import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Link2, Video } from "lucide-react";
import { PageHeader, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/my-budget")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },{ title: "My Budget Rooms — Budget Manager" }, { name: "description", content: "Manage my budget rooms in Budget Manager." }, { property: "og:title", content: "My Budget Rooms — Budget Manager" }, { property: "og:description", content: "Manage my budget rooms in Budget Manager." }] }),
  component: MyBudget,
});

function MyBudget() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const { data: rooms = [] } = useQuery({
    queryKey: ["my-budget-rooms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("budget_members" as any).select("budget_id, joined_at, budgets(*)").eq("user_id", user!.id).is("removed_at", null);
      if (error) throw new Error(error.message);
      return (data ?? []) as any[];
    },
  });
  return <>
    <PageHeader title="My Budget Rooms" subtitle="Budgets you joined through a shared link." />
    <div className="space-y-4">{rooms.map((m) => { const b = m.budgets; if (!b) return null; const link = `${window.location.origin}/join/${b.share_code}`; return <Panel key={m.budget_id}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">{b.status}</span><h2 className="mt-2 text-lg font-bold">{b.name}</h2>{b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}<p className="mt-2 text-sm font-semibold">Budget: {money(b.amount)}</p></div><div className="flex flex-wrap gap-2"><Button variant="unstyled" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Room link copied!"); }} className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><Link2 className="h-4 w-4" /> Copy link</Button>{b.meeting_link && <a href={b.meeting_link} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><Video className="h-4 w-4" /> Meeting</a>}<Link to="/room/$id" params={{ id: b.id }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"><ExternalLink className="h-4 w-4" /> Open room</Link></div></div>
    </Panel>; })}</div>
    {!rooms.length && <Panel><p className="text-sm text-muted-foreground">You have not joined any budget rooms yet. Ask an admin for a shared room link.</p></Panel>}
  </>;
}
