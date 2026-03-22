import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        james: {
          DEFAULT: "hsl(var(--james) / <alpha-value>)",
          foreground: "hsl(var(--james-foreground) / <alpha-value>)",
        },
        lisa: {
          DEFAULT: "hsl(var(--lisa) / <alpha-value>)",
          foreground: "hsl(var(--lisa-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      backgroundImage: {
        "wedding-shell":
          "radial-gradient(circle at top left, rgba(90, 125, 255, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(232, 105, 155, 0.18), transparent 26%), linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(249, 246, 241, 0.95))",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 23, 42, 0.08)",
      },
      keyframes: {
        "scroll-nudge": {
          "0%, 20%, 100%": {
            transform: "translateY(0)",
          },
          "40%": {
            transform: "translateY(5px)",
          },
          "58%": {
            transform: "translateY(0)",
          },
          "76%": {
            transform: "translateY(2px)",
          },
        },
      },
      animation: {
        "scroll-nudge": "scroll-nudge 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
