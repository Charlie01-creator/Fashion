"use client";

import { motion } from "framer-motion";

interface ConfidenceMeterProps {
  confidence: number; // 0–1
}

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const pct = Math.round(confidence * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-stone/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-brass-500"
        />
      </div>
      <span className="font-mono text-[11px] text-ink/60">{pct}% match</span>
    </div>
  );
}
