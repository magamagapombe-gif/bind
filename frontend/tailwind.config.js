/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        flame:  { DEFAULT: '#FF4458', dark: '#e03347' },
        gold:   { DEFAULT: '#FFD700' },
        slate:  { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 800: '#1e293b', 900: '#0f172a' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'slide-up':   'slideUp 0.35s ease-out',
        'fade-in':    'fadeIn 0.3s ease-out',
        'bounce-in':  'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'heart-pop':  'heartPop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        slideUp:   { from: { transform: 'translateY(40px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        bounceIn:  { '0%': { transform: 'scale(0.3)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        heartPop:  { '0%': { transform: 'scale(0)' }, '60%': { transform: 'scale(1.3)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
