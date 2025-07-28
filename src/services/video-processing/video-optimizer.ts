const ffmpeg = require('fluent-ffmpeg');
import * as path from 'path';
import * as fs from 'fs';

export interface VideoOptimizationOptions {
  // Mover metadatos al principio (faststart)
  faststart?: boolean;
  // Recodificar si es necesario
  reencode?: boolean;
  // Calidad de compresión (0-51, menor es mejor calidad)
  crf?: number;
  // Resolución máxima
  maxResolution?: { width: number; height: number };
  // Duración máxima del video en segundos
  maxDuration?: number;
  // Tamaño máximo del archivo en bytes
  maxFileSize?: number;
}

export interface OptimizationResult {
  success: boolean;
  optimizedPath?: string;
  error?: string;
  sizeReduction?: number;
  processingTime?: number;
  wasOptimized: boolean;
}

export class VideoOptimizer {
  private tempDir: string;
  private defaultOptions: VideoOptimizationOptions;

  constructor(tempDir: string, defaultOptions: VideoOptimizationOptions = {}) {
    this.tempDir = tempDir;
    this.defaultOptions = {
      faststart: true,
      reencode: false,
      crf: 28,
      maxResolution: { width: 1280, height: 720 },
      maxDuration: 300, // 5 minutos
      maxFileSize: 50 * 1024 * 1024, // 50MB
      ...defaultOptions
    };
  }

  /**
   * Optimiza un video para Telegram
   */
  async optimizeVideo(inputPath: string, options: VideoOptimizationOptions = {}): Promise<OptimizationResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      if (!fs.existsSync(inputPath)) {
        return {
          success: false,
          error: 'Input file does not exist',
          wasOptimized: false
        };
      }

      // Verificar si el archivo ya está optimizado
      const needsOptimization = await this.checkIfNeedsOptimization(inputPath, opts);
      
      if (!needsOptimization) {
        console.log('📹 Video already optimized, skipping...');
        return {
          success: true,
          optimizedPath: inputPath,
          wasOptimized: false,
          processingTime: Date.now() - startTime
        };
      }

      // Generar nombre para el archivo optimizado
      const outputPath = this.generateOutputPath(inputPath);
      
      // Procesar video
      await this.processVideo(inputPath, outputPath, opts);
      
      // Verificar resultado
      if (!fs.existsSync(outputPath)) {
        return {
          success: false,
          error: 'Optimized file was not created',
          wasOptimized: false
        };
      }

      const originalSize = fs.statSync(inputPath).size;
      const optimizedSize = fs.statSync(outputPath).size;
      const sizeReduction = ((originalSize - optimizedSize) / originalSize) * 100;

      console.log(`📹 Video optimized: ${this.formatFileSize(originalSize)} → ${this.formatFileSize(optimizedSize)} (${sizeReduction.toFixed(1)}% reduction)`);

      return {
        success: true,
        optimizedPath: outputPath,
        sizeReduction,
        processingTime: Date.now() - startTime,
        wasOptimized: true
      };

    } catch (error) {
      console.error('Error optimizing video:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        wasOptimized: false,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Verifica si el video necesita optimización
   */
  private async checkIfNeedsOptimization(inputPath: string, options: VideoOptimizationOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
        if (!videoStream) {
          resolve(false);
          return;
        }

        // Verificar si necesita faststart
        const needsFaststart = options.faststart && !this.hasFaststart(metadata);
        
        // Verificar resolución
        const needsResize = options.maxResolution && 
          (videoStream.width > options.maxResolution.width || 
           videoStream.height > options.maxResolution.height);

        // Verificar duración
        const needsTrimming = options.maxDuration && 
          metadata.format.duration && metadata.format.duration > options.maxDuration;

        // Verificar tamaño
        const needsCompression = options.maxFileSize && 
          fs.statSync(inputPath).size > options.maxFileSize;

        // Verificar codec
        const needsReencoding = options.reencode || 
          videoStream.codec_name !== 'h264' ||
          needsResize || needsTrimming || needsCompression;

        resolve(Boolean(needsFaststart || needsReencoding));
      });
    });
  }

  /**
   * Verifica si el video ya tiene faststart
   */
  private hasFaststart(metadata: any): boolean {
    // Verificación básica: si es MP4 y tiene metadatos al principio
    // ffmpeg puede detectar esto, pero es complejo
    // Por simplicidad, asumimos que necesita optimización si no sabemos
    return false;
  }

  /**
   * Procesa el video con ffmpeg
   */
  private processVideo(inputPath: string, outputPath: string, options: VideoOptimizationOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Configurar codec de video
      command = command.videoCodec('libx264');

      // Configurar calidad
      if (options.crf) {
        command = command.outputOptions(['-crf', options.crf.toString()]);
      }

      // Configurar resolución
      if (options.maxResolution) {
        const { width, height } = options.maxResolution;
        command = command.size(`${width}x${height}`);
      }

      // Configurar duración
      if (options.maxDuration) {
        command = command.duration(options.maxDuration);
      }

      // Configurar faststart (mover metadatos al principio)
      if (options.faststart) {
        command = command.outputOptions(['-movflags', '+faststart']);
      }

      // Configurar preset para optimización
      command = command.outputOptions([
        '-preset', 'medium',
        '-profile:v', 'high',
        '-level', '4.0',
        '-pix_fmt', 'yuv420p'
      ]);

      // Configurar audio
      command = command.audioCodec('aac').audioBitrate('128k');

      // Configurar formato de salida
      command = command.format('mp4');

      // Ejecutar procesamiento
      command
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('📹 Starting video optimization:', commandLine);
        })
        .on('progress', (progress: any) => {
          if (progress.percent) {
            process.stdout.write(`\r📹 Processing video: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ Video optimization completed');
          resolve();
        })
        .on('error', (err: any) => {
          console.log('\n❌ Video optimization failed:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Genera nombre para el archivo optimizado
   */
  private generateOutputPath(inputPath: string): string {
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);
    const dirname = path.dirname(inputPath);
    
    return path.join(dirname, `${basename}_optimized${ext}`);
  }

  /**
   * Formatea el tamaño del archivo
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Limpia archivos temporales
   */
  async cleanup(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`🗑️ Cleaned up optimized video: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error('Error cleaning up optimized video:', error);
    }
  }
} 