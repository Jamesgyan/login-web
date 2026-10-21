import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: "Budget Manager — Track shared budgets" },
      { name: "description", content: "Manage budgets, expenses, contributions and requests in one simple app." },
      { property: "og:title", content: "Budget Manager" },
      { property: "og:description", content: "Manage budgets, expenses, contributions and requests in one simple app." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
  }, [navigate]);
  return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
}
