import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: {
          DEFAULT: '#dc7aa4',
          hover: '#c66a90',
          dark: '#c05e85',
          light: '#f0a8c8',
        },
        // Brand colors
        starbiz: {
          dark: '#090653',
          light: '#DC79A8',
        },
        // Background colors
        background: {
          light: '#f8f6f7',
          dark: '#1f1318',
          page: '#F8F7FC',
        },
        // Surface colors
        surface: {
          light: '#ffffff',
          dark: '#2a1d22',
        },
        // Sidebar
        sidebar: {
          bg: '#090653',
          dark: '#1f1318',
        },
        // Text colors
        'text-main': '#191014',
        'text-muted': '#8d586f',
        // Border colors
        'input-border': '#e4d3da',
        'border-light': '#e4d3da',
        'border-dark': '#4a3b42',
        // Code background
        'code-bg': '#090653',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0, 0, 0, 0.03)',
        card: '0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

export default config
