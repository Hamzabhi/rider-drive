import { createContext, useContext, onMount, type ParentComponent } from 'solid-js';
import { themeStore, initThemeReactiveSystem } from './themeStore';
import type { ThemeConfiguration, ThemeMode, ThemeContextValue } from './themeTypes';

// Create the context with a default value
const ThemeContext = createContext<ThemeContextValue>({
  theme: () => themeStore.currentTheme(),
  mode: () => themeStore.mode(),
  effectiveMode: () => themeStore.effectiveMode(),
  setMode: (mode: ThemeMode) => themeStore.setMode(mode),
  toggleMode: () => themeStore.toggleMode(),
  applyTheme: (themeId: string) => themeStore.applyTheme(themeId),
  createTheme: (theme) => themeStore.createTheme(theme),
  updateTheme: (themeId, updates) => themeStore.updateTheme(themeId, updates),
  deleteTheme: (themeId) => themeStore.deleteTheme(themeId),
  duplicateTheme: (themeId, newName) => themeStore.duplicateTheme(themeId, newName),
  customThemes: () => themeStore.customThemes(),
  exportTheme: (themeId) => themeStore.exportTheme(themeId),
  importTheme: (json) => themeStore.importTheme(json),
  resetToDefault: () => themeStore.resetToDefault(),
  previewTheme: (theme) => themeStore.startPreview(theme),
  clearPreview: () => themeStore.clearPreview(),
});

// Export the context for advanced use cases
export { ThemeContext };

// Hook to access theme context
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme Provider component
export const ThemeProvider: ParentComponent = (props) => {
  // Initialise the reactive theme-application system inside the reactive root
  // so that toggling dark mode actually writes to the DOM.
  initThemeReactiveSystem();

  const contextValue: ThemeContextValue = {
    // Current theme accessors
    theme: () => themeStore.currentTheme(),
    mode: () => themeStore.mode(),
    effectiveMode: () => themeStore.effectiveMode(),

    // Theme mode management
    setMode: (mode: ThemeMode) => themeStore.setMode(mode),
    toggleMode: () => themeStore.toggleMode(),

    // Theme application
    applyTheme: (themeId: string) => themeStore.applyTheme(themeId),

    // Custom theme CRUD
    createTheme: (theme: Omit<ThemeConfiguration, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'>) =>
      themeStore.createTheme(theme),
    updateTheme: (themeId: string, updates: Partial<ThemeConfiguration>) =>
      themeStore.updateTheme(themeId, updates),
    deleteTheme: (themeId: string) => themeStore.deleteTheme(themeId),
    duplicateTheme: (themeId: string, newName: string) =>
      themeStore.duplicateTheme(themeId, newName),
    customThemes: () => themeStore.customThemes(),

    // Import/Export
    exportTheme: (themeId: string) => themeStore.exportTheme(themeId),
    importTheme: (json: string) => themeStore.importTheme(json),

    // Reset
    resetToDefault: () => themeStore.resetToDefault(),

    // Preview
    previewTheme: (theme: Partial<ThemeConfiguration>) => themeStore.startPreview(theme),
    clearPreview: () => themeStore.clearPreview(),
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {props.children}
    </ThemeContext.Provider>
  );
};

// Export types
export type { ThemeContextValue, ThemeConfiguration, ThemeMode };
