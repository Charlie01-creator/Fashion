"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { StyleProfileDTO } from "@fashion-platform/shared";
import { styleApi } from "@/lib/style-api";
import { ApiClientError } from "@/lib/api";
import { StylePercentageBars } from "@/components/style/StylePercentageBars";
import { ColorPalette } from "@/components/style/ColorPalette";
import { StylistLoading } from "@/components/stylist/StylistLoading";
import { Button } from "@/components/ui/Button";

export default function StyleProfilePage() {
  const [profile, setProfile] = useState<StyleProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    styleApi
      .getProfile()
      .then(setProfile)
      .catch((err) => {
        setProfile(null);
        // A 404 just means "not generated yet" — the normal first-visit
        // state, not an error worth surfacing. Anything else (network,
        // 500) gets a real message so it's not silently indistinguishable
        // from "you haven't generated one yet".
        if (!(err instanceof ApiClientError) || err.status !== 404) {
          setLoadError("Couldn't load your style profile. Try refreshing.");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await styleApi.generateProfile();
      setProfile(result);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Couldn't read your style right now. Try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return <div className="py-20 text-center text-ink/50">Loading…</div>;
  }

  if (isGenerating) {
    return (
      <div className="mx-auto max-w-2xl">
        <StylistLoading />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-brass-600">Style DNA</p>
        <h1 className="mt-2 font-display text-3xl italic text-ink">Your fashion identity, unlocked</h1>
        <p className="mt-3 text-sm text-ink/60">
          Analyze your wardrobe, saved outfits, and reactions to reveal the style patterns you naturally
          gravitate toward.
        </p>
        {(error || loadError) && <p className="mt-3 text-sm text-clay">{error ?? loadError}</p>}
        <Button onClick={handleGenerate} className="mt-6">
          Reveal my Style DNA
        </Button>
      </div>
    );
  }

  const topStyles = Object.entries(profile.stylePercentages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([style]) => style);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-brass-600">Your fashion identity</p>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 font-display text-4xl italic capitalize text-ink"
        >
          {profile.dominantStyle}
        </motion.h1>
        {topStyles.length === 2 && (
          <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
            You naturally combine <span className="capitalize text-ink">{topStyles[0]}</span> and{" "}
            <span className="capitalize text-ink">{topStyles[1]}</span> styles.
          </p>
        )}
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-ink/40">
          {Math.round(profile.confidenceScore * 100)}% confidence · based on your wardrobe, outfits, and
          feedback
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-sm border border-stone bg-white p-6"
        >
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Style breakdown</p>
          <div className="mt-4">
            <StylePercentageBars percentages={profile.stylePercentages} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-sm border border-stone bg-white p-6"
        >
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Favourite colours</p>
          <div className="mt-4">
            <ColorPalette colors={profile.favouriteColors} />
          </div>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-ink/50">
            Most-worn categories
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.preferredCategories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-stone px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-ink/70"
              >
                {category}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {profile.recommendedImprovements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="mt-6 rounded-sm border border-stone bg-white p-6"
        >
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">
            AI recommendations
          </p>
          <ul className="mt-3 space-y-2.5">
            {profile.recommendedImprovements.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink/75">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-brass-500" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <div className="mt-8 text-center">
        <Button variant="secondary" onClick={handleGenerate} isLoading={isGenerating}>
          Refresh my Style DNA
        </Button>
        {error && <p className="mt-3 text-sm text-clay">{error}</p>}
      </div>
    </div>
  );
}
