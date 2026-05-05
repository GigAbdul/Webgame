import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HomeMenuTraffic } from '../components/home-menu-traffic';
import { PlayerModelCanvas } from '../features/game/player-model-canvas';
import { getPlayerModeLabel } from '../features/game/player-mode-config';
import {
  playerSkinModes,
  usePlayerSkinSelectionStore,
  useSelectedPlayerSkinRecord,
} from '../features/game/player-skin-selection';
import { usePlayerSkinsQuery } from '../features/game/player-skins';
import { ApiClientError, apiRequest } from '../services/api';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/auth-store';
import type { PlayerMode, User } from '../types/models';
import { z } from 'zod';

type HomePanel = 'skins' | 'settings' | 'account' | 'admin-tools' | null;
type HomeAuthDialog = 'login' | 'register' | 'verify-email' | null;

type HomeSettings = {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  showHitFlash: boolean;
};

const homeSettingsStorageKey = 'dashforge-home-settings';

const adminToolOptions = [
  {
    id: 'dashboard',
    name: 'Control Room',
    accent: 'Overview Hub',
    flavor: 'System status, publishing shortcuts, and admin navigation in one compact hub.',
    route: '/admin',
    routeLabel: '/admin',
  },
  {
    id: 'queue',
    name: 'Review Queue',
    accent: 'Moderation Flow',
    flavor: 'Review submitted levels, adjust official status, and keep publish decisions traceable.',
    route: '/admin/levels',
    routeLabel: '/admin/levels',
  },
  {
    id: 'forge',
    name: 'Official Forge',
    accent: 'Create Stage',
    flavor: 'Start a new official stage draft and jump straight into the editor flow.',
    route: '/admin/create-official',
    routeLabel: '/admin/create-official',
  },
  {
    id: 'skins',
    name: 'Skin Lab',
    accent: 'Pixel Workshop',
    flavor: 'Tune player skins with layers, undo and redo, pixel tools, and a live gameplay preview.',
    route: '/admin/player-skins',
    routeLabel: '/admin/player-skins',
  },
  {
    id: 'users',
    name: 'Users',
    accent: 'Account Watch',
    flavor: 'Inspect player accounts, roles, star totals, and moderation signals quickly.',
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

const allowedRegistrationEmailDomains = ['apec.edu.kz', 'gmail.com', 'mail.ru', 'outlook.com'] as const;
const allowedRegistrationEmailDomainMessage =
  'Use an email from apec.edu.kz, gmail.com, mail.ru, or outlook.com';

function hasAllowedRegistrationEmailDomain(email: string) {
  const domain = email.trim().toLowerCase().split('@').pop() ?? '';

  return allowedRegistrationEmailDomains.includes(
    domain as (typeof allowedRegistrationEmailDomains)[number],
  );
}

const homeRegistrationEmailSchema = z
  .string()
  .trim()
  .max(254, 'Email must be 254 characters or fewer')
  .email('Enter a valid email address')
  .refine(hasAllowedRegistrationEmailDomain, allowedRegistrationEmailDomainMessage);

const homeLoginSchema = z.object({
  email: z.string().trim().max(254, 'Email must be 254 characters or fewer').email('Enter a valid email address'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password must be 128 characters or fewer'),
});

const homeRegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be 24 characters or fewer')
    .regex(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers, and underscores'),
  email: homeRegistrationEmailSchema,
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password must be 128 characters or fewer')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
});

const homeEmailVerificationSchema = z.object({
  email: z.string().trim().max(254, 'Email must be 254 characters or fewer').email('Enter a valid email address'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit code from your email'),
});

type HomeAuthResponse = {
  token: string;
  user: User;
};

type EmailVerificationRequiredResponse = {
  requiresEmailVerification: true;
  email: string;
  expiresAt: string | null;
};

type ResendVerificationResponse =
  | (EmailVerificationRequiredResponse & { sent: true })
  | {
      email: string;
      sent?: true;
      alreadyVerified?: true;
    };

function getHomeAuthErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? 'Check the highlighted fields and try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function getEmailVerificationDetails(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return null;
  }

  const details = error.details;

  if (
    typeof details !== 'object' ||
    details === null ||
    !('requiresEmailVerification' in details) ||
    !('email' in details)
  ) {
    return null;
  }

  const maybeEmail = (details as { email?: unknown }).email;

  return typeof maybeEmail === 'string' ? { email: maybeEmail } : null;
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const playerSkinsQuery = usePlayerSkinsQuery();
  const selectedPlayerSkinRecord = useSelectedPlayerSkinRecord();
  const playerSkinSelection = usePlayerSkinSelectionStore((state) => state.selection);
  const setPlayerSkinSelection = usePlayerSkinSelectionStore((state) => state.setSelection);
  const isAdmin = user?.role === 'ADMIN';
  const playRoute = '/levels';
  const builderRoute = user ? '/my-levels' : '/?auth=register';
  const homeScreenRef = useRef<HTMLDivElement | null>(null);
  const [activePanel, setActivePanel] = useState<HomePanel>(null);
  const [authDialog, setAuthDialog] = useState<HomeAuthDialog>(null);
  const [settings, setSettings] = useState<HomeSettings>(() => readStoredSettings());
  const [isAccountHelpOpen, setIsAccountHelpOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [emailVerificationForm, setEmailVerificationForm] = useState({
    email: '',
    code: '',
  });
  const publishedPlayerSkins = playerSkinsQuery.data?.skins ?? null;
  const publishedSkinCount = playerSkinModes.filter((mode) => Boolean(publishedPlayerSkins?.[mode])).length;
  const musicRangeStyle = { '--settings-range-fill': `${settings.musicVolume}%` } as CSSProperties;
  const sfxRangeStyle = { '--settings-range-fill': `${settings.sfxVolume}%` } as CSSProperties;

  useEffect(() => {
    const authTarget = searchParams.get('auth');

    if (authTarget !== 'login' && authTarget !== 'register') {
      return;
    }

    const fromPath = searchParams.get('from');
    setAuthRedirectPath(fromPath?.startsWith('/') && !fromPath.startsWith('//') ? fromPath : null);
    setActivePanel('account');
    setAuthDialog(authTarget);
    setAuthError(null);
    setAuthInfo(null);
    setIsAccountHelpOpen(false);
    navigate('/', { replace: true });
  }, [navigate, searchParams]);

  function getEquippedSkinSource(mode: PlayerMode) {
    return playerSkinSelection[mode] === 'published' && publishedPlayerSkins?.[mode] ? 'published' : 'default';
  }

  function openAccountPanel() {
    setActivePanel('account');
    setAuthDialog(null);
    setAuthError(null);
    setAuthInfo(null);
    setIsAccountHelpOpen(false);
  }

  function closeAuthDialog() {
    setAuthDialog(null);
    setAuthError(null);
    setAuthInfo(null);
    setAuthRedirectPath(null);
    setEmailVerificationForm({ email: '', code: '' });
  }

  function openAuthDialog(mode: Exclude<HomeAuthDialog, null>) {
    setAuthDialog(mode);
    setAuthError(null);
    setAuthInfo(null);
    setIsAccountHelpOpen(false);
  }

  function completeAuth(response: HomeAuthResponse) {
    setAuth(response.token, response.user);
    const nextRoute = authRedirectPath;
    setAuthDialog(null);
    setAuthError(null);
    setAuthInfo(null);
    setAuthRedirectPath(null);
    setIsAccountHelpOpen(false);
    setEmailVerificationForm({ email: '', code: '' });
    if (nextRoute) {
      navigate(nextRoute, { replace: true });
    } else {
      setActivePanel('account');
    }
  }

  async function submitLogin(values: typeof loginForm) {
    const payload = homeLoginSchema.parse(values);
    const response = await apiRequest<HomeAuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    completeAuth(response);
  }

  async function submitRegister(values: typeof registerForm) {
    const payload = homeRegisterSchema.parse(values);
    const response = await apiRequest<EmailVerificationRequiredResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setEmailVerificationForm({
      email: response.email,
      code: '',
    });
    setAuthDialog('verify-email');
    setAuthError(null);
    setAuthInfo(`Verification code sent to ${response.email}.`);
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAuthSubmitting) {
      return;
    }

    setAuthInfo(null);
    setIsAuthSubmitting(true);

    try {
      await submitLogin(loginForm);
      setLoginForm({
        email: '',
        password: '',
      });
    } catch (error) {
      const verificationDetails = getEmailVerificationDetails(error);

      if (verificationDetails) {
        setEmailVerificationForm({ email: verificationDetails.email, code: '' });
        setAuthDialog('verify-email');
        setAuthError(null);
        setAuthInfo('Email verification required. Enter your code or request a new one.');
      } else {
        setAuthError(getHomeAuthErrorMessage(error));
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAuthSubmitting) {
      return;
    }

    setAuthInfo(null);
    setIsAuthSubmitting(true);

    try {
      await submitRegister(registerForm);
      setRegisterForm({
        username: '',
        email: registerForm.email,
        password: '',
      });
    } catch (error) {
      setAuthError(getHomeAuthErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleVerifyEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAuthSubmitting) {
      return;
    }

    setAuthInfo(null);
    setIsAuthSubmitting(true);

    try {
      const payload = homeEmailVerificationSchema.parse(emailVerificationForm);
      const response = await apiRequest<HomeAuthResponse>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      completeAuth(response);
    } catch (error) {
      setAuthError(getHomeAuthErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleResendVerificationCode() {
    if (isAuthSubmitting) {
      return;
    }

    setAuthInfo(null);
    setAuthError(null);
    setIsAuthSubmitting(true);

    try {
      const email = homeEmailVerificationSchema.shape.email.parse(emailVerificationForm.email);
      const response = await apiRequest<ResendVerificationResponse>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if ('alreadyVerified' in response && response.alreadyVerified) {
        setAuthDialog('login');
        setAuthInfo('Email already verified. Log in to continue.');
        return;
      }

      setEmailVerificationForm((current) => ({ ...current, email: response.email, code: '' }));
      setAuthInfo(`New verification code sent to ${response.email}.`);
    } catch (error) {
      setAuthError(getHomeAuthErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(homeSettingsStorageKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!activePanel && !authDialog) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (authDialog) {
          closeAuthDialog();
          return;
        }

        if (activePanel === 'account') {
          setActivePanel('settings');
          setIsAccountHelpOpen(false);
          return;
        }

        setActivePanel(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePanel, authDialog]);

  useEffect(() => {
    if (activePanel !== 'account') {
      setAuthDialog(null);
      setIsAccountHelpOpen(false);
      setAuthError(null);
      setAuthInfo(null);
      setEmailVerificationForm({ email: '', code: '' });
    }
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

      <HomeMenuTraffic
        screenRef={homeScreenRef}
        showHitFlash={settings.showHitFlash}
        playerSkinOverrides={selectedPlayerSkinRecord}
      />

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
          <div
            className="game-home-panel game-home-panel--settings game-home-panel--character"
            role="dialog"
            aria-modal="true"
            aria-label="Character Select"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="game-home-settings-chain game-home-settings-chain--left" aria-hidden="true" />
            <span className="game-home-settings-chain game-home-settings-chain--right" aria-hidden="true" />

            <div className="game-home-settings-scaffold game-home-character-scaffold">
              <div className="game-home-settings-topbar" aria-hidden="true">
                <span className="game-home-settings-beam-cap game-home-settings-beam-cap--left" />
                <div className="game-home-settings-topbar-core">
                  <h2 className="game-home-settings-topbar-title">Character Select</h2>
                </div>
                <span className="game-home-settings-beam-cap game-home-settings-beam-cap--right" />
              </div>

              <span className="game-home-settings-post game-home-settings-post--left" aria-hidden="true" />
              <span className="game-home-settings-post game-home-settings-post--right" aria-hidden="true" />

              <div className="game-home-character-body">
                <div className="game-home-character-summary">
                  <div className="game-home-character-summary-copy">
                    <span className="game-home-character-summary-kicker">Custom Skins</span>
                    <strong>{publishedSkinCount}/4</strong>
                  </div>
                  <span className="game-home-character-summary-pill">Default / Custom</span>
                </div>

                <div className="game-home-character-grid">
                  {playerSkinModes.map((mode) => {
                    const publishedSkin = publishedPlayerSkins?.[mode] ?? null;
                    const hasPublishedSkin = Boolean(publishedSkin);
                    const equippedSkinSource = getEquippedSkinSource(mode);

                    return (
                      <section
                        key={mode}
                        className={cn(
                          'game-home-character-card',
                          equippedSkinSource === 'published' ? 'is-custom-equipped' : 'is-default-equipped',
                        )}
                      >
                        <button
                          type="button"
                          className="game-home-character-preview-button"
                          onClick={() =>
                            setPlayerSkinSelection(
                              mode,
                              hasPublishedSkin && equippedSkinSource === 'default' ? 'published' : 'default',
                            )
                          }
                          aria-label={`${getPlayerModeLabel(mode)} skin`}
                        >
                          <PlayerModelCanvas
                            mode={mode}
                            width={132}
                            height={132}
                            skinSource={equippedSkinSource}
                          />
                        </button>

                        <div className="game-home-character-card-header">
                          <p className="game-home-character-card-title">{getPlayerModeLabel(mode)}</p>
                          <span className="game-home-character-status">
                            {equippedSkinSource === 'published' ? 'Custom' : 'Default'}
                          </span>
                        </div>

                        <div
                          className="game-home-character-switch"
                          role="group"
                          aria-label={`${getPlayerModeLabel(mode)} skin source`}
                        >
                          <button
                            type="button"
                            className={cn(
                              'game-home-character-switch-button',
                              equippedSkinSource === 'default' && 'is-active',
                            )}
                            onClick={() => setPlayerSkinSelection(mode, 'default')}
                          >
                            Default
                          </button>

                          <button
                            type="button"
                            className={cn(
                              'game-home-character-switch-button',
                              equippedSkinSource === 'published' && 'is-active',
                            )}
                            disabled={!hasPublishedSkin}
                            onClick={() => setPlayerSkinSelection(mode, 'published')}
                            title={publishedSkin?.name ?? 'Custom skin'}
                          >
                            Custom
                          </button>
                        </div>
                      </section>
                    );
                  })}
                </div>

                {playerSkinsQuery.isError ? (
                  <p className="game-home-character-feedback">
                    Published skins are temporarily unavailable. You can still keep using the default set.
                  </p>
                ) : null}
              </div>

              <div className="game-home-settings-bottombar">
                <div className="game-home-settings-bottombar-segment" />
                <button
                  type="button"
                  className="game-home-settings-close"
                  onClick={() => setActivePanel(null)}
                  aria-label="Close character select"
                >
                  <span className="game-home-settings-close-glyph" />
                </button>
                <div className="game-home-settings-bottombar-segment" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'settings' ? (
        <div className="game-home-overlay" role="presentation" onClick={() => setActivePanel(null)}>
          <div
            className="game-home-panel game-home-panel--settings"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="game-home-settings-chain game-home-settings-chain--left" aria-hidden="true" />
            <span className="game-home-settings-chain game-home-settings-chain--right" aria-hidden="true" />

            <div className="game-home-settings-scaffold">
              <div className="game-home-settings-topbar" aria-hidden="true">
                <span className="game-home-settings-beam-cap game-home-settings-beam-cap--left" />
                <div className="game-home-settings-topbar-core">
                  <h2 className="game-home-settings-topbar-title">Settings</h2>
                </div>
                <span className="game-home-settings-beam-cap game-home-settings-beam-cap--right" />
              </div>

              <span className="game-home-settings-post game-home-settings-post--left" aria-hidden="true" />
              <span className="game-home-settings-post game-home-settings-post--right" aria-hidden="true" />

              <div className="game-home-settings-body">
                <button
                  type="button"
                  className="game-home-settings-launch"
                  aria-label="Open account menu"
                  onClick={openAccountPanel}
                >
                  <span className="game-home-settings-card-face">
                    <span className="game-home-settings-card-title">Account</span>
                  </span>
                  <span className="game-home-settings-account-status">
                    {user ? `Signed in as ${user.username}` : 'Open account menu'}
                  </span>
                </button>

                <Link
                  to="/editor-manual"
                  className="game-home-settings-launch game-home-settings-launch--manual"
                  onClick={() => setActivePanel(null)}
                >
                  <span className="game-home-settings-card-face">
                    <span className="game-home-settings-card-title">Manual</span>
                  </span>
                  <span className="game-home-settings-account-status">Editor guide</span>
                </Link>

                <label className="game-home-settings-meter">
                  <div className="game-home-settings-meter-heading">
                    <span className="game-home-settings-meter-title">Music</span>
                    <strong className="game-home-settings-meter-value">{settings.musicVolume}%</strong>
                  </div>
                  <div className="game-home-settings-meter-track">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.musicVolume}
                      className="game-home-settings-range"
                      style={musicRangeStyle}
                      aria-label="Music volume"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          musicVolume: clampPercentage(Number(event.target.value)),
                        }))
                      }
                    />
                  </div>
                </label>

                <label className="game-home-settings-meter">
                  <div className="game-home-settings-meter-heading">
                    <span className="game-home-settings-meter-title">SFX</span>
                    <strong className="game-home-settings-meter-value">{settings.sfxVolume}%</strong>
                  </div>
                  <div className="game-home-settings-meter-track">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.sfxVolume}
                      className="game-home-settings-range"
                      style={sfxRangeStyle}
                      aria-label="SFX volume"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          sfxVolume: clampPercentage(Number(event.target.value)),
                        }))
                      }
                    />
                  </div>
                </label>
              </div>

              <div className="game-home-settings-bottombar">
                <div className="game-home-settings-bottombar-segment" />
                <button
                  type="button"
                  className="game-home-settings-close"
                  onClick={() => setActivePanel(null)}
                  aria-label="Close settings"
                >
                  <span className="game-home-settings-close-glyph" />
                </button>
                <div className="game-home-settings-bottombar-segment" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'account' ? (
        <div className="game-home-overlay" role="presentation" onClick={() => setActivePanel('settings')}>
          <div
            className="game-home-panel game-home-panel--settings game-home-panel--account"
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="game-home-settings-chain game-home-settings-chain--left" aria-hidden="true" />
            <span className="game-home-settings-chain game-home-settings-chain--right" aria-hidden="true" />

            <div className="game-home-settings-scaffold">
              <div className="game-home-settings-topbar" aria-hidden="true">
                <span className="game-home-settings-beam-cap game-home-settings-beam-cap--left" />
                <div className="game-home-settings-topbar-core">
                  <h2 className="game-home-settings-topbar-title">Account</h2>
                </div>
                <span className="game-home-settings-beam-cap game-home-settings-beam-cap--right" />
              </div>

              <span className="game-home-settings-post game-home-settings-post--left" aria-hidden="true" />
              <span className="game-home-settings-post game-home-settings-post--right" aria-hidden="true" />

              <div className="game-home-account-body">
                {user ? (
                  <>
                    <p className="game-home-account-state">{user.username}</p>
                    <p className="game-home-account-copy">
                      Your runner profile is online. Stats, stars, and workshop progress are ready to sync.
                    </p>

                    <div className="game-home-account-detail-row">
                      <span className="game-home-account-detail-pill">{user.role}</span>
                      <span className="game-home-account-detail-pill">{user.email}</span>
                    </div>

                    <div className="game-home-account-button-stack">
                      <Link
                        to="/profile"
                        className="game-home-account-button"
                        onClick={() => {
                          setActivePanel(null);
                          setAuthDialog(null);
                        }}
                      >
                        Profile
                      </Link>
                      <button
                        type="button"
                        className="game-home-account-button game-home-account-button--help"
                        onClick={() => setIsAccountHelpOpen((current) => !current)}
                      >
                        Help
                      </button>
                      <button
                        type="button"
                        className="game-home-account-button"
                        onClick={() => {
                          clearAuth();
                          setIsAccountHelpOpen(false);
                          setAuthDialog(null);
                        }}
                      >
                        Log Out
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="game-home-account-state game-home-account-state--warning">Not Logged In</p>
                    <p className="game-home-account-copy">
                      Create an account to back up and load your data from the cloud.
                    </p>

                    <div className="game-home-account-button-stack">
                      <button type="button" className="game-home-account-button" onClick={() => openAuthDialog('login')}>
                        Log In
                      </button>
                      <button
                        type="button"
                        className="game-home-account-button game-home-account-button--help"
                        onClick={() => setIsAccountHelpOpen((current) => !current)}
                      >
                        Help
                      </button>
                      <button
                        type="button"
                        className="game-home-account-button"
                        onClick={() => openAuthDialog('register')}
                      >
                        Register
                      </button>
                    </div>
                  </>
                )}

                {isAccountHelpOpen ? (
                  <div className="game-home-account-help">
                    <p>
                      Log in with your email and password. Register creates a new pilot profile and stores your progress
                      in the cloud after you confirm the 6 digit email code.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="game-home-settings-bottombar">
                <div className="game-home-settings-bottombar-segment" />
                <button
                  type="button"
                  className="game-home-settings-close"
                  onClick={() => {
                    setActivePanel('settings');
                    closeAuthDialog();
                    setIsAccountHelpOpen(false);
                  }}
                  aria-label="Back to settings"
                >
                  <span className="game-home-settings-close-glyph" />
                </button>
                <div className="game-home-settings-bottombar-segment" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {authDialog ? (
        <div className="game-home-auth-overlay" role="presentation" onClick={closeAuthDialog}>
          <div className="game-home-auth-shell" role="dialog" aria-modal="true" aria-label={authDialog} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="game-home-auth-back" onClick={closeAuthDialog} aria-label="Back to account menu">
              <span className="game-home-auth-back-arrow" aria-hidden="true" />
            </button>

            <div className="game-home-auth-card">
              <h3 className="game-home-auth-title">
                {authDialog === 'login' ? 'Login' : authDialog === 'register' ? 'Register' : 'Verify Email'}
              </h3>

              <form
                className="game-home-auth-form"
                onSubmit={
                  authDialog === 'login'
                    ? handleLoginSubmit
                    : authDialog === 'register'
                      ? handleRegisterSubmit
                      : handleVerifyEmailSubmit
                }
              >
                {authDialog === 'login' ? (
                  <>
                    <label className="game-home-auth-field">
                      <span className="game-home-auth-label">Email:</span>
                      <input
                        type="email"
                        autoComplete="email"
                        className="game-home-auth-input"
                        value={loginForm.email}
                        placeholder="you@example.com"
                        onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>

                    <label className="game-home-auth-field">
                      <span className="game-home-auth-label">Password:</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        className="game-home-auth-input"
                        value={loginForm.password}
                        placeholder="Password"
                        onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      />
                    </label>

                    <div className="game-home-auth-utility-stack">
                      <button
                        type="button"
                        className="game-home-auth-utility-button"
                        onClick={() => openAuthDialog('register')}
                      >
                        Need Account?
                      </button>
                    </div>
                  </>
                ) : authDialog === 'register' ? (
                  <>
                    <label className="game-home-auth-field">
                      <span className="game-home-auth-label">Username:</span>
                      <input
                        type="text"
                        autoComplete="username"
                        className="game-home-auth-input"
                        value={registerForm.username}
                        placeholder="Username"
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, username: event.target.value }))
                        }
                      />
                    </label>

                    <label className="game-home-auth-field">
                      <span className="game-home-auth-label">Email:</span>
                      <input
                        type="email"
                        autoComplete="email"
                        className="game-home-auth-input"
                        value={registerForm.email}
                        placeholder="you@example.com"
                        onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>

                    <label className="game-home-auth-field">
                      <span className="game-home-auth-label">Password:</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className="game-home-auth-input"
                        value={registerForm.password}
                        placeholder="At least 8 characters"
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                    </label>

                    <div className="game-home-auth-utility-stack game-home-auth-utility-stack--single">
                      <button
                        type="button"
                        className="game-home-auth-utility-button"
                        onClick={() => openAuthDialog('login')}
                      >
                        Already Have Account?
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="game-home-auth-field">
                      <span className="game-home-auth-label">Email:</span>
                      <input
                        type="email"
                        autoComplete="email"
                        className="game-home-auth-input"
                        value={emailVerificationForm.email}
                        placeholder="you@example.com"
                        onChange={(event) =>
                          setEmailVerificationForm((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    </label>

                    <label className="game-home-auth-field">
                      <span className="game-home-auth-label">Code:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="game-home-auth-input"
                        value={emailVerificationForm.code}
                        placeholder="000000"
                        maxLength={6}
                        onChange={(event) =>
                          setEmailVerificationForm((current) => ({
                            ...current,
                            code: event.target.value.replace(/\D/g, '').slice(0, 6),
                          }))
                        }
                      />
                    </label>

                    <div className="game-home-auth-utility-stack">
                      <button
                        type="button"
                        className="game-home-auth-utility-button"
                        onClick={() => openAuthDialog('login')}
                      >
                        Back To Login
                      </button>
                      <button
                        type="button"
                        className="game-home-auth-utility-button"
                        onClick={() => void handleResendVerificationCode()}
                        disabled={isAuthSubmitting}
                      >
                        Resend Code
                      </button>
                    </div>
                  </>
                )}

                {authInfo ? <p className="game-home-auth-note">{authInfo}</p> : null}
                {authError ? <p className="game-home-auth-error">{authError}</p> : null}

                <div className="game-home-auth-action-row">
                  <button type="button" className="game-home-auth-submit" onClick={closeAuthDialog}>
                    Cancel
                  </button>
                  <button type="submit" className="game-home-auth-submit" disabled={isAuthSubmitting}>
                    {isAuthSubmitting
                      ? 'Please Wait'
                      : authDialog === 'login'
                        ? 'Login'
                        : authDialog === 'register'
                          ? 'Register'
                          : 'Verify'}
                  </button>
                </div>
              </form>
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
