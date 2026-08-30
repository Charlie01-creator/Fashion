"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { MobileNav } from "@/components/layout/MobileNav";

const NAV_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/wardrobe", label: "My Wardrobe" },
  { href: "/ai-stylist", label: "AI Stylist" },
  { href: "/style-profile", label: "Style Profile" },
  { href: "/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Client-side guard as a UX convenience (fast redirect, no flash-of-content
  // issues from SSR mismatches). The real security boundary is the backend:
  // every protected API route re-validates the JWT independently via
  // requireAuth — this redirect alone is not what makes /dashboard "secure".
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Close the mobile drawer on route change so navigating never leaves it
  // open over the new page.
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bone font-mono text-xs uppercase tracking-widest text-ink/40">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone">
      <header className="sticky top-0 z-40 border-b border-stone bg-bone/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-display text-lg italic text-ink">
              Fashion Platform
            </Link>
            {/* Desktop pill nav — hidden below sm, replaced by the hamburger drawer there. */}
            <nav className="hidden gap-1 sm:flex">
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

          <div className="hidden items-center gap-4 font-mono text-xs sm:flex">
            <span className="text-ink/60">{user.name}</span>
            <button onClick={() => logout()} className="text-ink underline underline-offset-2">
              Log out
            </button>
          </div>

          {/* Hamburger — only below sm. */}
          <button
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone text-ink transition-colors hover:border-ink/40 sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        links={NAV_LINKS}
        activePath={pathname}
        userName={user.name}
        onLogout={logout}
      />

      <div className="mx-auto max-w-6xl p-6">{children}</div>
    </div>
  );
}
