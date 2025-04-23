"use client"

import { ReactNode } from 'react';
import { ThemeProvider } from 'src/app/context/ThemeContext';

export function ClientThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
