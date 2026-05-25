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
          accent:      '#1f6feb',
          accentHover: '#388bfd',
          accentDeep:  '#1a4a8a',
          blueHover:   '#79baff',
          border3:     '#444c56',
          // solid 액션 버튼 (GitHub 팔레트)
          success:      '#238636',
          successHover: '#2ea043',
          successDeep:  '#1c6b3a',
          successBright:'#56d364',
          danger:       '#da3633',
          dangerHover:  '#f85149',
          dangerDeep:   '#a03030',
          bronze:       '#bc6c25',
        },
        // 상태 칩 틴트 (배경/테두리/텍스트) — 다크 UI 전용
        tint: {
          green:  { DEFAULT: '#0f2d1c', border: '#1c5c35', hover: '#1c3528' },
          amber:  { DEFAULT: '#3d2b0d', border: '#7a5000' },
          red:    { DEFAULT: '#3d1a1a', border: '#7f2020' },
          blue:   { DEFAULT: '#1c2d4a', border: '#2d4a7a', deep: '#111d30' },
          purple: { DEFAULT: '#2d1c4a', border: '#3d2060', text: '#b07fff' },
        },
      },
      ringWidth: { '3': '3px' },
    },
  },
  plugins: [],
}

export default config
