CREATE TABLE public.budget_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.budget_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_allocations TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.budget_tasks, public.budget_allocations, public.notifications TO service_role;
ALTER TABLE public.budget_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_room(_budget uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM budgets b WHERE b.id=_budget AND b.owner_id=auth.uid())
    OR EXISTS (SELECT 1 FROM budget_members m WHERE m.budget_id=_budget AND m.user_id=auth.uid() AND m.removed_at IS NULL)
$$;
CREATE OR REPLACE FUNCTION public.can_manage_room(_budget uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM budgets b WHERE b.id=_budget AND b.owner_id=auth.uid())
$$;

CREATE POLICY "tasks read" ON public.budget_tasks FOR SELECT TO authenticated USING (public.can_view_room(budget_id));
CREATE POLICY "tasks write" ON public.budget_tasks FOR ALL TO authenticated USING (public.can_manage_room(budget_id)) WITH CHECK (public.can_manage_room(budget_id));
CREATE POLICY "alloc read" ON public.budget_allocations FOR SELECT TO authenticated USING (public.can_view_room(budget_id));
CREATE POLICY "alloc write" ON public.budget_allocations FOR ALL TO authenticated USING (public.can_manage_room(budget_id)) WITH CHECK (public.can_manage_room(budget_id));
CREATE POLICY "notif read own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif delete own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_room(_budget uuid, _title text, _body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, title, body, link)
  SELECT DISTINCT m.user_id, _title, _body, '/room/' || _budget
  FROM budget_members m WHERE m.budget_id = _budget AND m.removed_at IS NULL
    AND m.user_id IS DISTINCT FROM auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.trg_room_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; bid uuid; bname text; what text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF TG_TABLE_NAME = 'budgets' THEN bid := r.id; ELSE bid := r.budget_id; END IF;
  IF bid IS NULL THEN RETURN NULL; END IF;
  SELECT name INTO bname FROM budgets WHERE id = bid;
  what := CASE TG_TABLE_NAME WHEN 'budgets' THEN 'Budget details updated'
    WHEN 'budget_allocations' THEN 'Budget allocation ' || lower(TG_OP) || 'd'
    WHEN 'budget_tasks' THEN 'Plan / task ' || lower(TG_OP) || 'd'
    WHEN 'contributions' THEN 'Contribution ' || lower(TG_OP) || 'd'
    ELSE 'Room updated' END;
  PERFORM public.notify_room(bid, coalesce(bname,'Budget room') || ': ' || what, NULL);
  RETURN NULL;
END $$;
CREATE TRIGGER room_notify_budgets AFTER UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.trg_room_change();
CREATE TRIGGER room_notify_alloc AFTER INSERT OR UPDATE OR DELETE ON public.budget_allocations FOR EACH ROW EXECUTE FUNCTION public.trg_room_change();
CREATE TRIGGER room_notify_tasks AFTER INSERT OR UPDATE OR DELETE ON public.budget_tasks FOR EACH ROW EXECUTE FUNCTION public.trg_room_change();
CREATE TRIGGER room_notify_contrib AFTER INSERT OR UPDATE OR DELETE ON public.contributions FOR EACH ROW EXECUTE FUNCTION public.trg_room_change();

CREATE OR REPLACE FUNCTION public.trg_request_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, body, link)
    SELECT ur.user_id, 'New request: ' || NEW.title, 'Amount ' || NEW.amount, '/requests'
    FROM user_roles ur WHERE ur.role = 'admin' AND ur.user_id IS DISTINCT FROM NEW.user_id;
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, link)
    VALUES (NEW.user_id, 'Your request was ' || NEW.status, NEW.title, '/requests');
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER request_notify AFTER INSERT OR UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.trg_request_notify();

CREATE OR REPLACE FUNCTION public.purge_expired_rooms() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[];
BEGIN
  SELECT array_agg(id) INTO ids FROM budgets WHERE created_at < now() - interval '30 days';
  IF ids IS NULL THEN RETURN; END IF;
  DELETE FROM comments WHERE request_id IN (SELECT id FROM requests WHERE budget_id = ANY(ids));
  DELETE FROM requests WHERE budget_id = ANY(ids);
  DELETE FROM expenses WHERE budget_id = ANY(ids);
  DELETE FROM contributions WHERE budget_id = ANY(ids);
  DELETE FROM budget_members WHERE budget_id = ANY(ids);
  DELETE FROM budgets WHERE id = ANY(ids);
END $$;
REVOKE EXECUTE ON FUNCTION public.purge_expired_rooms() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_room(uuid,text,text) FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('purge-expired-rooms', '0 * * * *', 'SELECT public.purge_expired_rooms()');