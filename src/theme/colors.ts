export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface Colors {
  primary: ColorScale;
  secondary: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  danger: ColorScale;
  background: string;
  surface: string;
  surfaceVariant: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  borderDark: string;
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
  overlay: string;
}

export const blueScale: ColorScale = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
};

export const slateScale: ColorScale = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
};

export const greenScale: ColorScale = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
};

export const amberScale: ColorScale = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
};

export const redScale: ColorScale = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
};

export const lightColors: Colors = {
  primary: blueScale,
  secondary: slateScale,
  success: greenScale,
  warning: amberScale,
  danger: redScale,
  background: '#ffffff',
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  inputBg: '#ffffff',
  inputBorder: '#e2e8f0',
  inputFocus: '#3b82f6',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const darkColors: Colors = {
  primary: blueScale,
  secondary: slateScale,
  success: greenScale,
  warning: amberScale,
  danger: redScale,
  background: '#0f172a',
  surface: '#1e293b',
  surfaceVariant: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  textInverse: '#0f172a',
  border: '#334155',
  borderLight: '#1e293b',
  borderDark: '#475569',
  inputBg: '#1e293b',
  inputBorder: '#334155',
  inputFocus: '#3b82f6',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export function generateColorCss(scale: ColorScale, prefix: string): string {
  return Object.entries(scale)
    .map(([key, value]) => `--${prefix}-${key}: ${value};`)
    .join('\n');
}

export function generateThemeCss(colors: Colors): string {
  return `
${generateColorCss(colors.primary, 'primary')}
${generateColorCss(colors.secondary, 'secondary')}
${generateColorCss(colors.success, 'success')}
${generateColorCss(colors.warning, 'warning')}
${generateColorCss(colors.danger, 'danger')}
--background: ${colors.background};
--surface: ${colors.surface};
--surface-variant: ${colors.surfaceVariant};
--text-primary: ${colors.textPrimary};
--text-secondary: ${colors.textSecondary};
--text-muted: ${colors.textMuted};
--text-inverse: ${colors.textInverse};
--border: ${colors.border};
--border-light: ${colors.borderLight};
--border-dark: ${colors.borderDark};
--input-bg: ${colors.inputBg};
--input-border: ${colors.inputBorder};
--input-focus: ${colors.inputFocus};
--overlay: ${colors.overlay};
--primary: var(--primary-500);
--secondary: var(--secondary-500);
--success: var(--success-500);
--warning: var(--warning-500);
--danger: var(--danger-500);
  `.trim();
}
