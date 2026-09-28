export type ThemeId = 'green-premium';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  brandPrimary: string;
  brandSecondary: string;
  accent: string;
  accentSoft: string;
  cta: string;
  success: string;
  warning: string;
  critical: string;
  danger: string;
  info: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chartGrid: string;
  chartAxis: string;
  chartTooltipBackground: string;
  chartTooltipText: string;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
  previewGradient: string;
}

export const THEME_STORAGE_KEY = 'sarthi-green-theme';
export const DEFAULT_THEME_ID: ThemeId = 'green-premium';

export const themes: AppTheme[] = [
  {
    id: 'green-premium',
    name: 'Green Premium',
    description: 'Minimal green AppSec command center',
    previewGradient: 'linear-gradient(135deg, #051F20 0%, #163832 40%, #8EB69B 100%)',
    colors: {
      background: '#051F20',
      backgroundSecondary: '#0B2B26',
      surface: '#163832',
      surfaceElevated: '#1D443D',
      surfaceHover: '#235347',
      border: 'rgba(218, 241, 222, 0.12)',
      borderStrong: 'rgba(142, 182, 155, 0.34)',
      textPrimary: '#EDF7ED',
      textSecondary: '#DAF1DE',
      textMuted: '#9BBBA3',
      brandPrimary: '#235347',
      brandSecondary: '#8EB69B',
      accent: '#8EB69B',
      accentSoft: 'rgba(142, 182, 155, 0.16)',
      cta: '#9CD4A8',
      success: '#A9E6B1',
      warning: '#D9C77A',
      critical: '#F2957F',
      danger: '#F2957F',
      info: '#CFEAD4',
      chart1: '#8EB69B',
      chart2: '#A9E6B1',
      chart3: '#D9C77A',
      chart4: '#F2957F',
      chartGrid: 'rgba(218, 241, 222, 0.08)',
      chartAxis: 'rgba(218, 241, 222, 0.7)',
      chartTooltipBackground: '#0B2B26',
      chartTooltipText: '#EDF7ED'
    }
  }
];

export const themeMap = {
  [DEFAULT_THEME_ID]: themes[0]
} as Record<ThemeId, AppTheme>;
