export type ThemePreference = 'light' | 'dark' | 'system';

export interface UiPreferences {
  theme: ThemePreference;
  sidebarCollapsed: boolean;
  autoPreview: boolean;
  previewDelayMs: number;
}

export const defaultUiPreferences: UiPreferences = {
  theme: 'system',
  sidebarCollapsed: false,
  autoPreview: true,
  previewDelayMs: 800,
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const STORAGE_KEY = 'resume-studio:ui-preferences:v1';

function browserStorage(): StorageLike | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

export function loadUiPreferences(storage = browserStorage()): UiPreferences {
  if (!storage) return { ...defaultUiPreferences };
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return { ...defaultUiPreferences };
    const p = value as Record<string, unknown>;
    if (!['light', 'dark', 'system'].includes(String(p.theme)) || typeof p.sidebarCollapsed !== 'boolean' ||
        typeof p.autoPreview !== 'boolean' || typeof p.previewDelayMs !== 'number' ||
        !Number.isInteger(p.previewDelayMs) || p.previewDelayMs < 500 || p.previewDelayMs > 2000) {
      return { ...defaultUiPreferences };
    }
    return { theme: p.theme as ThemePreference, sidebarCollapsed: p.sidebarCollapsed, autoPreview: p.autoPreview, previewDelayMs: p.previewDelayMs };
  } catch { return { ...defaultUiPreferences }; }
}

export function saveUiPreferences(preferences: UiPreferences, storage = browserStorage()): void {
  if (!storage) return;
  const { theme, sidebarCollapsed, autoPreview, previewDelayMs } = preferences;
  if (!['light', 'dark', 'system'].includes(theme) || typeof sidebarCollapsed !== 'boolean' || typeof autoPreview !== 'boolean' ||
      !Number.isInteger(previewDelayMs) || previewDelayMs < 500 || previewDelayMs > 2000) return;
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ theme, sidebarCollapsed, autoPreview, previewDelayMs })); } catch { /* Storage can be disabled or full. */ }
}
