import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { PageHeader, Panel } from "@/components/AppShell";
import { budgetsQuery, categoriesQuery, contributionsQuery, expensesQuery } from "@/lib/queries";
import { money } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },{ title: "Reports — Budget Manager" }, { name: "description", content: "Manage reports in Budget Manager." }, { property: "og:title", content: "Reports — Budget Manager" }, { property: "og:description", content: "Manage reports in Budget Manager." }] }),
  component: Reports,
});

function Reports() {
  const budgets = useQuery(budgetsQuery).data ?? [];
  const categories = useQuery(categoriesQuery).data ?? [];
  const expenses = useQuery(expensesQuery).data ?? [];
  const contributions = useQuery(contributionsQuery).data ?? [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0) || 1;
  const budgetTotal = budgets.reduce((s, b) => s + Number(b.amount), 0);

  function downloadCsv() {
    const rows = [
      ["Budget Manager Report"], ["Total Budget", budgetTotal], ["Total Spent", total], ["Remaining", budgetTotal - total], [],
      ["Contributions"], ["Contributor", "Amount", "Date"], ...contributions.map((c: any) => [c.contributor_name || c.user_id || "User", c.amount, c.date]), [],
      ["Expenses"], ["Description", "Amount", "Date"], ...expenses.map((e: any) => [e.description, e.amount, e.date]), [],
      ["Budgets"], ["Name", "Amount", "Status"], ...budgets.map((b: any) => [b.name, b.amount, b.status || "active"]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "budget-report.csv"; a.click(); URL.revokeObjectURL(url); toast.success("Excel-compatible CSV downloaded");
  }

  function printPdf() {
    window.print();
  }

  return <>
    <PageHeader title="Reports" subtitle="Download or print your budget history." />
    <div className="mb-6 flex flex-wrap gap-2 print:hidden"><Button variant="unstyled" onClick={downloadCsv} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><FileSpreadsheet className="h-4 w-4" /> Excel / CSV</Button><Button variant="unstyled" onClick={printPdf} className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 font-semibold"><Printer className="h-4 w-4" /> Print / Save PDF</Button></div>
    <div className="space-y-4">
      <Panel><div className="grid grid-cols-3 gap-3"><div><p className="text-xs text-muted-foreground">Budget</p><p className="font-bold">{money(budgetTotal)}</p></div><div><p className="text-xs text-muted-foreground">Spent</p><p className="font-bold">{money(total)}</p></div><div><p className="text-xs text-muted-foreground">Remaining</p><p className="font-bold">{money(budgetTotal - total)}</p></div></div></Panel>
      <Panel><h2 className="font-bold">Spending by category</h2><div className="mt-4 space-y-5">{categories.map((c) => { const sum = expenses.filter((e) => e.category_id === c.id).reduce((s, e) => s + Number(e.amount), 0); const pct = Math.round((sum / total) * 100); return <div key={c.id}><div className="flex justify-between text-sm"><span className="font-medium">{c.name}</span><span className="text-muted-foreground">{money(sum)} · {pct}%</span></div><div className="mt-2 h-3 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div></div>; })}</div></Panel>
      <Panel><h2 className="font-bold">Budget plans — all rooms</h2><div className="mt-3 space-y-2">{budgets.map((b: any) => { const roomSpent = expenses.filter((e: any) => e.budget_id === b.id).reduce((s: number, e: any) => s + Number(e.amount), 0); const roomLeft = Number(b.amount) - roomSpent; return <div key={b.id} className="rounded-xl border p-3"><div className="flex items-center justify-between"><div><p className="font-semibold">{b.name}</p><p className="text-xs text-muted-foreground">{b.status || "active"}</p></div><span className="font-semibold">{money(b.amount)}</span></div><div className="mt-2 flex justify-between text-xs"><span className="text-destructive">Spent: {money(roomSpent)}</span><span className="text-success">Remaining: {money(roomLeft)}</span></div></div>; })}</div></Panel>
    </div>
  </>;
}
