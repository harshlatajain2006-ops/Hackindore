import { AppTheme, ThemeId, themes } from './themes';

export const getThemeById = (themeId: ThemeId): AppTheme =>
  themes.find(theme => theme.id === themeId) ?? themes[3];

export const formatThemeLabel = (themeId: ThemeId): string => {
  const theme = getThemeById(themeId);
  return theme.name;
};
