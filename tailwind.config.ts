import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

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

                // App-shell design tokens (see globals.css :root / [data-app-shell]).
                // Channel-triple vars → Tailwind can apply opacity (bg-brand/10, …).
                surface: "rgb(var(--surface) / <alpha-value>)",
                "surface-sunken": "rgb(var(--surface-sunken) / <alpha-value>)",
                "surface-hover": "rgb(var(--surface-hover) / <alpha-value>)",
                hairline: "rgb(var(--border) / <alpha-value>)",
                "hairline-strong": "rgb(var(--border-strong) / <alpha-value>)",
                ink: "rgb(var(--ink) / <alpha-value>)",
                "ink-muted": "rgb(var(--ink-muted) / <alpha-value>)",
                "ink-subtle": "rgb(var(--ink-subtle) / <alpha-value>)",
                brand: "rgb(var(--brand) / <alpha-value>)",
                "brand-strong": "rgb(var(--brand-strong) / <alpha-value>)",
                ok: "rgb(var(--ok) / <alpha-value>)",
                warn: "rgb(var(--warn) / <alpha-value>)",
                danger: "rgb(var(--danger) / <alpha-value>)",
                info: "rgb(var(--info) / <alpha-value>)",
            },
            fontFamily: {
                sans: ["var(--font-lato)", "sans-serif"],
                serif: ["var(--font-playfair)", "serif"],
                ui: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
            },
            borderRadius: {
                control: "var(--r-control)",
                card: "var(--r-card)",
            },
            boxShadow: {
                raised: "var(--elev-raised)",
                overlay: "var(--elev-overlay)",
            },
        },
    },
    plugins: [typography],
};
export default config;
