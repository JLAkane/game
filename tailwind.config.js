/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          dark: '#0f141c',
          card: '#18202c',
          border: '#2a3649',
          gold: '#f59e0b',
          fire: '#ef4444',
          water: '#3b82f6',
          wood: '#10b981',
          thunder: '#eab308',
          shadow: '#8b5cf6',
        }
      }
    },
  },
  plugins: [],
}
