// Enterprise-grade theme type definitions for unlimited customization

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

export interface BackgroundColors {
  primary: string;
  secondary: string;
  card: string;
  sidebar: string;
  header: string;
  input: string;
}

export interface TextColors {
  primary: string;
  secondary: string;
  muted: string;
  heading: string;
  link: string;
  linkHover: string;
  inverse: string;
}

export interface BrandColors {
  primary: ColorScale;
  secondary: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;
}

export interface FontFamily {
  heading: string;
  body: string;
  mono: string;
}

export interface FontSizeScale {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
}

export interface FontWeightPresets {
  light: number;
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
}

export interface TypographyConfig {
  fontFamily: FontFamily;
  fontSize: FontSizeScale;
  fontWeight: FontWeightPresets;
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
  };
}

export interface BorderConfig {
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  width: {
    thin: string;
    default: string;
    thick: string;
  };
}

export interface LayoutConfig {
  containerMaxWidth: string;
  sidebarWidth: string;
  headerHeight: string;
  spacing: 'compact' | 'comfortable';
}

export interface ShadowConfig {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeColorPalette {
  background: BackgroundColors;
  text: TextColors;
  brand: BrandColors;
  border: BorderConfig;
  shadow: ShadowConfig;
}

export interface ThemeConfiguration {
  id: string;
  name: string;
  description?: string;
  mode: 'light' | 'dark';
  colors: ThemeColorPalette;
  typography: TypographyConfig;
  layout: LayoutConfig;
  createdAt: string;
  updatedAt: string;
  isCustom: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  currentThemeId: string;
  mode: ThemeMode;
  customThemes: ThemeConfiguration[];
  systemPreference: 'light' | 'dark';
}

export interface ThemeContextValue {
  // Current theme
  theme: () => ThemeConfiguration;
  mode: () => ThemeMode;
  effectiveMode: () => 'light' | 'dark';

  // Theme management
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  applyTheme: (themeId: string) => void;

  // Custom theme management
  createTheme: (theme: Omit<ThemeConfiguration, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'>) => string;
  updateTheme: (themeId: string, updates: Partial<ThemeConfiguration>) => void;
  deleteTheme: (themeId: string) => void;
  duplicateTheme: (themeId: string, newName: string) => string;
  customThemes: () => ThemeConfiguration[];

  // Import/Export
  exportTheme: (themeId: string) => string;
  importTheme: (json: string) => string | null;

  // Reset
  resetToDefault: () => void;

  // Preview
  previewTheme: (theme: Partial<ThemeConfiguration>) => void;
  clearPreview: () => void;
}

// Preset font families
export const FONT_FAMILIES = {
  inter: { name: 'Inter', value: "'Inter', system-ui, sans-serif" },
  roboto: { name: 'Roboto', value: "'Roboto', sans-serif" },
  openSans: { name: 'Open Sans', value: "'Open Sans', sans-serif" },
  lato: { name: 'Lato', value: "'Lato', sans-serif" },
  montserrat: { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  poppins: { name: 'Poppins', value: "'Poppins', sans-serif" },
  sourceSans: { name: 'Source Sans Pro', value: "'Source Sans Pro', sans-serif" },
  nunito: { name: 'Nunito', value: "'Nunito', sans-serif" },
  system: { name: 'System Default', value: "system-ui, -apple-system, sans-serif" },
} as const;

// Preset color scales for brand colors
export const PRESET_COLOR_SCALES: Record<string, ColorScale> = {
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e40af', 900: '#1e3a8a',
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
    400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
    800: '#065f46', 900: '#064e3b',
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
    400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
    800: '#5b21b6', 900: '#4c1d95',
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
    400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
    800: '#9f1239', 900: '#881337',
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
    400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
    800: '#92400e', 900: '#78350f',
  },
  slate: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a',
  },
  cyan: {
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
    400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
    800: '#155e75', 900: '#164e63',
  },
  orange: {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
    400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
    800: '#9a3412', 900: '#7c2d12',
  },
};
