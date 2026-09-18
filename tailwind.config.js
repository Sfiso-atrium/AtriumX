// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
colors: {
        slate: {
          deep: 'rgb(var(--atriumx-bg-deep-rgb) / <alpha-value>)',
          card: 'rgb(var(--atriumx-bg-card-rgb) / <alpha-value>)',
          border: 'rgb(var(--atriumx-border-rgb) / <alpha-value>)',
        },
        teal: {
          primary: 'rgb(var(--atriumx-teal-primary-rgb) / <alpha-value>)',
          light: 'rgb(var(--atriumx-teal-light-rgb) / <alpha-value>)',
          faint: 'rgb(var(--atriumx-teal-primary-rgb) / 0.133)',
        },
        sapphire: {
          primary: 'rgb(var(--atriumx-sapphire-primary-rgb) / <alpha-value>)',
          light: 'rgb(var(--atriumx-sapphire-light-rgb) / <alpha-value>)',
        },
        cream: {
          DEFAULT: 'rgb(var(--atriumx-cream-rgb) / <alpha-value>)',
          muted: 'rgb(var(--atriumx-cream-muted-rgb) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--atriumx-gold-rgb) / <alpha-value>)',
          muted: 'rgb(var(--atriumx-gold-muted-rgb) / <alpha-value>)',
        },
        ember: {
          DEFAULT: 'rgb(var(--atriumx-gold-rgb) / <alpha-value>)',
          dark: 'rgb(var(--atriumx-gold-muted-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
