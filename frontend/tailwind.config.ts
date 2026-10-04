import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyan: {
          50: '#f0f5ee',
          100: '#e1ebdc',
          200: '#c8dac0',
          300: '#a4c09d',
          400: '#769e75',
          500: '#547d58',
          600: '#3e6447',
          700: '#31543c',
          800: '#294735',
          900: '#20382b',
        },
      },
      fontFamily: { serif: ['Songti SC', 'STSong', 'SimSun', 'serif'] },
    },
  },
  plugins: [],
} satisfies Config;
