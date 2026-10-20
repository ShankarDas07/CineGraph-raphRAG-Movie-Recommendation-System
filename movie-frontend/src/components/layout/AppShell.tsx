import { Activity, Database, LayoutDashboard, Menu, Network, Sparkles, X, type LucideIcon } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PageLoader } from "@/components/common/PageLoader";
import { Button } from "@/components/ui/button";
import { API_DISPLAY_URL } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/ask", label: "Ask the Graph", icon: Sparkles },
  { to: "/index", label: "Indexing", icon: Database },
  { to: "/graph", label: "Graph Stats", icon: Network },
  { to: "/health", label: "System Health", icon: Activity },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-tight">
        <p className="text-lg font-bold">CineGraph</p>
        <p className="text-xs text-muted-foreground">GraphRAG · Movies</p>
      </div>
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu after navigating to another page.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Close the mobile menu with the Escape key.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar (visible from the lg breakpoint up) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r bg-card p-5 lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">API endpoint</p>
          <p className="break-all font-mono">{API_DISPLAY_URL}</p>
        </div>
      </aside>

      {/* Mobile menu drawer */}
      {open ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 border-l bg-card p-5 lg:hidden"
          >
            <div className="flex items-center justify-between">
              <Brand />
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <p className="mt-auto break-all font-mono text-xs text-muted-foreground">{API_DISPLAY_URL}</p>
          </aside>
        </>
      ) : null}

      <div className="lg:pl-64">
        {/* Top bar: brand + menu button on small screens, theme toggle on every screen size */}
        <header className="sticky top-0 z-20 flex items-center border-b bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu className="size-5" />
            </Button>
          </div>
        </header>

        <main>
          <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
