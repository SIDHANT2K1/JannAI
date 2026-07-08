/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#adc2ff',
          400: '#809eff',
          500: '#4d6eff',
          600: '#334cff',
          700: '#1f2edf',
          800: '#1924b8',
          900: '#141c96',
          950: '#0c0f5c',
        },
        slate: {
          850: '#1e293b',
          950: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
