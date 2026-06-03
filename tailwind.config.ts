import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          300: "#F8EDF7",
          400: "#F4D5F1",
          500: "#EFBDEB",
          600: "#D882CC",
          700: "#BD4CAF",
        },
        success: "#00DFA2",
        info: "#0079FF",
        danger: "#FF0060",
        warning: "#F6FA70",
      },
    },
  },
  plugins: [],
};

export default config;
