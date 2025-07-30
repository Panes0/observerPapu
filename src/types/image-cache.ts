/**
 * Tipos para el servicio de caché de imágenes
 */

export interface ImageCacheEntry {
  url: string;
  cleanUrl: string;
  filePath: string;
  messageId?: number;
  chatId?: number;
  urlHash: string;
  timestamp: number;
  fileSize?: number;
  contentType?: string;
  width?: number;
  height?: number;
  title?: string;
  query: string;
}

export interface ImageCache {
  version: string;
  lastUpdated: number;
  totalEntries: number;
  entries: Record<string, ImageCacheEntry>;
}

export interface ImageCacheStats {
  totalEntries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatio: number;
  totalSize: number;
  contentTypeStats: Record<string, number>;
  oldestEntry: number;
  newestEntry: number;
}

export interface ImageCacheCleanupOptions {
  olderThanDays?: number;
  maxEntries?: number;
  minFileSize?: number;
  maxFileSize?: number;
  invalidateFileChecks?: boolean;
}