import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeMenuTraffic } from '../components/home-menu-traffic';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/auth-store';

type HomePanel = 'skins' | 'settings' | 'admin-tools' | null;
type SkinId = 'pulse' | 'nova' | 'volt';

type HomeSettings = {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  showHitFlash: boolean;
};

const homeSkinStorageKey = 'dashforge-home-skin';
const homeSettingsStorageKey = 'dashforge-home-settings';

const skinOptions: Array<{
  id: SkinId;
  name: string;
  accent: string;
  flavor: string;
}> = [
  {
    id: 'pulse',
    name: 'Pulse',
    accent: 'Pink-Cyan',
    flavor: 'Fast neon default with sharp contrast.',
  },
  {
    id: 'nova',
    name: 'Nova',
    accent: 'Gold-Orange',
    flavor: 'Warm arcade glow for brighter stages.',
  },
  {
    id: 'volt',
    name: 'Volt',
    accent: 'Lime-Blue',
    flavor: 'Electric palette tuned for clear silhouettes.',
  },
];

const adminToolOptions = [
  {
    id: 'dashboard',
    name: 'Control Room',
    accent: 'Overview Hub',
    flavor: 'Главная админ-панель со статусом системы и быстрыми переходами.',
    route: '/admin',
    routeLabel: '/admin',
  },
  {
    id: 'queue',
    name: 'Review Queue',
    accent: 'Moderation Flow',
    flavor: 'Проверка отправленных уровней, official-решения и publish control.',
    route: '/admin/levels',
    routeLabel: '/admin/levels',
  },
  {
    id: 'forge',
    name: 'Official Forge',
    accent: 'Create Stage',
    flavor: 'Старт нового official-уровня с админским драфтом и редактором.',
    route: '/admin/create-official',
    routeLabel: '/admin/create-official',
  },
  {
    id: 'skins',
    name: 'Skin Lab',
    accent: 'Pixel Workshop',
    flavor: 'Редактор скинов с заливкой, слоями, undo/redo и игровым preview.',
    route: '/admin/player-skins',
    routeLabel: '/admin/player-skins',
  },
  {
    id: 'users',
    name: 'Users',
    accent: 'Account Watch',
    flavor: 'Список игроков, статусы аккаунтов и быстрая ручная проверка.',
    route: '/admin/users',
    routeLabel: '/admin/users',
  },
] as const;

const defaultSettings: HomeSettings = {
  musicVolume: 70,
  sfxVolume: 80,
  screenShake: true,
  showHitFlash: true,
};

function isSkinId(value: string | null): value is SkinId {
  return value === 'pulse' || value === 'nova' || value === 'volt';
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readStoredSkin() {
  if (typeof window === 'undefined') {
    return 'pulse' as SkinId;
  }

  const storedValue = window.localStorage.getItem(homeSkinStorageKey);
  return isSkinId(storedValue) ? storedValue : 'pulse';
}

function readStoredSettings(): HomeSettings {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  const raw = window.localStorage.getItem(homeSettingsStorageKey);

  if (!raw) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HomeSettings>;

    return {
      musicVolume: clampPercentage(parsed.musicVolume ?? defaultSettings.musicVolume),
      sfxVolume: clampPercentage(parsed.sfxVolume ?? defaultSettings.sfxVolume),
      screenShake: Boolean(parsed.screenShake ?? defaultSettings.screenShake),
      showHitFlash: Boolean(parsed.showHitFlash ?? defaultSettings.showHitFlash),
    };
  } catch {
    return defaultSettings;
  }
}

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const playRoute = '/levels';
  const builderRoute = user ? '/my-levels' : '/register';
  const homeScreenRef = useRef<HTMLDivElement | null>(null);
  const [activePanel, setActivePanel] = useState<HomePanel>(null);
  const [selectedSkin, setSelectedSkin] = useState<SkinId>(() => readStoredSkin());
  const [settings, setSettings] = useState<HomeSettings>(() => readStoredSettings());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(homeSkinStorageKey, selectedSkin);
  }, [selectedSkin]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(homeSettingsStorageKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!activePanel) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePanel(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePanel]);

  return (
    <div ref={homeScreenRef} className="game-home-screen" data-screen-shake={settings.screenShake ? 'on' : 'off'}>
      <div className="game-home-atmosphere" aria-hidden="true">
        <div className="game-home-stars" />
        <div className="game-home-planet-glow" />
        <div className="game-home-planet" />
        <div className="game-home-grid" />
        <div className="game-home-skyline game-home-skyline--rear" />
        <div className="game-home-skyline game-home-skyline--front" />
        <div className="game-home-stage-lane" />
        <div className="game-home-stage-blocks" />
        <div className="game-home-floating-cube game-home-floating-cube--left" />
        <div className="game-home-floating-cube game-home-floating-cube--right" />
      </div>

      <HomeMenuTraffic screenRef={homeScreenRef} showHitFlash={settings.showHitFlash} />

      <div className="game-home-shell">
        <div className="game-home-shell-content">
          <header className="game-home-hero">
            <h1 className="game-home-title" aria-label="DashForge">
              <span className="game-home-title-word" data-title="Dash">
                Dash
              </span>
              <span className="game-home-title-word" data-title="Forge">
                Forge
              </span>
            </h1>
          </header>

          <div className="game-home-primary">
            <div className="game-home-button-row">
              <div className="game-home-button-slot game-home-button-slot--skin">
                <button
                  type="button"
                  className="game-home-main-button game-home-main-button--skin"
                  onClick={() => setActivePanel('skins')}
                  aria-label="Skin Select"
                >
                  <span className="game-home-main-button-core">
                    <span className="game-home-main-button-sprite game-home-main-button-sprite--skin" />
                  </span>
                </button>
                <span className="game-home-button-caption">Character Select</span>
              </div>

              <Link
                to={playRoute}
                className="game-home-main-button game-home-main-button--play"
                aria-label="Play"
              >
                <span className="game-home-main-button-core">
                  <span className="game-home-main-button-sprite game-home-main-button-sprite--play" />
                </span>
              </Link>

              <div className="game-home-button-slot game-home-button-slot--builder">
                <Link
                  to={builderRoute}
                  className="game-home-main-button game-home-main-button--builder"
                  aria-label="Level Builder"
                >
                  <span className="game-home-main-button-core">
                    <span className="game-home-main-button-sprite game-home-main-button-sprite--builder" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="game-home-submenu">
            {isAdmin ? (
              <button
                type="button"
                className="game-home-submenu-button game-home-submenu-button--admin"
                onClick={() => setActivePanel('admin-tools')}
                aria-label="Admin Tools"
              >
                <span className="game-home-submenu-icon game-home-submenu-icon--admin" aria-hidden="true">
                  Admin
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="game-home-submenu-button game-home-submenu-button--settings"
              onClick={() => setActivePanel('settings')}
              aria-label="Settings"
            />
            <Link
              to="/leaderboard"
              className="game-home-submenu-button game-home-submenu-button--leaderboard"
              aria-label="Leaderboard"
            >
              <span className="game-home-submenu-icon game-home-submenu-icon--leaderboard" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {activePanel === 'skins' ? (
        <div className="game-home-overlay" role="presentation" onClick={() => setActivePanel(null)}>
          <div className="game-home-panel" role="dialog" aria-modal="true" aria-label="Skin Select" onClick={(event) => event.stopPropagation()}>
            <div className="game-home-panel-header">
              <div>
                <p className="game-home-panel-kicker">Garage</p>
                <h2 className="game-home-panel-title">Skin Select</h2>
              </div>
              <button type="button" className="game-home-close" onClick={() => setActivePanel(null)}>
                Close
              </button>
            </div>

            <div className="game-home-skin-grid">
              {skinOptions.map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  className={cn('game-home-skin-card', selectedSkin === skin.id && 'is-active')}
                  onClick={() => setSelectedSkin(skin.id)}
                >
                  <span className="game-home-skin-preview" data-preview-skin={skin.id}>
                    <span />
                  </span>
                  <span className="game-home-skin-name">{skin.name}</span>
                  <span className="game-home-skin-accent">{skin.accent}</span>
                  <span className="game-home-skin-flavor">{skin.flavor}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'settings' ? (
        <div className="game-home-overlay" role="presentation" onClick={() => setActivePanel(null)}>
          <div className="game-home-panel" role="dialog" aria-modal="true" aria-label="Settings" onClick={(event) => event.stopPropagation()}>
            <div className="game-home-panel-header">
              <div>
                <p className="game-home-panel-kicker">Options</p>
                <h2 className="game-home-panel-title">Settings</h2>
              </div>
              <button type="button" className="game-home-close" onClick={() => setActivePanel(null)}>
                Close
              </button>
            </div>

            <div className="game-home-settings-grid">
              <label className="game-home-slider">
                <div className="game-home-slider-copy">
                  <span>Music Volume</span>
                  <strong>{settings.musicVolume}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      musicVolume: clampPercentage(Number(event.target.value)),
                    }))
                  }
                />
              </label>

              <label className="game-home-slider">
                <div className="game-home-slider-copy">
                  <span>SFX Volume</span>
                  <strong>{settings.sfxVolume}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      sfxVolume: clampPercentage(Number(event.target.value)),
                    }))
                  }
                />
              </label>

              <div className="game-home-toggle-row">
                <button
                  type="button"
                  className={cn('game-home-toggle', settings.screenShake && 'is-active')}
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      screenShake: !current.screenShake,
                    }))
                  }
                >
                  Screen Shake
                </button>
                <button
                  type="button"
                  className={cn('game-home-toggle', settings.showHitFlash && 'is-active')}
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      showHitFlash: !current.showHitFlash,
                    }))
                  }
                >
                  Hit Flash
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'admin-tools' && isAdmin ? (
        <div className="game-home-overlay" role="presentation" onClick={() => setActivePanel(null)}>
          <div className="game-home-panel" role="dialog" aria-modal="true" aria-label="Admin Tools" onClick={(event) => event.stopPropagation()}>
            <div className="game-home-panel-header">
              <div>
                <p className="game-home-panel-kicker">Admin Access</p>
                <h2 className="game-home-panel-title">Admin Tools</h2>
              </div>
              <button type="button" className="game-home-close" onClick={() => setActivePanel(null)}>
                Close
              </button>
            </div>

            <div className="game-home-skin-grid game-home-skin-grid--admin">
              {adminToolOptions.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.route}
                  className="game-home-skin-card game-home-skin-card--tool"
                  onClick={() => setActivePanel(null)}
                >
                  <span className="game-home-tool-preview" data-admin-tool={tool.id}>
                    <strong>{tool.name.slice(0, 3).toUpperCase()}</strong>
                  </span>
                  <span className="game-home-skin-name">{tool.name}</span>
                  <span className="game-home-skin-accent">{tool.accent}</span>
                  <span className="game-home-skin-flavor">{tool.flavor}</span>
                  <span className="game-home-tool-route">{tool.routeLabel}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
