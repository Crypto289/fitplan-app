/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: '#00ff88',
      },
      boxShadow: {
        neon:    '0 0 20px rgba(0,255,136,0.4)',
        'neon-lg': '0 0 38px rgba(0,255,136,0.6)',
        card:    '0 4px 32px rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
}
