/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        burgundy: { DEFAULT: '#730639', dark: '#5a0429', light: '#8f0748' },
        rose: { mid: '#F279B2', soft: '#F2ACD3', light: '#FDF0F6', pale: '#FEF7FB' },
        plum: { DEFAULT: '#26011C', light: '#3d0230' },
        lavender: { DEFAULT: '#7A6DA6', light: '#a098c8', soft: '#EDE9F8' },
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        rose: '0 4px 24px -4px rgba(242,121,178,0.22)',
        'rose-lg': '0 8px 40px -8px rgba(242,121,178,0.28)',
        burgundy: '0 4px 20px -4px rgba(115,6,57,0.28)',
        card: '0 2px 16px -2px rgba(38,1,28,0.08)',
        'card-hover': '0 8px 32px -4px rgba(38,1,28,0.14)',
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scale-in 0.25s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
