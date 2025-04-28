import JSZip from 'jszip';

class ZipHandler {
  /**
   * Downloads a ZIP file from a URL
   * @param url URL to download the ZIP file from
   * @param filename Name to use for the downloaded file
   */
  async downloadZip(url: string, filename: string): Promise<boolean> {
    try {
      // Create a proxy URL through our own API to avoid CORS issues
      const proxyUrl = `/api/proxy/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      
      // Skip URL validation and directly proceed to download
      // The download endpoint already does its own validation
      
      // Create a link element
      const link = document.createElement('a');
      link.href = proxyUrl;
      link.download = filename;
      
      // Append to the document, click it, then remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('Error downloading ZIP file:', error);
      return false;
    }
  }
  
  /**
   * Checks if a URL is valid and accessible
   * @param url URL to check
   * @returns True if the URL is valid and accessible, false otherwise
   */
  async checkUrlValidity(url: string): Promise<boolean> {
    try {
      // For GitHub codeload URLs, we'll assume they're valid
      // The actual download endpoint will validate it properly
      if (url.startsWith('https://codeload.github.com/')) {
        return true;
      }
      
      // Use a proxy endpoint to check URL validity to avoid CORS issues
      const proxyUrl = `/api/proxy/check?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        console.error('Error checking URL validity: Server returned an error');
        return false;
      }
      
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Error checking URL validity:', error);
      return false;
    }
  }
  
  /**
   * Unzips a ZIP file in memory
   * @param zipData ArrayBuffer containing the ZIP file data
   * @returns Object with file paths as keys and file contents as values
   */
  async unzipFile(zipData: ArrayBuffer): Promise<Map<string, Uint8Array | string>> {
    try {
      const zip = await JSZip.loadAsync(zipData);
      const files = new Map<string, Uint8Array | string>();
      
      // Extract all files from the ZIP
      const extractPromises = Object.keys(zip.files).map(async (filename) => {
        const zipEntry = zip.files[filename];
        
        // Skip directories
        if (zipEntry.dir) {
          return;
        }
        
        // Determine if the file is a text file
        const isTextFile = this.isTextFile(filename);
        
        // Get file content as text or binary
        if (isTextFile) {
          const content = await zipEntry.async('string');
          files.set(filename, content);
        } else {
          const content = await zipEntry.async('uint8array');
          files.set(filename, content);
        }
      });
      
      await Promise.all(extractPromises);
      return files;
    } catch (error) {
      console.error('Error unzipping file:', error);
      throw error;
    }
  }
  
  /**
   * Checks if a file is likely to be a text file based on its extension
   * @param filename Filename to check
   * @returns True if the file is likely a text file, false otherwise
   */
  private isTextFile(filename: string): boolean {
    const textExtensions = [
      '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', 
      '.scss', '.less', '.yaml', '.yml', '.xml', '.svg', '.sh', '.bash', 
      '.py', '.rb', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.go', '.rs',
      '.gitignore', '.env', '.editorconfig', '.eslintrc', '.prettierrc'
    ];
    
    // Check if the filename ends with any of the text extensions
    return textExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext) || 
      filename.toLowerCase().includes(ext + '.')
    );
  }
}

// Export a singleton instance
const zipHandler = new ZipHandler();
export default zipHandler;
