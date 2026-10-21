import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { compressImage } from "@/lib/compress-image";
import { ArrowDown, ArrowUp, Camera, ImageIcon, ArrowLeft, Banknote, CheckCircle2, Circle, Clock, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Stat } from "@/components/AppShell";
import { PieChart } from "@/components/PieChart";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/session";


export const Route = createFileRoute("/_authenticated/room/$id")({
  head: () => ({ meta: [{ title: "Budget Room Report — Budget Manager" }, { name: "description", content: "Room report: allocations vs spending, contributions, cash and online totals." }, { property: "og:title", content: "Budget Room Report — Budget Manager" }, { property: "og:description", content: "Room report: allocations vs spending, contributions, cash and online totals." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: RoomPage,
});

const input = "h-12 w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring";
const run = async (p: PromiseLike<{ data: any; error: { message: string } | null }>) => { const { data, error } = await p; if (error) throw new Error(error.message); return data ?? []; };
const sum = (xs: any[]) => xs.reduce((s, x) => s + Number(x.amount), 0);
const isOnline = (x: any) => x.payment_method === "online";

function MethodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div className="col-span-2 grid grid-cols-2 gap-2">
    {(["cash", "online"] as const).map((m) => <Button key={m} type="button" variant="unstyled" onClick={() => onChange(m)} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-ink font-semibold capitalize ${value === m ? "bg-highlight text-ink" : "bg-card"}`}>{m === "cash" ? <Banknote className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}{m}</Button>)}
  </div>;
}

function MethodTag({ m }: { m: string }) {
  return <span className="rounded-full border border-ink px-2 py-0.5 text-[10px] font-bold uppercase">{m === "online" ? "Online" : "Cash"}</span>;
}

function RoomPage() {
  const { id } = Route.useParams();
  const { role, user } = Route.useRouteContext();
  const qc = useQueryClient();
  const budget = useQuery({ queryKey: ["room", id], queryFn: () => run(supabase.from("budgets").select("*").eq("id", id).maybeSingle()) }).data as any;
  const tasks = (useQuery({ queryKey: ["room-tasks", id], queryFn: () => run(supabase.from("budget_tasks").select("*").eq("budget_id", id).order("position").order("created_at")) }).data ?? []) as any[];
  const allocs = (useQuery({ queryKey: ["room-allocs", id], queryFn: () => run(supabase.from("budget_allocations").select("*").eq("budget_id", id).order("created_at")) }).data ?? []) as any[];
  const contribs = (useQuery({ queryKey: ["room-contribs", id], queryFn: () => run(supabase.from("contributions").select("*").eq("budget_id", id).order("date", { ascending: false })) }).data ?? []) as any[];
  const spends = (useQuery({ queryKey: ["room-spends", id], queryFn: () => run(supabase.from("expenses").select("*").eq("budget_id", id).order("date", { ascending: false })) }).data ?? []) as any[];
  const canManage = role === "admin" || budget?.owner_id === user.id;

  const [task, setTask] = useState("");
  const [label, setLabel] = useState("");
  const [allocAmt, setAllocAmt] = useState("");
  const [person, setPerson] = useState("");
  const [given, setGiven] = useState("");
  const [giveMethod, setGiveMethod] = useState("cash");
  const [spendAlloc, setSpendAlloc] = useState("");
  const [spendDesc, setSpendDesc] = useState("");
  const [spendAmt, setSpendAmt] = useState("");
  const [spendMethod, setSpendMethod] = useState("cash");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = () => { ["room-tasks", "room-allocs", "room-contribs", "room-spends"].forEach((k) => qc.invalidateQueries({ queryKey: [k, id] })); qc.invalidateQueries({ queryKey: ["contributions"] }); qc.invalidateQueries({ queryKey: ["expenses"] }); };
  const act = async (p: PromiseLike<{ error: { message: string } | null }>, msg?: string) => { const { error } = await p; if (error) toast.error(error.message); else { if (msg) toast.success(msg); refresh(); } };

  const addTask = async (e: FormEvent) => { e.preventDefault(); await act(supabase.from("budget_tasks").insert({ budget_id: id, title: task, created_by: user.id, position: tasks.reduce((m, t) => Math.max(m, t.position ?? 0), 0) + 1 }), "Task added"); setTask(""); };
  const addAlloc = async (e: FormEvent) => { e.preventDefault(); await act(supabase.from("budget_allocations").insert({ budget_id: id, label, amount: Number(allocAmt) }), "Allocation added"); setLabel(""); setAllocAmt(""); };
  const addContrib = async (e: FormEvent) => { e.preventDefault(); await act(supabase.from("contributions").insert({ budget_id: id, contributor_name: person, amount: Number(given), user_id: user.id, payment_method: giveMethod }), "Contribution added"); setPerson(""); setGiven(""); };
  const addSpend = async (e: FormEvent) => {
    e.preventDefault();
    const a = allocs.find((x) => x.id === spendAlloc);
    setBusy(true);
    let receipt_path: string | null = null;
    try {
      if (photo) {
        const blob = await compressImage(photo);
        receipt_path = `${id}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("receipts").upload(receipt_path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
      }
    } catch (err) { setBusy(false); toast.error(err instanceof Error ? err.message : "Photo upload failed"); return; }
    await act(supabase.from("expenses").insert({ budget_id: id, allocation_id: spendAlloc || null, description: spendDesc || a?.label || "Spending", amount: Number(spendAmt), user_id: user.id, payment_method: spendMethod, receipt_path }), "Spending recorded");
    setBusy(false);
    setSpendDesc(""); setSpendAmt(""); setPhoto(null); setPhotoKey((k) => k + 1);
  };
  const viewPhoto = async (path: string) => {
    const w = window.open("", "_blank");
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
    if (error || !data) { w?.close(); toast.error(error?.message ?? "Could not open photo"); return; }
    if (w) w.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };
  const deleteSpend = async (s: any) => {
    if (s.receipt_path) await supabase.storage.from("receipts").remove([s.receipt_path]);
    await act(supabase.from("expenses").delete().eq("id", s.id));
  };
  const moveTask = async (i: number, dir: -1 | 1) => {
    const a = tasks[i], b = tasks[i + dir];
    if (!a || !b) return;
    const order = tasks.map((t) => t.id);
    [order[i], order[i + dir]] = [order[i + dir], order[i]];
    const results = await Promise.all(order.map((tid, idx) => supabase.from("budget_tasks").update({ position: idx + 1 }).eq("id", tid)));
    const err = results.find((x) => x.error)?.error;
    if (err) toast.error(err.message);
    refresh();
  };

  const collected = sum(contribs);
  const allocated = sum(allocs);
  const spent = sum(spends);
  const total = Number(budget?.amount ?? 0) + collected;
  const cashIn = sum(contribs.filter((c) => !isOnline(c)));
  const onlineIn = sum(contribs.filter(isOnline));
  const cashOut = sum(spends.filter((s) => !isOnline(s)));
  const onlineOut = sum(spends.filter(isOnline));
  const daysLeft = budget ? Math.max(0, 30 - Math.floor((Date.now() - new Date(budget.created_at).getTime()) / 86400000)) : 30;

  const people = Object.values(contribs.reduce((acc: Record<string, { name: string; cash: number; online: number }>, c) => {
    const name = c.contributor_name ?? "—"; const k = name.trim().toLowerCase();
    acc[k] ??= { name, cash: 0, online: 0 };
    if (isOnline(c)) acc[k].online += Number(c.amount); else acc[k].cash += Number(c.amount);
    return acc;
  }, {}));

  if (!budget) return <Panel><p className="text-sm text-muted-foreground">Room not found or you don't have access.</p></Panel>;

  return (
    <>
      <Link to="/dashboard" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <PageHeader title={budget.name} subtitle={budget.description ?? "Room report"} />
      <p className="street-badge mb-4 inline-flex items-center gap-2 bg-highlight px-3 py-1 text-xs font-bold text-ink"><Clock className="h-4 w-4" /> Auto-deletes in {daysLeft} day{daysLeft === 1 ? "" : "s"}</p>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total amount" value={money(total)} />
        <Stat label="Allocated" value={money(allocated)} />
        <Stat label="Spent" value={money(spent)} tone="destructive" />
        <Stat label="Remaining" value={money(total - spent)} tone={total - spent < 0 ? "destructive" : "success"} />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Panel><p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Banknote className="h-4 w-4" /> Cash</p><p className="mt-1 text-xl font-bold">{money(cashIn - cashOut)}</p><p className="text-xs text-muted-foreground">In {money(cashIn)} · Spent {money(cashOut)}</p></Panel>
        <Panel><p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Smartphone className="h-4 w-4" /> Online</p><p className="mt-1 text-xl font-bold">{money(onlineIn - onlineOut)}</p><p className="text-xs text-muted-foreground">In {money(onlineIn)} · Spent {money(onlineOut)}</p></Panel>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel className="md:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Allocated vs spent</h2>
          {canManage && <form onSubmit={addAlloc} className="mb-4 grid grid-cols-2 gap-2">
            <input className={input} list="alloc-labels" placeholder="Food, Travel, Snacks…" value={label} onChange={(e) => setLabel(e.target.value)} required />
            <datalist id="alloc-labels"><option value="Food" /><option value="Travel" /><option value="Snacks" /><option value="Others" /></datalist>
            <input className={input} type="number" min="0" step="0.01" placeholder="Allocate amount" value={allocAmt} onChange={(e) => setAllocAmt(e.target.value)} required />
            <Button variant="unstyled" className="col-span-2 h-12 rounded-xl bg-primary font-semibold text-primary-foreground">Add allocation</Button>
          </form>}
          <ul className="space-y-3">{allocs.map((a) => {
            const used = sum(spends.filter((s) => s.allocation_id === a.id));
            const left = Number(a.amount) - used;
            const pct = Math.min(100, Math.round((used / (Number(a.amount) || 1)) * 100));
            return <li key={a.id} className="rounded-xl border px-3 py-3">
              <div className="flex items-center justify-between"><span className="font-bold">{a.label}</span>{canManage && <Button variant="unstyled" aria-label="Delete" onClick={() => act(supabase.from("budget_allocations").delete().eq("id", a.id))} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></Button>}</div>
              <div className="mt-1 grid grid-cols-3 text-sm"><span>Allocated<br /><b>{money(a.amount)}</b></span><span>Spent<br /><b className="text-destructive">{money(used)}</b></span><span>Left<br /><b className={left < 0 ? "text-destructive" : "text-success"}>{money(left)}</b></span></div>
              <div className="mt-2 h-2.5 rounded-full bg-secondary"><div className={`h-full rounded-full ${left < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
            </li>;
          })}</ul>
          {!allocs.length && <p className="text-sm text-muted-foreground">No allocations yet.</p>}
        </Panel>

        <Panel>
          <h2 className="mb-3 text-lg font-bold">What we spent</h2>
          {canManage && <form onSubmit={addSpend} className="mb-4 grid grid-cols-2 gap-2">
            <select className={input} value={spendAlloc} onChange={(e) => setSpendAlloc(e.target.value)} required>
              <option value="">Category…</option>
              {allocs.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <input className={input} type="number" min="0" step="0.01" placeholder="Amount spent" value={spendAmt} onChange={(e) => setSpendAmt(e.target.value)} required />
            <input className={`${input} col-span-2`} placeholder="Note (optional)" value={spendDesc} onChange={(e) => setSpendDesc(e.target.value)} />
            <MethodPicker value={spendMethod} onChange={setSpendMethod} />
            <label className="col-span-2 flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-input px-4 py-2 text-sm">
              <Camera className="h-5 w-5 shrink-0" />
              <span className="truncate">{photo ? photo.name : "Add photo of bill (optional)"}</span>
              <input key={photoKey} type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
            <Button variant="unstyled" disabled={busy} className="col-span-2 h-12 rounded-xl bg-primary font-semibold text-primary-foreground">{busy ? "Saving…" : "Record spending"}</Button>
          </form>}
          <ul className="space-y-2">{spends.map((s) => <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
            <span className="min-w-0"><span className="block truncate font-semibold">{s.description}</span><span className="text-xs text-muted-foreground">{allocs.find((a) => a.id === s.allocation_id)?.label ?? "Other"} · {s.date}</span></span>
            <span className="flex shrink-0 items-center gap-2"><MethodTag m={s.payment_method} />{s.receipt_path && <Button variant="unstyled" aria-label="View photo" onClick={() => viewPhoto(s.receipt_path)} className="p-1"><ImageIcon className="h-4 w-4" /></Button>}<span className="font-semibold text-destructive">{money(s.amount)}</span>{canManage && <Button variant="unstyled" aria-label="Delete" onClick={() => deleteSpend(s)} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></Button>}</span>
          </li>)}</ul>
          {!spends.length && <p className="text-sm text-muted-foreground">Nothing spent yet.</p>}
        </Panel>

        <Panel>
          <h2 className="mb-3 text-lg font-bold">Contributions</h2>
          {canManage && <form onSubmit={addContrib} className="mb-4 grid grid-cols-2 gap-2">
            <input className={input} placeholder="Person's name" value={person} onChange={(e) => setPerson(e.target.value)} required />
            <input className={input} type="number" min="0" step="0.01" placeholder="Amount given" value={given} onChange={(e) => setGiven(e.target.value)} required />
            <MethodPicker value={giveMethod} onChange={setGiveMethod} />
            <Button variant="unstyled" className="col-span-2 h-12 rounded-xl bg-primary font-semibold text-primary-foreground">Add to total</Button>
          </form>}
          {people.length > 0 && <div className="mb-4 overflow-hidden rounded-xl border">
            <div className="grid grid-cols-4 bg-secondary px-3 py-2 text-xs font-bold uppercase"><span className="col-span-1">Name</span><span className="text-right">Cash</span><span className="text-right">Online</span><span className="text-right">Total</span></div>
            {people.map((p) => <div key={p.name} className="grid grid-cols-4 border-t px-3 py-2 text-sm"><span className="truncate font-semibold">{p.name}</span><span className="text-right">{money(p.cash)}</span><span className="text-right">{money(p.online)}</span><span className="text-right font-bold text-success">{money(p.cash + p.online)}</span></div>)}
          </div>}
          <ul className="space-y-2">{contribs.map((c) => <li key={c.id} className="flex items-center justify-between rounded-xl border px-3 py-2"><span className="font-semibold">{c.contributor_name ?? "—"}</span><span className="flex items-center gap-2"><MethodTag m={c.payment_method} /><span className="text-success">{money(c.amount)}</span>{canManage && <Button variant="unstyled" aria-label="Delete" onClick={() => act(supabase.from("contributions").delete().eq("id", c.id))} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></Button>}</span></li>)}</ul>
          {!contribs.length && <p className="text-sm text-muted-foreground">No contributions yet.</p>}
        </Panel>

        <Panel className="md:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Plans & tasks</h2>
          {canManage && <form onSubmit={addTask} className="mb-4 flex gap-2">
            <input className={input} placeholder="Something to be done…" value={task} onChange={(e) => setTask(e.target.value)} required />
            <Button variant="unstyled" className="h-12 shrink-0 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Add</Button>
          </form>}
          <ul className="space-y-2">{tasks.map((t, i) => <li key={t.id} className="flex items-center gap-3 rounded-xl border px-3 py-2">
            <Button variant="unstyled" disabled={!canManage} aria-label="Toggle done" onClick={() => act(supabase.from("budget_tasks").update({ done: !t.done }).eq("id", t.id))}>{t.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5" />}</Button>
            <span className={`flex-1 ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
            {canManage && <Button variant="unstyled" aria-label="Move up" disabled={i === 0} onClick={() => moveTask(i, -1)} className="p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></Button>}
            {canManage && <Button variant="unstyled" aria-label="Move down" disabled={i === tasks.length - 1} onClick={() => moveTask(i, 1)} className="p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></Button>}
            {canManage && <Button variant="unstyled" aria-label="Delete" onClick={() => act(supabase.from("budget_tasks").delete().eq("id", t.id))} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></Button>}
          </li>)}</ul>
          {!tasks.length && <p className="text-sm text-muted-foreground">No plans yet.</p>}
        </Panel>
      </div>

      <Panel className="mt-6">
        <h2 className="mb-1 text-lg font-bold">Room report</h2>
        <p className="mb-4 text-sm text-muted-foreground">Income of {money(total)} (base budget {money(Number(budget?.amount ?? 0))} + collected {money(collected)}) against spending of {money(spent)}.</p>
        <PieChart spent={spent} remaining={total - spent} />
      </Panel>
    </>
  );
}

