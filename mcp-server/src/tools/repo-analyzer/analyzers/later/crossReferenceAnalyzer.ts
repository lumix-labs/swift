  // Identify hotspot symbols (most referenced)
  const hotspots = Object.entries(symbolUsage)
    .filter(([, usage]) => usage.referenceCount > 0)
    .sort((a, b) => b[1].referenceCount - a[1].referenceCount)
    .slice(0, 10)  // Top 10 most referenced
    .map(([name]) => name);
  
  // Identify unused symbols
  const unused = Object.entries(symbolUsage)
    .filter(([, usage]) => usage.referenceCount === 0)
    .map(([name]) => name);