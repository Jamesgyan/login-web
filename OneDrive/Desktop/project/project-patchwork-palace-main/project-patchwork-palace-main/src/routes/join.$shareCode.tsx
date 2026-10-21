import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, LogIn, Users, Video, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/session";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";

export const Route = createFileRoute("/join/$shareCode")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },{ title: "Join Budget Room — Budget Manager" }, { name: "description", content: "Manage join budget room in Budget Manager." }, { property: "og:title", content: "Join Budget Room — Budget Manager" }, { property: "og:description", content: "Manage join budget room in Budget Manager." }] }),
  component: JoinRoom,
});

function JoinRoom() {
  const { shareCode } = Route.useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data: budget, isLoading } = useQuery({
    queryKey: ["shared-budget", shareCode],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("share_code", shareCode).maybeSingle();
      if (error) throw new Error(error.message);
      return data as any;
    },
  });

  async function join() {
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) { localStorage.setItem("budgetJoinRedirect", `/join/${shareCode}`); navigate({ to: "/auth" }); return; }
    if (!budget) return;
    const { error } = await supabase.from("budget_members" as any).upsert({ budget_id: budget.id, user_id: data.user.id, removed_at: null }, { onConflict: "budget_id,user_id" } as any);
    if (error) toast.error(error.message); else { toast.success("You joined the budget room"); navigate({ to: "/my-budget" }); }
    setBusy(false);
  }

  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading room…</div>;
  if (!budget) return <div className="grid min-h-screen place-items-center p-4"><Panel className="max-w-md text-center"><h1 className="text-xl font-bold">Room not found</h1><p className="mt-2 text-sm text-muted-foreground">This budget link may be invalid or no longer available.</p><Link to="/auth" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Sign in</Link></Panel></div>;

  return <div className="grid min-h-screen place-items-center bg-background p-4"><Panel className="w-full max-w-lg">
    <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Wallet className="h-6 w-6" /></div><div><p className="text-sm font-medium text-primary">Budget room</p><h1 className="text-2xl font-bold">{budget.name}</h1></div></div>
    {budget.description && <p className="mt-4 text-muted-foreground">{budget.description}</p>}
    <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Total budget</p><p className="mt-1 text-xl font-bold">{money(budget.amount)}</p></div><div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Room</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Shared</p></div></div>
    {budget.meeting_link && <a href={budget.meeting_link} target="_blank" rel="noreferrer" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl border font-semibold"><Video className="h-5 w-5" /> Join {budget.meeting_provider === "google_meet" ? "Google Meet" : "Zoom"}</a>}
    <Button variant="unstyled" onClick={join} disabled={busy || budget.allow_join === false || budget.status === "archived"} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Joining…" : <><CheckCircle2 className="h-5 w-5" /> Join budget room</>}</Button>
    <Link to="/auth" className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-primary"><LogIn className="h-4 w-4" /> Sign in / create account</Link>
  </Panel></div>;
}
