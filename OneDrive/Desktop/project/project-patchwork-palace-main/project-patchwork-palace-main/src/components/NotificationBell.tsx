import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  useEffect(() => {
    if (!seen.current) { seen.current = new Set(data.map((n) => n.id)); return; }
    data.filter((n) => !seen.current!.has(n.id) && !n.read).forEach((n) => toast(n.title, { description: n.body ?? undefined }));
    data.forEach((n) => seen.current!.add(n.id));
  }, [data]);
  const unread = data.filter((n) => !n.read).length;

  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="relative">
      <Button variant="unstyled" aria-label="Notifications" onClick={() => setOpen(!open)} className="theme-toggle relative grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-card text-card-foreground">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>}
      </Button>
      {open && (
        <div className="street-panel absolute right-0 z-30 mt-2 max-h-96 w-80 max-w-[90vw] overflow-auto bg-card p-3 text-card-foreground">
          <div className="mb-2 flex items-center justify-between"><p className="font-bold">Notifications</p>{unread > 0 && <Button variant="unstyled" onClick={markAll} className="text-xs font-semibold text-primary">Mark all read</Button>}</div>
          {data.map((n) => (
            <Link key={n.id} to={n.link ?? "/dashboard"} onClick={() => setOpen(false)} className={`block rounded-lg px-2 py-2 text-sm hover:bg-secondary ${n.read ? "text-muted-foreground" : "font-semibold"}`}>
              {n.title}{n.body && <span className="block text-xs font-normal text-muted-foreground">{n.body}</span>}
            </Link>
          ))}
          {!data.length && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
        </div>
      )}
    </div>
  );
}
