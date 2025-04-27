"use client";
import Head from 'next/head';
import { useTheme } from '../../context/ThemeContext';

export function FaviconSwitcher() {
  const { resolvedTheme } = useTheme();

  return (
    <Head>
      <link
        rel="icon"
        href={resolvedTheme === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg'}
        type="image/svg+xml"
        key="favicon"
      />
    </Head>
  );
}
