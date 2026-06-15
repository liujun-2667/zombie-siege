/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2d5a3d',
        'primary-dark': '#1a3d27',
        secondary: '#8b4513',
        accent: '#ff6b35',
        danger: '#dc2626',
        success: '#22c55e',
        warning: '#f59e0b',
        dark: '#1a1a2e',
        'dark-light': '#16213e',
        gray: '#4a5568',
        light: '#f7f7f7',
      },
    },
  },
  plugins: [],
}
