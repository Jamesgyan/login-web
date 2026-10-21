ALTER TABLE public.budget_tasks ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
UPDATE public.budget_tasks t SET position = s.rn FROM (SELECT id, row_number() OVER (PARTITION BY budget_id ORDER BY created_at) AS rn FROM public.budget_tasks) s WHERE s.id = t.id;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_path text;
CREATE POLICY "receipts read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND public.can_view_room(((storage.foldername(name))[1])::uuid));
CREATE POLICY "receipts insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts' AND public.can_manage_room(((storage.foldername(name))[1])::uuid));
CREATE POLICY "receipts delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'receipts' AND public.can_manage_room(((storage.foldername(name))[1])::uuid));