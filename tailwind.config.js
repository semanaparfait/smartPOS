/** @type {import('tailwindcss').Config} */
// Brand tokens live in global.css — see the table there.
const withVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Brand tokens ─────────────────────────────────────────────
        ink: {
          DEFAULT: withVar("--color-ink"),
          soft: withVar("--color-ink-soft"),
        },
        lime: {
          DEFAULT: withVar("--color-lime"),
          dark: withVar("--color-lime-dark"),
        },
        ivory: withVar("--color-ivory"),

        // ── Legacy aliases (older screens) ───────────────────────────
        // `navy-*` → ink. 900 is exactly ink; other steps are tints for borders/muted text.
        navy: {
          DEFAULT: withVar("--color-ink"),
          soft: withVar("--color-ink-soft"),
          50: "#F2F4F8",
          100: "#E3E7EF",
          200: "#C5CCDA",
          300: "#9AA4BA",
          400: "#6B7690",
          500: "#4A556F",
          600: "#3A4560",
          700: withVar("--color-ink-soft"),
          800: withVar("--color-ink-soft"),
          900: withVar("--color-ink"),
          950: "#161C2A",
        },
        // `gold-*` → lime.
        gold: {
          500: withVar("--color-lime"),
          600: withVar("--color-lime-dark"),
        },
      },
    },
  },
  plugins: [],
};
