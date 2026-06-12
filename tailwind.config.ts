import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#eaf2ed",
        muted: "#9bb0a5",
        panel: "#15241d",
        background: "#07140f",
        line: "#36473e",
        action: "#1ba06c",
        actionHover: "#17875b",
        accent: "#d9963f"
      }
    }
  },
  plugins: []
};

export default config;
