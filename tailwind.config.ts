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
      fontFamily: {
        display: ['var(--font-barlow)', 'Barlow Semi Condensed', 'sans-serif'],
        mono: ['var(--font-martian)', 'Martian Mono', 'monospace'],
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#e97b77",
          foreground: "#10201d",
        },
        secondary: {
          DEFAULT: "#f7f7f2",
          foreground: "#10201d",
        },
        destructive: {
          DEFAULT: "#e53927",
          foreground: "#f7f7f2",
        },
        muted: {
          DEFAULT: "#e4e5da",
          foreground: "#34433f",
        },
        accent: {
          DEFAULT: "#8bb2de",
          foreground: "#10201d",
        },
        popover: {
          DEFAULT: "#f7f7f2",
          foreground: "#10201d",
        },
        card: {
          DEFAULT: "#f7f7f2",
          foreground: "#10201d",
        },
        // Hacktoberfest retro-brutalist theme tokens
        hack: {
          forest: "#2e4742",
          teal: "#3d5f58",
          sand: "#f2f2eb",
          panel: "#f7f7f2",
          muted: "#e4e5da",
          ink: "#10201d",
          coral: "#e97b77",
          'coral-shadow': "#671912",
          rust: "#e53927",
          blue: "#8bb2de",
          gold: "#f5b726",
          'gold-shadow': "#8a5d13",
          pink: "#f6c4c1",
          subtext: "#34433f",
        },
      },
      boxShadow: {
        'hack-btn': '5px 5px 0 #671912',
        'hack-btn-hover': '3px 3px 0 #671912',
        'hack-card': '7px 7px 0 #671912',
        'hack-card-gold': '7px 7px 0 #8a5d13',
        'hack-chip': '5px 5px 0 #2e4742',
        'hack-nav': '4px 4px 0 #671912',
        'hack-panel': '6px 6px 0 #10201d',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
