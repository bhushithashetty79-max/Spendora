/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070A09',
          900: '#0B0F0D',
          850: '#0F1411',
          800: '#141A16',
          750: '#1A211D',
          700: '#212A24',
          600: '#2C372F',
          500: '#3A463C',
        },
        mint: {
          50: '#E6FFF4',
          100: '#C2FFE6',
          200: '#8BFFD1',
          300: '#4FF7B8',
          400: '#1FE89F',
          500: '#00D986',
          600: '#00B370',
          700: '#008C56',
          800: '#066B45',
          900: '#0A5238',
        },
        teal: {
          400: '#2DD4BF',
          500: '#14B8A6',
        },
        gold: {
          400: '#FFD24A',
          500: '#FFB020',
        },
        rose: {
          400: '#FF6B6B',
          500: '#F23E3E',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset',
        lift: '0 18px 40px -12px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06) inset',
        glow: '0 0 24px -2px rgba(31,232,159,0.45)',
        'glow-sm': '0 0 14px -2px rgba(31,232,159,0.4)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.96)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%,100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        'dot': {
          '0%,80%,100%': { opacity: '0.25', transform: 'translateY(0)' },
          '40%': { opacity: '1', transform: 'translateY(-3px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'slide-in': 'slide-in 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'pop': 'pop 0.3s ease both',
        'pulse-ring': 'pulse-ring 2.4s ease-in-out infinite',
        'dot': 'dot 1.2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
