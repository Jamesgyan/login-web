import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getRole } from "@/lib/session";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const role = await getRole(data.user.id);
    return { user: data.user, role };
  },
  component: Layout,
});

function Layout() {
  const { role, user } = Route.useRouteContext();
  return (
    <AppShell role={role} email={user.email ?? ""}>
      <Outlet />
    </AppShell>
  );
}
