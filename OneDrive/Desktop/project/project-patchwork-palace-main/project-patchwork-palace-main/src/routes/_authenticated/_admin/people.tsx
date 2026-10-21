import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserMinus, UserPlus, Users, UserRound, ShieldCheck } from "lucide-react";
import { PageHeader, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_admin/people")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "People — Budget Manager" },
      { name: "description", content: "Manage people in Budget Manager." },
      { property: "og:title", content: "People — Budget Manager" },
      {
        property: "og:description",
        content: "Manage people in Budget Manager.",
      },
    ],
  }),
  component: People,
});

function People() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["people-rooms"],
    queryFn: async () => {
      const [
        { data: profiles, error: profilesError },
        { data: roles, error: rolesError },
        { data: budgets, error: budgetsError },
        { data: members, error: membersError },
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase
          .from("budgets")
          .select("id,name,status,share_code")
          .order("created_at", { ascending: false }),
        supabase
          .from("budget_members" as any)
          .select("id,budget_id,user_id,joined_at,removed_at"),
      ]);

      const queryError =
        profilesError || rolesError || budgetsError || membersError;

      if (queryError) throw queryError;

      const people = (profiles ?? []).map((profile) => ({
        ...profile,
        role: roles?.some(
          (role) =>
            role.user_id === profile.id && role.role === "admin",
        )
          ? "admin"
          : "user",
      }));

      return {
        people,
        budgets: budgets ?? [],
        members: (members ?? []) as any[],
      };
    },
  });

  async function addMember(budgetId: string, userId: string) {
    const { error } = await supabase
      .from("budget_members" as any)
      .upsert(
        {
          budget_id: budgetId,
          user_id: userId,
          removed_at: null,
        },
        { onConflict: "budget_id,user_id" } as any,
      );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Person added to room");
    setSelection((current) => ({ ...current, [budgetId]: "" }));
    await qc.invalidateQueries({ queryKey: ["people-rooms"] });
  }

  async function removeMember(id: string) {
    const { error } = await supabase
      .from("budget_members" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Person removed from room");
    await qc.invalidateQueries({ queryKey: ["people-rooms"] });
  }

  const input =
    "h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-sm text-card-foreground outline-none transition-colors focus:ring-2 focus:ring-ring";

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="People & Rooms"
          subtitle="Manage who can join each shared budget room."
        />
        <Panel>
          <p className="text-sm text-muted-foreground">
            Loading people and budget rooms…
          </p>
        </Panel>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="People & Rooms"
          subtitle="Manage who can join each shared budget room."
        />
        <Panel>
          <p className="font-semibold text-destructive">
            Could not load people and rooms.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </Panel>
      </>
    );
  }

  const people = data?.people ?? [];
  const budgets = data?.budgets ?? [];
  const allMembers = data?.members ?? [];

  return (
    <>
      <PageHeader
        title="People & Rooms"
        subtitle="Manage who can join each shared budget room."
      />

      {/* Accounts */}
      <Panel className="mb-6 border border-border">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-card-foreground">Accounts</h2>
            <p className="text-sm text-muted-foreground">
              Registered users and their roles
            </p>
          </div>
          <span className="ml-auto rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">
            {people.length}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {people.map((person: any) => (
            <div
              key={person.id}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-secondary/60"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/15 text-secondary">
                {person.role === "admin" ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {person.full_name || "Unnamed user"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.email}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  person.role === "admin"
                    ? "bg-secondary/20 text-secondary"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {person.role}
              </span>
            </div>
          ))}

          {!people.length && (
            <p className="py-5 text-center text-sm text-muted-foreground">
              No accounts found.
            </p>
          )}
        </div>
      </Panel>

      {/* Budget room membership */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1.5 rounded-full bg-secondary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Room memberships
            </h2>
            <p className="text-sm text-muted-foreground">
              Add or remove people from shared budgets.
            </p>
          </div>
        </div>

        {budgets.map((budget: any) => {
          const members = allMembers.filter(
            (member: any) =>
              member.budget_id === budget.id && !member.removed_at,
          );

          const memberIds = new Set(
            members.map((member: any) => member.user_id),
          );

          const availablePeople = people.filter(
            (person: any) => !memberIds.has(person.id),
          );

          return (
            <Panel
              key={budget.id}
              className="border border-border transition-colors hover:border-secondary/60"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-bold text-card-foreground">
                      {budget.name}
                    </h3>

                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                      {budget.status}
                    </span>
                  </div>

                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    Room link: /join/{budget.share_code}
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {members.length}{" "}
                    {members.length === 1 ? "member" : "members"}
                  </p>
                </div>

                <form
                  className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-md"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const userId = selection[budget.id];
                    if (userId) void addMember(budget.id, userId);
                  }}
                >
                  <select
                    aria-label={`Select person for ${budget.name}`}
                    className={input}
                    value={selection[budget.id] ?? ""}
                    onChange={(event) =>
                      setSelection((current) => ({
                        ...current,
                        [budget.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Add person…</option>
                    {availablePeople.map((person: any) => (
                      <option key={person.id} value={person.id}>
                        {person.full_name || person.email}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="unstyled"
                    type="submit"
                    disabled={!selection[budget.id]}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-95 disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add
                  </Button>
                </form>
              </div>

              <div className="mt-5 space-y-3 border-t border-border pt-4">
                {members.length ? (
                  members.map((member: any) => {
                    const person = people.find(
                      (item: any) => item.id === member.user_id,
                    );

                    return (
                      <div
                        key={member.id}
                        className="flex min-w-0 items-center gap-3 rounded-xl bg-muted/60 p-3"
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                          <UserRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {person?.full_name || "User"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {person?.email || "Email unavailable"}
                          </p>
                        </div>

                        <Button
                          variant="unstyled"
                          onClick={() => void removeMember(member.id)}
                          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <UserMinus className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    No members yet. People can join using the room link.
                  </p>
                )}
              </div>
            </Panel>
          );
        })}

        {!budgets.length && (
          <Panel>
            <p className="text-sm text-muted-foreground">
              No budget rooms found. Create a room before assigning members.
            </p>
          </Panel>
        )}
      </div>
    </>
  );
}