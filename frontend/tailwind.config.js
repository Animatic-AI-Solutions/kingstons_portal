/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
      },
      colors: {
        'primary': {
          50: '#f8f6fc',
          100: '#f2eefa',
          200: '#e5ddf4',
          300: '#d3c5ec',
          400: '#b298df',
          500: '#9975d5',
          600: '#7c54c4',
          700: '#4B2D83', // Main primary color (dark purple)
          800: '#3B1E73', // Primary dark
          900: '#2B104F',
        },
        'pink': {
          400: '#ff59d6',
          500: '#ee00c2',
          600: '#d100a8',
          700: '#a8007e',
        },
        'green': {
          400: '#3ceba6',
          500: '#27cb8b',
          600: '#17a46f',
          700: '#108356',
        },
        'blue': {
          400: '#59cbff',
          500: '#36b3f9',
          600: '#1597e5',
          700: '#0073cc',
        },
        'red': {
          400: '#fc6a6a',
          500: '#f83b3b',
          600: '#e41616',
          700: '#c60f0f',
        },
        'text': {
          'primary': '#111827', // Near-black for primary text
          'secondary': '#374151', // Dark gray for secondary text
          'muted': '#4B5563', // Medium gray for less important text
        },
        'background': {
          'primary': '#ffffff',
          'secondary': '#f9fafb',
          'tertiary': '#f3f4f6',
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
