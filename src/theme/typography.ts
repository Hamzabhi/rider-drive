export interface Typography {
  fontFamily: {
    sans: string;
    mono: string;
    display: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
    wider: string;
  };
}

export const defaultTypography: Typography = {
  fontFamily: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace",
    display: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },
};

export function generateTypographyCss(typography: Typography): string {
  return `
--font-sans: ${typography.fontFamily.sans};
--font-mono: ${typography.fontFamily.mono};
--font-display: ${typography.fontFamily.display};
--text-xs: ${typography.fontSize.xs};
--text-sm: ${typography.fontSize.sm};
--text-base: ${typography.fontSize.base};
--text-lg: ${typography.fontSize.lg};
--text-xl: ${typography.fontSize.xl};
--text-2xl: ${typography.fontSize['2xl']};
--text-3xl: ${typography.fontSize['3xl']};
--text-4xl: ${typography.fontSize['4xl']};
--text-5xl: ${typography.fontSize['5xl']};
--font-light: ${typography.fontWeight.light};
--font-normal: ${typography.fontWeight.normal};
--font-medium: ${typography.fontWeight.medium};
--font-semibold: ${typography.fontWeight.semibold};
--font-bold: ${typography.fontWeight.bold};
--leading-tight: ${typography.lineHeight.tight};
--leading-normal: ${typography.lineHeight.normal};
--leading-relaxed: ${typography.lineHeight.relaxed};
--tracking-tight: ${typography.letterSpacing.tight};
--tracking-normal: ${typography.letterSpacing.normal};
--tracking-wide: ${typography.letterSpacing.wide};
--tracking-wider: ${typography.letterSpacing.wider};
  `.trim();
}
