/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-mint': '#3ED2B9',
        'background-base': '#FAFFFF',
        'background-card': '#FFFFFF',
        'text-primary': '#2E2E2E',
        'text-secondary': '#6E6E6E',
        'error-red': '#E74C3C',
        'border-light': '#E6E6E6',
        'panel-bg-primary': '#FFFFFF',
        'panel-bg-secondary': '#FFFFFF',
        // New custom colors from inline styles
        'tft-gray-900': '#1f2937',
        'tft-gray-700': '#4B5563',
        'tft-gray-100': '#F3F4F6',
        'tft-gray-200': '#E5E7EB',
        'tft-white': '#fff', // Equivalent to background-card

        // Dark mode colors
        'dark-background-base': '#121212',
        'dark-background-card': '#1A1A1A',
        'dark-text-primary': '#E0E0E0',
        'dark-text-secondary': '#A0AEC0',
        'dark-border-light': '#333333',
        'dark-panel-bg-primary': '#1E1E1E',
        'dark-panel-bg-secondary': '#1E1E1E',
        'dark-tft-gray-900': '#E0E0E0',
        'dark-tft-gray-700': '#A0AEC0',
        'dark-tft-gray-100': '#333333',
        'dark-tft-gray-200': '#1E1E1E',
        'dark-tft-white': '#1E1E1E',
        'dark-tft-loading': '#A0AEC0',
        'dark-background-page': '#252525',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', '"Noto Sans KR"', 'sans-serif'],
      },
      spacing: {
        '4px': '4px',
        '5px': '5px',
        '8px': '8px',
        '10px': '10px',
        '12px': '12px',
        '16px': '16px',
        '18px': '18px',
        '20px': '20px',
        '24px': '24px',
        '1.5rem': '1.5rem',
        '2rem': '2rem',
        '4rem': '4rem',
      },
      fontSize: {
        '0.75rem': '0.75rem',
        '0.8rem': '0.8rem',
        '0.9rem': '0.9rem',
        '1.5rem': '1.5rem',
      },
      borderRadius: {
        '8px': '8px',
        '6px': '6px',
        '50%': '50%',
      },
      boxShadow: {
        'header': '0 4px 12px rgba(0,0,0,0.05)',
        'block': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.12)',
      },
      minHeight: {
        '1.2em': '1.2em',
      },
      maxWidth: {
        '960px': '960px',
      },
      animation: {
        'wave': 'wave 1.5s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}