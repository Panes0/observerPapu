import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ImageCacheEntry, ImageCache, ImageCacheStats, ImageCacheCleanupOptions } from '../../types/image-cache';
import { cleanUrl } from '../../utils/url-utils';

export class ImageCacheService {
  private cacheFilePath: string;
  private cache: ImageCache;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(cacheDir: string = '.image-cache') {
    this.cacheFilePath = path.join(process.cwd(), cacheDir, 'image-cache.json');
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
  private loadCache(): ImageCache {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf8');
        const parsedCache = JSON.parse(data) as ImageCache;
        
        // Validar versión y migrar si es necesario
        if (parsedCache.version !== '1.0') {
          console.log('🔄 Migrando caché de imágenes a nueva versión...');
          return this.createEmptyCache();
        }
        
        console.log(`📦 Caché de imágenes cargado: ${parsedCache.totalEntries} entradas`);
        return parsedCache;
      }
    } catch (error) {
      console.error('❌ Error cargando caché de imágenes:', error);
    }
    
    return this.createEmptyCache();
  }

  /**
   * Crea un caché vacío
   */
  private createEmptyCache(): ImageCache {
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
      console.error('❌ Error guardando caché de imágenes:', error);
    }
  }

  /**
   * Busca una entrada en el caché por URL
   */
  getCachedEntry(url: string): ImageCacheEntry | null {
    const urlHash = this.generateUrlHash(url);
    const entry = this.cache.entries[urlHash];
    
    if (entry && this.isFileValid(entry.filePath)) {
      this.stats.hits++;
      console.log(`💾 Image cache HIT para ${url} -> archivo ${entry.filePath}`);
      return entry;
    }
    
    if (entry && !this.isFileValid(entry.filePath)) {
      // Archivo no existe, limpiar entrada
      console.log(`🗑️ Archivo ${entry.filePath} no existe, eliminando del caché`);
      this.removeEntry(url);
    }
    
    this.stats.misses++;
    console.log(`❌ Image cache MISS para ${url}`);
    return null;
  }

  /**
   * Verifica si un archivo existe
   */
  private isFileValid(filePath: string): boolean {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Guarda una nueva entrada en el caché
   */
  addEntry(
    url: string,
    filePath: string,
    query: string,
    metadata?: {
      messageId?: number;
      chatId?: number;
      fileSize?: number;
      contentType?: string;
      width?: number;
      height?: number;
      title?: string;
    }
  ): void {
    const urlHash = this.generateUrlHash(url);
    const cleanedUrl = cleanUrl(url);
    
    const entry: ImageCacheEntry = {
      url,
      cleanUrl: cleanedUrl,
      filePath,
      query,
      urlHash,
      timestamp: Date.now(),
      messageId: metadata?.messageId,
      chatId: metadata?.chatId,
      fileSize: metadata?.fileSize,
      contentType: metadata?.contentType,
      width: metadata?.width,
      height: metadata?.height,
      title: metadata?.title
    };

    this.cache.entries[urlHash] = entry;
    this.saveCache();
    
    console.log(`💾 Imagen guardada en caché: ${query} - ${url} -> ${filePath}`);
  }

  /**
   * Elimina una entrada del caché
   */
  removeEntry(url: string): boolean {
    const urlHash = this.generateUrlHash(url);
    
    if (this.cache.entries[urlHash]) {
      const entry = this.cache.entries[urlHash];
      
      // Intentar eliminar el archivo también
      try {
        if (fs.existsSync(entry.filePath)) {
          fs.unlinkSync(entry.filePath);
          console.log(`🗑️ Archivo eliminado: ${entry.filePath}`);
        }
      } catch (error) {
        console.log(`⚠️ No se pudo eliminar archivo: ${entry.filePath}`);
      }
      
      delete this.cache.entries[urlHash];
      this.saveCache();
      console.log(`🗑️ Eliminado del caché: ${url}`);
      return true;
    }
    
    return false;
  }

  /**
   * Limpia entradas inválidas o antiguas del caché
   */
  async cleanup(options: ImageCacheCleanupOptions = {}): Promise<number> {
    const {
      olderThanDays = 30,
      maxEntries = 1000,
      minFileSize = 0,
      maxFileSize = Infinity,
      invalidateFileChecks = true
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

      // Verificar si el archivo aún existe
      if (invalidateFileChecks && !this.isFileValid(entry.filePath)) {
        shouldRemove = true;
      }

      // Eliminar por tamaño de archivo
      if (entry.fileSize) {
        if (entry.fileSize < minFileSize || entry.fileSize > maxFileSize) {
          shouldRemove = true;
        }
      }

      if (shouldRemove) {
        // Intentar eliminar el archivo
        try {
          if (fs.existsSync(entry.filePath)) {
            fs.unlinkSync(entry.filePath);
          }
        } catch (error) {
          console.log(`⚠️ No se pudo eliminar archivo: ${entry.filePath}`);
        }
        
        delete this.cache.entries[entry.urlHash];
        removedCount++;
      }
    }

    // Aplicar límite máximo de entradas
    const remainingEntries = Object.values(this.cache.entries);
    if (remainingEntries.length > maxEntries) {
      // Ordenar por timestamp y mantener solo las más recientes
      remainingEntries.sort((a, b) => b.timestamp - a.timestamp);
      const toRemove = remainingEntries.slice(maxEntries);
      
      for (const entry of toRemove) {
        // Intentar eliminar el archivo
        try {
          if (fs.existsSync(entry.filePath)) {
            fs.unlinkSync(entry.filePath);
          }
        } catch (error) {
          console.log(`⚠️ No se pudo eliminar archivo: ${entry.filePath}`);
        }
        
        delete this.cache.entries[entry.urlHash];
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.saveCache();
      console.log(`🧹 Limpieza del caché de imágenes completada: ${removedCount} entradas eliminadas`);
    }

    return removedCount;
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): ImageCacheStats {
    const entries = Object.values(this.cache.entries);
    const totalSize = entries.reduce((sum, entry) => sum + (entry.fileSize || 0), 0);
    
    const contentTypeStats: Record<string, number> = {};
    entries.forEach(entry => {
      if (entry.contentType) {
        contentTypeStats[entry.contentType] = (contentTypeStats[entry.contentType] || 0) + 1;
      }
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
      contentTypeStats,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Busca entradas por query
   */
  searchEntriesByQuery(query: string): ImageCacheEntry[] {
    const regex = new RegExp(query, 'i');
    return Object.values(this.cache.entries).filter(entry => 
      regex.test(entry.query) || regex.test(entry.title || '') || regex.test(entry.url)
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
    // Intentar eliminar todos los archivos
    const entries = Object.values(this.cache.entries);
    for (const entry of entries) {
      try {
        if (fs.existsSync(entry.filePath)) {
          fs.unlinkSync(entry.filePath);
        }
      } catch (error) {
        console.log(`⚠️ No se pudo eliminar archivo: ${entry.filePath}`);
      }
    }
    
    this.cache = this.createEmptyCache();
    this.stats = { hits: 0, misses: 0 };
    this.saveCache();
    console.log('🗑️ Caché de imágenes limpiado completamente');
  }
}

// Instancia singleton del servicio
export const imageCacheService = new ImageCacheService();