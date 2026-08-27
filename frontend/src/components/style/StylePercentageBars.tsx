"use client";

import { motion } from "framer-motion";

interface StylePercentageBarsProps {
  percentages: Record<string, number>;
}

export function StylePercentageBars({ percentages }: StylePercentageBarsProps) {
  const sorted = Object.entries(percentages)
    .filter(([, pct]) => pct > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-3">
      {sorted.map(([style, pct], index) => (
        <div key={style}>
          <div className="flex items-baseline justify-between">
            <span className="font-display capitalize text-ink">{style}</span>
            <span className="font-mono text-xs text-ink/50">{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, delay: index * 0.08, ease: "easeOut" }}
              className={index === 0 ? "h-full rounded-full bg-ink" : "h-full rounded-full bg-brass-500"}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
