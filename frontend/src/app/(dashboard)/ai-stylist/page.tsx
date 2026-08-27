"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { OutfitDTO, OutfitFeedbackAction, OutfitOccasion, WeatherContext } from "@fashion-platform/shared";
import { outfitApi } from "@/lib/outfit-api";
import { ApiClientError } from "@/lib/api";
import { OccasionPicker } from "@/components/stylist/OccasionPicker";
import { WeatherSelector } from "@/components/stylist/WeatherSelector";
import { OutfitResultCard } from "@/components/stylist/OutfitResultCard";
import { StylistLoading } from "@/components/stylist/StylistLoading";
import { Button } from "@/components/ui/Button";

export default function AiStylistPage() {
  const [occasion, setOccasion] = useState<OutfitOccasion | null>(null);
  const [condition, setCondition] = useState<WeatherContext["condition"] | null>(null);

  const [outfits, setOutfits] = useState<OutfitDTO[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<{ id: string; action: OutfitFeedbackAction } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!occasion) return;
    setIsGenerating(true);
    setError(null);
    setOutfits(null);

    try {
      const result = await outfitApi.generate({
        occasion,
        weather: condition ? { condition } : undefined,
      });
      setOutfits(result.outfits);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Something went wrong while styling your look. Try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const previous = outfits;
    setOutfits((current) => (current ? current.filter((o) => o.id !== id) : current));
    try {
      await outfitApi.deleteOutfit(id);
    } catch {
      setOutfits(previous);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleFeedback(id: string, action: OutfitFeedbackAction) {
    setPendingFeedback({ id, action });
    try {
      const updated = await outfitApi.submitFeedback(id, action);
      setOutfits((current) => (current ? current.map((o) => (o.id === id ? updated : o)) : current));
    } catch {
      // Feedback is low-stakes and non-blocking — silently let the user try again rather than showing an alarming error for a "like" button.
    } finally {
      setPendingFeedback(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-brass-600">AI Stylist</p>
        <h1 className="mt-2 font-display text-4xl italic text-ink">What are you dressing for?</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
          Your stylist works entirely from pieces already in your wardrobe — no shopping required.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-10 rounded-sm border border-stone bg-white p-6"
      >
        <OccasionPicker value={occasion} onChange={setOccasion} />

        <div className="mt-6 border-t border-dashed border-stone pt-5">
          <WeatherSelector value={condition} onChange={setCondition} />
        </div>

        <div className="mt-6 flex justify-center">
          <Button onClick={handleGenerate} disabled={!occasion} isLoading={isGenerating} className="px-8">
            Generate outfit
          </Button>
        </div>
      </motion.div>

      <div className="mt-10">
        <AnimatePresence mode="wait">
          {isGenerating && (
            <motion.div key="loading" exit={{ opacity: 0 }}>
              <StylistLoading />
            </motion.div>
          )}
        </AnimatePresence>

        {error && !isGenerating && (
          <div className="rounded-sm border border-clay/30 bg-clay/5 px-4 py-4 text-center text-sm text-clay">
            <p>{error}</p>
            <Link href="/upload" className="mt-2 inline-block underline">
              Add more pieces to your wardrobe
            </Link>
          </div>
        )}

        {outfits && !isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-6 sm:grid-cols-2"
          >
            {outfits.map((outfit, index) => (
              <OutfitResultCard
                key={outfit.id}
                outfit={outfit}
                index={index}
                onRemove={handleRemove}
                onFeedback={handleFeedback}
                isRemoving={removingId === outfit.id}
                pendingFeedback={pendingFeedback?.id === outfit.id ? pendingFeedback.action : null}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
