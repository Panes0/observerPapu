import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

export interface ImageDownloadResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  contentType?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface ImageDownloadOptions {
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  tempDir?: string;
  timeout?: number; // in milliseconds
}

export class ImageDownloadService {
  private readonly defaultOptions: Required<ImageDownloadOptions> = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    tempDir: path.join(process.cwd(), 'temp_downloads', 'images'),
    timeout: 30000 // 30 seconds
  };

  constructor(private options: ImageDownloadOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
    this.ensureTempDir();
  }

  /**
   * Asegura que el directorio temporal exista
   */
  private ensureTempDir(): void {
    try {
      if (!fs.existsSync(this.options.tempDir!)) {
        fs.mkdirSync(this.options.tempDir!, { recursive: true });
      }
    } catch (error) {
      console.error('❌ Error creando directorio temporal para imágenes:', error);
    }
  }

  /**
   * Descarga una imagen desde una URL
   */
  async downloadImage(url: string, filename?: string): Promise<ImageDownloadResult> {
    try {
      console.log(`📥 Descargando imagen desde: ${url}`);

      // Validar URL
      if (!this.isValidUrl(url)) {
        return {
          success: false,
          error: 'URL inválida'
        };
      }

      // Declarar variables fuera de los bloques try-catch
      let filePath: string;
      let contentType: string = '';
      let skipValidation = false;

      // Intentar petición HEAD primero para validación
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout!);

        const headResponse = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site'
          }
        });

        clearTimeout(timeoutId);
        
        if (headResponse.ok) {
          contentType = headResponse.headers.get('content-type') || '';
          const contentLength = parseInt(headResponse.headers.get('content-length') || '0');

          // Validar tipo de contenido
          if (contentType && !this.isAllowedContentType(contentType)) {
            return {
              success: false,
              error: `Tipo de archivo no permitido: ${contentType}`
            };
          }

          // Validar tamaño
          if (contentLength > 0 && contentLength > this.options.maxFileSize!) {
            return {
              success: false,
              error: `Archivo demasiado grande: ${Math.round(contentLength / 1024 / 1024)}MB`
            };
          }
        } else {
          console.log(`⚠️ HEAD request failed (${headResponse.status}), proceeding without pre-validation`);
          skipValidation = true;
        }
      } catch (headError) {
        console.log(`⚠️ HEAD request failed: ${headError instanceof Error ? headError.message : 'Unknown error'}`);
        skipValidation = true;
      }

      // Proceder con la descarga
      const downloadController = new AbortController();
      const downloadTimeoutId = setTimeout(() => downloadController.abort(), this.options.timeout!);

      try {
        // Generar nombre de archivo único
        const finalFilename = filename || this.generateFilename(url, contentType || 'image/jpeg');
        filePath = path.join(this.options.tempDir!, finalFilename);

        // Descargar imagen
        const response = await fetch(url, {
          signal: downloadController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
            'Referer': new URL(url).origin + '/'
          }
        });

        clearTimeout(downloadTimeoutId);

        if (!response.ok) {
          return {
            success: false,
            error: `Error HTTP: ${response.status}`
          };
        }

        // Validar content-type si se saltó antes
        if (skipValidation) {
          const responseContentType = response.headers.get('content-type') || '';
          if (responseContentType && !this.isAllowedContentType(responseContentType)) {
            return {
              success: false,
              error: `Tipo de archivo no permitido: ${responseContentType}`
            };
          }
          contentType = responseContentType;
        }

        // Guardar archivo
        const fileStream = fs.createWriteStream(filePath);
        if (response.body) {
          await streamPipeline(response.body as any, fileStream);
        } else {
          return {
            success: false,
            error: 'No se pudo obtener el contenido de la respuesta'
          };
        }
      } catch (downloadError) {
        clearTimeout(downloadTimeoutId);
        throw downloadError;
      }

      // Verificar que el archivo se guardó correctamente
      const stats = fs.statSync(filePath);
      if (!stats.isFile() || stats.size === 0) {
        // Limpiar archivo vacío
        try {
          fs.unlinkSync(filePath);
        } catch {}
        
        return {
          success: false,
          error: 'Archivo descargado está vacío'
        };
      }

      // Verificar tamaño final
      if (stats.size > this.options.maxFileSize!) {
        // Limpiar archivo demasiado grande
        try {
          fs.unlinkSync(filePath);
        } catch {}
        
        return {
          success: false,
          error: `Archivo descargado demasiado grande: ${Math.round(stats.size / 1024 / 1024)}MB`
        };
      }

      // Obtener dimensiones si es posible
      const dimensions = await this.getImageDimensions(filePath, contentType);

      console.log(`✅ Imagen descargada: ${filePath} (${Math.round(stats.size / 1024)}KB)`);

      return {
        success: true,
        filePath,
        fileSize: stats.size,
        contentType,
        width: dimensions?.width,
        height: dimensions?.height
      };

    } catch (error) {
      console.error('❌ Error descargando imagen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Valida si una URL es válida
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Verifica si el tipo de contenido es permitido
   */
  private isAllowedContentType(contentType: string): boolean {
    return this.options.allowedTypes!.some(type => contentType.includes(type));
  }

  /**
   * Genera un nombre de archivo único
   */
  private generateFilename(url: string, contentType: string): string {
    const urlHash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const extension = this.getFileExtension(contentType);
    
    return `img_${timestamp}_${urlHash}${extension}`;
  }

  /**
   * Obtiene la extensión de archivo basada en el tipo de contenido
   */
  private getFileExtension(contentType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/svg+xml': '.svg'
    };

    for (const [type, ext] of Object.entries(typeMap)) {
      if (contentType.includes(type)) {
        return ext;
      }
    }

    return '.jpg'; // default
  }

  /**
   * Intenta obtener las dimensiones de una imagen
   */
  private async getImageDimensions(filePath: string, contentType: string): Promise<{ width: number; height: number } | null> {
    try {
      // Para implementación básica, retornamos null
      // En una implementación completa, podrías usar una librería como 'sharp' o 'image-size'
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Limpia archivos temporales antiguos
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
    try {
      if (!fs.existsSync(this.options.tempDir!)) {
        return 0;
      }

      const files = fs.readdirSync(this.options.tempDir!);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      let removedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.options.tempDir!, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            removedCount++;
          }
        } catch (error) {
          console.log(`⚠️ No se pudo procesar archivo temporal: ${file}`);
        }
      }

      if (removedCount > 0) {
        console.log(`🧹 Limpieza de archivos temporales de imágenes: ${removedCount} archivos eliminados`);
      }

      return removedCount;
    } catch (error) {
      console.error('❌ Error limpiando archivos temporales de imágenes:', error);
      return 0;
    }
  }

  /**
   * Elimina un archivo temporal específico
   */
  cleanupFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Archivo temporal eliminado: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.log(`⚠️ No se pudo eliminar archivo temporal: ${filePath}`);
      return false;
    }
  }
}

// Instancia singleton del servicio
export const imageDownloadService = new ImageDownloadService();