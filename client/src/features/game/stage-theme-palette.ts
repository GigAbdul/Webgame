export type StageThemePalette = {
  editorGradientTop: string;
  editorGradientMid: string;
  editorGradientBottom: string;
  editorPanelTint: string;
  editorGridLine: string;
  editorGlowColor: string;
  editorStarColor: string;
  groundBaseColor: string;
  runtimeGradientTop: string;
  runtimeGradientMid: string;
  runtimeGradientBottom: string;
  runtimePanelTint: string;
  runtimeAccentPrimary: string;
  runtimeAccentSecondary: string;
  runtimeGlowColor: string;
  runtimeStarColor: string;
};

export type StageGroundPalette = {
  base: string;
  top: string;
  mid: string;
  bottom: string;
  shadow: string;
  seam: string;
  highlight: string;
};

const STAGE_THEME_PALETTES: Record<string, StageThemePalette> = {
  'neon-grid': {
    editorGradientTop: '#2d73e8',
    editorGradientMid: '#1f5cca',
    editorGradientBottom: '#1745a3',
    editorPanelTint: 'rgba(255,255,255,0.06)',
    editorGridLine: 'rgba(255,255,255,0.05)',
    editorGlowColor: 'rgba(99, 199, 255, 0.22)',
    editorStarColor: 'rgba(255,255,255,0.14)',
    groundBaseColor: '#2aaeff',
    runtimeGradientTop: '#3c7bff',
    runtimeGradientMid: '#2147b3',
    runtimeGradientBottom: '#0d1e52',
    runtimePanelTint: 'rgba(255,255,255,0.04)',
    runtimeAccentPrimary: 'rgba(91, 240, 255, 0.12)',
    runtimeAccentSecondary: 'rgba(255, 255, 255, 0.08)',
    runtimeGlowColor: 'rgba(86, 201, 255, 0.18)',
    runtimeStarColor: 'rgba(255,255,255,0.16)',
  },
  'cyber-night': {
    editorGradientTop: '#27486d',
    editorGradientMid: '#183352',
    editorGradientBottom: '#0a1328',
    editorPanelTint: 'rgba(93, 190, 255, 0.05)',
    editorGridLine: 'rgba(141, 202, 255, 0.08)',
    editorGlowColor: 'rgba(70, 182, 255, 0.16)',
    editorStarColor: 'rgba(214, 241, 255, 0.18)',
    groundBaseColor: '#3d9dff',
    runtimeGradientTop: '#183455',
    runtimeGradientMid: '#0a1830',
    runtimeGradientBottom: '#030711',
    runtimePanelTint: 'rgba(109, 190, 255, 0.04)',
    runtimeAccentPrimary: 'rgba(90, 222, 255, 0.12)',
    runtimeAccentSecondary: 'rgba(117, 161, 255, 0.08)',
    runtimeGlowColor: 'rgba(58, 170, 255, 0.14)',
    runtimeStarColor: 'rgba(217, 244, 255, 0.18)',
  },
  'sunset-burn': {
    editorGradientTop: '#ff9a4c',
    editorGradientMid: '#d24b7a',
    editorGradientBottom: '#4d1577',
    editorPanelTint: 'rgba(255, 244, 230, 0.06)',
    editorGridLine: 'rgba(255, 215, 176, 0.09)',
    editorGlowColor: 'rgba(255, 164, 98, 0.2)',
    editorStarColor: 'rgba(255, 242, 221, 0.12)',
    groundBaseColor: '#ffb347',
    runtimeGradientTop: '#ff9d46',
    runtimeGradientMid: '#cb4f77',
    runtimeGradientBottom: '#3b145c',
    runtimePanelTint: 'rgba(255,255,255,0.05)',
    runtimeAccentPrimary: 'rgba(255, 203, 94, 0.16)',
    runtimeAccentSecondary: 'rgba(255, 120, 164, 0.1)',
    runtimeGlowColor: 'rgba(255, 143, 77, 0.18)',
    runtimeStarColor: 'rgba(255, 241, 221, 0.12)',
  },
  'acid-void': {
    editorGradientTop: '#8de94f',
    editorGradientMid: '#16906f',
    editorGradientBottom: '#052132',
    editorPanelTint: 'rgba(232, 255, 223, 0.05)',
    editorGridLine: 'rgba(182, 255, 131, 0.08)',
    editorGlowColor: 'rgba(144, 255, 115, 0.18)',
    editorStarColor: 'rgba(223, 255, 229, 0.14)',
    groundBaseColor: '#65e85f',
    runtimeGradientTop: '#8eff49',
    runtimeGradientMid: '#0c8d69',
    runtimeGradientBottom: '#03131f',
    runtimePanelTint: 'rgba(214,255,186,0.05)',
    runtimeAccentPrimary: 'rgba(173, 255, 84, 0.14)',
    runtimeAccentSecondary: 'rgba(52, 239, 255, 0.1)',
    runtimeGlowColor: 'rgba(150, 255, 112, 0.16)',
    runtimeStarColor: 'rgba(220, 255, 229, 0.14)',
  },
  'deep-space': {
    editorGradientTop: '#060b19',
    editorGradientMid: '#02040d',
    editorGradientBottom: '#000000',
    editorPanelTint: 'rgba(122, 144, 255, 0.02)',
    editorGridLine: 'rgba(154, 178, 255, 0.08)',
    editorGlowColor: 'rgba(78, 108, 255, 0.18)',
    editorStarColor: 'rgba(241, 247, 255, 0.3)',
    groundBaseColor: '#5f7dff',
    runtimeGradientTop: '#081020',
    runtimeGradientMid: '#01040c',
    runtimeGradientBottom: '#000000',
    runtimePanelTint: 'rgba(110, 132, 255, 0.022)',
    runtimeAccentPrimary: 'rgba(102, 147, 255, 0.08)',
    runtimeAccentSecondary: 'rgba(214, 230, 255, 0.05)',
    runtimeGlowColor: 'rgba(92, 116, 255, 0.16)',
    runtimeStarColor: 'rgba(245, 249, 255, 0.34)',
  },
};

export function getStageThemePalette(theme: string): StageThemePalette {
  return STAGE_THEME_PALETTES[theme] ?? STAGE_THEME_PALETTES['neon-grid'];
}

export function getDefaultStageGroundColor(theme: string) {
  return getStageThemePalette(theme).groundBaseColor;
}

export function getStageGroundPalette(theme: string, overrideColor?: string): StageGroundPalette {
  const base = isHexColor(overrideColor) ? overrideColor : getDefaultStageGroundColor(theme);

  return {
    base,
    top: mixHex(base, '#ffffff', 0.34),
    mid: mixHex(base, '#ffffff', 0.08),
    bottom: mixHex(base, '#041437', 0.42),
    shadow: mixHex(base, '#050a1c', 0.82),
    seam: rgba(mixHex(base, '#ffffff', 0.2), 0.42),
    highlight: rgba(mixHex(base, '#dfffff', 0.5), 0.94),
  };
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function mixHex(from: string, to: string, amount: number) {
  const normalizedAmount = Math.max(0, Math.min(1, amount));
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);

  const red = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * normalizedAmount);
  const green = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * normalizedAmount);
  const blue = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * normalizedAmount);

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((chunk) => `${chunk}${chunk}`).join('') : value;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}
