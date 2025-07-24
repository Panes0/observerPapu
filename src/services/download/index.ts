export { YouTubeDLService } from './youtube-dl-service';
export { FileManager } from './file-manager';
export { RedditService } from './reddit-service';

import { YouTubeDLService } from './youtube-dl-service';
import { DownloadConfig } from '../../types/download';

// Default configuration for the download service
const defaultDownloadConfig: DownloadConfig = {
  enabled: true,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxDuration: 600, // 10 minutes
  videoQuality: 'best[height<=720]',
  audioQuality: 'best[abr<=128]',
  extractAudio: true,
  extractSubtitles: false,
  extractThumbnails: true,
  blockedDomains: [],
  nsfwBlocked: false,
  blockPlaylists: false,
  tempDir: './temp_downloads',
  cleanupAfterSend: true,
  maxConcurrentDownloads: 2,
  showFallbackMessage: true,
  showProgress: true,
  showExtractorName: true
};

// Global download service instance (will be configured later)
let downloadService: YouTubeDLService | null = null;

/**
 * Configures the global download service
 */
export function configureDownloadService(config: DownloadConfig): void {
  downloadService = new YouTubeDLService(config);
  console.log('🚀 Download service configured with youtube-dl-exec');
}

/**
 * Gets the configured download service instance
 */
export function getDownloadService(): YouTubeDLService {
  if (!downloadService) {
    // Use default config if not configured
    downloadService = new YouTubeDLService(defaultDownloadConfig);
    console.log('⚠️ Using default download service configuration');
  }
  return downloadService;
}

/**
 * Checks if download service is configured
 */
export function isDownloadServiceConfigured(): boolean {
  return downloadService !== null;
}

/**
 * Gets default download configuration
 */
export function getDefaultDownloadConfig(): DownloadConfig {
  return { ...defaultDownloadConfig };
} 