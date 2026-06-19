// New enterprise-grade theme system
export * from './themeTypes';
export * from './defaultTheme';
export * from './themeStore';
export { ThemeProvider, useTheme } from './ThemeContext.tsx';
export type { ThemeContextValue, ThemeConfiguration } from './ThemeContext.tsx';
export * from './generateCssVariables';

// Legacy exports for backwards compatibility. Avoid `export * from './types'`
// and `export * from './colors'` because they re-export ColorScale/ThemeMode
// already exported above, which would trigger TS2308 duplicate-export errors.
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './radius';
export * from './transitions';
export type { Theme } from './types';

// Legacy theme creation (for backwards compatibility)
import { lightColors, darkColors } from './colors';
import { defaultTypography } from './typography';
import { defaultSpacing } from './spacing';
import { lightShadows, darkShadows } from './shadows';
import { defaultRadius } from './radius';
import { defaultTransitions } from './transitions';
import type { Theme, ThemeMode } from './types';

export function createTheme(mode: ThemeMode = 'light'): Theme {
  return {
    mode,
    colors: mode === 'light' ? lightColors : darkColors,
    typography: defaultTypography,
    spacing: defaultSpacing,
    shadows: mode === 'light' ? lightShadows : darkShadows,
    radius: defaultRadius,
    transitions: defaultTransitions,
  };
}

export function applyThemeToRoot(theme: Theme): void {
  const root = document.documentElement;
  const colorCss = Object.entries(theme.colors.primary)
    .map(([key, value]) => `--primary-${key}: ${value};`)
    .join('\n');
  root.style.cssText = colorCss;
  if (theme.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
