export interface DownloadInfo {
  id: string;
  title: string;
  description?: string;
  uploader: string;
  upload_date?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  dislike_count?: number;
  comment_count?: number;
  extractor: string;
  extractor_key: string;
  webpage_url: string;
  original_url: string;
  thumbnail?: string;
  thumbnails?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  formats?: Array<{
    format_id: string;
    url: string;
    ext: string;
    width?: number;
    height?: number;
    filesize?: number;
    tbr?: number;
    vbr?: number;
    abr?: number;
  }>;
  filesize?: number;
  _type?: 'video' | 'audio' | 'playlist';
  playlist_count?: number;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  thumbnail?: string;
  info?: DownloadInfo;
  error?: string;
  extractor?: string;
}

export interface DownloadOptions {
  maxFileSize: number;
  maxDuration: number;
  videoQuality: string;
  audioQuality: string;
  extractAudio: boolean;
  extractSubtitles: boolean;
  extractThumbnails: boolean;
  tempDir: string;
  cleanupAfterSend: boolean;
  showProgress: boolean;
}

export interface DownloadConfig {
  enabled: boolean;
  maxFileSize: number;
  maxDuration: number;
  videoQuality: string;
  audioQuality: string;
  extractAudio: boolean;
  extractSubtitles: boolean;
  extractThumbnails: boolean;
  blockedDomains: string[];
  nsfwBlocked: boolean;
  blockPlaylists: boolean;
  tempDir: string;
  cleanupAfterSend: boolean;
  maxConcurrentDownloads: number;
  showFallbackMessage: boolean;
  showProgress: boolean;
  showExtractorName: boolean;
}

export interface FileInfo {
  path: string;
  size: number;
  ext: string;
  mimeType: string;
  isVideo: boolean;
  isAudio: boolean;
  isImage: boolean;
} 