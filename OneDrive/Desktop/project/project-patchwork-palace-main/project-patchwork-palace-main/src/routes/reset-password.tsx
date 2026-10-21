import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: "Reset password — Budget Manager" },
      { name: "description", content: "Set a new password for your Budget Manager account." },
      { property: "og:title", content: "Reset password — Budget Manager" },
      { property: "og:description", content: "Set a new password for your Budget Manager account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMsg("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg(error.message);
    else navigate({ to: "/dashboard", replace: true });
  }

  const input = "h-12 w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="public-auth grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><KeyRound className="h-7 w-7" /></div>
          <h1 className="text-2xl font-bold">Set a new password</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className={input} type="password" placeholder="New password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className={input} type="password" placeholder="Confirm password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          <Button variant="unstyled" disabled={busy} className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save password"}</Button>
        </form>
      </div>
    </div>
  );
}
