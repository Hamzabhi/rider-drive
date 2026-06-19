import type { ThemeConfiguration, ColorScale } from './themeTypes';

// Generate CSS variables for a color scale
function generateColorScaleVars(scale: ColorScale, prefix: string): string {
  return Object.entries(scale)
    .map(([key, value]) => `--${prefix}-${key}: ${value};`)
    .join('\n  ');
}

// Generate all CSS variables from a theme configuration
export function generateCssVariables(theme: ThemeConfiguration): string {
  const { colors, typography, layout } = theme;

  const vars = `
  /* Background Colors */
  --bg-primary: ${colors.background.primary};
  --bg-secondary: ${colors.background.secondary};
  --bg-card: ${colors.background.card};
  --bg-sidebar: ${colors.background.sidebar};
  --bg-header: ${colors.background.header};
  --bg-input: ${colors.background.input};

  /* Text Colors */
  --text-primary: ${colors.text.primary};
  --text-secondary: ${colors.text.secondary};
  --text-muted: ${colors.text.muted};
  --text-heading: ${colors.text.heading};
  --text-link: ${colors.text.link};
  --text-link-hover: ${colors.text.linkHover};
  --text-inverse: ${colors.text.inverse};

  /* Brand Colors - Primary */
  ${generateColorScaleVars(colors.brand.primary, 'primary')}
  --primary: var(--primary-500);

  /* Brand Colors - Secondary */
  ${generateColorScaleVars(colors.brand.secondary, 'secondary')}
  --secondary: var(--secondary-500);

  /* Brand Colors - Success */
  ${generateColorScaleVars(colors.brand.success, 'success')}
  --success: var(--success-500);

  /* Brand Colors - Warning */
  ${generateColorScaleVars(colors.brand.warning, 'warning')}
  --warning: var(--warning-500);

  /* Brand Colors - Error */
  ${generateColorScaleVars(colors.brand.error, 'error')}
  --error: var(--error-500);

  /* Brand Colors - Info */
  ${generateColorScaleVars(colors.brand.info, 'info')}
  --info: var(--info-500);

  /* Typography */
  --font-heading: ${typography.fontFamily.heading};
  --font-body: ${typography.fontFamily.body};
  --font-mono: ${typography.fontFamily.mono};
  --font-size-xs: ${typography.fontSize.xs};
  --font-size-sm: ${typography.fontSize.sm};
  --font-size-base: ${typography.fontSize.base};
  --font-size-lg: ${typography.fontSize.lg};
  --font-size-xl: ${typography.fontSize.xl};
  --font-size-2xl: ${typography.fontSize['2xl']};
  --font-size-3xl: ${typography.fontSize['3xl']};
  --font-size-4xl: ${typography.fontSize['4xl']};
  --font-size-5xl: ${typography.fontSize['5xl']};
  --font-weight-light: ${typography.fontWeight.light};
  --font-weight-normal: ${typography.fontWeight.normal};
  --font-weight-medium: ${typography.fontWeight.medium};
  --font-weight-semibold: ${typography.fontWeight.semibold};
  --font-weight-bold: ${typography.fontWeight.bold};
  --line-height-tight: ${typography.lineHeight.tight};
  --line-height-normal: ${typography.lineHeight.normal};
  --line-height-relaxed: ${typography.lineHeight.relaxed};
  --letter-spacing-tight: ${typography.letterSpacing.tight};
  --letter-spacing-normal: ${typography.letterSpacing.normal};
  --letter-spacing-wide: ${typography.letterSpacing.wide};

  /* Border */
  --radius-none: ${colors.border.radius.none};
  --radius-sm: ${colors.border.radius.sm};
  --radius-md: ${colors.border.radius.md};
  --radius-lg: ${colors.border.radius.lg};
  --radius-xl: ${colors.border.radius.xl};
  --radius-2xl: ${colors.border.radius['2xl']};
  --radius-full: ${colors.border.radius.full};
  --border-thin: ${colors.border.width.thin};
  --border-default: ${colors.border.width.default};
  --border-thick: ${colors.border.width.thick};

  /* Shadows */
  --shadow-none: ${colors.shadow.none};
  --shadow-sm: ${colors.shadow.sm};
  --shadow-md: ${colors.shadow.md};
  --shadow-lg: ${colors.shadow.lg};
  --shadow-xl: ${colors.shadow.xl};
  --shadow-2xl: ${colors.shadow['2xl']};

  /* Layout */
  --container-max-width: ${layout.containerMaxWidth};
  --sidebar-width: ${layout.sidebarWidth};
  --header-height: ${layout.headerHeight};
  --spacing-mode: ${layout.spacing};

  /* Legacy compatibility variables */
  --background: var(--bg-primary);
  --surface: var(--bg-card);
  --surface-variant: var(--bg-secondary);
  --border: var(--secondary-200);
  --border-light: var(--secondary-100);
  --border-dark: var(--secondary-300);
  --input-bg: var(--bg-input);
  --input-border: var(--secondary-200);
  --input-focus: var(--primary-500);
  --overlay: rgba(0, 0, 0, ${theme.mode === 'dark' ? '0.7' : '0.5'});
  --danger: var(--error);
  --font-sans: var(--font-body);
`;

  return vars.trim();
}

// Apply theme to document root
export function applyThemeToDocument(theme: ThemeConfiguration): void {
  const root = document.documentElement;

  // Generate and inject CSS variables
  const cssVars = generateCssVariables(theme);

  // Remove existing theme style tag if any
  const existingStyle = document.getElementById('theme-variables');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element for theme variables
  const styleTag = document.createElement('style');
  styleTag.id = 'theme-variables';
  styleTag.textContent = `:root {\n  ${cssVars}\n}`;
  document.head.appendChild(styleTag);

  // Set dark mode class for Tailwind compatibility
  if (theme.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Apply font family
  root.style.setProperty('font-family', theme.typography.fontFamily.body);
}

// Get CSS variable value (for reading computed values)
export function getCssVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Set a single CSS variable (for live preview)
export function setCssVariable(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value);
}

// Generate a complete theme stylesheet
export function generateThemeStylesheet(theme: ThemeConfiguration): string {
  const cssVars = generateCssVariables(theme);
  return `
/* ${theme.name} - Generated Theme */
:root {
  ${cssVars}
}

/* Dark mode overrides (when .dark class is applied) */
.dark {
  /* Additional dark mode specific overrides can go here */
}

/* Font face declarations */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
`;
}

// Extract theme from current CSS variables (for export)
export function extractCurrentTheme(): Record<string, string> {
  const styles = getComputedStyle(document.documentElement);
  const variables: Record<string, string> = {};

  // Get all CSS custom properties
  const allVars = [
    '--bg-primary', '--bg-secondary', '--bg-card', '--bg-sidebar', '--bg-header', '--bg-input',
    '--text-primary', '--text-secondary', '--text-muted', '--text-heading', '--text-link', '--text-link-hover', '--text-inverse',
    '--font-heading', '--font-body', '--font-mono',
    '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl',
    '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl',
    '--container-max-width', '--sidebar-width', '--header-height',
  ];

  allVars.forEach(varName => {
    variables[varName] = styles.getPropertyValue(varName).trim();
  });

  return variables;
}
