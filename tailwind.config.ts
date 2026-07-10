import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#050816",
        gold: "#D4AF37",
        mist: "#A8B2D1",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        body: ['"Poppins"', "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 80px rgba(212, 175, 55, 0.16)",
      },
    },
  },
  plugins: [],
} satisfies Config;
