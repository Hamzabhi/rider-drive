import type { ThemeConfiguration, ColorScale, ThemeColorPalette, TypographyConfig, LayoutConfig } from './themeTypes';
import { PRESET_COLOR_SCALES, FONT_FAMILIES } from './themeTypes';

// Helper to create color scales
const createScale = (base500: string): ColorScale => {
  // Generate a full scale from a 500 color
  // This is a simplified version - in production you'd want more sophisticated color manipulation
  return {
    50: `${base500}1a`,  // Very light
    100: `${base500}33`,
    200: `${base500}4d`,
    300: `${base500}66`,
    400: `${base500}80`,
    500: base500,
    600: `${base500}cc`,
    700: `${base500}99`,
    800: `${base500}66`,
    900: `${base500}33`,
  };
};

// Light theme colors
const lightColorPalette: ThemeColorPalette = {
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    card: '#ffffff',
    sidebar: '#ffffff',
    header: '#ffffff',
    input: '#ffffff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    heading: '#0f172a',
    link: '#3b82f6',
    linkHover: '#2563eb',
    inverse: '#ffffff',
  },
  brand: {
    primary: PRESET_COLOR_SCALES.blue,
    secondary: PRESET_COLOR_SCALES.slate,
    success: PRESET_COLOR_SCALES.emerald,
    warning: PRESET_COLOR_SCALES.amber,
    error: PRESET_COLOR_SCALES.rose,
    info: PRESET_COLOR_SCALES.cyan,
  },
  border: {
    radius: {
      none: '0',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      full: '9999px',
    },
    width: {
      thin: '1px',
      default: '1px',
      thick: '2px',
    },
  },
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
};

// Dark theme colors
const darkColorPalette: ThemeColorPalette = {
  background: {
    primary: '#0f172a',
    secondary: '#1e293b',
    card: '#1e293b',
    sidebar: '#1e293b',
    header: '#1e293b',
    input: '#334155',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    muted: '#64748b',
    heading: '#f8fafc',
    link: '#60a5fa',
    linkHover: '#93c5fd',
    inverse: '#0f172a',
  },
  brand: {
    primary: PRESET_COLOR_SCALES.blue,
    secondary: PRESET_COLOR_SCALES.slate,
    success: PRESET_COLOR_SCALES.emerald,
    warning: PRESET_COLOR_SCALES.amber,
    error: PRESET_COLOR_SCALES.rose,
    info: PRESET_COLOR_SCALES.cyan,
  },
  border: {
    radius: {
      none: '0',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      full: '9999px',
    },
    width: {
      thin: '1px',
      default: '1px',
      thick: '2px',
    },
  },
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.5)',
  },
};

// Default typography
const defaultTypography: TypographyConfig = {
  fontFamily: {
    heading: FONT_FAMILIES.inter.value,
    body: FONT_FAMILIES.inter.value,
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',    // 48px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
};

// Default layout
const defaultLayout: LayoutConfig = {
  containerMaxWidth: '1280px',
  sidebarWidth: '16rem', // 256px
  headerHeight: '4rem',  // 64px
  spacing: 'comfortable',
};

// Generate unique ID
const generateId = (): string => {
  return `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Default light theme
export const defaultLightTheme: ThemeConfiguration = {
  id: 'default-light',
  name: 'Default Light',
  description: 'Clean and modern light theme',
  mode: 'light',
  colors: lightColorPalette,
  typography: defaultTypography,
  layout: defaultLayout,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isCustom: false,
};

// Default dark theme
export const defaultDarkTheme: ThemeConfiguration = {
  id: 'default-dark',
  name: 'Default Dark',
  description: 'Elegant dark theme for reduced eye strain',
  mode: 'dark',
  colors: darkColorPalette,
  typography: defaultTypography,
  layout: defaultLayout,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isCustom: false,
};

// Premium preset themes
export const oceanTheme: ThemeConfiguration = {
  id: 'preset-ocean',
  name: 'Ocean Blue',
  description: 'Cool ocean-inspired palette',
  mode: 'light',
  colors: {
    ...lightColorPalette,
    brand: {
      primary: PRESET_COLOR_SCALES.cyan,
      secondary: PRESET_COLOR_SCALES.slate,
      success: PRESET_COLOR_SCALES.emerald,
      warning: PRESET_COLOR_SCALES.amber,
      error: PRESET_COLOR_SCALES.rose,
      info: PRESET_COLOR_SCALES.blue,
    },
  },
  typography: defaultTypography,
  layout: defaultLayout,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isCustom: false,
};

export const forestTheme: ThemeConfiguration = {
  id: 'preset-forest',
  name: 'Forest Green',
  description: 'Natural green tones',
  mode: 'light',
  colors: {
    ...lightColorPalette,
    brand: {
      primary: PRESET_COLOR_SCALES.emerald,
      secondary: PRESET_COLOR_SCALES.slate,
      success: PRESET_COLOR_SCALES.emerald,
      warning: PRESET_COLOR_SCALES.amber,
      error: PRESET_COLOR_SCALES.rose,
      info: PRESET_COLOR_SCALES.cyan,
    },
  },
  typography: defaultTypography,
  layout: defaultLayout,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isCustom: false,
};

export const sunsetTheme: ThemeConfiguration = {
  id: 'preset-sunset',
  name: 'Sunset Orange',
  description: 'Warm sunset tones',
  mode: 'light',
  colors: {
    ...lightColorPalette,
    brand: {
      primary: PRESET_COLOR_SCALES.orange,
      secondary: PRESET_COLOR_SCALES.slate,
      success: PRESET_COLOR_SCALES.emerald,
      warning: PRESET_COLOR_SCALES.amber,
      error: PRESET_COLOR_SCALES.rose,
      info: PRESET_COLOR_SCALES.blue,
    },
  },
  typography: defaultTypography,
  layout: defaultLayout,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isCustom: false,
};

// All built-in themes
export const builtInThemes: ThemeConfiguration[] = [
  defaultLightTheme,
  defaultDarkTheme,
  oceanTheme,
  forestTheme,
  sunsetTheme,
];

// Get theme by ID
export const getThemeById = (id: string): ThemeConfiguration | undefined => {
  return builtInThemes.find(t => t.id === id);
};

// Create a copy of theme with new colors
export const createThemeFromBase = (
  baseTheme: ThemeConfiguration,
  overrides: Partial<ThemeConfiguration>
): ThemeConfiguration => {
  return {
    ...baseTheme,
    ...overrides,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: true,
  };
};
