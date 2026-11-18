/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F7F4EB',
        paper: '#FCFAF4',
        ink: '#22362B',
        forest: {
          50: '#EDF5ED',
          100: '#DCEBDD',
          200: '#BBD8BE',
          300: '#94C49A',
          400: '#7BC47F',
          500: '#58A563',
          600: '#3F8450',
          700: '#326843',
          800: '#285238',
          900: '#1E3D2B',
          950: '#13271C',
        },
        moss: '#7BC47F',
        sage: '#B7CDB6',
        fern: '#4F7960',
        peach: '#F2B998',
        apricot: '#F7D7B9',
        butter: '#F4E4AE',
        clay: '#D77C5A',
        cloud: '#F1EDE2',
        line: '#E6E0D3',
        bark: '#735845',
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 14px 40px -20px rgba(38, 63, 45, 0.22)',
        card: '0 2px 4px rgba(45, 65, 52, 0.03), 0 22px 45px -30px rgba(45, 65, 52, 0.25)',
        float: '0 30px 80px -28px rgba(23, 52, 35, 0.45)',
        glow: '0 0 0 6px rgba(123, 196, 127, 0.13)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.018)', opacity: '0.96' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0, 0, 0)', opacity: '0' },
          '20%': { opacity: '0.85' },
          '80%': { opacity: '0.65' },
          '100%': { transform: 'translate3d(18px, -90px, 0)', opacity: '0' },
        },
        blink: {
          '0%, 45%, 50%, 100%': { transform: 'scaleY(1)' },
          '47%': { transform: 'scaleY(0.08)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '70%': { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        confetti: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(320px) rotate(540deg)', opacity: '0' },
        },
        zzz: {
          '0%': { transform: 'translateY(0) scale(0.9)', opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { transform: 'translateY(-24px) scale(1.1)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        breathe: 'breathe 5s ease-in-out infinite',
        sway: 'sway 7s ease-in-out infinite',
        drift: 'drift 7s ease-in-out infinite',
        blink: 'blink 5.5s ease-in-out infinite',
        'fade-up': 'fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'popIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        zzz: 'zzz 3s ease-out infinite',
      },
    },
  },
  plugins: [],
};
