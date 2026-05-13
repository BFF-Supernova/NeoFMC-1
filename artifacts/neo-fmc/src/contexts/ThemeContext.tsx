import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'dark' | 'light' | 'cheerful';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  themeLabel: (ar: string, en: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_LABELS: Record<ThemeMode, { ar: string; en: string }> = {
  dark: { ar: 'داكن', en: 'Dark' },
  light: { ar: 'فاتح', en: 'Light' },
  cheerful: { ar: 'مبهج', en: 'Cheerful' },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('neo_fmc_theme');
    return (saved === 'dark' || saved === 'light' || saved === 'cheerful') ? saved : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'cheerful');
    root.classList.add(theme);
    localStorage.setItem('neo_fmc_theme', theme);
  }, [theme]);

  const setTheme = (t: ThemeMode) => setThemeState(t);

  const themeLabel = (ar: string, en: string) => {
    return en;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeLabel }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { THEME_LABELS };
export type { ThemeMode };
