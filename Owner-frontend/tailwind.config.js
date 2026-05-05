/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Dark mode surface layers
        "dk-base":    "#0F1115",
        "dk-raised":  "#151821",
        "dk-panel":   "#1C2030",
        "dk-overlay": "#222637",
        // Accent — warm gold
        "dk-gold":        "#C9A96E",
        "dk-gold-deep":   "#A67C3D",
        "dk-gold-pale":   "#E8C98A",
        // Semantic text
        "dk-heading": "#F0EBE3",
        "dk-body":    "#C8BFB4",
        "dk-muted":   "#7A7572",
        // Status
        "dk-positive": "#4ADE80",
        "dk-warning":  "#FBBF24",
        "dk-danger":   "#F87171",
      },
      boxShadow: {
        "glow-gold":  "0 0 0 1px rgba(201,169,110,0.25), 0 4px 24px rgba(201,169,110,0.12)",
        "card-dark":  "0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.28)",
        "card-dark-hover": "0 2px 8px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.36), 0 0 0 1px rgba(201,169,110,0.15)",
        "sidebar-dark": "4px 0 32px rgba(0,0,0,0.4)",
        "modal-dark": "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "dk-sidebar-header": "linear-gradient(160deg, #1e2235 0%, #12151e 100%)",
        "dk-card-glow": "radial-gradient(circle at top right, rgba(201,169,110,0.06), transparent 60%)",
        "dk-active-nav": "linear-gradient(90deg, rgba(201,169,110,0.18) 0%, rgba(201,169,110,0.04) 100%)",
        "dk-gold-btn": "linear-gradient(135deg, #C9A96E 0%, #A67C3D 100%)",
        "dk-accent-card": "linear-gradient(135deg, #8B5E3C 0%, #4E2D1B 100%)",
      },
      borderColor: {
        "dk-subtle": "rgba(255,255,255,0.07)",
        "dk-muted":  "rgba(255,255,255,0.12)",
        "dk-gold":   "rgba(201,169,110,0.35)",
      },
      ringColor: {
        "dk-gold": "rgba(201,169,110,0.4)",
      },
    },
  },
  plugins: [],
}

