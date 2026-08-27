"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ClothingItemDTO } from "@fashion-platform/shared";
import { clothingApi } from "@/lib/clothing-api";
import { AiStatusBadge } from "@/components/wardrobe/AiStatusBadge";
import { Button } from "@/components/ui/Button";

export default function ClothingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<ClothingItemDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await clothingApi.getItem(params.id);
      setItem(data);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Same quiet-polling pattern as the wardrobe grid: pick up the AI result
  // automatically if it's still in progress when this page loads.
  useEffect(() => {
    if (item?.aiStatus !== "PENDING" && item?.aiStatus !== "ANALYZING") return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [item?.aiStatus, load]);

  async function handleRetry() {
    setIsRetrying(true);
    setError(null);
    try {
      const updated = await clothingApi.reanalyze(params.id);
      setItem(updated);
    } catch {
      setError("Retry failed. Try again in a moment.");
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this item from your wardrobe? This can't be undone.")) return;
    try {
      await clothingApi.deleteItem(params.id);
      router.push("/wardrobe");
    } catch {
      setError("Couldn't remove this item. Try again.");
    }
  }

  if (isLoading) {
    return <div className="py-20 text-center text-ink/50">Loading…</div>;
  }

  if (notFound || !item) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-xl text-ink">Item not found</p>
        <Link href="/wardrobe" className="mt-3 inline-block text-sm underline">
          Back to wardrobe
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/wardrobe" className="font-mono text-xs uppercase tracking-wide text-ink/50 hover:text-ink">
        ← Back to wardrobe
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-4 grid gap-8 sm:grid-cols-2"
      >
        <div className="overflow-hidden rounded-sm border border-stone bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={`${item.color} ${item.category}`} className="w-full object-cover" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{item.category}</p>
            <AiStatusBadge status={item.aiStatus} size="md" />
          </div>

          <h1 className="mt-2 font-display text-3xl capitalize text-ink">
            {item.color} {item.style ? `· ${item.style}` : ""}
          </h1>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-dashed border-stone pt-4 text-sm">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Season</dt>
              <dd className="mt-1 capitalize text-ink">{item.season.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Added</dt>
              <dd className="mt-1 text-ink">{new Date(item.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>

          {item.tags.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Tags</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-stone px-2.5 py-0.5 font-mono text-[11px] text-ink/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-sm border border-stone bg-white p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">AI analysis</p>

            {(item.aiStatus === "PENDING" || item.aiStatus === "ANALYZING") && (
              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass-500" aria-hidden="true" />
                <p className="text-sm text-ink/60">
                  {item.aiStatus === "PENDING"
                    ? "Queued — AI is analyzing your clothing…"
                    : "AI is analyzing your clothing…"}
                </p>
              </div>
            )}

            {item.aiStatus === "FAILED" && (
              <div className="mt-2">
                <p className="text-sm text-clay">{item.aiErrorMessage ?? "Analysis couldn't complete."}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRetry}
                  isLoading={isRetrying}
                  className="mt-2"
                >
                  Retry analysis
                </Button>
              </div>
            )}

            {item.aiStatus === "COMPLETED" && item.aiMetadata && (
              <div className="mt-3">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-ink/40">Category</dt>
                    <dd className="capitalize text-ink">{item.aiMetadata.category}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-ink/40">Color</dt>
                    <dd className="capitalize text-ink">{item.aiMetadata.color}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-ink/40">Style</dt>
                    <dd className="capitalize text-ink">{item.aiMetadata.style}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-ink/40">Pattern</dt>
                    <dd className="capitalize text-ink">{item.aiMetadata.pattern}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-ink/40">Material</dt>
                    <dd className="capitalize text-ink">{item.aiMetadata.material}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-ink/40">Confidence</dt>
                    <dd className="text-ink">{Math.round(item.aiMetadata.confidence * 100)}%</dd>
                  </div>
                </dl>

                <div className="mt-3">
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-ink/40">Suits</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {[...item.aiMetadata.seasonSuitability, ...item.aiMetadata.occasionSuitability].map(
                      (value) => (
                        <span
                          key={value}
                          className="rounded-full bg-moss/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-moss"
                        >
                          {value.replace("_", " ")}
                        </span>
                      )
                    )}
                  </dd>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-clay" role="alert">
              {error}
            </p>
          )}

          <button
            onClick={handleDelete}
            className="mt-6 font-mono text-xs uppercase tracking-wide text-clay/80 underline hover:text-clay"
          >
            Remove from wardrobe
          </button>
        </div>
      </motion.div>
    </div>
  );
}
