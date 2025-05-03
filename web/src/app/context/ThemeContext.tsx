"use client"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback
} from 'react';
import { getSystemTheme, isBrowser } from '../lib/utils';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => { },
  resolvedTheme: 'light',
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Synchronously initialize theme from localStorage or system
  let initialTheme: Theme = 'system';
  if (typeof window !== 'undefined') {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        initialTheme = savedTheme;
      }
    } catch { }
  }
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    initialTheme === 'system'
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : initialTheme
  );
  const [mounted, setMounted] = useState(false);

  // Function to update the resolved theme and document class
  const updateResolvedTheme = useCallback(() => {
    if (!isBrowser) {
      return;
    }

    const newResolvedTheme =
      theme === 'system'
        ? getSystemTheme()
        : theme;

    setResolvedTheme(newResolvedTheme);

    // Update document class for CSS - use classList.replace for better performance
    if (document.documentElement.classList.contains('light') && newResolvedTheme === 'dark') {
      document.documentElement.classList.replace('light', 'dark');
    } else if (document.documentElement.classList.contains('dark') && newResolvedTheme === 'light') {
      document.documentElement.classList.replace('dark', 'light');
    } else {
      // Ensure the correct class is present
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newResolvedTheme);
    }
  }, [theme]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    // Set mounted to true after first render
    setMounted(true);

    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Could not access localStorage:', error);
    }
  }, []);

  // Update resolvedTheme when theme changes
  useEffect(() => {
    if (!mounted) {
      return;
    }

    updateResolvedTheme();

    // Listen for system theme changes only if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // Use the modern event listener pattern
      const handleChange = () => updateResolvedTheme();

      try {
        // Modern browsers
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } catch (error) {
        // Fallback for older browsers that don't support addEventListener
        console.error('fallback triggered:', error);
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme, mounted, updateResolvedTheme]);

  // Update localStorage when theme changes
  useEffect(() => {
    if (!isBrowser || !mounted) {
      return;
    }

    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.error('Could not write to localStorage:', error);
    }
  }, [theme, mounted]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    resolvedTheme
  }), [theme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
