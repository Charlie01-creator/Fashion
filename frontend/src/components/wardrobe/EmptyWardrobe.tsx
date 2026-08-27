"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface EmptyWardrobeProps {
  /** True when a category filter is active but has no matches — distinct message from a truly empty wardrobe. */
  isFiltered?: boolean;
}

export function EmptyWardrobe({ isFiltered }: EmptyWardrobeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center rounded-sm border border-dashed border-stone bg-white/50 px-6 py-20 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brass-400/50 text-brass-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 3h6l1 2h3a1 1 0 011 1v1a4 4 0 01-4 4h-1v8a2 2 0 01-2 2h-4a2 2 0 01-2-2v-8H6a4 4 0 01-4-4V6a1 1 0 011-1h3l1-2z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isFiltered ? (
        <>
          <h3 className="mt-5 font-display text-xl text-ink">Nothing in this category yet</h3>
          <p className="mt-1.5 max-w-xs text-sm text-ink/60">
            Try a different filter, or add a piece that belongs here.
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-5 font-display text-xl text-ink">Your wardrobe is empty</h3>
          <p className="mt-1.5 max-w-xs text-sm text-ink/60">
            Upload your first piece to start building your digital closet.
          </p>
        </>
      )}

      <Link
        href="/upload"
        className="mt-6 rounded-full bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-bone transition-colors hover:bg-brass-600"
      >
        Add a piece
      </Link>
    </motion.div>
  );
}
