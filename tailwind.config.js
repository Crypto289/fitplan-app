/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        amber: {
          DEFAULT: '#e8922a',
          hi: '#f0a648',
          deep: '#b8701f',
        },
        bg: {
          DEFAULT: '#0d0d0d',
          card: '#141414',
          elev: '#1a1a1a',
        },
        fg: {
          DEFAULT: '#f5f5f5',
          dim: '#a8a8a8',
          mute: '#666666',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        amber: '0 0 20px rgba(232,146,42,0.30)',
        'amber-lg': '0 0 28px rgba(232,146,42,0.45), 0 0 60px rgba(232,146,42,0.18)',
        card: '0 4px 32px rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
}
