import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY, AppTheme, ThemeId, themeMap } from './themes';

interface ThemeContextValue {
  theme: AppTheme;
  themeId: ThemeId;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useMemo(() => themeMap[DEFAULT_THEME_ID], []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme.id;
    document.documentElement.style.colorScheme = 'dark';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch {
      // ignore storage access errors
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    themeId: DEFAULT_THEME_ID
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
