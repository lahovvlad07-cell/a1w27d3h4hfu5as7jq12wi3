import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0A14",
        surface: "#15131F",
        surface2: "#1E1B2E",
        ink: "#EDEAF6",
        muted: "#9691AC",
        gold: "#E8B04B",
        violet: "#8C6FFF",
        danger: "#FF6B6B",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(232,176,75,0.35)",
        violetGlow: "0 0 40px -8px rgba(140,111,255,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
