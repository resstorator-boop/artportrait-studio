import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Landing palette — Docs/landing-spec.md §4 (VISUAL DIRECTION) */
        page: "#f5ede0",
        card: "#fbf6ec",
        risk: "#3c2a26",
        ink: "#2a1f1a",
        muted: "#7a6a5e",
        inverse: "#f5ede0",
        burgundy: "#7d2538",
        dusty: "#c89898",
        hairline: "rgba(42, 31, 26, 0.10)",
      },
      fontFamily: {
        sans: ["var(--font-onest)", "system-ui", "sans-serif"],
        heading: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        container: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;
