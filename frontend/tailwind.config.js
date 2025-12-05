/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#39FF14',
        'dark-bg': '#0a0a0a',
        'dark-panel': '#1a1a1a',
        'electric-blue': '#00D9FF',
        'toxic-purple': '#B026FF',
        'blood-red': '#FF0040',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flicker': 'flicker 3s linear infinite',
        'electric': 'electric 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '1',
            filter: 'drop-shadow(0 0 8px currentColor)',
          },
          '50%': { 
            opacity: '0.7',
            filter: 'drop-shadow(0 0 16px currentColor)',
          },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '41.99%': { opacity: '1' },
          '42%': { opacity: '0.8' },
          '43%': { opacity: '1' },
          '45.99%': { opacity: '1' },
          '46%': { opacity: '0.6' },
          '46.5%': { opacity: '1' },
        },
        'electric': {
          '0%, 100%': { 
            transform: 'translateY(0)',
            filter: 'brightness(1)',
          },
          '50%': { 
            transform: 'translateY(-2px)',
            filter: 'brightness(1.2)',
          },
        },
      },
    },
  },
  plugins: [],
}
