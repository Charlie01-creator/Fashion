"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/upload", label: "Add piece" },
  { href: "/ai-stylist", label: "AI Stylist" },
  { href: "/style-profile", label: "Style DNA" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Client-side guard as a UX convenience (fast redirect, no flash-of-content
  // issues from SSR mismatches). The real security boundary is the backend:
  // every protected API route re-validates the JWT independently via
  // requireAuth — this redirect alone is not what makes /dashboard "secure".
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-bone text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-bone">
      <header className="sticky top-0 z-10 border-b border-stone bg-bone/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="font-display text-lg italic text-ink">Fashion Platform</span>
            <nav className="flex gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                      isActive ? "bg-ink text-bone" : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <span className="text-ink/60">{user.name}</span>
            <button onClick={() => logout()} className="text-ink underline underline-offset-2">
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl p-6">{children}</div>
    </div>
  );
}
