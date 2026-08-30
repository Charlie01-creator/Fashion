"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const STEPS = [
  {
    mark: "01",
    title: "Upload your clothes",
    body: "Photograph what's already in your closet. No shopping required — this is about the wardrobe you have.",
  },
  {
    mark: "02",
    title: "Discover your style",
    body: "AI reads color, silhouette, and pattern across every piece to surface the style that's already yours.",
  },
  {
    mark: "03",
    title: "Let AI create your looks",
    body: "Get outfit pairings built from your own wardrobe — for work, for weekends, for the wedding you forgot about.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ink text-bone">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-28 sm:pt-36">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-xs uppercase tracking-[0.3em] text-brass-400"
          >
            An AI stylist for the wardrobe you already own
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-6 font-display text-4xl leading-[1.05] sm:text-6xl"
          >
            Your wardrobe,
            <br />
            <span className="italic text-brass-400">understood.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="mx-auto mt-6 max-w-md text-bone/65"
          >
            Upload clothes. Discover your style. Let AI create your looks — all from what's already
            hanging in your closet.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.34 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/register"
              className="rounded-full bg-brass-500 px-6 py-3 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-brass-400"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-bone/25 px-6 py-3 font-mono text-xs uppercase tracking-wide text-bone transition-colors hover:border-bone/60"
            >
              Sign in
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Three-step value prop — the sequence is real (upload -> analyze -> style),
          so numbered marks encode actual order here, not decoration. */}
      <section className="border-t border-bone/10 px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.mark}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="label-corners rounded-sm border border-bone/10 px-6 py-8"
            >
              <span className="font-mono text-xs text-brass-400">{step.mark}</span>
              <h3 className="mt-3 font-display text-xl text-bone">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bone/60">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-bone/10 px-6 py-8 text-center font-mono text-[11px] uppercase tracking-widest text-bone/35">
        Fashion Platform
      </footer>
    </main>
  );
}
