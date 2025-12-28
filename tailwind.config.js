/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
        '17': 'repeat(17, minmax(0, 1fr))',
        '18': 'repeat(18, minmax(0, 1fr))',
      },
      fontFamily: {
        coldiac: ['Coldiac', 'serif'],
        meravila: ['Meravila', 'serif'],
        geosans: ['Geosans', 'sans-serif'],
        bodar: ['BODAR', 'serif'],
      },
    },
  },
  plugins: [],
}
