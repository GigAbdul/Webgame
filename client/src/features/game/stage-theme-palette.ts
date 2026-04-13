export type StageThemePalette = {
  editorGradientTop: string;
  editorGradientMid: string;
  editorGradientBottom: string;
  editorPanelTint: string;
  editorGridLine: string;
  editorGlowColor: string;
  editorStarColor: string;
  runtimeGradientTop: string;
  runtimeGradientMid: string;
  runtimeGradientBottom: string;
  runtimePanelTint: string;
  runtimeAccentPrimary: string;
  runtimeAccentSecondary: string;
  runtimeGlowColor: string;
  runtimeStarColor: string;
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
