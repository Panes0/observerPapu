import * as fs from 'fs';
import * as path from 'path';
import { FileInfo } from '../../types/download';

export class FileManager {
  private tempDir: string;
  private maxFileSize: number;
  private cleanupAfterSend: boolean;

  constructor(tempDir: string, maxFileSize: number, cleanupAfterSend: boolean = true) {
    this.tempDir = tempDir;
    this.maxFileSize = maxFileSize;
    this.cleanupAfterSend = cleanupAfterSend;
    this.ensureDirectoryExists();
  }

  /**
   * Ensures the temporary directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log(`📁 Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Generates a unique filename for downloads
   */
  generateFileName(originalUrl: string, title?: string, ext?: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    // Clean title for filename
    const cleanTitle = title
      ? title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50)
      : 'download';
    
    const extension = ext || 'mp4';
    return `${timestamp}_${randomId}_${cleanTitle}.${extension}`;
  }

  /**
   * Gets the full path for a filename in temp directory
   */
  getTempPath(filename: string): string {
    return path.join(this.tempDir, filename);
  }

  /**
   * Validates if a file exists and meets size requirements
   */
  validateFile(filePath: string): Promise<FileInfo> {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject(new Error(`File not found: ${filePath}`));
          return;
        }

        if (stats.size > this.maxFileSize) {
          reject(new Error(`File too large: ${stats.size} bytes (max: ${this.maxFileSize})`));
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const fileInfo: FileInfo = {
          path: filePath,
          size: stats.size,
          ext: ext,
          mimeType: this.getMimeType(ext),
          isVideo: this.isVideoFile(ext),
          isAudio: this.isAudioFile(ext),
          isImage: this.isImageFile(ext)
        };

        resolve(fileInfo);
      });
    });
  }

  /**
   * Gets MIME type based on file extension
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Checks if file is a video
   */
  private isVideoFile(ext: string): boolean {
    const videoExts = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4v'];
    return videoExts.includes(ext);
  }

  /**
   * Checks if file is audio
   */
  private isAudioFile(ext: string): boolean {
    const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
    return audioExts.includes(ext);
  }

  /**
   * Checks if file is an image
   */
  private isImageFile(ext: string): boolean {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExts.includes(ext);
  }

  /**
   * Lists all files in the temp directory
   */
  listTempFiles(): string[] {
    try {
      return fs.readdirSync(this.tempDir).map(file => path.join(this.tempDir, file));
    } catch (error) {
      console.error('Error listing temp files:', error);
      return [];
    }
  }

  /**
   * Cleans up a specific file
   */
  async cleanup(filePath: string): Promise<void> {
    if (!this.cleanupAfterSend) {
      return;
    }

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`🗑️ Cleaned up file: ${path.basename(filePath)}`);
      }

      // Also clean up related files (thumbnails, info files)
      const baseName = path.parse(filePath).name;
      const relatedFiles = [
        filePath.replace(path.extname(filePath), '.info.json'),
        filePath.replace(path.extname(filePath), '.jpg'),
        filePath.replace(path.extname(filePath), '.png'),
        filePath.replace(path.extname(filePath), '.webp')
      ];

      for (const relatedFile of relatedFiles) {
        try {
          if (fs.existsSync(relatedFile)) {
            await fs.promises.unlink(relatedFile);
            console.log(`🗑️ Cleaned up related file: ${path.basename(relatedFile)}`);
          }
        } catch (error) {
          // Ignore errors for related files
        }
      }
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }

  /**
   * Cleans up all files in temp directory
   */
  async cleanupAll(): Promise<void> {
    const files = this.listTempFiles();
    const cleanupPromises = files.map(file => this.cleanup(file));
    
    try {
      await Promise.all(cleanupPromises);
      console.log(`🗑️ Cleaned up ${files.length} temporary files`);
    } catch (error) {
      console.error('Error during mass cleanup:', error);
    }
  }

  /**
   * Cleans up old files (older than specified hours)
   */
  async cleanupOldFiles(maxAgeHours: number = 1): Promise<void> {
    const files = this.listTempFiles();
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    for (const filePath of files) {
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.mtimeMs < cutoffTime) {
          await this.cleanup(filePath);
        }
      } catch (error) {
        console.error(`Error checking file age ${filePath}:`, error);
      }
    }
  }

  /**
   * Gets directory size and file count
   */
  async getDirectoryStats(): Promise<{ fileCount: number; totalSize: number }> {
    const files = this.listTempFiles();
    let totalSize = 0;

    for (const filePath of files) {
      try {
        const stats = await fs.promises.stat(filePath);
        totalSize += stats.size;
      } catch (error) {
        // Ignore errors for individual files
      }
    }

    return {
      fileCount: files.length,
      totalSize
    };
  }

  /**
   * Formats file size for human readable display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Formats duration for human readable display
   */
  static formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
} 