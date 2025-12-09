/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        primary: "#2563eb",
        secondary: "#4f46e5",
        background: "#f8fafc",
        surface: "#ffffff",
        surfaceHighlight: "#f1f5f9",
        textMain: "#0f172a",
        textMuted: "#64748b",
        border: "#e2e8f0",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
};
