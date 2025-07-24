import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { VideoCacheEntry, VideoCache, VideoCacheStats, CacheCleanupOptions } from '../../types/video-cache';
import { cleanUrl } from '../../utils/url-utils';

export class VideoCacheService {
  private cacheFilePath: string;
  private cache: VideoCache;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(cacheDir: string = '.video-cache') {
    this.cacheFilePath = path.join(process.cwd(), cacheDir, 'video-cache.json');
    this.cache = this.loadCache();
  }

  /**
   * Genera un hash único para una URL
   */
  private generateUrlHash(url: string): string {
    const cleanedUrl = cleanUrl(url).toLowerCase();
    return crypto.createHash('sha256').update(cleanedUrl).digest('hex').substring(0, 16);
  }

  /**
   * Carga el caché desde el archivo
   */
  private loadCache(): VideoCache {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf8');
        const parsedCache = JSON.parse(data) as VideoCache;
        
        // Validar versión y migrar si es necesario
        if (parsedCache.version !== '1.0') {
          console.log('🔄 Migrando caché de videos a nueva versión...');
          return this.createEmptyCache();
        }
        
        console.log(`📦 Caché de videos cargado: ${parsedCache.totalEntries} entradas`);
        return parsedCache;
      }
    } catch (error) {
      console.error('❌ Error cargando caché de videos:', error);
    }
    
    return this.createEmptyCache();
  }

  /**
   * Crea un caché vacío
   */
  private createEmptyCache(): VideoCache {
    return {
      version: '1.0',
      lastUpdated: Date.now(),
      totalEntries: 0,
      entries: {}
    };
  }

  /**
   * Guarda el caché en el archivo
   */
  private saveCache(): void {
    try {
      // Crear directorio si no existe
      const cacheDir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      this.cache.lastUpdated = Date.now();
      this.cache.totalEntries = Object.keys(this.cache.entries).length;

      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('❌ Error guardando caché de videos:', error);
    }
  }

  /**
   * Busca una entrada en el caché por URL
   */
  getCachedEntry(url: string): VideoCacheEntry | null {
    const urlHash = this.generateUrlHash(url);
    const entry = this.cache.entries[urlHash];
    
    if (entry) {
      this.stats.hits++;
      console.log(`💾 Cache HIT para ${url} -> mensaje ${entry.messageId} en chat ${entry.chatId}`);
      return entry;
    }
    
    this.stats.misses++;
    console.log(`❌ Cache MISS para ${url}`);
    return null;
  }

  /**
   * Guarda una nueva entrada en el caché
   */
  addEntry(
    url: string,
    messageId: number,
    chatId: number,
    platform: string,
    metadata?: {
      title?: string;
      author?: string;
      duration?: number;
      fileSize?: number;
    }
  ): void {
    const urlHash = this.generateUrlHash(url);
    const cleanedUrl = cleanUrl(url);
    
    const entry: VideoCacheEntry = {
      url,
      cleanUrl: cleanedUrl,
      messageId,
      chatId,
      platform,
      urlHash,
      timestamp: Date.now(),
      title: metadata?.title,
      author: metadata?.author,
      duration: metadata?.duration,
      fileSize: metadata?.fileSize
    };

    this.cache.entries[urlHash] = entry;
    this.saveCache();
    
    console.log(`💾 Guardado en caché: ${platform} - ${url} -> mensaje ${messageId}`);
  }

  /**
   * Elimina una entrada del caché
   */
  removeEntry(url: string): boolean {
    const urlHash = this.generateUrlHash(url);
    
    if (this.cache.entries[urlHash]) {
      delete this.cache.entries[urlHash];
      this.saveCache();
      console.log(`🗑️ Eliminado del caché: ${url}`);
      return true;
    }
    
    return false;
  }

  /**
   * Verifica si un mensaje aún existe en Telegram
   */
  async isMessageValid(entry: VideoCacheEntry, botApi: any): Promise<boolean> {
    try {
      // Intentar obtener el mensaje para verificar si existe
      await botApi.forwardMessage(entry.chatId, entry.chatId, entry.messageId);
      return true;
    } catch (error) {
      // Si el mensaje no existe, eliminarlo del caché
      console.log(`🗑️ Mensaje ${entry.messageId} no existe, eliminando del caché`);
      this.removeEntry(entry.url);
      return false;
    }
  }

  /**
   * Limpia entradas inválidas o antiguas del caché
   */
  async cleanup(options: CacheCleanupOptions = {}, botApi?: any): Promise<number> {
    const {
      olderThanDays = 30,
      maxEntries = 1000,
      excludePlatforms = [],
      minFileSize = 0
    } = options;

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;
    const entriesArray = Object.values(this.cache.entries);

    // Ordenar por timestamp (más antiguos primero)
    entriesArray.sort((a, b) => a.timestamp - b.timestamp);

    for (const entry of entriesArray) {
      let shouldRemove = false;

      // Eliminar por edad
      if (entry.timestamp < cutoffTime) {
        shouldRemove = true;
      }

      // Eliminar por plataforma excluida
      if (excludePlatforms.includes(entry.platform)) {
        shouldRemove = true;
      }

      // Eliminar por tamaño mínimo
      if (minFileSize > 0 && (!entry.fileSize || entry.fileSize < minFileSize)) {
        shouldRemove = true;
      }

      // Verificar si el mensaje aún existe (si se proporciona botApi)
      if (!shouldRemove && botApi) {
        const isValid = await this.isMessageValid(entry, botApi);
        if (!isValid) {
          shouldRemove = true;
        }
      }

      if (shouldRemove) {
        delete this.cache.entries[entry.urlHash];
        removedCount++;
      }
    }

    // Aplicar límite máximo de entradas
    const remainingEntries = Object.values(this.cache.entries);
    if (remainingEntries.length > maxEntries) {
      // Ordenar por timestamp y mantener solo las más recientes
      remainingEntries.sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = remainingEntries.slice(0, maxEntries);
      
      this.cache.entries = {};
      toKeep.forEach(entry => {
        this.cache.entries[entry.urlHash] = entry;
      });
      
      removedCount += remainingEntries.length - maxEntries;
    }

    if (removedCount > 0) {
      this.saveCache();
      console.log(`🧹 Limpieza del caché completada: ${removedCount} entradas eliminadas`);
    }

    return removedCount;
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): VideoCacheStats {
    const entries = Object.values(this.cache.entries);
    const totalSize = entries.reduce((sum, entry) => sum + (entry.fileSize || 0), 0);
    
    const platformStats: Record<string, number> = {};
    entries.forEach(entry => {
      platformStats[entry.platform] = (platformStats[entry.platform] || 0) + 1;
    });

    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      totalEntries: entries.length,
      cacheHits: this.stats.hits,
      cacheMisses: this.stats.misses,
      hitRatio,
      totalSize,
      platformStats,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Busca entradas por plataforma
   */
  getEntriesByPlatform(platform: string): VideoCacheEntry[] {
    return Object.values(this.cache.entries).filter(entry => entry.platform === platform);
  }

  /**
   * Busca entradas por patrón en la URL
   */
  searchEntries(pattern: string): VideoCacheEntry[] {
    const regex = new RegExp(pattern, 'i');
    return Object.values(this.cache.entries).filter(entry => 
      regex.test(entry.url) || regex.test(entry.title || '') || regex.test(entry.author || '')
    );
  }

  /**
   * Exporta el caché a un formato legible
   */
  exportCache(): any {
    return {
      metadata: {
        version: this.cache.version,
        lastUpdated: new Date(this.cache.lastUpdated).toISOString(),
        totalEntries: this.cache.totalEntries
      },
      stats: this.getStats(),
      entries: Object.values(this.cache.entries).map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp).toISOString()
      }))
    };
  }

  /**
   * Limpia completamente el caché
   */
  clearCache(): void {
    this.cache = this.createEmptyCache();
    this.stats = { hits: 0, misses: 0 };
    this.saveCache();
    console.log('🗑️ Caché de videos limpiado completamente');
  }
}

// Instancia singleton del servicio
export const videoCacheService = new VideoCacheService(); 