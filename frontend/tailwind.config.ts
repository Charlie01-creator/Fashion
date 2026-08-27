import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#faf7f2",
          100: "#f0e9dd",
          200: "#e0d0b8",
          300: "#ccae87",
          400: "#b98d5e",
          500: "#a3733f",
          600: "#875c33",
          700: "#6c482a",
          800: "#573b26",
          900: "#493222",
        },
        // Premium wardrobe palette — used on /wardrobe, /upload, and other
        // "product" surfaces. Kept distinct from `brand` (used on marketing/
        // auth screens) rather than replacing it, to avoid a sweeping
        // re-theme of pages outside this phase's scope.
        ink: "#15130F",
        bone: "#F7F2E7",
        stone: "#D9D2C2",
        brass: {
          400: "#C9A467",
          500: "#AD8748",
          600: "#8F6C36",
        },
        moss: "#33402C",
        clay: "#8B3A2B",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
