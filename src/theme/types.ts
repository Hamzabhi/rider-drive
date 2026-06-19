export type { Colors, ColorScale } from './colors';
export type { Typography } from './typography';
export type { Spacing } from './spacing';
export type { Shadows } from './shadows';
export type { Radius } from './radius';
export type { Transitions } from './transitions';

import type { Colors, ColorScale } from './colors';
import type { Typography } from './typography';
import type { Spacing } from './spacing';
import type { Shadows } from './shadows';
import type { Radius } from './radius';
import type { Transitions } from './transitions';

export interface Theme {
  mode: 'light' | 'dark';
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  shadows: Shadows;
  radius: Radius;
  transitions: Transitions;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor?: ColorScale;
  fontFamily?: Partial<Typography['fontFamily']>;
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  theme: () => Theme;
  mode: () => ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  updatePrimaryColor: (color: ColorScale) => void;
  updateFontFamily: (font: Partial<Typography['fontFamily']>) => void;
}
