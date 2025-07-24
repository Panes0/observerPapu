/**
 * Entrada individual del caché de videos
 */
export interface VideoCacheEntry {
  /** URL original del video */
  url: string;
  
  /** URL limpia (sin parámetros de tracking) */
  cleanUrl: string;
  
  /** ID del mensaje con el video procesado */
  messageId: number;
  
  /** ID del chat donde está almacenado el mensaje */
  chatId: number;
  
  /** Plataforma del video (youtube, tiktok, etc.) */
  platform: string;
  
  /** Hash de la URL para búsqueda rápida */
  urlHash: string;
  
  /** Timestamp de cuando se guardó */
  timestamp: number;
  
  /** Título del video (opcional) */
  title?: string;
  
  /** Autor del video (opcional) */
  author?: string;
  
  /** Duración en segundos (opcional) */
  duration?: number;
  
  /** Tamaño del archivo en bytes (opcional) */
  fileSize?: number;
}

/**
 * Estructura del archivo de caché
 */
export interface VideoCache {
  /** Versión del formato de caché */
  version: string;
  
  /** Timestamp de última actualización */
  lastUpdated: number;
  
  /** Número total de entradas */
  totalEntries: number;
  
  /** Mapa de hash de URL -> entrada del caché */
  entries: Record<string, VideoCacheEntry>;
}

/**
 * Estadísticas del caché
 */
export interface VideoCacheStats {
  /** Número total de entradas */
  totalEntries: number;
  
  /** Número de hits del caché */
  cacheHits: number;
  
  /** Número de misses del caché */
  cacheMisses: number;
  
  /** Ratio de aciertos (hits / (hits + misses)) */
  hitRatio: number;
  
  /** Tamaño total estimado en bytes */
  totalSize: number;
  
  /** Plataformas más cacheadas */
  platformStats: Record<string, number>;
  
  /** Fecha de la entrada más antigua */
  oldestEntry: number;
  
  /** Fecha de la entrada más reciente */
  newestEntry: number;
}

/**
 * Opciones para limpiar el caché
 */
export interface CacheCleanupOptions {
  /** Eliminar entradas más antiguas que X días */
  olderThanDays?: number;
  
  /** Máximo número de entradas a mantener */
  maxEntries?: number;
  
  /** Eliminar entradas de plataformas específicas */
  excludePlatforms?: string[];
  
  /** Solo mantener entradas con cierto tamaño mínimo */
  minFileSize?: number;
} 