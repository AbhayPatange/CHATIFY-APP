/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Pinglet palette (dark, WhatsApp-style)
        pl: {
          bg: "#0b0e17",
          panel: "#111622",
          header: "#171e2c",
          hover: "#202a3b",
          selected: "#273449",
          line: "#263244",
          out: "#254b59",
          accent: "#70e0da",
          accentDark: "#40bcb7",
          blue: "#9bafff",
          text: "#eef4f8",
          muted: "#96a7b8",
          chip: "#1d2838",
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Helvetica Neue", "Helvetica", "Arial", "Lucida Grande", "sans-serif"],
      },
    },
  },
  plugins: [],
};
