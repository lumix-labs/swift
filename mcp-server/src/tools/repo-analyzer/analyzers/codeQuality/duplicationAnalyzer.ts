  // Clean each line: trim whitespace, remove comments
  const cleanedChunk = chunk.map(line => {
    const cleanedLine = line.trim()
      .replace(/\/\/.*$/, '') // Remove single-line comments
      .replace(/^\s*\*.*$/, '') // Remove lines that are just JSDoc/block comment content
      .trim();
      
    // Skip empty lines after cleaning
    if (!cleanedLine || cleanedLine.length < MIN_LINE_LENGTH) {
      return '';
    }
    
    return cleanedLine;
  }).filter(line => line !== ''); // Remove empty lines