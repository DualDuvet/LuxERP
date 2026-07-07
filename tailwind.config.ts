import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d2433",
        muted: "#657084",
        panel: "#f6f7f9",
        line: "#d9dee7",
        accent: "#c81e1e",
        warning: "#b86b00"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(29,36,51,0.08)"
      }
    }
  },
  plugins: [forms]
};

export default config;
