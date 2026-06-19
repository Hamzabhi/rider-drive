import { createSignal, Show, For, createEffect, on, batch } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { useTheme } from '@/theme';
import { themeStore } from '@/theme/themeStore';
import { builtInThemes } from '@/theme/defaultTheme';
import { PRESET_COLOR_SCALES, FONT_FAMILIES } from '@/theme/themeTypes';
import type { ThemeConfiguration, ColorScale, ThemeMode } from '@/theme/themeTypes';
import { Card, Button } from '@/components/ui';
import { useToast } from '@/components/ui/toast';

type TabId = 'presets' | 'colors' | 'typography' | 'layout' | 'shadows' | 'import';

export function ThemeSettings() {
  const toast = useToast();
  const themeContext = useTheme();
  const [activeTab, setActiveTab] = createSignal<TabId>('presets');
  const [hasChanges, setHasChanges] = createSignal(false);
  const [editingTheme, setEditingTheme] = createSignal<ThemeConfiguration | null>(null);
  const [exportJson, setExportJson] = createSignal('');
  const [importJson, setImportJson] = createSignal('');
  const [importError, setImportError] = createSignal('');
  const [showPreview, setShowPreview] = createSignal(true);
  const [newThemeName, setNewThemeName] = createSignal('');
  const [showCreateForm, setShowCreateForm] = createSignal(false);

  const getCurrentEdit = (): ThemeConfiguration => {
    return editingTheme() || themeContext.theme();
  };

  const startEditing = () => {
    if (!editingTheme()) {
      setEditingTheme(JSON.parse(JSON.stringify(themeContext.theme())));
      setHasChanges(false);
    }
  };

  const cancelEditing = () => {
    themeContext.clearPreview();
    setEditingTheme(null);
    setHasChanges(false);
    setShowCreateForm(false);
    setNewThemeName('');
  };

  const applyChanges = () => {
    const edited = editingTheme();
    if (!edited) return;
    if (edited.isCustom) {
      themeContext.updateTheme(edited.id, edited);
    }
    themeContext.clearPreview();
    themeContext.applyTheme(edited.id);
    setEditingTheme(null);
    setHasChanges(false);
    toast.add('Theme applied successfully!', 'success');
  };

  const saveAsNewTheme = () => {
    const edited = editingTheme();
    if (!edited) return;
    const name = newThemeName() || `Custom Theme ${themeContext.customThemes().length + 1}`;
    const id = themeContext.createTheme({
      name,
      description: 'Custom theme created from theme editor',
      mode: edited.mode,
      colors: JSON.parse(JSON.stringify(edited.colors)),
      typography: JSON.parse(JSON.stringify(edited.typography)),
      layout: JSON.parse(JSON.stringify(edited.layout)),
    });
    themeContext.clearPreview();
    themeContext.applyTheme(id);
    setEditingTheme(null);
    setHasChanges(false);
    setShowCreateForm(false);
    setNewThemeName('');
    toast.add('New theme saved and applied!', 'success');
  };

  const updateTheme = (path: string, value: string | number | ColorScale) => {
    const current = getCurrentEdit();
    const updated = { ...current } as any;
    const keys = path.split('.');
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!obj[key]) obj[key] = {};
      if (typeof obj[key] === 'object') obj[key] = { ...obj[key] };
      obj = obj[key];
    }
    obj[keys[keys.length - 1]] = value;
    updated.updatedAt = new Date().toISOString();
    setEditingTheme(updated);
    setHasChanges(true);
    themeContext.previewTheme(updated);
  };

  const applyColorScale = (brandKey: keyof ThemeConfiguration['colors']['brand'], scale: ColorScale) => {
    startEditing();
    updateTheme(`colors.brand.${brandKey}`, scale);
  };

  const updateColorScaleShade = (brandKey: keyof ThemeConfiguration['colors']['brand'], shade: string, value: string) => {
    startEditing();
    const current = getCurrentEdit();
    const currentScale = current.colors.brand[brandKey];
    const updatedScale = { ...currentScale, [shade]: value };
    updateTheme(`colors.brand.${brandKey}`, updatedScale);
  };

  const createCustomTheme = () => {
    const current = getCurrentEdit();
    const id = themeContext.createTheme({
      name: `Custom Theme ${themeContext.customThemes().length + 1}`,
      description: 'Custom theme created from settings',
      mode: current.mode,
      colors: JSON.parse(JSON.stringify(current.colors)),
      typography: JSON.parse(JSON.stringify(current.typography)),
      layout: JSON.parse(JSON.stringify(current.layout)),
    });
    themeContext.applyTheme(id);
    toast.add('Custom theme created!', 'success');
  };

  const handleExport = () => {
    const current = getCurrentEdit();
    const json = JSON.stringify(current, null, 2);
    setExportJson(json);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current.name.replace(/\s+/g, '-').toLowerCase()}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.add('Theme exported to file!', 'success');
  };

  const handleCopyExport = () => {
    const current = getCurrentEdit();
    const json = JSON.stringify(current, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      toast.add('Theme JSON copied to clipboard!', 'success');
    }).catch(() => {
      toast.add('Failed to copy to clipboard', 'error');
    });
  };

  const handleImport = () => {
    setImportError('');
    if (!importJson().trim()) {
      setImportError('Please paste theme JSON first');
      return;
    }
    try {
      const id = themeContext.importTheme(importJson());
      if (id) {
        themeContext.applyTheme(id);
        setImportJson('');
        toast.add('Theme imported successfully!', 'success');
      } else {
        setImportError('Invalid theme format');
        toast.add('Invalid theme format', 'error');
      }
    } catch (e: any) {
      setImportError(e.message || 'Failed to import theme');
      toast.add('Failed to import theme', 'error');
    }
  };

  const handleFileImport = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const id = themeContext.importTheme(json);
        if (id) {
          themeContext.applyTheme(id);
          toast.add('Theme imported from file!', 'success');
        } else {
          toast.add('Invalid theme file', 'error');
        }
      } catch {
        toast.add('Failed to import theme', 'error');
      }
    };
    reader.readAsText(file);
    input.value = '';
  };

  const handleReset = () => {
    themeContext.resetToDefault();
    setEditingTheme(null);
    setHasChanges(false);
    toast.add('Theme reset to default!', 'success');
  };

  const handleDeleteCustom = (id: string) => {
    themeContext.deleteTheme(id);
    toast.add('Custom theme deleted', 'info');
  };

  const handleDuplicate = (themeId: string) => {
    const id = themeContext.duplicateTheme(themeId, `${themeContext.theme().name} Copy`);
    themeContext.applyTheme(id);
    toast.add('Theme duplicated!', 'success');
  };

  // Auto-update export JSON when tab changes
  createEffect(on(activeTab, () => {
    if (activeTab() === 'import') {
      const current = getCurrentEdit();
      setExportJson(JSON.stringify(current, null, 2));
    }
  }));

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'presets', label: 'Presets', icon: 'M4 5a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1z' },
    { id: 'colors', label: 'Colors', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'typography', label: 'Typography', icon: 'M4 6h16M4 12h16m-7 6h7' },
    { id: 'layout', label: 'Layout', icon: 'M4 5a1 1 0 011-1h14a1 1 0 110 2H5a1 1 0 01-1-1zm0 12a1 1 0 011-1h6a1 1 0 110 2H5a1 1 0 01-1-1zm0-6a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z' },
    { id: 'shadows', label: 'Shadows', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'import', label: 'Import/Export', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  ];

  const theme = getCurrentEdit;

  return (
    <MainLayout>
      <div class="space-y-6">
        {/* Header */}
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-2xl font-bold text-text-heading">Theme Settings</h1>
            <p class="text-text-secondary mt-1">Customize the look and feel of your entire application</p>
          </div>
          <div class="flex items-center gap-2">
            <Show when={hasChanges()}>
              <Button variant="ghost" onClick={cancelEditing}>Cancel</Button>
              <Show when={!showCreateForm()}>
                <Button onClick={() => setShowCreateForm(true)}>Save as New</Button>
              </Show>
              <Button onClick={applyChanges}>Apply Changes</Button>
            </Show>
          </div>
        </div>

        {/* Save as New Form */}
        <Show when={showCreateForm()}>
          <Card class="border-2 border-primary/30 bg-primary-50/50 dark:bg-primary-900/20">
            <div class="flex items-center gap-3">
              <input
                type="text"
                value={newThemeName()}
                onInput={(e) => setNewThemeName(e.currentTarget.value)}
                placeholder="Enter theme name..."
                class="flex-1 px-3 py-2 bg-bg-input rounded-lg border border-border text-text-primary text-sm"
                onKeyDown={(e) => e.key === 'Enter' && saveAsNewTheme()}
              />
              <Button onClick={saveAsNewTheme}>Save</Button>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </Card>
        </Show>

        {/* Mode Toggle */}
        <Card>
          <h3 class="text-lg font-semibold text-text-heading mb-4">Appearance Mode</h3>
          <div class="flex gap-3 flex-wrap">
            <For each={['light', 'dark', 'system'] as ThemeMode[]}>{(m) => (
              <button
                onClick={() => themeContext.setMode(m)}
                class={`flex-1 min-w-[120px] flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  themeStore.themeMode() === m
                    ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Show when={m === 'light'}>
                  <svg class="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                  </svg>
                </Show>
                <Show when={m === 'dark'}>
                  <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                  </svg>
                </Show>
                <Show when={m === 'system'}>
                  <svg class="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </Show>
                <span class="text-sm font-medium capitalize">{m}</span>
              </button>
            )}</For>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div class="flex gap-1 border-b border-border pb-2 overflow-x-auto">
          <For each={tabs}>{(tab) => (
            <button
              onClick={() => setActiveTab(tab.id)}
              class={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab() === tab.id
                  ? 'bg-primary text-text-inverse'
                  : 'text-text-secondary hover:bg-surface-variant'
              }`}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.icon}/>
              </svg>
              {tab.label}
            </button>
          )}</For>
        </div>

        {/* ===== PRESETS TAB ===== */}
        <Show when={activeTab() === 'presets'}>
          <div class="space-y-6">
            {/* Built-in Themes */}
            <div>
              <h3 class="text-lg font-semibold text-text-heading mb-3">Built-in Themes</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <For each={builtInThemes}>{(theme) => (
                  <div
                    onClick={() => {
                      themeContext.applyTheme(theme.id);
                      setEditingTheme(null);
                      setHasChanges(false);
                      toast.add(`Applied ${theme.name}`, 'success');
                    }}
                    class={`relative p-4 rounded-xl border-2 transition-all text-left group cursor-pointer ${
                      themeStore.currentThemeId() === theme.id && !editingTheme()
                        ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-10 h-10 rounded-lg shadow-sm" style={`background: ${theme.colors.brand.primary[500]}`} />
                      <div>
                        <p class="font-semibold text-text-heading">{theme.name}</p>
                        <p class="text-xs text-text-muted capitalize">{theme.mode} mode</p>
                      </div>
                    </div>
                    <div class="flex gap-1">
                      <For each={['primary', 'secondary', 'success', 'warning', 'error'] as const}>{(key) => (
                        <div class="flex-1 h-2 rounded-full" style={`background: ${theme.colors.brand[key][500]}`} />
                      )}</For>
                    </div>
                    <Show when={themeStore.currentThemeId() === theme.id && !editingTheme()}>
                      <div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-text-inverse flex items-center justify-center">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    </Show>
                    <div class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(theme.id); }}
                        class="p-1.5 rounded-md bg-surface-variant hover:bg-primary/10 text-text-secondary hover:text-primary text-xs cursor-pointer"
                        title="Duplicate"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                )}</For>
              </div>
            </div>

            {/* Custom Themes */}
            <Show when={themeContext.customThemes().length > 0}>
              <div>
                <h3 class="text-lg font-semibold text-text-heading mb-3">Custom Themes</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <For each={themeContext.customThemes()}>{(theme) => (
                    <div class={`relative p-4 rounded-xl border-2 transition-all ${
                      themeStore.currentThemeId() === theme.id
                        ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                        : 'border-border hover:border-primary/50'
                    }`}>
                      <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 rounded-lg shadow-sm" style={`background: ${theme.colors.brand.primary[500]}`} />
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold text-text-heading truncate">{theme.name}</p>
                          <p class="text-xs text-text-muted capitalize">{theme.mode} mode</p>
                        </div>
                      </div>
                      <div class="flex gap-1 mb-3">
                        <For each={['primary', 'secondary', 'success', 'warning', 'error'] as const}>{(key) => (
                          <div class="flex-1 h-2 rounded-full" style={`background: ${theme.colors.brand[key][500]}`} />
                        )}</For>
                      </div>
                      <div class="flex gap-2">
                        <button
                          onClick={() => {
                            themeContext.applyTheme(theme.id);
                            toast.add(`Applied ${theme.name}`, 'success');
                          }}
                          class="flex-1 px-3 py-1.5 rounded-lg bg-primary text-text-inverse text-sm font-medium hover:bg-primary-600 transition-colors"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            setEditingTheme(JSON.parse(JSON.stringify(theme)));
                            setActiveTab('colors');
                            setHasChanges(false);
                          }}
                          class="px-3 py-1.5 rounded-lg bg-surface-variant text-text-secondary text-sm hover:bg-secondary-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(theme.id)}
                          class="px-3 py-1.5 rounded-lg bg-surface-variant text-text-secondary text-sm hover:bg-secondary-100 transition-colors"
                          title="Duplicate"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCustom(theme.id)}
                          class="px-3 py-1.5 rounded-lg bg-surface-variant text-danger text-sm hover:bg-danger-50 transition-colors"
                          title="Delete"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}</For>
                </div>
              </div>
            </Show>

            {/* Create Custom Theme */}
            <button
              onClick={createCustomTheme}
              class="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-text-muted hover:text-primary"
            >
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              <span class="font-medium">Create Custom Theme</span>
            </button>
          </div>
        </Show>

        {/* ===== COLORS TAB ===== */}
        <Show when={activeTab() === 'colors'}>
          <div class="space-y-6">
            {/* Brand Color Presets */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Brand Color Presets</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <For each={['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const}>{(key) => (
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2 capitalize">{key} Color</label>
                    <div class="space-y-1.5">
                      <For each={Object.entries(PRESET_COLOR_SCALES)}>{([name, scale]) => {
                        const isActive = () => JSON.stringify(theme().colors.brand[key]) === JSON.stringify(scale);
                        return (
                          <button
                            onClick={() => applyColorScale(key, scale)}
                            class={`w-full flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                              isActive()
                                ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div class="w-6 h-6 rounded-md shadow-sm" style={`background: ${scale[500]}`} />
                            <span class="text-sm text-text-primary capitalize">{name}</span>
                          </button>
                        );
                      }}</For>
                    </div>
                    {/* Color Scale Editor */}
                    <Show when={hasChanges()}>
                      <div class="mt-3 pt-3 border-t border-border">
                        <p class="text-xs text-text-muted mb-2">Custom shades</p>
                        <div class="grid grid-cols-3 gap-1">
                          <For each={['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']}>{(shade) => (
                            <div class="flex items-center gap-1">
                              <input
                                type="color"
                                value={theme().colors.brand[key][shade as unknown as keyof ColorScale]}
                                onInput={(e) => updateColorScaleShade(key, shade, e.currentTarget.value)}
                                class="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                style="min-width: 24px"
                              />
                              <span class="text-[10px] text-text-muted">{shade}</span>
                            </div>
                          )}</For>
                        </div>
                      </div>
                    </Show>
                  </div>
                )}</For>
              </div>
            </Card>

            {/* Background Colors */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Background Colors</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <For each={['primary', 'secondary', 'card', 'sidebar', 'header', 'input'] as const}>{(key) => (
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                    <div class="flex gap-2">
                      <input
                        type="color"
                        value={theme().colors.background[key]}
                        onInput={(e) => { startEditing(); updateTheme(`colors.background.${key}`, e.currentTarget.value); }}
                        class="w-12 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={theme().colors.background[key]}
                        onInput={(e) => { startEditing(); updateTheme(`colors.background.${key}`, e.currentTarget.value); }}
                        class="flex-1 px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary"
                      />
                    </div>
                  </div>
                )}</For>
              </div>
            </Card>

            {/* Text Colors */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Text Colors</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <For each={['primary', 'secondary', 'muted', 'heading', 'link', 'linkHover'] as const}>{(key) => (
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                    <div class="flex gap-2">
                      <input
                        type="color"
                        value={theme().colors.text[key]}
                        onInput={(e) => { startEditing(); updateTheme(`colors.text.${key}`, e.currentTarget.value); }}
                        class="w-12 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={theme().colors.text[key]}
                        onInput={(e) => { startEditing(); updateTheme(`colors.text.${key}`, e.currentTarget.value); }}
                        class="flex-1 px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary"
                      />
                    </div>
                  </div>
                )}</For>
              </div>
            </Card>
          </div>
        </Show>

        {/* ===== TYPOGRAPHY TAB ===== */}
        <Show when={activeTab() === 'typography'}>
          <div class="space-y-6">
            {/* Font Families */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Font Families</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <For each={['heading', 'body', 'mono'] as const}>{(key) => (
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2 capitalize">{key} Font</label>
                    <select
                      value={theme().typography.fontFamily[key]}
                      onChange={(e) => { startEditing(); updateTheme(`typography.fontFamily.${key}`, e.currentTarget.value); }}
                      class="w-full px-3 py-2 bg-bg-input rounded-lg border border-border text-text-primary text-sm"
                    >
                      <For each={Object.entries(FONT_FAMILIES)}>{([k, font]) => (
                        <option value={font.value}>{font.name}</option>
                      )}</For>
                    </select>
                    <p class="mt-2 text-sm" style={`font-family: ${theme().typography.fontFamily[key]}`}>
                      The quick brown fox jumps over the lazy dog.
                    </p>
                  </div>
                )}</For>
              </div>
            </Card>

            {/* Font Sizes */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Font Size Scale</h3>
              <div class="space-y-3">
                <For each={['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'] as const}>{(key) => (
                  <div class="flex items-center gap-4">
                    <span class="w-12 text-sm font-medium text-text-secondary uppercase">{key}</span>
                    <input
                      type="text"
                      value={theme().typography.fontSize[key]}
                      onInput={(e) => { startEditing(); updateTheme(`typography.fontSize.${key}`, e.currentTarget.value); }}
                      class="w-24 px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary"
                    />
                    <div class="flex-1 overflow-hidden">
                      <span class="text-text-primary truncate block" style={`font-size: ${theme().typography.fontSize[key]}`}>
                        The quick brown fox jumps over the lazy dog.
                      </span>
                    </div>
                  </div>
                )}</For>
              </div>
            </Card>

            {/* Font Weights */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Font Weights</h3>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <For each={['light', 'normal', 'medium', 'semibold', 'bold'] as const}>{(key) => (
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2 capitalize">{key}</label>
                    <input
                      type="number"
                      value={theme().typography.fontWeight[key]}
                      onInput={(e) => { startEditing(); updateTheme(`typography.fontWeight.${key}`, Number(e.currentTarget.value)); }}
                      min={100}
                      max={900}
                      step={100}
                      class="w-full px-3 py-2 bg-bg-input rounded-lg border border-border text-sm text-text-primary"
                    />
                    <p class="mt-2" style={`font-weight: ${theme().typography.fontWeight[key]}`}>
                      Aa
                    </p>
                  </div>
                )}</For>
              </div>
            </Card>

            {/* Line Height & Letter Spacing */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Line Height & Letter Spacing</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 class="text-sm font-medium text-text-secondary mb-3">Line Height</h4>
                  <div class="space-y-3">
                    <For each={['tight', 'normal', 'relaxed'] as const}>{(key) => (
                      <div class="flex items-center gap-3">
                        <span class="w-16 text-sm text-text-secondary capitalize">{key}</span>
                        <input
                          type="number"
                          value={theme().typography.lineHeight[key]}
                          onInput={(e) => { startEditing(); updateTheme(`typography.lineHeight.${key}`, Number(e.currentTarget.value)); }}
                          step={0.05}
                          class="w-20 px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary"
                        />
                        <p class="flex-1 text-sm text-text-primary" style={`line-height: ${theme().typography.lineHeight[key]}`}>
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        </p>
                      </div>
                    )}</For>
                  </div>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-text-secondary mb-3">Letter Spacing</h4>
                  <div class="space-y-3">
                    <For each={['tight', 'normal', 'wide'] as const}>{(key) => (
                      <div class="flex items-center gap-3">
                        <span class="w-16 text-sm text-text-secondary capitalize">{key}</span>
                        <input
                          type="text"
                          value={theme().typography.letterSpacing[key]}
                          onInput={(e) => { startEditing(); updateTheme(`typography.letterSpacing.${key}`, e.currentTarget.value); }}
                          class="w-24 px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary"
                        />
                        <p class="flex-1 text-sm text-text-primary uppercase" style={`letter-spacing: ${theme().typography.letterSpacing[key]}`}>
                          Sample
                        </p>
                      </div>
                    )}</For>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Show>

        {/* ===== LAYOUT TAB ===== */}
        <Show when={activeTab() === 'layout'}>
          <div class="space-y-6">
            {/* Dimensions */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Dimensions</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <For each={[
                  { key: 'containerMaxWidth', label: 'Container Max Width' },
                  { key: 'sidebarWidth', label: 'Sidebar Width' },
                  { key: 'headerHeight', label: 'Header Height' },
                ]}>{(item) => (
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2">{item.label}</label>
                    <input
                      type="text"
                      value={(theme().layout as any)[item.key] as string}
                      onInput={(e) => { startEditing(); updateTheme(`layout.${item.key}`, e.currentTarget.value); }}
                      class="w-full px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary"
                    />
                  </div>
                )}</For>
              </div>
            </Card>

            {/* Border Radius */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Border Radius</h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                <For each={['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] as const}>{(key) => (
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2 uppercase">{key}</label>
                    <div class="flex gap-2 items-center">
                      <input
                        type="text"
                        value={theme().colors.border.radius[key]}
                        onInput={(e) => { startEditing(); updateTheme(`colors.border.radius.${key}`, e.currentTarget.value); }}
                        class="flex-1 px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary min-w-0"
                      />
                      <div class="w-10 h-10 bg-primary flex-shrink-0" style={`border-radius: ${theme().colors.border.radius[key]}`} />
                    </div>
                  </div>
                )}</For>
              </div>
            </Card>

            {/* Border Width */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Border Width</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <For each={['thin', 'default', 'thick'] as const}>{(key) => (
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2 capitalize">{key}</label>
                    <input
                      type="text"
                      value={theme().colors.border.width[key]}
                      onInput={(e) => { startEditing(); updateTheme(`colors.border.width.${key}`, e.currentTarget.value); }}
                      class="w-full px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary"
                    />
                    <div class="mt-3 p-4 bg-bg-card rounded-lg" style={`border: ${theme().colors.border.width[key]} solid var(--border)`}>
                      <span class="text-sm text-text-primary">Border preview</span>
                    </div>
                  </div>
                )}</For>
              </div>
            </Card>

            {/* Spacing Mode */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Spacing Mode</h3>
              <div class="flex gap-3">
                <For each={['compact', 'comfortable'] as const}>{(mode) => (
                  <button
                    onClick={() => { startEditing(); updateTheme('layout.spacing', mode); }}
                    class={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      theme().layout.spacing === mode
                        ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p class="font-medium text-text-heading capitalize">{mode}</p>
                    <p class="text-sm text-text-secondary mt-1">
                      {mode === 'compact' ? 'Reduced padding and margins' : 'Standard padding and margins'}
                    </p>
                  </button>
                )}</For>
              </div>
            </Card>
          </div>
        </Show>

        {/* ===== SHADOWS TAB ===== */}
        <Show when={activeTab() === 'shadows'}>
          <div class="space-y-6">
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-4">Shadow Scale</h3>
              <div class="space-y-4">
                <For each={['none', 'sm', 'md', 'lg', 'xl', '2xl'] as const}>{(key) => (
                  <div class="flex items-center gap-4">
                    <span class="w-12 text-sm font-medium text-text-secondary uppercase">{key}</span>
                    <input
                      type="text"
                      value={theme().colors.shadow[key]}
                      onInput={(e) => { startEditing(); updateTheme(`colors.shadow.${key}`, e.currentTarget.value); }}
                      class="flex-1 px-3 py-2 bg-bg-input rounded-lg border border-border text-sm font-mono text-text-primary"
                    />
                    <div class="w-16 h-16 bg-bg-card rounded-lg flex-shrink-0" style={`box-shadow: ${theme().colors.shadow[key]}`} />
                  </div>
                )}</For>
              </div>
            </Card>
          </div>
        </Show>

        {/* ===== IMPORT/EXPORT TAB ===== */}
        <Show when={activeTab() === 'import'}>
          <div class="space-y-6">
            {/* Export to File */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-2">Export Theme</h3>
              <p class="text-text-secondary mb-4">Download the current theme as a JSON file, or copy to clipboard.</p>
              <div class="flex gap-2 flex-wrap">
                <Button onClick={handleExport}>
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Download JSON
                </Button>
                <Button variant="secondary" onClick={handleCopyExport}>
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                  </svg>
                  Copy to Clipboard
                </Button>
              </div>
            </Card>

            {/* Export Preview */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-2">Theme JSON</h3>
              <textarea
                value={exportJson()}
                readOnly
                class="w-full h-48 px-3 py-2 bg-bg-input rounded-lg border border-border text-xs font-mono text-text-primary resize-y"
              />
            </Card>

            {/* Import from File */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-2">Import from File</h3>
              <p class="text-text-secondary mb-4">Upload a theme JSON file to apply it.</p>
              <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                <svg class="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <span class="text-sm text-text-muted mt-2">Click to upload or drag and drop</span>
                <input type="file" accept=".json" class="hidden" onChange={handleFileImport} />
              </label>
            </Card>

            {/* Import from Text */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-2">Import from Text</h3>
              <p class="text-text-secondary mb-4">Paste theme JSON below to import.</p>
              <textarea
                value={importJson()}
                onInput={(e) => { setImportJson(e.currentTarget.value); setImportError(''); }}
                placeholder="Paste theme JSON here..."
                class="w-full h-48 px-3 py-2 bg-bg-input rounded-lg border border-border text-xs font-mono text-text-primary resize-y mb-3"
              />
              <Show when={importError()}>
                <p class="text-sm text-danger mb-3">{importError()}</p>
              </Show>
              <Button onClick={handleImport}>
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Import Theme
              </Button>
            </Card>

            {/* Reset */}
            <Card>
              <h3 class="text-lg font-semibold text-text-heading mb-2">Reset to Default</h3>
              <p class="text-text-secondary mb-4">Reset all theme settings to the default configuration. This will not delete custom themes.</p>
              <Button variant="danger" onClick={handleReset}>
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Reset to Default
              </Button>
            </Card>
          </div>
        </Show>

        {/* ===== LIVE PREVIEW ===== */}
        <Show when={showPreview()}>
          <div class="sticky bottom-4 z-40">
            <Card class="bg-bg-card border-2 border-primary/20 shadow-xl">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold text-text-heading">Live Preview</h3>
                  <Show when={hasChanges()}>
                    <span class="text-xs px-2 py-1 rounded-full bg-primary text-text-inverse font-medium animate-pulse">Previewing Changes</span>
                  </Show>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  class="p-1 rounded-lg hover:bg-surface-variant text-text-muted"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="p-3 rounded-lg bg-bg-primary border border-border">
                  <p class="text-sm font-semibold text-text-heading">Primary BG</p>
                  <p class="text-xs text-text-secondary mt-1">Sample text</p>
                </div>
                <div class="p-3 rounded-lg bg-bg-secondary border border-border">
                  <p class="text-sm font-semibold text-text-heading">Secondary BG</p>
                  <p class="text-xs text-text-secondary mt-1">Sample text</p>
                </div>
                <div class="p-3 rounded-lg bg-bg-card border border-border">
                  <p class="text-sm font-semibold text-text-heading">Card BG</p>
                  <p class="text-xs text-text-secondary mt-1">Sample text</p>
                </div>
                <div class="p-3 rounded-lg bg-primary text-text-inverse">
                  <p class="text-sm font-semibold">Primary</p>
                  <p class="text-xs mt-1 opacity-80">Brand color</p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 mt-3">
                <span class="px-3 py-1.5 rounded-md bg-primary text-text-inverse text-sm font-medium">Primary</span>
                <span class="px-3 py-1.5 rounded-md bg-secondary text-text-inverse text-sm font-medium">Secondary</span>
                <span class="px-3 py-1.5 rounded-md bg-success text-text-inverse text-sm font-medium">Success</span>
                <span class="px-3 py-1.5 rounded-md bg-warning text-text-inverse text-sm font-medium">Warning</span>
                <span class="px-3 py-1.5 rounded-md bg-error text-text-inverse text-sm font-medium">Error</span>
                <span class="px-3 py-1.5 rounded-md bg-info text-text-inverse text-sm font-medium">Info</span>
              </div>

              <div class="mt-3 p-3 rounded-lg bg-bg-input border border-border">
                <p class="text-sm font-medium text-text-heading" style={`font-family: ${theme().typography.fontFamily.heading}`}>Heading Font Preview</p>
                <p class="text-sm text-text-secondary mt-1" style={`font-family: ${theme().typography.fontFamily.body}`}>Body font preview with current typography settings applied to all text.</p>
              </div>

              <div class="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                <For each={['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']}>{(shade) => (
                  <div class="h-6 rounded-md" style={`background: var(--primary-${shade})`} />
                )}</For>
              </div>
            </Card>
          </div>
        </Show>

        {/* Show preview button when hidden */}
        <Show when={!showPreview()}>
          <button
            onClick={() => setShowPreview(true)}
            class="fixed bottom-4 right-4 z-40 px-4 py-2 bg-primary text-text-inverse rounded-lg shadow-lg hover:bg-primary-600 transition-colors font-medium text-sm flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Show Preview
          </button>
        </Show>
      </div>
    </MainLayout>
  );
}

export default ThemeSettings;
