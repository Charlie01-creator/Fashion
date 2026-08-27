"use client";

import { motion } from "framer-motion";
import { OutfitOccasions, type OutfitOccasion } from "@fashion-platform/shared";

const OCCASION_COPY: Record<OutfitOccasion, { label: string; note: string }> = {
  casual: { label: "Casual", note: "Everyday, relaxed" },
  formal: { label: "Formal", note: "Polished, refined" },
  party: { label: "Party", note: "Evening, statement" },
  work: { label: "Work", note: "Sharp, professional" },
  wedding: { label: "Wedding", note: "Elevated, guest-ready" },
};

interface OccasionPickerProps {
  value: OutfitOccasion | null;
  onChange: (occasion: OutfitOccasion) => void;
}

export function OccasionPicker({ value, onChange }: OccasionPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {OutfitOccasions.map((occasion) => {
        const isActive = value === occasion;
        const copy = OCCASION_COPY[occasion];
        return (
          <motion.button
            key={occasion}
            type="button"
            onClick={() => onChange(occasion)}
            whileTap={{ scale: 0.97 }}
            className={`flex flex-col items-start gap-1 rounded-sm border px-4 py-3.5 text-left transition-colors ${
              isActive ? "border-ink bg-ink text-bone" : "border-stone bg-white hover:border-ink/40"
            }`}
          >
            <span className="font-display text-lg capitalize">{copy.label}</span>
            <span className={`font-mono text-[10px] uppercase tracking-wide ${isActive ? "text-bone/60" : "text-ink/40"}`}>
              {copy.note}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
