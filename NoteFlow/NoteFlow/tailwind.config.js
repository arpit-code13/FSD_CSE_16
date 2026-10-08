const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        sunken: token('sunken'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        danger: token('danger'),
      },
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06)',
        lift: '0 8px 24px -8px rgb(var(--shadow) / 0.22)',
        modal: '0 24px 64px -16px rgb(var(--shadow) / 0.45)',
      },
      keyframes: {
        pop: { from: { opacity: 0, transform: 'translateY(6px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        toast: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        pin: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.35) rotate(-12deg)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        pop: 'pop .18s ease-out',
        fade: 'fade .15s ease-out',
        toast: 'toast .2s ease-out',
        pin: 'pin .35s ease-out',
      },
    },
  },
  plugins: [],
};
