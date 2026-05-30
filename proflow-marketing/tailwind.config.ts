import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Section 3.1 color tokens (exact hex from spec)
        primary: {
          DEFAULT: "#0F172A",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#2563EB",
          foreground: "#FFFFFF",
        },
        "background-alt": "#F8FAFC",
        border: "#E2E8F0",
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",

        // Platform colors
        platform: {
          instagram: "#E4405F",
          tiktok: "#000000",
          youtube: "#FF0000",
          facebook: "#1877F2",
          linkedin: "#0A66C2",
          x: "#000000",
        },

        // shadcn-style aliases that map onto the spec palette so existing
        // primitives keep working without re-painting every component.
        background: "#FFFFFF",
        foreground: "#0F172A",
        input: "#E2E8F0",
        ring: "#2563EB",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#0F172A",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        brand: {
          DEFAULT: "#2563EB",
          dark: "#1D4ED8",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
