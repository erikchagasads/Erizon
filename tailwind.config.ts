import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        erizon: {
          black: "#05070F",
          navy: "#0A0F2C",
          cosmic: "#121735",
          purple: "#6C4BFF",
          plasma: "#9B7CFF",
          neural: "#1F3BFF",
          mint: "#2FFFCB",
          red: "#FF4D6D",
          white: "#F5F7FF",
          lunar: "#A6AED1",
        },
      },
      backgroundImage: {
        'erizon-ia': "linear-gradient(135deg, #6C4BFF 0%, #1F3BFF 50%, #2FFFCB 100%)",
        'erizon-space': "linear-gradient(180deg, #05070F 0%, #0A0F2C 100%)",
      },
    },
  },
  plugins: [],
};
export default config;