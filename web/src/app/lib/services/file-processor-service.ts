"use client";

import JSZip from "jszip";

interface FileMetadata {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: Date;
  lineCount?: number;
  wordCount?: number;
}

/**
 * Service for processing repository files after download
 */
export class FileProcessorService {
  private readonly textFileExtensions = [
    "txt",
    "md",
    "js",
    "jsx",
    "ts",
    "tsx",
    "html",
    "css",
    "scss",
    "json",
    "yaml",
    "yml",
    "xml",
    "c",
    "cpp",
    "h",
    "hpp",
    "java",
    "py",
    "rb",
    "php",
    "go",
    "rs",
    "swift",
    "kt",
    "sh",
    "bat",
    "ps1",
    "conf",
    "ini",
    "toml",
    "sql",
    "graphql",
    "vue",
    "svelte",
  ];

  private readonly binaryFileExtensions = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "bmp",
    "ico",
    "svg",
    "webp",
    "pdf",
    "zip",
    "gz",
    "tar",
    "rar",
    "7z",
    "exe",
    "dll",
    "so",
    "dylib",
    "bin",
    "dat",
    "mp3",
    "mp4",
    "avi",
    "mov",
    "webm",
    "woff",
    "woff2",
    "ttf",
    "otf",
    "eot",
  ];

  /**
   * Extracts and processes a ZIP file containing a GitHub repository
   * @param zipData ArrayBuffer containing the ZIP file data
   * @returns Object with extracted repository data
   */
  public async processRepositoryZip(zipData: ArrayBuffer): Promise<{
    rootDirName: string;
    files: { [path: string]: Uint8Array | string };
    metadata: { [path: string]: FileMetadata[] };
    dirtextFiles: { [dirPath: string]: string };
    dirmetaFiles: { [dirPath: string]: string };
  }> {
    try {
      // Load the ZIP file
      const zip = new JSZip();
      await zip.loadAsync(zipData);

      // Store processed files
      const files: { [path: string]: Uint8Array | string } = {};
      const metadata: { [path: string]: FileMetadata[] } = {};
      const dirtextFiles: { [dirPath: string]: string } = {};
      const dirmetaFiles: { [dirPath: string]: string } = {};

      // Get the root directory name (GitHub ZIP always has a root dir)
      let rootDirName = "";
      Object.keys(zip.files).forEach((fileName) => {
        const parts = fileName.split("/");
        if (parts.length > 0 && !rootDirName) {
          rootDirName = parts[0];
        }
      });

      // Process all files in the ZIP
      const dirMap: { [dirPath: string]: { files: FileMetadata[]; content: string } } = {};

      for (const [filePath, file] of Object.entries(zip.files)) {
        if (file.dir) continue; // Skip directories

        // Skip .git directory
        if (filePath.includes("/.git/")) continue;

        // Get relative path to repo root (removing the root dir name prefix)
        const relativePath = filePath.replace(`${rootDirName}/`, "");

        // Get directory path
        const lastSlashIndex = relativePath.lastIndexOf("/");
        const dirPath = lastSlashIndex >= 0 ? relativePath.substring(0, lastSlashIndex) : "";
        const fileName = relativePath.substring(lastSlashIndex + 1);

        // Skip node_modules, dist, build folders
        if (
          dirPath.includes("node_modules/") ||
          dirPath.includes("/dist/") ||
          dirPath.includes("/build/") ||
          filePath.includes("/.git/")
        ) {
          continue;
        }

        // Initialize directory mapping if needed
        if (!dirMap[dirPath]) {
          dirMap[dirPath] = { files: [], content: "" };
        }

        // Get file extension
        const extIndex = fileName.lastIndexOf(".");
        const ext = extIndex >= 0 ? fileName.substring(extIndex + 1).toLowerCase() : "";

        // Process file based on type
        let fileContent: string | Uint8Array;
        let lineCount = 0;
        let wordCount = 0;

        if (this.isTextFile(ext)) {
          // Process as text file
          fileContent = await file.async("string");
          lineCount = (fileContent as string).split("\n").length;
          wordCount = (fileContent as string).split(/\s+/).filter((w) => w.length > 0).length;

          // Add file content to directory text mapping
          dirMap[dirPath].content += `\n\n# File: ${fileName}\n\n${fileContent}`;
        } else {
          // Process as binary file
          fileContent = await file.async("uint8array");
        }

        // Store file content
        files[relativePath] = fileContent;

        // Get file size using the async API
        const fileSize = await this.getFileSize(file);

        // Create file metadata
        const fileMetadata: FileMetadata = {
          name: fileName,
          path: relativePath,
          size: fileSize,
          type: ext || "unknown",
          lastModified: new Date(file.date),
          lineCount,
          wordCount,
        };

        // Add to metadata map
        dirMap[dirPath].files.push(fileMetadata);
      }

      // Process directory maps to create dirtext.md and dirmeta.md
      for (const [dirPath, { files, content }] of Object.entries(dirMap)) {
        // Generate directory text content
        dirtextFiles[dirPath] = `# Directory: ${dirPath || "root"}\n${content}`;

        // Generate directory metadata
        let metaContent = `# Directory: ${dirPath || "root"}\n\n`;
        metaContent += `## Files: ${files.length}\n\n`;

        // Add metadata for each file
        files.sort((a, b) => a.name.localeCompare(b.name));
        for (const file of files) {
          metaContent += `- **${file.name}**\n`;
          metaContent += `  - Size: ${this.formatSize(file.size)}\n`;
          metaContent += `  - Last Modified: ${file.lastModified.toISOString()}\n`;

          if (file.lineCount !== undefined) {
            metaContent += `  - Lines: ${file.lineCount}\n`;
          }

          if (file.wordCount !== undefined) {
            metaContent += `  - Words: ${file.wordCount}\n`;
          }

          metaContent += `  - Type: ${file.type}\n\n`;
        }

        dirmetaFiles[dirPath] = metaContent;

        // Add to metadata object
        metadata[dirPath] = files;
      }

      return { rootDirName, files, metadata, dirtextFiles, dirmetaFiles };
    } catch (error) {
      console.error("Error processing repository ZIP:", error);
      throw error;
    }
  }

  /**
   * Get file size from JSZip object using proper API methods
   * @param file JSZip file object
   * @returns File size in bytes
   */
  private async getFileSize(file: JSZip.JSZipObject): Promise<number> {
    try {
      // Get file content and measure its size directly
      const content = await file.async("uint8array");
      return content.length;
    } catch (error) {
      console.error("Error getting file size:", error);
      return 0;
    }
  }

  /**
   * Checks if a file is a text file based on its extension
   * @param extension File extension
   * @returns True if it's a text file, false otherwise
   */
  private isTextFile(extension: string): boolean {
    return this.textFileExtensions.includes(extension.toLowerCase());
  }

  /**
   * Formats file size into a human-readable string
   * @param bytes Size in bytes
   * @returns Formatted size string
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

// Create a singleton instance
export const fileProcessorService = new FileProcessorService();
