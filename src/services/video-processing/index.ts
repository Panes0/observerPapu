import { VideoOptimizer, VideoOptimizationOptions, OptimizationResult } from './video-optimizer';

export { VideoOptimizer, VideoOptimizationOptions, OptimizationResult };

// Instance singleton para evitar múltiples instancias
let videoOptimizerInstance: VideoOptimizer | null = null;

/**
 * Obtiene una instancia del optimizador de videos
 */
export function getVideoOptimizer(tempDir: string): VideoOptimizer {
  if (!videoOptimizerInstance) {
    videoOptimizerInstance = new VideoOptimizer(tempDir, {
      faststart: true,
      reencode: false,
      crf: 28,
      maxResolution: { width: 1280, height: 720 },
      maxDuration: 300, // 5 minutos
      maxFileSize: 50 * 1024 * 1024, // 50MB
    });
  }
  return videoOptimizerInstance;
} 