/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
  navy: {
    900: '#001F3F',
    800: '#082A4D',
    950: '#00152B',
  },
  gold: {
    500: '#D4AF37', // This is the "Brass" look
  }
}
    },
  },
  plugins: [],
}