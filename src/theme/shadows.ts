export interface Shadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
}

export const lightShadows: Shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  lg: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  xl: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

export const darkShadows: Shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  md: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
  lg: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
  xl: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.5)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
};

export function generateShadowCss(shadows: Shadows): string {
  return `
--shadow-none: ${shadows.none};
--shadow-sm: ${shadows.sm};
--shadow-md: ${shadows.md};
--shadow-lg: ${shadows.lg};
--shadow-xl: ${shadows.xl};
--shadow-2xl: ${shadows['2xl']};
--shadow-inner: ${shadows.inner};
  `.trim();
}
