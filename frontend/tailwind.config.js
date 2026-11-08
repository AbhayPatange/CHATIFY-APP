/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Pinglet palette (dark, WhatsApp-style)
        pl: {
          bg: "#0b141a", // page + chat wallpaper
          panel: "#111b21", // sidebar
          header: "#202c33", // top bars, incoming bubble
          hover: "#202c33",
          selected: "#2a3942", // active chat row, text inputs
          line: "#222d34", // dividers
          out: "#005c4b", // my bubbles
          accent: "#00a884", // brand green
          accentDark: "#008069",
          blue: "#53bdeb", // "seen" ticks
          text: "#e9edef",
          muted: "#8696a0",
          chip: "#182229", // date separators
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Helvetica Neue", "Helvetica", "Arial", "Lucida Grande", "sans-serif"],
      },
    },
  },
  plugins: [],
};
