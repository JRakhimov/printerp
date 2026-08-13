/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--tg-theme-bg-color, #0f172a)',
        foreground: 'var(--tg-theme-text-color, #f8fafc)',
        card: {
          DEFAULT: 'var(--tg-theme-secondary-bg-color, #1e293b)',
          foreground: '#f8fafc',
        },
        primary: {
          DEFAULT: 'var(--tg-theme-button-color, #3b82f6)',
          foreground: 'var(--tg-theme-button-text-color, #ffffff)',
        },
        accent: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#334155',
          foreground: '#94a3b8',
        },
        border: '#334155',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
