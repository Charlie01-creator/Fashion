"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
  activePath: string;
  userName: string;
  onLogout: () => void;
}

/**
 * Full-screen mobile nav drawer. Separate component (not a media-query
 * variant of the desktop pill nav) because a hamburger drawer and an
 * inline pill list are different interaction patterns, not the same
 * markup at different widths — trying to share one component for both
 * tends to produce compromises in each.
 */
export function MobileNav({ isOpen, onClose, links, activePath, userName, onLogout }: MobileNavProps) {
  // Lock body scroll while the drawer is open — otherwise the page behind
  // it scrolls along with the drawer's own content on touch devices.
  useEffect(() => {
    if (isOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-ink text-bone sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="flex items-center justify-between border-b border-bone/15 px-6 py-4">
            <span className="font-display text-lg italic">Fashion Platform</span>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/25 text-bone/80 transition-colors hover:border-bone/60 hover:text-bone"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col px-6 py-4">
            {links.map((link, i) => {
              const isActive = activePath === link.href;
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.03 * i }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={`flex items-center justify-between border-b border-bone/10 py-4 font-display text-2xl transition-colors ${
                      isActive ? "text-brass-400" : "text-bone/90 hover:text-brass-400"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-brass-400/80">
                        Now viewing
                      </span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-bone/15 px-6 py-5 font-mono text-xs">
            <span className="text-bone/60">Signed in as {userName}</span>
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="text-bone underline underline-offset-2"
            >
              Log out
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
