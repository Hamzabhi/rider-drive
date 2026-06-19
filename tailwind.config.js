/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          50: 'var(--primary-50)', 100: 'var(--primary-100)', 200: 'var(--primary-200)',
          300: 'var(--primary-300)', 400: 'var(--primary-400)', 500: 'var(--primary-500)',
          600: 'var(--primary-600)', 700: 'var(--primary-700)', 800: 'var(--primary-800)',
          900: 'var(--primary-900)', DEFAULT: 'var(--primary)',
        },
        secondary: {
          50: 'var(--secondary-50)', 100: 'var(--secondary-100)', 200: 'var(--secondary-200)',
          300: 'var(--secondary-300)', 400: 'var(--secondary-400)', 500: 'var(--secondary-500)',
          600: 'var(--secondary-600)', 700: 'var(--secondary-700)', 800: 'var(--secondary-800)',
          900: 'var(--secondary-900)', DEFAULT: 'var(--secondary)',
        },
        success: {
          50: 'var(--success-50)', 100: 'var(--success-100)', 200: 'var(--success-200)',
          300: 'var(--success-300)', 400: 'var(--success-400)', 500: 'var(--success-500)',
          600: 'var(--success-600)', 700: 'var(--success-700)', 800: 'var(--success-800)',
          900: 'var(--success-900)', DEFAULT: 'var(--success)',
        },
        warning: {
          50: 'var(--warning-50)', 100: 'var(--warning-100)', 200: 'var(--warning-200)',
          300: 'var(--warning-300)', 400: 'var(--warning-400)', 500: 'var(--warning-500)',
          600: 'var(--warning-600)', 700: 'var(--warning-700)', 800: 'var(--warning-800)',
          900: 'var(--warning-900)', DEFAULT: 'var(--warning)',
        },
        danger: {
          50: 'var(--danger-50)', 100: 'var(--danger-100)', 200: 'var(--danger-200)',
          300: 'var(--danger-300)', 400: 'var(--danger-400)', 500: 'var(--danger-500)',
          600: 'var(--danger-600)', 700: 'var(--danger-700)', 800: 'var(--danger-800)',
          900: 'var(--danger-900)', DEFAULT: 'var(--danger)',
        },
        error: {
          50: 'var(--error-50)', 100: 'var(--error-100)', 200: 'var(--error-200)',
          300: 'var(--error-300)', 400: 'var(--error-400)', 500: 'var(--error-500)',
          600: 'var(--error-600)', 700: 'var(--error-700)', 800: 'var(--error-800)',
          900: 'var(--error-900)', DEFAULT: 'var(--error)',
        },
        info: {
          50: 'var(--info-50)', 100: 'var(--info-100)', 200: 'var(--info-200)',
          300: 'var(--info-300)', 400: 'var(--info-400)', 500: 'var(--info-500)',
          600: 'var(--info-600)', 700: 'var(--info-700)', 800: 'var(--info-800)',
          900: 'var(--info-900)', DEFAULT: 'var(--info)',
        },

        // Background colors
        background: 'var(--background)',
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-card': 'var(--bg-card)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'bg-header': 'var(--bg-header)',
        'bg-input': 'var(--bg-input)',

        // Surface colors (legacy)
        surface: 'var(--surface)',
        'surface-variant': 'var(--surface-variant)',

        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-heading': 'var(--text-heading)',
        'text-link': 'var(--text-link)',
        'text-inverse': 'var(--text-inverse)',

        // Border colors
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        'border-dark': 'var(--border-dark)',

        // Overlay
        overlay: 'var(--overlay)',
      },
      fontFamily: {
        sans: 'var(--font-body)',
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-base)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
        '5xl': 'var(--font-size-5xl)',
      },
      fontWeight: {
        light: 'var(--font-weight-light)',
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      lineHeight: {
        tight: 'var(--line-height-tight)',
        normal: 'var(--line-height-normal)',
        relaxed: 'var(--line-height-relaxed)',
      },
      letterSpacing: {
        tight: 'var(--letter-spacing-tight)',
        normal: 'var(--letter-spacing-normal)',
        wide: 'var(--letter-spacing-wide)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
        header: 'var(--header-height)',
      },
      maxWidth: {
        container: 'var(--container-max-width)',
      },
    },
  },
  plugins: [],
}
