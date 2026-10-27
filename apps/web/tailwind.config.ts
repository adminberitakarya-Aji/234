import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bet: {
          dark: "#0a0a0a",
          panel: "#111111",
          accent: "#00ff9f",
          accentHover: "#00e88e",
          text: "#ffffff",
          textMuted: "#888888",
          danger: "#ff4444",
          success: "#00ff9f",
        },
      },
    },
  },
  plugins: [],
};

export default config;