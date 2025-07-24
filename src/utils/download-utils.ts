import { DownloadResult, DownloadInfo } from '../types/download';
import { FileManager } from '../services/download/file-manager';

/**
 * Formats a successful download result for Telegram
 */
export function formatDownloadResult(downloadResult: DownloadResult): string {
  const { info, extractor, fileSize, duration } = downloadResult;
  
  let message = '';
  
  // Platform header
  if (extractor) {
    const emoji = getExtractorEmoji(extractor);
    message += `${emoji} <b>${extractor.toUpperCase()}</b>\n`;
  }
  
  // Author
  if (info?.uploader) {
    message += `👤 <b>Autor:</b> ${info.uploader}\n`;
  }
  
  // Title/Content
  if (info?.title) {
    message += `\n📝 <b>Título:</b>\n${info.title}\n`;
  }
  
  // Metadata
  const metadata = [];
  
  if (duration) {
    metadata.push(`⏱️ ${FileManager.formatDuration(duration)}`);
  }
  
  if (fileSize) {
    metadata.push(`📦 ${FileManager.formatFileSize(fileSize)}`);
  }
  
  if (info?.view_count) {
    metadata.push(`👁️ ${info.view_count.toLocaleString()}`);
  }
  
  if (info?.like_count) {
    metadata.push(`❤️ ${info.like_count.toLocaleString()}`);
  }
  
  if (metadata.length > 0) {
    message += `\n${metadata.join(' | ')}\n`;
  }
  
  // Original link
  if (info?.webpage_url) {
    message += `\n🔗 <a href="${info.webpage_url}">Ver original</a>`;
  }
  
  return message;
}

/**
 * Formats a download error for Telegram
 */
export function formatDownloadError(url: string, error: string): string {
  return `⬬ <b>Error de Descarga</b>\n\n` +
         `🔗 <b>URL:</b> ${url}\n` +
         `❌ <b>Error:</b> ${error}\n\n` +
         `💡 <b>Posibles causas:</b>\n` +
         `• Sitio no soportado\n` +
         `• Contenido privado o eliminado\n` +
         `• Archivo demasiado grande\n` +
         `• Error de conexión`;
}

/**
 * Gets appropriate emoji for extractor/platform
 */
export function getExtractorEmoji(extractor: string): string {
  const emojis: Record<string, string> = {
    youtube: '📺',
    twitter: '🐦', 
    instagram: '📷',
    tiktok: '🎵',
    facebook: '📘',
    reddit: '🤖',
    twitch: '🎮',
    vimeo: '🎬',
    soundcloud: '🎧',
    bandcamp: '🎵',
    dailymotion: '📹',
    'bbc': '📺',
    'cnn': '📰',
    'reuters': '📰',
    'generic': '⬬'
  };
  
  return emojis[extractor.toLowerCase()] || emojis['generic'];
}

/**
 * Determines if URL is likely to be supported by youtube-dl
 */
export function isLikelySupported(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Known supported domains
    const supportedDomains = [
      'youtube.com', 'youtu.be',
      'twitter.com', 'x.com',
      'instagram.com',
      'tiktok.com', 'vm.tiktok.com',
      'facebook.com', 'fb.watch',
      'reddit.com', 'v.redd.it',
      'twitch.tv',
      'vimeo.com',
      'soundcloud.com',
      'bandcamp.com',
      'dailymotion.com',
      'bbc.co.uk', 'bbc.com',
      'cnn.com',
      'reuters.com'
    ];
    
    return supportedDomains.some(supportedDomain => 
      domain.includes(supportedDomain) || supportedDomain.includes(domain)
    );
  } catch {
    return false;
  }
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts domain from URL for display
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'sitio desconocido';
  }
}

/**
 * Creates a summary message for download service status
 */
export function formatDownloadServiceStatus(stats: {
  supportedSites: number;
  tempFiles: number;
  tempSize: number;
  activeConcurrentDownloads: number;
  maxConcurrentDownloads: number;
}): string {
  return `📊 <b>Estado del Servicio de Descarga</b>\n\n` +
         `🌍 <b>Sitios soportados:</b> ${stats.supportedSites}+\n` +
         `📁 <b>Archivos temporales:</b> ${stats.tempFiles}\n` +
         `💾 <b>Espacio usado:</b> ${FileManager.formatFileSize(stats.tempSize)}\n` +
         `⚡ <b>Descargas activas:</b> ${stats.activeConcurrentDownloads}/${stats.maxConcurrentDownloads}`;
}

/**
 * Gets help message for download functionality
 */
export function getDownloadHelp(): string {
  return `⬬ <b>Descarga Universal</b>\n\n` +
         `<b>¿Qué es?</b>\n` +
         `Sistema de respaldo que descarga contenido de 1000+ sitios web cuando las APIs directas fallan.\n\n` +
         `<b>Sitios soportados:</b>\n` +
         `📺 YouTube, Vimeo, Dailymotion\n` +
         `🤖 Reddit, Facebook, Twitch\n` +
         `🎧 SoundCloud, Bandcamp\n` +
         `📰 BBC, CNN, Reuters\n` +
         `🌍 Y muchísimos más!\n\n` +
         `<b>Cómo funciona:</b>\n` +
         `1. Intenta APIs rápidas primero\n` +
         `2. Si fallan, descarga directamente\n` +
         `3. Envía el contenido a Telegram\n` +
         `4. Limpia archivos temporales\n\n` +
         `<b>Límites:</b>\n` +
         `• Máximo 50MB por archivo\n` +
         `• Máximo 10 minutos de duración\n` +
         `• Calidad optimizada para Telegram\n\n` +
         `💡 <b>Simplemente envía cualquier URL de video/audio!</b>`;
} 