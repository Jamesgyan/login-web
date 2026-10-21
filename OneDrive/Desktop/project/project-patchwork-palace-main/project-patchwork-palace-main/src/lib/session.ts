import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "user";

export async function getRole(userId: string): Promise<Role> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  return data?.some((r) => r.role === "admin") ? "admin" : "user";
}

// Default currency is Indian Rupee.
let currentCurrency = "INR";

export function setCurrency(currency: string) {
  try {
    // Validate that the currency code is supported.
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    });

    currentCurrency = currency;
  } catch {
    currentCurrency = "INR";
  }
}

export function money(
  n: number | string | null | undefined,
  currency?: string,
): string {
  const selectedCurrency = currency || currentCurrency;
  const amount = Number(n ?? 0);

  return new Intl.NumberFormat(
    selectedCurrency === "INR" ? "en-IN" : "en-US",
    {
      style: "currency",
      currency: selectedCurrency,
      maximumFractionDigits: 2,
    },
  ).format(Number.isFinite(amount) ? amount : 0);
}
