/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        apple: {
          yellow: '#e5a93c',
          yellowHover: '#d4982a',
          yellowActive: '#c48920',
          yellowMuted: 'rgba(229, 169, 60, 0.15)',
          // Dark theme shades
          darkBg: '#1c1c1e',
          darkPanel: '#252528',
          darkSidebar: '#1e1e20',
          darkHover: '#2c2c2e',
          darkActive: '#3a3a3c',
          darkBorder: '#333336',
          darkText: '#f5f5f7',
          darkMuted: '#8e8e93',
          // Light theme shades
          lightBg: '#ffffff',
          lightPanel: '#fcfcfc',
          lightSidebar: '#f6f6f8',
          lightHover: '#ececee',
          lightActive: '#e2e2e6',
          lightBorder: '#e5e5ea',
          lightText: '#1d1d1f',
          lightMuted: '#86868b'
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif"
        ],
        mono: [
          "SF Mono",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ]
      }
    },
  },
  plugins: [],
}
