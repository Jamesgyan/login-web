import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { PageHeader, Panel, StatusBadge } from "@/components/AppShell";
import { budgetsQuery, requestsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/session";
import { toast } from "sonner";
import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Requests — Budget Manager" },
      {
        name: "description",
        content: "Manage spending requests in Budget Manager.",
      },
      { property: "og:title", content: "Requests — Budget Manager" },
      {
        property: "og:description",
        content: "Manage spending requests in Budget Manager.",
      },
    ],
  }),
  component: Requests,
});

function Requests() {
  const { role, user } = Route.useRouteContext();
  const qc = useQueryClient();

  const requestsQueryResult = useQuery(requestsQuery);
  const budgetsQueryResult = useQuery(budgetsQuery);

  const requests = requestsQueryResult.data ?? [];
  const budgets = budgetsQueryResult.data ?? [];

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = role === "admin";

  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "approved",
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "rejected",
  ).length;

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const numericAmount = Number(amount);

    if (!trimmedTitle) {
      toast.error("Please enter a request title.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("requests").insert({
        title: trimmedTitle,
        amount: numericAmount,
        budget_id: budgetId || null,
        user_id: user.id,
      });

      if (error) throw error;

      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "Request submitted",
          details: trimmedTitle,
        });

      if (activityError) {
        console.error("Could not save request activity:", activityError);
      }

      toast.success("Request submitted successfully.");
      setTitle("");
      setAmount("");
      setBudgetId("");

      await qc.invalidateQueries({ queryKey: ["requests"] });
    } catch (error) {
      console.error("Request submission failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit the request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    setUpdatingId(id);

    try {
      const { error } = await supabase
        .from("requests")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        status === "approved"
          ? "Request approved successfully."
          : "Request rejected.",
      );

      await qc.invalidateQueries({ queryKey: ["requests"] });
    } catch (error) {
      console.error("Could not update request status:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the request. Please try again.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const input =
    "h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring";

  return (
    <>
      <PageHeader
        title="Requests"
        subtitle={
          isAdmin
            ? "Review and manage spending requests."
            : "Submit a request and track its approval status."
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Panel className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold tabular-nums">{pendingCount}</p>
          </div>
        </Panel>

        <Panel className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold tabular-nums">{approvedCount}</p>
          </div>
        </Panel>

        <Panel className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold tabular-nums">{rejectedCount}</p>
          </div>
        </Panel>
      </div>

      <Panel className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">
              {isAdmin ? "Submit a request" : "New spending request"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Describe what you need and enter the requested amount.
            </p>
          </div>
        </div>

        <form onSubmit={create} className="grid gap-3 md:grid-cols-4">
          <input
            className={`${input} md:col-span-2`}
            placeholder="What do you need?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />

          <input
            className={input}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <select
            className={input}
            value={budgetId}
            onChange={(e) => setBudgetId(e.target.value)}
          >
            <option value="">Any budget</option>
            {budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.name}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            variant="unstyled"
            disabled={submitting}
            className="h-12 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-4"
          >
            {submitting ? "Submitting..." : "Submit request"}
          </Button>
        </form>
      </Panel>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">All requests</h2>
        <span className="text-sm text-muted-foreground">
          {requests.length} {requests.length === 1 ? "request" : "requests"}
        </span>
      </div>

      {requestsQueryResult.isLoading ? (
        <Panel>
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading requests...
          </p>
        </Panel>
      ) : requestsQueryResult.isError ? (
        <Panel>
          <p className="py-6 text-center text-sm text-destructive">
            Could not load requests. Please refresh and try again.
          </p>
        </Panel>
      ) : requests.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="font-semibold">No requests yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              New spending requests will appear here after they are submitted.
            </p>
          </div>
        </Panel>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Panel
              key={request.id}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words font-semibold">{request.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {money(request.amount)}
                  </span>
                  {request.reason ? ` · ${request.reason}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={request.status} />

                {isAdmin && request.status === "pending" && (
                  <>
                    <Button
                      type="button"
                      variant="unstyled"
                      disabled={updatingId === request.id}
                      onClick={() => setStatus(request.id, "approved")}
                      className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                    >
                      {updatingId === request.id
                        ? "Updating..."
                        : "Approve"}
                    </Button>

                    <Button
                      type="button"
                      variant="unstyled"
                      disabled={updatingId === request.id}
                      onClick={() => setStatus(request.id, "rejected")}
                      className="h-10 rounded-xl border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:opacity-80 disabled:opacity-60"
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}