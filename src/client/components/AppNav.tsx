import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "@/client/components/AppShell";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/revise", label: "Revise" },
  { to: "/exams", label: "Exams" },
  { to: "/stats", label: "Stats" },
  { to: "/history", label: "History" },
  { to: "/bank", label: "Bank" },
] as const;

/** Every page's frame: the shell with the app's sections. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <AppShell
      nav={
        <nav className="flex min-w-0 items-center gap-3 overflow-x-auto text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:font-medium data-[status=active]:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      }
    >
      {children}
    </AppShell>
  );
}
