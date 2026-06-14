// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          deep: '#0D2538',
          card: '#0F2D45',
          border: '#1E3A4F',
        },
        teal: {
          primary: '#1A5F7A',
          light: '#2A7A9A',
          faint: '#1A5F7A22',
        },
        cream: {
          DEFAULT: '#FFF7ED',
          muted: '#C9B99A',
        },
        gold: {
          DEFAULT: '#FBBF24',
          muted: '#D97706',
        },
        ember: {
          DEFAULT: '#F97316',
          dark: '#C2550F',
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
