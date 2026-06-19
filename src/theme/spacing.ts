export interface Spacing {
  '0': string;
  '0.5': string;
  1: string;
  '1.5': string;
  2: string;
  '2.5': string;
  3: string;
  '3.5': string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
  36: string;
  40: string;
  44: string;
  48: string;
  52: string;
  56: string;
  60: string;
  64: string;
  72: string;
  80: string;
  96: string;
}

const BASE_UNIT = 0.25; // rem, equals 4px at default font size

function generateSpacing(): Spacing {
  const values = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
  const spacing = {} as Spacing;
  values.forEach(v => {
    const key = v.toString() as keyof Spacing;
    spacing[key] = `${v * BASE_UNIT}rem`;
  });
  return spacing;
}

export const defaultSpacing: Spacing = generateSpacing();

export function generateSpacingCss(spacing: Spacing): string {
  return Object.entries(spacing)
    .map(([key, value]) => key.includes('.') ? `--spacing-${key.replace('.', '-')}: ${value};` : `--spacing-${key}: ${value};`)
    .join('\n');
}
