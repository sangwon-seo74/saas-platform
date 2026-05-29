import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/constants/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
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
          accent:      '#ea580c',
          accentHover: '#f97316',
          accentDeep:  '#9a3412',
          blueHover:   '#79baff',
          border3:     '#444c56',
          success:      '#238636',
          successHover: '#2ea043',
          successDeep:  '#1c6b3a',
          successBright:'#56d364',
          danger:       '#da3633',
          dangerHover:  '#f85149',
          dangerDeep:   '#a03030',
          bronze:       '#bc6c25',
        },
        tint: {
          green:  { DEFAULT: '#0f2d1c', border: '#1c5c35', hover: '#1c3528' },
          amber:  { DEFAULT: '#3d2b0d', border: '#7a5000' },
          red:    { DEFAULT: '#3d1a1a', border: '#7f2020' },
          blue:   { DEFAULT: '#1c2d4a', border: '#2d4a7a', deep: '#111d30' },
          purple: { DEFAULT: '#2d1c4a', border: '#3d2060', text: '#b07fff' },
          orange: { DEFAULT: '#3d1e00', border: '#7a3d00' },
        },
      },
      ringWidth: { '3': '3px' },
    },
  },
  plugins: [],
}

export default config
