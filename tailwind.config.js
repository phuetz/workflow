/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      // Z-Index Scale (matching src/styles/z-index.ts)
      zIndex: {
        'base': '0',
        'canvas': '10',
        'edges': '15',
        'nodes': '20',
        'minimap': '30',
        'alignment': '40',
        'statusbar': '100',
        'sidebar': '110',
        'header': '120',
        'panel': '200',
        'config-panel': '200',
        'focus-panel': '210',
        'debug-panel': '220',
        'bulk-panel': '230',
        'dropdown': '300',
        'context-menu': '310',
        'tooltip': '320',
        'quick-search': '330',
        'modal-backdrop': '400',
        'modal': '410',
        'drawer': '420',
        'node-panel': '430',
        'popup': '500',
        'toast': '510',
        'notification': '520',
        'command-palette': '600',
        'keyboard-shortcuts': '610',
        'spotlight': '620',
        'max': '9999',
      },
      // Colors using CSS variables
      colors: {
        linear: {
          bg: {
            primary: 'var(--linear-bg-primary)',
            secondary: 'var(--linear-bg-secondary)',
            tertiary: 'var(--linear-bg-tertiary)',
            elevated: 'var(--linear-bg-elevated)',
          },
          text: {
            primary: 'var(--linear-text-primary)',
            secondary: 'var(--linear-text-secondary)',
            tertiary: 'var(--linear-text-tertiary)',
            muted: 'var(--linear-text-muted)',
          },
          surface: {
            1: 'var(--linear-surface-1)',
            2: 'var(--linear-surface-2)',
            hover: 'var(--linear-surface-hover)',
            active: 'var(--linear-surface-active)',
          },
          border: {
            default: 'var(--linear-border-default)',
            subtle: 'var(--linear-border-subtle)',
          },
          accent: {
            purple: 'var(--linear-accent-purple)',
            blue: 'var(--linear-accent-blue)',
            green: 'var(--linear-accent-green)',
            red: 'var(--linear-accent-red)',
            orange: 'var(--linear-accent-orange)',
            pink: 'var(--linear-accent-pink)',
          },
        },
      },
      // Animation utilities
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'fade-out': 'fadeOut 150ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'slide-in-left': 'slideInLeft 200ms ease-out',
        'slide-in-up': 'slideInUp 200ms ease-out',
        'slide-in-down': 'slideInDown 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'scale-out': 'scaleOut 150ms ease-out',
        'linear-scale-in': 'linearScaleIn 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        linearScaleIn: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      // Box shadows
      boxShadow: {
        'linear-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'linear-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'linear-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'linear-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'linear-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'linear-glow': '0 0 0 3px rgb(124 58 237 / 0.3)',
      },
      // Border radius
      borderRadius: {
        'linear-sm': '0.25rem',
        'linear-md': '0.375rem',
        'linear-lg': '0.5rem',
        'linear-xl': '0.75rem',
        'linear-2xl': '1rem',
      },
    },
  },
  plugins: [],
};
