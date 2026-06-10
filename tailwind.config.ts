import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D6CDF',
          light: '#4F8AEF',
          dark: '#1A4FA0'
        },
        secondary: '#7B5CF0',
        background: '#F0F4FF',
        card: '#FFFFFF',
        income: '#30D158',
        expense: '#FF453A',
        warning: '#FF9500',
        muted: '#8E8E93',
        border: 'rgba(0,0,0,0.08)'
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'system-ui',
          'sans-serif'
        ]
      },
      borderRadius: {
        ios: '12px',
        'ios-lg': '16px',
        'ios-xl': '24px'
      },
      boxShadow: {
        card: '0 1px 8px rgba(0,0,0,0.08)',
        'card-lg': '0 4px 20px rgba(0,0,0,0.12)'
      }
    }
  },
  plugins: []
}

export default config
