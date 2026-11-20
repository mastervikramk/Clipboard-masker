/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)']
      },
      colors: {
        apple: {
          bg: '#0F0F11',
          card: 'rgba(28, 28, 30, 0.75)',
          cardLight: 'rgba(255, 255, 255, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          borderLight: 'rgba(0, 0, 0, 0.08)',
          accent: '#0A84FF',
          accentHover: '#0071E3',
          green: '#30D158',
          amber: '#FF9F0A',
          red: '#FF453A',
          secondary: '#8E8E93',
          muted: '#636366'
        }
      },
      backdropBlur: {
        'apple': '20px',
        'apple-thick': '32px'
      },
      boxShadow: {
        'apple-popover': '0 12px 36px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'apple-card': '0 2px 10px rgba(0, 0, 0, 0.2)'
      }
    },
  },
  plugins: [],
}
