"use client";

// Best-effort name -> hex mapping for common fashion color vocabulary
// (matches the mock AI provider's output and typical user-entered colors).
// Unrecognized names fall back to a neutral swatch with a visible border so
// the UI never looks broken — the label still shows the real name either way.
const COLOR_HEX: Record<string, string> = {
  black: "#15130F",
  white: "#FDFCF9",
  navy: "#1F2937",
  beige: "#E8DFC8",
  olive: "#6B6B3A",
  burgundy: "#5C1F2E",
  grey: "#9A9A94",
  gray: "#9A9A94",
  camel: "#C19A6B",
  cream: "#F3ECD9",
  ivory: "#F6F2E7",
  charcoal: "#36393B",
  red: "#A6373A",
  blue: "#3B5C8C",
  green: "#3E5C43",
  pink: "#D9A5B0",
  purple: "#5B4B6E",
  orange: "#C1703B",
  yellow: "#D8B94A",
  brown: "#6B4A34",
  tan: "#C9A876",
};

interface ColorPaletteProps {
  colors: string[];
}

export function ColorPalette({ colors }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {colors.map((color) => {
        const hex = COLOR_HEX[color.toLowerCase()];
        return (
          <div key={color} className="flex flex-col items-center gap-1.5">
            <span
              className="h-10 w-10 rounded-full border border-stone shadow-sm"
              style={{ backgroundColor: hex ?? "#D9D2C2" }}
              aria-hidden="true"
            />
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink/60">{color}</span>
          </div>
        );
      })}
    </div>
  );
}
