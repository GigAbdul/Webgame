import type { LevelData } from '../../types/models';

const HOME_SETTINGS_STORAGE_KEY = 'dashforge-home-settings';
const DEFAULT_MUSIC_VOLUME = 0.7;
const builtInMusicLabels: Record<string, string> = {
  none: 'No Music',
  'placeholder-track-01': 'Placeholder Track 01',
  'placeholder-track-02': 'Placeholder Track 02',
};

export function readStoredMusicVolume() {
  if (typeof window === 'undefined') {
    return DEFAULT_MUSIC_VOLUME;
  }

  try {
    const raw = window.localStorage.getItem(HOME_SETTINGS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_MUSIC_VOLUME;
    }

    const parsed = JSON.parse(raw) as Partial<{ musicVolume: number }>;
    const value = Number(parsed.musicVolume);

    if (!Number.isFinite(value)) {
      return DEFAULT_MUSIC_VOLUME;
    }

    return Math.max(0, Math.min(1, value / 100));
  } catch {
    return DEFAULT_MUSIC_VOLUME;
  }
}

export function resolveLevelMusic(meta: LevelData['meta']) {
  const source = meta.music?.trim() ?? '';

  if (!source || source === 'none') {
    return {
      src: null,
      label: meta.musicLabel?.trim() || builtInMusicLabels.none,
      isCustom: false,
    };
  }

  const isCustomSource =
    source.startsWith('data:audio/') ||
    source.startsWith('blob:') ||
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.startsWith('/');

  return {
    src: isCustomSource ? source : null,
    label: meta.musicLabel?.trim() || builtInMusicLabels[source] || source,
    isCustom: isCustomSource,
  };
}
