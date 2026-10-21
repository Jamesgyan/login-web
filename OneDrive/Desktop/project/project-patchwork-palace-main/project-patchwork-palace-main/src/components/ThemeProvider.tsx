import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("budget-manager-theme");
      const initial = stored === "dark" || stored === "light" ? stored : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(initial);
      document.documentElement.classList.toggle("dark", initial === "dark");
    } catch { /* Use the default appearance when storage is unavailable. */ }
  }, []);
  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("budget-manager-theme", next); } catch { /* Theme still works without storage. */ }
  }
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";
  return <Button variant="outline" size="icon" type="button" onClick={toggle} aria-label={label} title={label} className="theme-toggle shrink-0">{theme === "light" ? <Moon /> : <Sun />}</Button>;
}

export function PublicThemeToggle() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  if (!(path === "/auth" || path === "/reset-password" || path.startsWith("/join/"))) return null;
  return <div className="fixed right-4 top-4 z-30 print:hidden"><ThemeToggle /></div>;
}