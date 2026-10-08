import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getTheme, saveTheme } from '../services/storageService';

const ThemeContext = createContext(null);
const darkQuery = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)');

const applyTheme = (theme) => {
  const dark = theme === 'dark' || (theme === 'system' && darkQuery()?.matches);
  document.documentElement.classList.toggle('dark', Boolean(dark));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1115' : '#3b5bdb');
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return undefined;
    const query = darkQuery();
    const onChange = () => applyTheme('system');
    query?.addEventListener?.('change', onChange);
    return () => query?.removeEventListener?.('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    const root = document.documentElement;
    root.classList.add('theme-fade');
    setTimeout(() => root.classList.remove('theme-fade'), 400);
    saveTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
