/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        espresso: { DEFAULT: '#2C2119', 800: '#3A2C22', 700: '#4A3A2E', 600: '#5E4B3C' },
        ember: { DEFAULT: '#E2622B', 600: '#C9511E', 400: '#EE8550', 100: '#FDE9DD' },
        saffron: { DEFAULT: '#E8A33D', 100: '#FBEFD9' },
        lagoon: { DEFAULT: '#1F6F68', 600: '#185953', 100: '#E1F0EE' },
        cream: { DEFAULT: '#F8F5EF', 200: '#EFE8DA', 300: '#E3D9C6' },
        ink: { DEFAULT: '#2A2420', muted: '#7A6E64' },
      },
      fontFamily: {
        display: ['Anuphan', 'IBM Plex Sans Thai', 'sans-serif'],
        sans: ['IBM Plex Sans Thai', 'Anuphan', 'system-ui', 'sans-serif'],
        mono: ['Courier Prime', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(44,33,25,.06), 0 8px 24px -12px rgba(44,33,25,.18)',
        lift: '0 18px 40px -18px rgba(44,33,25,.45)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        'stamp': { '0%': { opacity: 0, transform: 'scale(1.6) rotate(-18deg)' }, '60%': { opacity: 1, transform: 'scale(.94) rotate(-8deg)' }, '100%': { transform: 'scale(1) rotate(-10deg)' } },
        'fly': { from: { transform: 'translateX(-10%)' }, to: { transform: 'translateX(110%)' } },
      },
      animation: {
        'fade-up': 'fade-up .5s ease both',
        stamp: 'stamp .6s cubic-bezier(.2,.8,.2,1) both',
        fly: 'fly 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
