import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  Archive,
  Check,
  Calendar,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  RotateCcw,
  Video,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/AppShell";
import { budgetsQuery, expensesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/budget")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Budget Rooms — Budget Manager" },
      {
        name: "description",
        content: "Manage budget rooms in Budget Manager.",
      },
      { property: "og:title", content: "Budget Rooms — Budget Manager" },
      {
        property: "og:description",
        content: "Manage budget rooms in Budget Manager.",
      },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const qc = useQueryClient();
  const budgets = useQuery(budgetsQuery).data ?? [];
  const expenses = useQuery(expensesQuery).data ?? [];

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [provider, setProvider] = useState("none");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;
      if (!userData.user) {
        toast.error("Please sign in before creating a budget room.");
        return;
      }

      const shareCode = crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 10)
        .toLowerCase();

      const { error } = await supabase.from("budgets").insert({
        name,
        amount: Number(amount),
        owner_id: userData.user.id,
        description: description || null,
        share_code: shareCode,
        status: "active",
        allow_join: true,
        meeting_link: meetingLink || null,
        meeting_provider: provider === "none" ? null : provider,
      } as any);

      if (error) throw error;

      toast.success("Budget room created");
      setName("");
      setAmount("");
      setDescription("");
      setMeetingLink("");
      setProvider("none");

      await qc.invalidateQueries({ queryKey: ["budgets"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create budget room.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string, archived: boolean) {
    const { error } = await supabase
      .from("budgets")
      .update({
        status: archived ? "active" : "archived",
        archived_at: archived ? null : new Date().toISOString(),
      } as any)
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(archived ? "Budget room restored" : "Budget room archived");
      await qc.invalidateQueries({ queryKey: ["budgets"] });
    }
  }

  async function updateBudget(id: string, patch: any) {
    const { error } = await supabase
      .from("budgets")
      .update(patch)
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Budget updated");
      await qc.invalidateQueries({ queryKey: ["budgets"] });
    }
  }

  async function copyRoom(code: string) {
    try {
      const link = `${window.location.origin}/join/${code}`;
      await navigator.clipboard.writeText(link);
      toast.success("Room link copied!", {
        description: "Share it with your members.",
      });
    } catch {
      toast.error("Unable to copy the room link. Please copy it from the room details.");
    }
  }

  const input =
    "h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-card-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

  const active = budgets.filter((b) => (b as any).status !== "archived");
  const archived = budgets.filter((b) => (b as any).status === "archived");

  return (
    <>
      <PageHeader
        title="Budget Rooms"
        subtitle="Create shareable budget plans and keep old plans for history."
      />

      <Panel className="mb-6 border border-border">
        <div className="mb-4 flex items-center gap-2 font-semibold text-card-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Plus className="h-5 w-5" />
          </span>
          Create a budget room
        </div>

        <form onSubmit={add} className="grid gap-3 md:grid-cols-2">
          <input
            className={input}
            placeholder="Budget / room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            className={input}
            type="number"
            min="0"
            step="0.01"
            placeholder="Total amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <input
            className={input}
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <select
            className={input}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="none">No video meeting</option>
            <option value="google_meet">Google Meet</option>
            <option value="zoom">Zoom</option>
          </select>

          <input
            className={input}
            placeholder="Google Meet / Zoom link (optional)"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />

          <Button
            variant="unstyled"
            type="submit"
            disabled={busy}
            className="street-form-button h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create room"}
          </Button>
        </form>
      </Panel>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-6 w-1.5 rounded-full bg-primary" />
          <h2 className="text-xl font-bold text-foreground">Active rooms</h2>
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
            {active.length}
          </span>
        </div>

        {active.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget as any}
            expenses={expenses}
            onCopy={copyRoom}
            onArchive={() => archive(budget.id, false)}
            onUpdate={updateBudget}
          />
        ))}

        {!active.length && (
          <Panel>
            <p className="text-sm text-muted-foreground">
              No active budget rooms yet.
            </p>
          </Panel>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-6 w-1.5 rounded-full bg-secondary" />
          <h2 className="text-xl font-bold text-foreground">Old budget plans</h2>
          <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-bold text-secondary">
            {archived.length}
          </span>
        </div>

        {archived.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget as any}
            expenses={expenses}
            onCopy={copyRoom}
            onArchive={() => archive(budget.id, true)}
            onUpdate={updateBudget}
            archived
          />
        ))}

        {!archived.length && (
          <Panel>
            <p className="text-sm text-muted-foreground">
              Archived plans will appear here.
            </p>
          </Panel>
        )}
      </section>
    </>
  );
}

function BudgetCard({
  budget: b,
  expenses,
  onCopy,
  onArchive,
  onUpdate,
  archived = false,
}: any) {
  const used = expenses
    .filter((e: any) => e.budget_id === b.id)
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  const remaining = Number(b.amount) - used;
  const roomLink = `${window.location.origin}/join/${b.share_code}`;

  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const [edit, setEdit] = useState({
    name: b.name,
    amount: String(b.amount),
    description: b.description ?? "",
    meeting_link: b.meeting_link ?? "",
  });

  async function saveEdit() {
    setSaving(true);

    try {
      await onUpdate(b.id, {
        name: edit.name,
        amount: Number(edit.amount),
        description: edit.description || null,
        meeting_link: edit.meeting_link || null,
      });

      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="border border-border transition-colors hover:border-primary/60">
      {editing ? (
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveEdit();
          }}
        >
          <input
            className="h-11 rounded-xl border border-input bg-card px-3 text-card-foreground outline-none focus:ring-2 focus:ring-ring"
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            required
          />

          <input
            className="h-11 rounded-xl border border-input bg-card px-3 text-card-foreground outline-none focus:ring-2 focus:ring-ring"
            type="number"
            min="0"
            step="0.01"
            value={edit.amount}
            onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
            required
          />

          <input
            className="h-11 rounded-xl border border-input bg-card px-3 text-card-foreground outline-none focus:ring-2 focus:ring-ring"
            value={edit.description}
            placeholder="Description"
            onChange={(e) => setEdit({ ...edit, description: e.target.value })}
          />

          <input
            className="h-11 rounded-xl border border-input bg-card px-3 text-card-foreground outline-none focus:ring-2 focus:ring-ring"
            type="url"
            value={edit.meeting_link}
            placeholder="Meeting link"
            onChange={(e) => setEdit({ ...edit, meeting_link: e.target.value })}
          />

          <Button
            variant="unstyled"
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </Button>

          <Button
            variant="unstyled"
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  b.status === "archived"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {b.status}
              </span>

              {b.meeting_provider && (
                <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold capitalize text-secondary">
                  {String(b.meeting_provider).replace("_", " ")}
                </span>
              )}
            </div>

            <h2 className="mt-3 break-words text-lg font-bold text-card-foreground">
              {b.name}
            </h2>

            {b.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {b.description}
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-muted-foreground">Budget</p>
                <p className="mt-1 break-words font-semibold text-foreground">
                  {money(b.amount)}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-muted-foreground">Spent</p>
                <p className="mt-1 break-words font-semibold text-secondary">
                  {money(used)}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-muted-foreground">Left</p>
                <p
                  className={`mt-1 break-words font-semibold ${
                    remaining < 0 ? "text-destructive" : "text-success"
                  }`}
                >
                  {money(remaining)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
            <Button
              variant="unstyled"
              onClick={async () => {
                await onCopy(b.share_code);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-95"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Share room"}
            </Button>

            <Link
              to="/room/$id"
              params={{ id: b.id }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Link2 className="h-4 w-4" />
              Plans & money
            </Link>

            {b.meeting_link && (
              <a
                href={b.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Video className="h-4 w-4" />
                Meeting
              </a>
            )}

            <Button
              variant="unstyled"
              onClick={() => setEditing(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>

            <Button
              variant="unstyled"
              onClick={onArchive}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {archived ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {archived ? "Restore" : "Archive"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
        <Calendar className="h-4 w-4 shrink-0 text-secondary" />
        <span className="truncate">{roomLink}</span>
        <a
          href={roomLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Open budget room link"
          className="ml-auto shrink-0 rounded-md p-1 text-foreground transition-colors hover:bg-background"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </Panel>
  );
}