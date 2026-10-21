import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Budget Manager" },
      { name: "description", content: "Manage settings in Budget Manager." },
      { property: "og:title", content: "Settings — Budget Manager" },
      { property: "og:description", content: "Manage settings in Budget Manager." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const CURRENCIES = [
  ["INR", "Indian Rupee (₹)"],
  ["USD", "US Dollar ($)"],
  ["EUR", "Euro (€)"],
  ["GBP", "British Pound (£)"],
  ["AED", "UAE Dirham (د.إ)"],
  ["AUD", "Australian Dollar (A$)"],
  ["CAD", "Canadian Dollar (C$)"],
  ["SGD", "Singapore Dollar (S$)"],
  ["JPY", "Japanese Yen (¥)"],
  ["CNY", "Chinese Yuan (¥)"],
  ["CHF", "Swiss Franc (CHF)"],
  ["NZD", "New Zealand Dollar (NZ$)"],
  ["SAR", "Saudi Riyal (﷼)"],
  ["QAR", "Qatari Riyal (ر.ق)"],
  ["ZAR", "South African Rand (R)"],
  ["BRL", "Brazilian Real (R$)"],
  ["MXN", "Mexican Peso (MX$)"],
  ["KRW", "South Korean Won (₩)"],
  ["HKD", "Hong Kong Dollar (HK$)"],
  ["THB", "Thai Baht (฿)"],
  ["IDR", "Indonesian Rupiah (Rp)"],
  ["MYR", "Malaysian Ringgit (RM)"],
  ["PHP", "Philippine Peso (₱)"],
  ["BDT", "Bangladeshi Taka (৳)"],
  ["PKR", "Pakistani Rupee (₨)"],
  ["LKR", "Sri Lankan Rupee (Rs)"],
  ["NPR", "Nepalese Rupee (रू)"],
  ["NGN", "Nigerian Naira (₦)"],
  ["EGP", "Egyptian Pound (E£)"],
  ["KES", "Kenyan Shilling (KSh)"],
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .order("key");

      if (error) throw error;
      return data ?? [];
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (data) {
      const settings = Object.fromEntries(
        data.map((s) => [s.key, s.value]),
      );

      // Default currency for new or unconfigured installations.
      if (!settings["currency"]) settings["currency"] = "INR";

      setValues(settings);
    }
  }, [data]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setErrorMessage("");

    const entries = Object.entries(values).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    // Ensure currency is saved even if the setting did not previously exist.
    if (!entries.some((entry) => entry.key === "currency")) {
      entries.push({
        key: "currency",
        value: "INR",
        updated_at: new Date().toISOString(),
      });
    }

    const { error } = await supabase
      .from("settings")
      .upsert(entries, { onConflict: "key" });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await qc.invalidateQueries({ queryKey: ["settings"] });
    setSaved(true);
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Settings" subtitle="General app settings" />
        <Panel>Loading settings...</Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your budget preferences"
      />

      <Panel className="space-y-5">
        {Object.entries(values)
          .filter(([key]) => key !== "currency")
          .map(([key, value]) => (
            <label key={key} className="block">
              <span className="text-sm font-medium capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <input
                className="mt-1 h-12 w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring"
                value={value}
                onChange={(e) => {
                  setSaved(false);
                  setValues({ ...values, [key]: e.target.value });
                }}
              />
            </label>
          ))}

        <label className="block">
          <span className="text-sm font-medium">Currency</span>
          <select
            className="mt-1 h-12 w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring"
            value={values["currency"] || "INR"}
            onChange={(e) => {
              setSaved(false);
              setValues({ ...values, currency: e.target.value });
            }}
          >
            {CURRENCIES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted-foreground">
            Select the currency used for displaying budget amounts.
          </span>
        </label>

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        <Button
          variant="unstyled"
          disabled={saving}
          onClick={save}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground md:w-auto md:px-8"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
        </Button>
      </Panel>
    </>
  );
}
