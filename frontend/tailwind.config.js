/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Pinglet palette (plum, lilac and citron)
        pl: {
          bg: "#15121b",
          panel: "#201c27",
          header: "#292431",
          hover: "#332c3d",
          selected: "#40354d",
          line: "#44394e",
          out: "#503968",
          accent: "#daf88b",
          accentDark: "#bade70",
          blue: "#d6b5ff",
          text: "#fbf6ff",
          muted: "#beb2c8",
          chip: "#352c40",
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Helvetica Neue", "Helvetica", "Arial", "Lucida Grande", "sans-serif"],
      },
    },
  },
  plugins: [],
};
