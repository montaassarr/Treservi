/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
      },
      colors: {
        'treservi-bg-light': '#F4F4F4',
        'treservi-card-light': '#FFFFFF',
        'treservi-bg-dark': '#121212',
        'treservi-card-dark': '#1A1A1A',
        'treservi-accent': '#22C55E',
      },
      borderRadius: {
        'pill': '32px',
        'bubble': '40px',
      },
      boxShadow: {
        'soft-glow': '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
        'neon-glow': '0 0 20px rgba(34, 197, 94, 0.4)',
      }
    },
  },
  plugins: [],
}
