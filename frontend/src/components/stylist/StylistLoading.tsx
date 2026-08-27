"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGES = ["Reading your wardrobe…", "Weighing color and season…", "Curating your look…"];

export function StylistLoading() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-stone bg-white/50 py-20">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-brass-500"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="font-mono text-xs uppercase tracking-widest text-ink/50"
        >
          {MESSAGES[messageIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
