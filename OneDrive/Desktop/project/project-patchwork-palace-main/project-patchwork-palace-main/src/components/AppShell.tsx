import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Wallet,
  Users,
  Inbox,
  BarChart3,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeProvider";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/session";

type Item = { to: string; label: string; icon: LucideIcon };

const adminNav: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/budget", label: "Budget", icon: Wallet },
  { to: "/people", label: "People", icon: Users },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const userNav: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/my-budget", label: "My Budget", icon: Wallet },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

export function AppShell({
  role,
  email,
  children,
}: {
  role: Role;
  email: string;
  children: ReactNode;
}) {
  const nav = role === "admin" ? adminNav : userNav;
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="street-shell min-h-screen bg-background text-foreground md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r-4 border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl border-2 border-sidebar-border bg-primary text-primary-foreground shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold text-sidebar-foreground">
            Budget Manager
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "bg-sidebar-primary !text-sidebar-primary-foreground font-bold",
              }}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border pt-4">
          <div className="mb-4 flex items-center gap-2 px-2">
            <ThemeToggle />
            <NotificationBell />
          </div>

          <p className="truncate px-3 text-xs text-sidebar-foreground/80">
            {email}
          </p>

          <p className="px-3 pt-1 text-xs font-bold capitalize text-primary">
            {role}
          </p>

          <Button
            variant="unstyled"
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
          <span className="font-display text-xl font-bold text-sidebar-foreground">
            Budget Manager
          </span>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />

            <Button
              variant="unstyled"
              onClick={signOut}
              aria-label="Log out"
              className="grid h-11 w-11 place-items-center rounded-xl text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="street-main relative mx-auto min-h-screen max-w-5xl p-4 pb-24 md:p-8 md:pb-8">
          <div className="street-decoration" aria-hidden="true" />
          <div className="relative">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-20 flex border-t-4 border-sidebar-border bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold text-sidebar-foreground/80 transition-colors"
            activeProps={{
              className:
                "!text-primary font-bold bg-sidebar-accent/50",
            }}
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="street-title">{title}</h1>
      {subtitle && (
        <p className="street-subtitle mt-2 text-sm">{subtitle}</p>
      )}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`street-panel bg-card text-card-foreground p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: string;
  tone?: "primary" | "success" | "destructive";
}) {
  const toneCls = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
  }[tone];

  return (
    <Panel>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneCls}`}>{value}</p>
    </Panel>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-success/15 text-success"
      : status === "rejected"
        ? "bg-destructive/15 text-destructive"
        : "bg-warning/20 text-foreground";

  return (
    <span
      className={`street-badge px-3 py-1 text-xs font-semibold capitalize ${cls}`}
    >
      {status}
    </span>
  );
}