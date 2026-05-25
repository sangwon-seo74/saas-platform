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
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dk: {
          bg:       '#0D1117',
          surface:  '#161B22',
          surface2: '#1C2128',
          border:   '#21262D',
          border2:  '#30363D',
          text:     '#E6EDF3',
          muted:    '#8B949E',
          dim:      '#6E7681',
          blue:     '#58A6FF',
          green:    '#3FB950',
          purple:   '#D2A8FF',
          red:      '#FF7B72',
          orange:   '#E3B341',
        },
      },
      ringWidth: { '3': '3px' },
    },
  },
  plugins: [],
}

export default config
