import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { Chrome } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — Budget Manager" },
      { name: "description", content: "Sign in or create your Budget Manager account." },
      { property: "og:title", content: "Sign in — Budget Manager" },
      { property: "og:description", content: "Sign in or create your Budget Manager account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const redirect = localStorage.getItem("budgetJoinRedirect");
        if (redirect) { localStorage.removeItem("budgetJoinRedirect"); window.location.assign(redirect); }
        else navigate({ to: "/dashboard", replace: true });
      }
    });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else navigate({ to: "/dashboard", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) setMsg(error.message);
      else if (data.session) navigate({ to: "/dashboard", replace: true });
      else { const r = await supabase.auth.signInWithPassword({ email, password }); if (r.error) setMsg(r.error.message); else navigate({ to: "/dashboard", replace: true }); }
    }
    setBusy(false);
  }

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setMsg(error ? error.message : "Check your email for a link to reset your password.");
    setBusy(false);
  }


  async function signInWithGoogle() {
    setGoogleBusy(true);
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) { setMsg(result.error.message ?? String(result.error)); setGoogleBusy(false); return; }
    if (result.redirected) return;
    setGoogleBusy(false);
    window.location.assign("/auth");
  }

  const input = "h-12 w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="public-auth grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Budget Manager</h1>
          <p className="text-sm text-muted-foreground">{mode === "in" ? "Welcome back" : "Create your account"}</p>
        </div>
        {mode === "forgot" ? (
          <form onSubmit={sendReset} className="space-y-3">
            <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
            <Button variant="unstyled" disabled={busy} className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Sending…" : "Send reset link"}</Button>
          </form>
        ) : (
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && <input className={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />}
          <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={input} type="password" placeholder="Password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {mode === "in" && <Button variant="unstyled" type="button" onClick={() => { setMode("forgot"); setMsg(null); }} className="text-sm font-medium text-primary">Forgot password?</Button>}
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          <Button variant="unstyled" disabled={busy} className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        )}
        {mode === "in" && <Button variant="unstyled" onClick={signInWithGoogle} disabled={googleBusy} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border font-semibold disabled:opacity-50"><Chrome className="h-5 w-5" /> {googleBusy ? "Opening Google…" : "Continue with Google"}</Button>}
        <Button variant="unstyled" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-4 h-11 w-full text-sm font-medium text-primary">
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </Button>
      </div>
    </div>
  );
}
