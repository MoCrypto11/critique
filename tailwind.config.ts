import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201d",
        muted: "#5f6f68",
        panel: "#f7f8f4",
        background: "#f6f7f2",
        line: "#d8ded5",
        action: "#116149",
        actionHover: "#0d513d",
        accent: "#b54708"
      }
    }
  },
  plugins: []
};

export default config;
