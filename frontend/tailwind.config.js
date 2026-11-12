/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          50: '#FCFCFB',
          100: '#F9F9F7',
          200: '#F3F3F0',
          300: '#EBEBE7',
          400: '#DCDCD6',
        },
        navy: {
          900: '#0B132B',
          800: '#1C2541',
          700: '#273456',
          600: '#3A4B75',
        },
        arch: {
          blue: '#1E40AF',
          cyan: '#0284C7',
          sky: '#38BDF8',
          teal: '#0D9488',
          slate: '#334155',
          muted: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'elevated': '0 4px 20px -2px rgba(15, 23, 42, 0.07), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'float': '0 12px 36px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
      }
    },
  },
  plugins: [],
};

