import { SocialMediaPost, MediaItem } from '../types/social-media';
import { botConfig } from '../../config/bot.config';

/**
 * Formatea un post de redes sociales para Telegram
 */
export function formatPostForTelegram(post: SocialMediaPost): string {
  const displayOptions = botConfig.options.socialMediaDisplay;
  let message = '';
  
  // If this is a reply and there's an original post, show both
  if (post.originalPost) {
    // Format original post first
    const platformEmoji = getPlatformEmoji(post.platform);
    message += `${platformEmoji} <b>${post.platform.toUpperCase()}</b> - CONVERSACIÓN\n\n`;
    
    message += `💬 <b>Tweet original:</b>\n`;
    if (displayOptions.showAuthor) {
      message += `👤 <b>@${post.originalPost.author}</b>\n`;
    }
    if (displayOptions.showContent && post.originalPost.content) {
      message += `📝 ${post.originalPost.content}\n`;
    }
    if (displayOptions.showStats && post.originalPost) {
      const originalStats = formatStats(post.originalPost);
      if (originalStats) {
        message += `${originalStats}\n`;
      }
    }
    
    // Add separator and reply
    message += `\n➥ <b>Respuesta:</b>\n`;
    if (displayOptions.showAuthor) {
      message += `👤 <b>@${post.author}</b>\n`;
    }
    if (displayOptions.showContent && post.content) {
      message += `📝 ${post.content}\n`;
    }
    if (displayOptions.showStats) {
      const replyStats = formatStats(post);
      if (replyStats) {
        message += `${replyStats}\n`;
      }
    }
  } else {
    // Regular single post formatting
    // Mostrar plataforma si está habilitado
    if (displayOptions.showPlatform) {
      const platformEmoji = getPlatformEmoji(post.platform);
      message += `${platformEmoji} <b>${post.platform.toUpperCase()}</b>\n`;
    }
    
    // Mostrar autor si está habilitado
    if (displayOptions.showAuthor) {
      message += `👤 <b>Autor:</b> ${post.author}\n`;
    }
    
    // Mostrar contenido si está habilitado
    if (displayOptions.showContent && post.content) {
      message += `\n📝 <b>Contenido:</b>\n${post.content}\n`;
    }
    
    // Mostrar estadísticas si están habilitadas
    if (displayOptions.showStats) {
      const stats = formatStats(post);
      if (stats) {
        message += `\n${stats}\n`;
      }
    }
  }
  
  // Mostrar enlace original si está habilitado
  if (displayOptions.showOriginalLink) {
    message += `\n🔗 <a href="${post.url}">Ver original</a>`;
  }
  
  return message;
}

/**
 * Obtiene el emoji correspondiente a la plataforma
 */
export function getPlatformEmoji(platform: string): string {
  const emojis: Record<string, string> = {
    twitter: '🐦',
    instagram: '📷',
    tiktok: '🎵'
  };
  
  return emojis[platform] || '📱';
}

/**
 * Formatea las estadísticas del post
 */
export function formatStats(post: SocialMediaPost): string {
  const stats = [];
  
  if (post.likes !== undefined) {
    stats.push(`❤️ ${post.likes.toLocaleString()}`);
  }
  
  if (post.shares !== undefined) {
    stats.push(`🔄 ${post.shares.toLocaleString()}`);
  }
  
  if (post.comments !== undefined) {
    stats.push(`💬 ${post.comments.toLocaleString()}`);
  }
  
  return stats.length > 0 ? stats.join(' | ') : '';
}

/**
 * Obtiene el tipo de medio principal del post
 */
export function getMainMediaType(post: SocialMediaPost): 'image' | 'video' | 'gif' | null {
  if (!post.media || post.media.length === 0) {
    return null;
  }
  
  return post.media[0].type;
}

/**
 * Filtra medios por tipo
 */
export function filterMediaByType(media: MediaItem[], type: 'image' | 'video' | 'gif'): MediaItem[] {
  return media.filter(item => item.type === type);
}

/**
 * Obtiene la URL del thumbnail principal
 */
export function getMainThumbnail(post: SocialMediaPost): string | null {
  if (!post.media || post.media.length === 0) {
    return null;
  }
  
  return post.media[0].thumbnail || post.media[0].url;
}

/**
 * Formatea la duración de un video
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Crea un mensaje de error formateado
 */
export function formatErrorMessage(platform: string, error: string): string {
  const emoji = getPlatformEmoji(platform);
  return `${emoji} <b>Error al procesar ${platform.toUpperCase()}</b>\n\n❌ ${error}`;
} 