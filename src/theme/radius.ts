export interface Radius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

export const defaultRadius: Radius = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

export function generateRadiusCss(radius: Radius): string {
  return `
--radius-none: ${radius.none};
--radius-sm: ${radius.sm};
--radius-md: ${radius.md};
--radius-lg: ${radius.lg};
--radius-xl: ${radius.xl};
--radius-2xl: ${radius['2xl']};
--radius-3xl: ${radius['3xl']};
--radius-full: ${radius.full};
  `.trim();
}
