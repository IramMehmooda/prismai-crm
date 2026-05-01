import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Notebook-inspired palette
        nav: {
          900: "#1f2a36", // sidebar deepest
          800: "#26333f", // sidebar base
          700: "#2f3d4a", // hover
          600: "#3a4856",
          500: "#4a5867",
          ink: "#9aa6b2", // sidebar muted text
        },
        topbar: "#34495e",
        leaf: {
          50: "#ecfdf3",
          100: "#d1fadf",
          400: "#43c178",
          500: "#27ae60", // brand green (active row, buttons)
          600: "#1f9b54",
          700: "#187a44",
        },
        accent: {
          sky: "#3498db",
          orange: "#f39c12",
          red: "#e74c3c",
          violet: "#9b59b6",
          teal: "#1abc9c",
          slate: "#7f8c9b",
        },
        ink: {
          50: "#f7f9fb",
          100: "#eef2f6",
          200: "#dde4eb",
          300: "#c2cdd6",
          400: "#8a98a5",
          500: "#5b6b78",
          600: "#3f4b56",
          700: "#2c3845",
          900: "#0f1820",
        },
        // keep brand alias for legacy usages
        brand: {
          50: "#ecfdf3",
          100: "#d1fadf",
          500: "#27ae60",
          600: "#1f9b54",
          700: "#187a44",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "Segoe UI", "Tahoma", "Arial"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 6px 18px -8px rgba(15,23,42,0.10)",
        card: "0 1px 0 rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        glow: "0 6px 20px -8px rgba(39,174,96,0.55)",
      },
      backgroundImage: {
        "grad-leaf":   "linear-gradient(135deg,#27ae60 0%,#1abc9c 100%)",
        // Legacy aliases kept so existing list pages keep their colored avatars
        "grad-brand":  "linear-gradient(135deg,#27ae60 0%,#1abc9c 100%)",
        "grad-aurora": "linear-gradient(135deg,#3498db 0%,#9b59b6 100%)",
        "grad-mint":   "linear-gradient(135deg,#1abc9c 0%,#27ae60 100%)",
        "grad-sunset": "linear-gradient(135deg,#f39c12 0%,#e74c3c 100%)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "shimmer": { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-in": "fade-in .35s ease-out both",
        "shimmer": "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
