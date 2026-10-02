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
        display: ['var(--font-space)', 'var(--font-barlow)', 'Space Grotesk', 'Barlow Semi Condensed', 'sans-serif'],
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
          DEFAULT: "#F16D67",
          foreground: "#172522",
        },
        secondary: {
          DEFAULT: "#FFFDFC",
          foreground: "#172522",
        },
        destructive: {
          DEFAULT: "#e53927",
          foreground: "#FFFDFC",
        },
        muted: {
          DEFAULT: "#CBD0C8",
          foreground: "#55635F",
        },
        accent: {
          DEFAULT: "#79AEE8",
          foreground: "#172522",
        },
        popover: {
          DEFAULT: "#FFFDFC",
          foreground: "#172522",
        },
        card: {
          DEFAULT: "#FFFDFC",
          foreground: "#172522",
        },
        // HackFlow refined war-room design tokens
        hack: {
          ink: "#172522", // Primary text, dark panels
          navy: "#203A52", // Navigation, secondary dark surfaces
          sand: "#F6F1E7", // Warm paper page background
          canvas: "#F6F1E7",
          panel: "#FFFDFC", // Cards, surfaces, inputs
          surface: "#FFFDFC",
          muted: "#CBD0C8", // Subtle dividers and borders
          coral: "#F16D67", // Primary action + deadline state
          'coral-dark': "#D94841", // Accessible coral for text on light backgrounds
          'coral-shadow': "#671912", // Kept for legacy shadow compatibility
          rust: "#E53927", // Critical urgency, destructive
          red: "#E53927",
          blue: "#79AEE8", // Links, info, active state
          'blue-dark': "#2D6BB5", // Accessible blue text on light backgrounds
          sky: "#79AEE8",
          gold: "#F6C344", // Warning, attention, trophies
          'gold-dark': "#946C00", // Accessible gold/amber text on light backgrounds
          yellow: "#F6C344",
          'gold-shadow': "#8a5d13", // Kept for legacy compatibility
          mint: "#B8DCCB", // Success / completed state
          'mint-dark': "#1D684D", // Accessible mint text
          subtext: "#55635F", // Secondary text (WCAG AA compliant: 5.6:1 on paper, 6.2:1 on white)
          'muted-text': "#55635F",
          pink: "#f6c4c1", // Kept for legacy compatibility
          forest: "#2e4742", // Kept for dark container backwards compatibility
          teal: "#3d5f58", // Kept for header backwards compatibility
        },
      },
      boxShadow: {
        // Signature HackFlow shadow
        'hack-hero': '0 5px 0 rgba(23,37,34,.16)',
        'hack-btn': '0 5px 0 rgba(23,37,34,.16)',
        'hack-btn-hover': '0 2px 0 rgba(23,37,34,.16)',
        // Clean elevation scale
        'hack-card': '0 2px 8px rgba(23,37,34,.08)',
        'hack-card-quiet': '0 1px 4px rgba(23,37,34,.06)',
        'hack-card-hero': '0 5px 0 rgba(23,37,34,.16)',
        'hack-card-gold': '0 5px 0 rgba(148,108,0,.2)',
        'hack-chip': '0 1px 3px rgba(23,37,34,.08)',
        'hack-nav': '0 2px 6px rgba(23,37,34,.06)',
        'hack-panel': '0 4px 16px rgba(23,37,34,.06)',
        'hack-dialog': '0 12px 40px rgba(23,37,34,.15)',
        'hack-sm': '0 1px 2px rgba(23,37,34,.06)',
        'hack-md': '0 2px 6px rgba(23,37,34,.08)',
        'hack-lg': '0 4px 12px rgba(23,37,34,.10)',
        'hack-xl': '0 8px 24px rgba(23,37,34,.12)',
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
