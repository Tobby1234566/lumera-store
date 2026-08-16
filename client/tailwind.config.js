/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sophisticated neutral identity — warm sand, clay and deep ink.
        sand: {
          50: '#FBF9F6',
          100: '#F5F1EB',
          200: '#EBE4DA',
          300: '#DDD3C5',
          400: '#C7B9A6',
          500: '#AD9C85',
          600: '#8E7C64',
          700: '#6F604C',
          800: '#4F4437',
        },
        ink: {
          DEFAULT: '#1C1917',
          soft: '#44403C',
          muted: '#78716C',
          faint: '#A8A29E',
        },
        clay: {
          100: '#F2E9E4',
          300: '#D8BFB2',
          500: '#B08968',
          700: '#7F5539',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.18em',
        wide2: '0.08em',
      },
      maxWidth: {
        shell: '1280px',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        'slide-in-right': 'slide-in-right 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
