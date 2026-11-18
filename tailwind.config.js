/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { DEFAULT: 'rgb(var(--ink) / <alpha-value>)', soft: 'rgb(var(--ink-soft) / <alpha-value>)', faint: 'rgb(var(--ink-faint) / <alpha-value>)' },
        paper: { DEFAULT: 'rgb(var(--paper) / <alpha-value>)', raised: 'rgb(var(--paper-raised) / <alpha-value>)', sunk: 'rgb(var(--paper-sunk) / <alpha-value>)' },
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: { DEFAULT: 'rgb(var(--accent) / <alpha-value>)', soft: 'rgb(var(--accent-soft) / <alpha-value>)' },
      },
    },
  },
  plugins: [],
}
