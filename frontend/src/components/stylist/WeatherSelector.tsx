"use client";

import type { WeatherContext } from "@fashion-platform/shared";

const CONDITIONS: { value: NonNullable<WeatherContext["condition"]>; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "sunny", label: "Sunny" },
  { value: "hot", label: "Hot" },
  { value: "cold", label: "Cold" },
  { value: "rainy", label: "Rainy" },
  { value: "snowy", label: "Snowy" },
];

interface WeatherSelectorProps {
  value: WeatherContext["condition"] | null;
  onChange: (condition: WeatherContext["condition"] | null) => void;
}

/**
 * Optional input — this is the "prepare structure" requirement for weather
 * made tangible: the field exists end to end (UI → API → engine), the
 * engine already biases season selection on it, but there's no real
 * weather API behind it yet. Selecting nothing is a fully valid choice.
 */
export function WeatherSelector({ value, onChange }: WeatherSelectorProps) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">
        Weather <span className="normal-case text-ink/35">(optional)</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
            value === null ? "border-ink bg-ink text-bone" : "border-stone text-ink/60 hover:border-ink/40"
          }`}
        >
          Any
        </button>
        {CONDITIONS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              value === c.value ? "border-ink bg-ink text-bone" : "border-stone text-ink/60 hover:border-ink/40"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
