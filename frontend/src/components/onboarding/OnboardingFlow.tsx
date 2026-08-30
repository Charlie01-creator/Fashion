"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClothingCategories, type ClothingCategory } from "@fashion-platform/shared";
import { OutfitOccasions, type OutfitOccasion, type OutfitDTO } from "@fashion-platform/shared";
import { styleApi } from "@/lib/style-api";
import { clothingApi } from "@/lib/clothing-api";
import { outfitApi } from "@/lib/outfit-api";
import { Dropzone, DROPZONE_ACCEPTED_TYPES, DROPZONE_MAX_SIZE_MB } from "@/components/wardrobe/Dropzone";
import { Button } from "@/components/ui/Button";

const STYLE_OPTIONS = [
  "Minimalist",
  "Classic",
  "Streetwear",
  "Bohemian",
  "Preppy",
  "Edgy",
  "Romantic",
  "Athleisure",
];

const STEPS = ["Your style", "First piece", "First look"] as const;

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Guided first-run flow: style preferences -> first wardrobe upload ->
 * first generated outfit. Every step calls a real, already-existing
 * endpoint (styleApi.updatePreferences, clothingApi.upload+create,
 * outfitApi.generate) — this is a guided path through the product, not a
 * separate onboarding-specific backend.
 *
 * Each step can be skipped individually as well as the whole flow — an
 * onboarding sequence that blocks someone who just wants to explore is
 * worse than no onboarding at all.
 */
export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);

  // --- Step 1: style preferences ---
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [savingStyles, setSavingStyles] = useState(false);

  // --- Step 2: first upload ---
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<ClothingCategory>("top");
  const [color, setColor] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  // --- Step 3: first outfit ---
  const [occasion, setOccasion] = useState<OutfitOccasion>("casual");
  const [generatedOutfit, setGeneratedOutfit] = useState<OutfitDTO | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function toggleStyle(style: string) {
    setSelectedStyles((current) =>
      current.includes(style) ? current.filter((s) => s !== style) : [...current, style]
    );
  }

  async function handleStyleContinue() {
    if (selectedStyles.length === 0) {
      setStep(1);
      return;
    }
    setSavingStyles(true);
    try {
      await styleApi.updatePreferences({ preferredStyles: selectedStyles });
    } catch {
      // Non-blocking: preferences can be set later from Style Profile.
      // Onboarding's job is momentum, not being a second form-validation gate.
    } finally {
      setSavingStyles(false);
      setStep(1);
    }
  }

  function handleFileSelected(candidate: File) {
    setUploadError(null);
    if (!DROPZONE_ACCEPTED_TYPES.includes(candidate.type)) {
      setUploadError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (candidate.size > DROPZONE_MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`That image is over ${DROPZONE_MAX_SIZE_MB}MB. Try a smaller file.`);
      return;
    }
    setFile(candidate);
    setPreviewUrl(URL.createObjectURL(candidate));
  }

  async function handleUploadContinue() {
    if (!file || !color.trim()) {
      setUploadError(!file ? "Add a photo to continue." : "Give it a color.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await clothingApi.uploadImage(file);
      await clothingApi.createItem({
        imageUrl: uploaded.url,
        imageKey: uploaded.key,
        category,
        color: color.trim(),
        season: "all_season",
        tags: [],
      });
      setHasUploaded(true);
      setStep(2);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't save this item. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const result = await outfitApi.generate({ occasion });
      setGeneratedOutfit(result.outfits[0] ?? null);
    } catch (err) {
      setGenerateError(
        err instanceof Error
          ? err.message
          : "Couldn't generate a look yet — AI analysis on your first piece may still be running. Try again from AI Stylist in a moment."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome onboarding"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-sm border border-bone/10 bg-bone"
      >
        {/* Progress header — garment-label style step markers. */}
        <div className="flex items-center justify-between border-b border-stone px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] transition-colors ${
                    i === step
                      ? "bg-ink text-bone"
                      : i < step
                        ? "bg-brass-500 text-bone"
                        : "border border-stone text-ink/40"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={`hidden font-mono text-[10px] uppercase tracking-wide sm:inline ${i === step ? "text-ink" : "text-ink/40"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onSkip}
            className="font-mono text-[10px] uppercase tracking-widest text-ink/40 underline underline-offset-2 hover:text-ink/70"
          >
            Skip for now
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-8 sm:px-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="styles" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                <p className="font-mono text-xs uppercase tracking-widest text-brass-600">Step 1 of 3</p>
                <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">What's your style?</h2>
                <p className="mt-2 text-sm text-ink/60">
                  Pick as many as feel right — this shapes your first recommendations. You can refine it
                  anytime from Style Profile.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((styleOption) => {
                    const isSelected = selectedStyles.includes(styleOption);
                    return (
                      <button
                        key={styleOption}
                        type="button"
                        onClick={() => toggleStyle(styleOption)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          isSelected
                            ? "border-ink bg-ink text-bone"
                            : "border-stone bg-white text-ink/70 hover:border-ink/40"
                        }`}
                      >
                        {styleOption}
                      </button>
                    );
                  })}
                </div>
                <Button onClick={handleStyleContinue} isLoading={savingStyles} className="mt-8 w-full">
                  Continue
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="upload" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                <p className="font-mono text-xs uppercase tracking-widest text-brass-600">Step 2 of 3</p>
                <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">Add your first piece</h2>
                <p className="mt-2 text-sm text-ink/60">
                  One item is enough to get started — a clear photo works best, but any photo will do.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Dropzone
                    file={file}
                    previewUrl={previewUrl}
                    onFileSelected={handleFileSelected}
                    onClear={() => {
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                  />
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[11px] uppercase tracking-wide text-ink/60">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ClothingCategory)}
                        className="rounded-sm border border-stone bg-white px-3.5 py-2.5 text-sm capitalize outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                      >
                        {ClothingCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[11px] uppercase tracking-wide text-ink/60">Color</label>
                      <input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="e.g. Charcoal, Ivory, Sage"
                        className="rounded-sm border border-stone bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                      />
                    </div>
                  </div>
                </div>

                {uploadError && (
                  <p className="mt-3 text-sm text-clay" role="alert">
                    {uploadError}
                  </p>
                )}

                <Button onClick={handleUploadContinue} isLoading={isUploading} className="mt-6 w-full">
                  Save and continue
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="generate" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                <p className="font-mono text-xs uppercase tracking-widest text-brass-600">Step 3 of 3</p>
                <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">See your first AI look</h2>

                {!generatedOutfit ? (
                  <>
                    <p className="mt-2 text-sm text-ink/60">
                      {hasUploaded
                        ? "Your piece is being analyzed. Pick an occasion and let the stylist put together a first look."
                        : "Pick an occasion to generate a look from your wardrobe."}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {OutfitOccasions.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setOccasion(o)}
                          className={`rounded-full border px-4 py-2 text-sm capitalize transition-colors ${
                            occasion === o ? "border-ink bg-ink text-bone" : "border-stone bg-white text-ink/70 hover:border-ink/40"
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    {generateError && (
                      <p className="mt-3 text-sm text-clay" role="alert">
                        {generateError}
                      </p>
                    )}
                    <Button onClick={handleGenerate} isLoading={isGenerating} className="mt-6 w-full">
                      Generate my first look
                    </Button>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                    <div className="label-corners rounded-sm border border-brass-400/40 bg-white p-5">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-brass-600">
                        {generatedOutfit.occasion} · {Math.round(generatedOutfit.confidence * 100)}% match
                      </p>
                      <p className="mt-2 font-display text-lg text-ink">{generatedOutfit.styleExplanation}</p>
                      <p className="mt-1 text-sm text-ink/60">{generatedOutfit.reasoning}</p>
                    </div>
                    <Button onClick={onComplete} className="mt-6 w-full">
                      Go to my dashboard
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
