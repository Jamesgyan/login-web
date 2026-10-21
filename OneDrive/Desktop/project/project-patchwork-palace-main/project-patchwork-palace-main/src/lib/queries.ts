import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const q = async <T,>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) => {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
};

export const budgetsQuery = queryOptions({
  queryKey: ["budgets"],
  queryFn: () => q(supabase.from("budgets").select("*").order("created_at", { ascending: false })),
});
export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: () => q(supabase.from("categories").select("*").order("name")),
});
export const expensesQuery = queryOptions({
  queryKey: ["expenses"],
  queryFn: () => q(supabase.from("expenses").select("*, categories(name)").order("date", { ascending: false })),
});
export const contributionsQuery = queryOptions({
  queryKey: ["contributions"],
  queryFn: () => q(supabase.from("contributions").select("*").order("date", { ascending: false })),
});
export const requestsQuery = queryOptions({
  queryKey: ["requests"],
  queryFn: () => q(supabase.from("requests").select("*").order("created_at", { ascending: false })),
});
export const activityQuery = queryOptions({
  queryKey: ["activity"],
  queryFn: () => q(supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8)),
});
