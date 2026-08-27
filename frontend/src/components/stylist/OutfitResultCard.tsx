"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { OutfitDTO, OutfitFeedbackAction } from "@fashion-platform/shared";
import { ConfidenceMeter } from "./ConfidenceMeter";

interface OutfitResultCardProps {
  outfit: OutfitDTO;
  index: number;
  onRemove: (id: string) => void;
  onFeedback: (id: string, action: OutfitFeedbackAction) => void;
  isRemoving?: boolean;
  pendingFeedback?: OutfitFeedbackAction | null;
}

export function OutfitResultCard({
  outfit,
  index,
  onRemove,
  onFeedback,
  isRemoving,
  pendingFeedback,
}: OutfitResultCardProps) {
  const { latestReaction, saved, wornCount } = outfit.feedback;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: "easeOut" }}
      className="overflow-hidden rounded-sm border border-stone bg-white shadow-sm"
    >
      <div className="grid grid-cols-3 gap-px bg-stone sm:grid-cols-4">
        {outfit.items.map((outfitItem) => (
          <Link
            key={outfitItem.clothingItem.id}
            href={`/wardrobe/${outfitItem.clothingItem.id}`}
            className="group relative aspect-square overflow-hidden bg-bone"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={outfitItem.clothingItem.imageUrl}
              alt={`${outfitItem.clothingItem.color} ${outfitItem.clothingItem.category}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {outfitItem.role && (
              <span className="absolute bottom-1 left-1 rounded-full bg-ink/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-bone backdrop-blur">
                {outfitItem.role}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-brass-600">
            {outfit.occasion} look
          </span>
          <ConfidenceMeter confidence={outfit.confidence} />
        </div>

        <p className="mt-3 font-display text-lg leading-snug text-ink">{outfit.reasoning}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">{outfit.styleExplanation}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-stone pt-4">
          <FeedbackButton
            label="Like"
            active={latestReaction === "LIKE"}
            isPending={pendingFeedback === "LIKE"}
            onClick={() => onFeedback(outfit.id, "LIKE")}
          />
          <FeedbackButton
            label="Dislike"
            active={latestReaction === "DISLIKE"}
            isPending={pendingFeedback === "DISLIKE"}
            onClick={() => onFeedback(outfit.id, "DISLIKE")}
          />
          <FeedbackButton
            label="Save"
            active={saved}
            isPending={pendingFeedback === "SAVED"}
            onClick={() => onFeedback(outfit.id, "SAVED")}
          />
          <FeedbackButton
            label={wornCount > 0 ? `Worn ${wornCount}×` : "Mark worn"}
            active={wornCount > 0}
            isPending={pendingFeedback === "WORN"}
            onClick={() => onFeedback(outfit.id, "WORN")}
          />
        </div>

        <button
          onClick={() => onRemove(outfit.id)}
          disabled={isRemoving}
          className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink/40 underline hover:text-clay disabled:opacity-40"
        >
          {isRemoving ? "Removing…" : "Remove this look"}
        </button>
      </div>
    </motion.article>
  );
}

function FeedbackButton({
  label,
  active,
  isPending,
  onClick,
}: {
  label: string;
  active: boolean;
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors disabled:opacity-50 ${
        active ? "border-ink bg-ink text-bone" : "border-stone text-ink/60 hover:border-ink/40"
      }`}
    >
      {label}
    </button>
  );
}
