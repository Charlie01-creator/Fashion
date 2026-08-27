"use client";

import { ClothingCategories, type ClothingCategory } from "@fashion-platform/shared";

interface CategoryFilterProps {
  active: ClothingCategory | "all";
  onChange: (category: ClothingCategory | "all") => void;
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  const options: (ClothingCategory | "all")[] = ["all", ...ClothingCategories];

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
      {options.map((option) => {
        const isActive = active === option;
        return (
          <button
            key={option}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option)}
            className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              isActive
                ? "border-ink bg-ink text-bone"
                : "border-stone bg-white text-ink/70 hover:border-ink/40"
            }`}
          >
            {option === "all" ? "All items" : option}
          </button>
        );
      })}
    </div>
  );
}
