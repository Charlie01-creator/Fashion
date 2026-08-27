"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ClothingCategory, ClothingItemDTO } from "@fashion-platform/shared";
import { clothingApi } from "@/lib/clothing-api";
import { GarmentCard } from "@/components/wardrobe/GarmentCard";
import { CategoryFilter } from "@/components/wardrobe/CategoryFilter";
import { EmptyWardrobe } from "@/components/wardrobe/EmptyWardrobe";

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItemDTO[]>([]);
  const [category, setCategory] = useState<ClothingCategory | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (filterCategory: ClothingCategory | "all") => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await clothingApi.listItems(filterCategory === "all" ? undefined : filterCategory);
      setItems(result.items);
    } catch {
      setError("Couldn't load your wardrobe. Try refreshing.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems(category);
  }, [category, loadItems]);

  // AI analysis runs in the background after upload (see clothingService.create
  // on the backend, and services/queue/). While any visible item is still
  // PENDING or ANALYZING, poll quietly to pick up the result without the
  // user having to manually refresh. Paused automatically once nothing is
  // in flight, so this doesn't run forever.
  useEffect(() => {
    const hasInFlight = items.some((item) => item.aiStatus === "PENDING" || item.aiStatus === "ANALYZING");
    if (!hasInFlight) return;

    const interval = setInterval(() => {
      clothingApi
        .listItems(category === "all" ? undefined : category)
        .then((result) => setItems(result.items))
        .catch(() => {
          /* silent — next tick or manual refresh will recover */
        });
    }, 3000);

    return () => clearInterval(interval);
  }, [items, category]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id)); // optimistic
    try {
      await clothingApi.deleteItem(id);
    } catch {
      setItems(previous); // roll back on failure
      setError("Couldn't remove that item. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-brass-600">Digital Wardrobe</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Your closet</h1>
        </div>
        <CategoryFilter active={category} onChange={setCategory} />
      </div>

      {error && (
        <p className="mt-4 rounded-sm border border-clay/30 bg-clay/5 px-3 py-2 text-sm text-clay" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8">
        {isLoading ? (
          <WardrobeGridSkeleton />
        ) : items.length === 0 ? (
          <EmptyWardrobe isFiltered={category !== "all"} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <GarmentCard
                  key={item.id}
                  item={item}
                  index={index}
                  onDelete={handleDelete}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function WardrobeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-sm bg-stone/40" />
      ))}
    </div>
  );
}
