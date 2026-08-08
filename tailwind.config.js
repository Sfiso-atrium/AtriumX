// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
colors: {
        slate: {
          deep: '#0A0F1E',
          card: '#111827',
          border: '#1F2D3D',
        },
        teal: {
          primary: '#0D9488',
          light: '#14B8A6',
          faint: '#0D948822',
        },
        sapphire: {
          primary: '#16305C',
          light: '#3C5F94',
        },
        cream: {
          DEFAULT: '#F0F4F8',
          muted: '#8B949E',
        },
        gold: {
          DEFAULT: '#D4A017',
          muted: '#A6790F',
        },
        ember: {
          DEFAULT: '#D4A017',
          dark: '#A6790F',
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
