"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ClothingItemDTO } from "@fashion-platform/shared";
import { AiStatusBadge } from "./AiStatusBadge";

interface GarmentCardProps {
  item: ClothingItemDTO;
  index: number;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

/**
 * The signature element of the wardrobe UI: each garment is presented like
 * a physical clothing tag — a catalog code in mono type, a dashed stitch
 * line, and a slight swing on hover, as if it were hanging on a rail.
 */
export function GarmentCard({ item, index, onDelete, isDeleting }: GarmentCardProps) {
  const code = `NO. ${String(index + 1).padStart(3, "0")}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4, rotate: -0.6 }}
      className="group relative flex flex-col overflow-hidden rounded-sm border border-stone bg-white shadow-sm transition-shadow hover:shadow-lg"
    >
      <Link href={`/wardrobe/${item.id}`} className="relative aspect-[4/5] w-full overflow-hidden bg-bone">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={`${item.color} ${item.category}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />

        <div className="absolute left-2 top-2">
          <AiStatusBadge status={item.aiStatus} />
        </div>
      </Link>

      <button
        onClick={() => onDelete(item.id)}
        disabled={isDeleting}
        aria-label="Remove item"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-bone opacity-0 backdrop-blur transition-opacity duration-200 hover:bg-clay group-hover:opacity-100 disabled:opacity-40"
      >
        {isDeleting ? (
          <span className="h-3 w-3 animate-pulse rounded-full bg-bone" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <Link href={`/wardrobe/${item.id}`} className="border-t border-dashed border-stone px-3.5 py-3">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-brass-600">
          <span>{code}</span>
          <span>{item.category}</span>
        </div>

        <h3 className="mt-1.5 font-display text-base capitalize text-ink">
          {item.color} {item.style ? `· ${item.style}` : ""}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-moss/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-moss">
            {item.season.replace("_", " ")}
          </span>
          {item.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-stone px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/60"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </motion.article>
  );
}
