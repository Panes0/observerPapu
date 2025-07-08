import { ImageSearchResult, FormattedImageResult } from '../types/image-search';

/**
 * Formatea un resultado de búsqueda de imagen para Telegram
 */
export function formatImageResult(result: ImageSearchResult, query: string): FormattedImageResult {
  // Crear mensaje con información de la imagen
  let message = `🖼️ <b><a href="${result.url}">"${query}"</a></b> `;

  return {
    message,
    imageUrl: result.url,
    thumbnailUrl: result.thumbnailUrl,
    query,
    success: true
  };
}

/**
 * Formatea un mensaje de error para búsqueda de imágenes
 */
export function formatImageError(query: string, error: string): FormattedImageResult {
  const message = `❌ <b>Error buscando imágenes</b>\n\n` +
                  `🔍 <b>Búsqueda:</b> "${query}"\n` +
                  `⚠️ <b>Error:</b> ${escapeHtml(error)}\n\n` +
                  `💡 <b>Sugerencias:</b>\n` +
                  `• Intenta con palabras diferentes\n` +
                  `• Verifica que la búsqueda sea específica\n` +
                  `• Intenta de nuevo en unos minutos`;

  return {
    message,
    imageUrl: '',
    query,
    success: false
  };
}

/**
 * Formatea un mensaje cuando no se encuentran imágenes
 */
export function formatNoImagesFound(query: string): FormattedImageResult {
  const message = `😕 <b>No se encontraron imágenes</b>\n\n` +
                  `🔍 <b>Búsqueda:</b> "${query}"\n\n` +
                  `💡 <b>Sugerencias:</b>\n` +
                  `• Intenta con palabras más generales\n` +
                  `• Verifica la ortografía\n` +
                  `• Usa términos en inglés para más resultados`;

  return {
    message,
    imageUrl: '',
    query,
    success: false
  };
}

/**
 * Valida si una URL de imagen es válida
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === '') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Verificar protocolo
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Verificar que tenga una extensión de imagen común
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const pathname = urlObj.pathname.toLowerCase();
    
    return imageExtensions.some(ext => pathname.includes(ext)) || 
           pathname.includes('image') || 
           urlObj.hostname.includes('image');
  } catch {
    return false;
  }
}

/**
 * Escapa caracteres HTML para evitar problemas de parsing
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formatea las dimensiones de una imagen
 */
export function formatImageDimensions(width: number, height: number): string {
  if (width === 0 || height === 0) {
    return 'Dimensiones desconocidas';
  }

  // Determinar calidad basada en las dimensiones
  const totalPixels = width * height;
  let quality = '';

  if (totalPixels >= 2073600) { // 1920x1080
    quality = ' (Alta calidad)';
  } else if (totalPixels >= 921600) { // 1280x720
    quality = ' (Buena calidad)';
  } else if (totalPixels >= 307200) { // 640x480
    quality = ' (Calidad media)';
  } else {
    quality = ' (Baja calidad)';
  }

  return `${width}x${height}px${quality}`;
}

/**
 * Formatea el título de una imagen, limitando la longitud
 */
export function formatImageTitle(title: string, maxLength: number = 50): string {
  if (!title || title === 'Sin título') {
    return '';
  }

  if (title.length <= maxLength) {
    return title;
  }

  return title.substring(0, maxLength - 3) + '...';
}

/**
 * Genera un mensaje de ayuda para el comando /img
 */
export function getImageSearchHelp(): string {
  return `🖼️ <b>Comando /img - Búsqueda de Imágenes</b>\n\n` +
         `<b>Uso:</b>\n` +
         `<code>/img [término de búsqueda]</code>\n\n` +
         `<b>Ejemplos:</b>\n` +
         `• <code>/img gatos</code>\n` +
         `• <code>/img paisaje montañas</code>\n` +
         `• <code>/img comida italiana</code>\n` +
         `• <code>/img tecnología</code>\n\n` +
         `<b>Características:</b>\n` +
         `• Búsqueda en DuckDuckGo\n` +
         `• Resultados aleatorios\n` +
         `• Enlaces directos a imágenes\n` +
         `• Información de dimensiones\n\n` +
         `<b>Nota:</b> El bot envía la URL de la imagen para que Telegram muestre el preview automáticamente.`;
} 