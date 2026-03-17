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
                primary: "#4A6741", // Deep Forest Green
                secondary: "#C68E5D", // Earthy Brown/Terracotta
                accent: "#FDFCF8", // Beige/Sand
                text: "#2C3E32", // Dark Charcoal
                background: "#FDFCF8",
            },
            fontFamily: {
                sans: ["var(--font-lato)", "sans-serif"],
                serif: ["var(--font-playfair)", "serif"],
            },
        },
    },
    plugins: [],
};
export default config;
