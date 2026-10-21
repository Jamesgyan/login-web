import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Wallet } from "lucide-react";
import { PageHeader, Panel } from "@/components/AppShell";
import { budgetsQuery } from "@/lib/queries";
import { money } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      { title: "Dashboard — Budget Manager" },
      {
        name: "description",
        content: "All budget rooms at a glance in Budget Manager.",
      },
      { property: "og:title", content: "Dashboard — Budget Manager" },
      {
        property: "og:description",
        content: "All budget rooms at a glance in Budget Manager.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const budgets = (useQuery(budgetsQuery).data ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="All budget rooms — tap one to see its report"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {budgets.map((budget) => (
          <Link
            key={budget.id}
            to="/room/$id"
            params={{ id: budget.id }}
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Panel className="flex h-full items-center justify-between gap-3 border border-border transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary group-hover:shadow-md">
              <div className="min-w-0 flex-1">
                <span
                  className={`street-badge inline-flex items-center px-3 py-1 text-xs font-bold capitalize ${
                    budget.status === "approved"
                      ? "bg-success/15 text-success"
                      : budget.status === "rejected"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-accent text-accent-foreground"
                  }`}
                >
                  {budget.status ?? "active"}
                </span>

                <h2 className="mt-3 truncate text-lg font-bold text-card-foreground transition-colors group-hover:text-primary">
                  {budget.name}
                </h2>

                {budget.description && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {budget.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <Wallet className="h-4 w-4 shrink-0 text-secondary" />
                  <p className="text-sm font-semibold text-foreground">
                    Base budget: {money(budget.amount)}
                  </p>
                </div>
              </div>

              <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Panel>
          </Link>
        ))}
      </div>

      {!budgets.length && (
        <Panel className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Wallet className="h-7 w-7" />
          </div>

          <h2 className="text-lg font-bold text-card-foreground">
            No budget rooms yet
          </h2>

          <p className="max-w-sm text-sm text-muted-foreground">
            No rooms have been created yet. Once a budget room is available,
            it will appear here.
          </p>
        </Panel>
      )}
    </>
  );
}
