import { createSignal, createEffect, on, batch } from 'solid-js';
import type { ThemeConfiguration, ThemeMode } from './themeTypes';
import { defaultLightTheme, defaultDarkTheme, builtInThemes } from './defaultTheme';
import { applyThemeToDocument } from './generateCssVariables';

// LocalStorage keys
const THEME_ID_KEY = 'rideflow_theme_id';
const THEME_MODE_KEY = 'rideflow_theme_mode';
const CUSTOM_THEMES_KEY = 'rideflow_custom_themes';

// Generate unique ID
function generateId(): string {
  return `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Load from localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Save to localStorage
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Get system preference
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// Migrate old theme key to new format
function migrateOldThemeKey(): ThemeMode {
  try {
    const oldKey = localStorage.getItem('rideflow_theme');
    if (oldKey === 'dark') return 'dark';
    if (oldKey === 'light') return 'light';
  } catch {}
  return loadFromStorage(THEME_MODE_KEY, 'light' as ThemeMode);
}

// State signals
const [currentThemeId, setCurrentThemeId] = createSignal<string>(
  loadFromStorage(THEME_ID_KEY, 'default-light')
);

const [mode, setModeState] = createSignal<ThemeMode>(migrateOldThemeKey());

const [customThemes, setCustomThemes] = createSignal<ThemeConfiguration[]>(
  loadFromStorage(CUSTOM_THEMES_KEY, [])
);

const [previewTheme, setPreviewTheme] = createSignal<ThemeConfiguration | null>(null);

// Get effective mode (resolves 'system' to actual mode)
const effectiveMode = (): 'light' | 'dark' => {
  const m = mode();
  if (m === 'system') {
    return getSystemPreference();
  }
  return m;
};

// Simple mode signal for backward compatibility (returns 'light' | 'dark' only)
const simpleMode = (): 'light' | 'dark' => effectiveMode();

// Get current theme configuration
const currentTheme = (): ThemeConfiguration => {
  if (previewTheme()) {
    return previewTheme()!;
  }

  const id = currentThemeId();
  const effectiveModeValue = effectiveMode();

  // Check built-in themes first
  const builtIn = builtInThemes.find(t => t.id === id);
  if (builtIn) {
    if (builtIn.mode !== effectiveModeValue) {
      const matchingTheme = builtInThemes.find(t => t.mode === effectiveModeValue && !t.isCustom);
      if (matchingTheme) return matchingTheme;
    }
    return builtIn;
  }

  // Check custom themes
  const custom = customThemes().find(t => t.id === id);
  if (custom) {
    return custom;
  }

  // Fallback to default based on effective mode
  return effectiveModeValue === 'dark' ? defaultDarkTheme : defaultLightTheme;
};

// Apply current theme to document
function applyCurrentTheme(): void {
  const theme = currentTheme();
  applyThemeToDocument(theme);
}

// Set the theme mode
function setMode(newMode: ThemeMode): void {
  setModeState(newMode);
  saveToStorage(THEME_MODE_KEY, newMode);
}

// Toggle between light and dark (simple toggle for sidebar button)
function toggle(): void {
  const effective = effectiveMode();
  setMode(effective === 'dark' ? 'light' : 'dark');
}

// Toggle between light/dark/system (cycle for settings panel)
function toggleMode(): void {
  const current = mode();
  if (current === 'light') {
    setMode('dark');
  } else if (current === 'dark') {
    setMode('system');
  } else {
    setMode('light');
  }
}

// Apply a specific theme by ID
function applyTheme(themeId: string): void {
  setCurrentThemeId(themeId);
  saveToStorage(THEME_ID_KEY, themeId);
}

// Create a new custom theme
function createTheme(
  themeConfig: Omit<ThemeConfiguration, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'>
): string {
  const id = generateId();
  const now = new Date().toISOString();

  const newTheme: ThemeConfiguration = {
    ...themeConfig,
    id,
    createdAt: now,
    updatedAt: now,
    isCustom: true,
  };

  batch(() => {
    setCustomThemes(prev => [...prev, newTheme]);
    saveToStorage(CUSTOM_THEMES_KEY, customThemes());
  });

  return id;
}

// Update an existing custom theme
function updateTheme(themeId: string, updates: Partial<ThemeConfiguration>): void {
  batch(() => {
    setCustomThemes(prev =>
      prev.map(t =>
        t.id === themeId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      )
    );
    saveToStorage(CUSTOM_THEMES_KEY, customThemes());
  });
}

// Delete a custom theme
function deleteTheme(themeId: string): void {
  batch(() => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
    saveToStorage(CUSTOM_THEMES_KEY, customThemes());

    if (currentThemeId() === themeId) {
      const defaultTheme = effectiveMode() === 'dark' ? 'default-dark' : 'default-light';
      applyTheme(defaultTheme);
    }
  });
}

// Duplicate a theme
function duplicateTheme(themeId: string, newName: string): string {
  let source: ThemeConfiguration | undefined;
  source = builtInThemes.find(t => t.id === themeId);
  if (!source) {
    source = customThemes().find(t => t.id === themeId);
  }

  if (!source) {
    throw new Error('Theme not found');
  }

  return createTheme({
    name: newName,
    description: `Copy of ${source.name}`,
    mode: source.mode,
    colors: JSON.parse(JSON.stringify(source.colors)),
    typography: JSON.parse(JSON.stringify(source.typography)),
    layout: JSON.parse(JSON.stringify(source.layout)),
  });
}

// Export theme as JSON
function exportTheme(themeId: string): string {
  let theme: ThemeConfiguration | undefined;
  theme = builtInThemes.find(t => t.id === themeId);
  if (!theme) {
    theme = customThemes().find(t => t.id === themeId);
  }

  if (!theme) {
    throw new Error('Theme not found');
  }

  return JSON.stringify(theme, null, 2);
}

// Import theme from JSON
function importTheme(json: string): string | null {
  try {
    const parsed = JSON.parse(json) as ThemeConfiguration;

    if (!parsed.name || !parsed.colors || !parsed.typography || !parsed.layout) {
      throw new Error('Invalid theme format');
    }

    return createTheme({
      name: parsed.name,
      description: parsed.description,
      mode: parsed.mode || 'light',
      colors: parsed.colors,
      typography: parsed.typography,
      layout: parsed.layout,
    });
  } catch (e) {
    console.error('Failed to import theme:', e);
    return null;
  }
}

// Preview a theme without saving
function startPreview(theme: Partial<ThemeConfiguration>): void {
  const base = currentTheme();
  const preview: ThemeConfiguration = {
    ...base,
    ...theme,
    mode: theme.mode || base.mode,
  };
  setPreviewTheme(preview);
}

// Clear preview
function clearPreview(): void {
  setPreviewTheme(null);
}

// Reset to default theme
function resetToDefault(): void {
  batch(() => {
    setMode('light');
    applyTheme('default-light');
  });
}

// All themes (built-in + custom)
function allThemes(): ThemeConfiguration[] {
  return [...builtInThemes, ...customThemes()];
}

// Export the store
export const themeStore = {
  // State
  currentThemeId,
  mode: simpleMode, // Backward compat: returns 'light' | 'dark'
  themeMode: mode, // Full mode with 'system' support
  effectiveMode,
  currentTheme,
  customThemes,
  allThemes,
  previewTheme,

  // Actions
  setMode,
  toggle, // Simple light/dark toggle (used by sidebar button)
  toggleMode, // Full light/dark/system cycle
  applyTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  duplicateTheme,
  exportTheme,
  importTheme,
  startPreview,
  clearPreview,
  resetToDefault,
  applyCurrentTheme,
};

// Reactively apply theme changes. Must run inside a reactive root
// (i.e. within a component rendered by Solid's `render()`), otherwise
// the effect never executes and dark-mode toggles won't touch the DOM.
export function initThemeReactiveSystem(): void {
  if (typeof window === 'undefined') return;

  createEffect(on([currentThemeId, mode, previewTheme], () => {
    applyCurrentTheme();
  }));

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (mode() === 'system') {
      applyCurrentTheme();
    }
  });
}
