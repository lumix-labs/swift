"use client";
import Head from 'next/head';
import { useEffect, useState } from 'react';

export function FaviconSwitcher() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const match = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setIsDark(match.matches);
    update();
    match.addEventListener('change', update);
    return () => match.removeEventListener('change', update);
  }, []);

  return (
    <Head>
      <link
        rel="icon"
        href={isDark ? '/favicon-dark.svg' : '/favicon-light.svg'}
        type="image/svg+xml"
        key="favicon"
      />
    </Head>
  );
}
