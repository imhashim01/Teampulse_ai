/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"] },
      colors: {
        canvas: "#FAFAF7",
        line: "#ECEAE4",
        ink: "#1C1C1E",
        muted: "#6B6B6B",
        accent: { DEFAULT: "#4F46E5", hover: "#4338CA", soft: "#EEF0FF" },
      },
      boxShadow: { soft: "0 1px 2px rgba(28,28,30,0.04), 0 2px 8px rgba(28,28,30,0.04)" },
      borderRadius: { xl2: "14px" },
    },
  },
  plugins: [],
};
