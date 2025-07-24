import { Context, InputFile } from 'grammy';
import { socialMediaManager } from '../../services/social-media';
import { extractUrls, isSocialMediaUrl } from '../../utils/url-utils';
import { formatPostForTelegram, formatErrorMessage, getMainMediaType } from '../../utils/media-utils';
import { SocialMediaPost } from '../../types/social-media';
import { isAutoDeleteEnabled, getDeleteDelay } from '../../config/social-media-config';
import { getDownloadService } from '../../services/download';
import { botConfig } from '../../../config/bot.config';
import { FileManager } from '../../services/download/file-manager';
import * as fs from 'fs';

export class SocialMediaHandler {
  /**
   * Maneja mensajes que contienen URLs de redes sociales
   */
  static async handleMessage(ctx: Context): Promise<void> {
    if (!ctx.message?.text) return;

    const urls = extractUrls(ctx.message.text);
    const socialMediaUrls = urls.filter(url => isSocialMediaUrl(url));

    if (socialMediaUrls.length === 0) return;

    // Procesar cada URL de redes sociales
    for (const url of socialMediaUrls) {
      try {
        await this.processSocialMediaUrl(ctx, url);
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        try {
          const platform = this.detectPlatformFromUrl(url);
          const errorMessage = formatErrorMessage(platform, 'No se pudo procesar el contenido');
          await ctx.reply(errorMessage, { 
            parse_mode: 'HTML',
            disable_notification: true // Silent reply
          });
        } catch (replyError) {
          console.error('Error sending error message:', replyError);
          // If even the error message fails, just log it
        }
      }
    }
  }

  /**
   * Procesa una URL específica de redes sociales
   */
  static async processSocialMediaUrl(ctx: Context, url: string): Promise<void> {
    // Mostrar mensaje de "procesando"
    const processingMessage = await ctx.reply('🔄 Procesando contenido...', { 
      parse_mode: 'HTML',
      disable_notification: true // Silent reply
    });

    try {
      // Extraer información del post
      const post = await socialMediaManager.extractPost(url);
      
      // Formatear mensaje
      const formattedMessage = formatPostForTelegram(post);
      
      // Enviar contenido según el tipo de medio
      await this.sendPostContent(ctx, post, formattedMessage);
      
      // Eliminar mensaje de procesamiento
      await ctx.api.deleteMessage(ctx.chat!.id, processingMessage.message_id);
      
      // Auto-delete original message if enabled
      if (isAutoDeleteEnabled() && ctx.message?.message_id) {
        await this.scheduleMessageDeletion(ctx, ctx.message.message_id);
      }
      
    } catch (error) {
      console.error('Error processing social media URL:', error);
      
      // 🆕 TRY DOWNLOAD FALLBACK BEFORE GIVING UP!
      if (botConfig.options.enableDownloadFallback && botConfig.options.downloadFallback.enabled) {
        try {
          console.log('🔄 Trying download fallback with youtube-dl-exec...');
          
          // Update processing message to show fallback
          if (botConfig.options.downloadFallback.showFallbackMessage) {
            await ctx.api.editMessageText(
              ctx.chat!.id, 
              processingMessage.message_id, 
              '⬬ Descargando contenido... (Usando método alternativo)', 
              { parse_mode: 'HTML' }
            );
          }
          
          const downloadService = getDownloadService();
          const downloadResult = await downloadService.downloadMedia(url);
          
          if (downloadResult.success && downloadResult.filePath) {
            await this.sendDownloadedContent(ctx, downloadResult, processingMessage);
            
            // Auto-delete original message if enabled
            if (isAutoDeleteEnabled() && ctx.message?.message_id) {
              await this.scheduleMessageDeletion(ctx, ctx.message.message_id);
            }
            
            return; // Success with fallback!
          } else {
            console.log('Download fallback also failed:', downloadResult.error);
          }
        } catch (downloadError) {
          console.error('Download fallback failed:', downloadError);
          // Continue to original error handling
        }
      }
      
      // Original error handling when fallback is disabled or fails
      let errorMessage: string;
      const platform = this.detectPlatformFromUrl(url);
      
      if (error instanceof Error) {
        if (error.message.includes('All Instagram APIs failed')) {
          errorMessage = formatErrorMessage(platform, 'No se pudo obtener el contenido de Instagram. Los servicios pueden estar temporalmente no disponibles.');
        } else if (error.message.includes('Access forbidden') || error.message.includes('403')) {
          errorMessage = formatErrorMessage(platform, 'Acceso denegado. El servicio puede estar bloqueando las solicitudes.');
        } else if (error.message.includes('Rate limited') || error.message.includes('429')) {
          errorMessage = formatErrorMessage(platform, 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.');
        } else if (error.message.includes('HTTP error')) {
          errorMessage = formatErrorMessage(platform, 'Error de conexión con el servicio.');
        } else {
          errorMessage = formatErrorMessage(platform, 'Error al obtener el contenido. Intenta de nuevo más tarde.');
        }
      } else {
        errorMessage = formatErrorMessage(platform, 'Error inesperado al procesar el contenido.');
      }
      
      // If we tried fallback, mention that both methods failed
      if (botConfig.options.enableDownloadFallback && botConfig.options.downloadFallback.enabled) {
        errorMessage = formatErrorMessage(platform, 'No se pudo procesar el contenido con ningún método disponible.');
      }
      
      // Update processing message with error
      await ctx.api.editMessageText(ctx.chat!.id, processingMessage.message_id, errorMessage, { parse_mode: 'HTML' });
    }
  }

  /**
   * Envía el contenido del post según su tipo
   */
  private static async sendPostContent(ctx: Context, post: SocialMediaPost, message: string): Promise<void> {
    const mediaType = getMainMediaType(post);
    
    if (!mediaType || !post.media || post.media.length === 0) {
      // Solo texto
      try {
        await ctx.reply(message, { 
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
      } catch (error) {
        console.error('Error sending text message:', error);
        // Try without HTML parsing as fallback
        await ctx.reply(message.replace(/<[^>]*>/g, ''), {
          disable_notification: true // Silent reply
        });
      }
      return;
    }

    const mainMedia = post.media[0];

    try {
      if (mediaType === 'image') {
        await ctx.replyWithPhoto(mainMedia.url, {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
      } else if (mediaType === 'video') {
        await ctx.replyWithVideo(mainMedia.url, {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
      } else if (mediaType === 'gif') {
        await ctx.replyWithAnimation(mainMedia.url, {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
      }
    } catch (error) {
      console.error('Error sending media:', error);
      // Fallback a mensaje de texto si falla el envío de medios
      try {
        await ctx.reply(message, { 
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
      } catch (textError) {
        console.error('Error sending fallback text message:', textError);
        // Final fallback: send without HTML
        await ctx.reply(message.replace(/<[^>]*>/g, ''), {
          disable_notification: true // Silent reply
        });
      }
    }
  }

  /**
   * Detecta la plataforma desde una URL
   */
  private static detectPlatformFromUrl(url: string): string {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    } else if (hostname.includes('instagram.com')) {
      return 'instagram';
    } else if (hostname.includes('tiktok.com')) {
      return 'tiktok';
    }

    return 'red social';
  }

  /**
   * Maneja el comando /fix para obtener URLs fijas
   */
  static async handleFixCommand(ctx: Context): Promise<void> {
    if (!ctx.message?.text) return;

    const urls = extractUrls(ctx.message.text);
    const socialMediaUrls = urls.filter(url => isSocialMediaUrl(url));

    if (socialMediaUrls.length === 0) {
      await ctx.reply('❌ No se encontraron URLs de redes sociales en el mensaje.', {
        disable_notification: true // Silent reply
      });
      return;
    }

    let response = '🔗 <b>URLs fijas:</b>\n\n';
    
    for (const url of socialMediaUrls) {
      try {
        const fixedUrl = socialMediaManager.getFixedUrl(url);
        const platform = this.detectPlatformFromUrl(url);
        const emoji = this.getPlatformEmoji(platform);
        
        response += `${emoji} <b>${platform.toUpperCase()}:</b>\n`;
        response += `<a href="${fixedUrl}">${fixedUrl}</a>\n\n`;
      } catch (error) {
        response += `❌ Error al procesar: ${url}\n\n`;
      }
    }

    await ctx.reply(response, { 
      parse_mode: 'HTML',
      disable_notification: true // Silent reply
    });
  }

  /**
   * Obtiene el emoji de la plataforma
   */
  private static getPlatformEmoji(platform: string): string {
    const emojis: Record<string, string> = {
      twitter: '🐦',
      instagram: '📷',
      tiktok: '🎵'
    };
    
    return emojis[platform] || '📱';
  }

  /**
   * Envía contenido descargado usando el servicio de fallback
   */
  private static async sendDownloadedContent(ctx: Context, downloadResult: any, processingMessage: any): Promise<void> {
    try {
      const { filePath, info, extractor, fileSize, duration, thumbnail } = downloadResult;
      
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('Downloaded file not found');
      }
      
      // Create message with download info
      let message = '';
      
      if (botConfig.options.downloadFallback.showExtractorName && extractor) {
        const extractorEmoji = this.getExtractorEmoji(extractor);
        message += `${extractorEmoji} <b>${extractor.toUpperCase()}</b>\n`;
      }
      
      if (info?.uploader) {
        message += `👤 <b>Autor:</b> ${info.uploader}\n`;
      }
      
      if (info?.title) {
        message += `\n📝 <b>Título:</b>\n${info.title}\n`;
      }
      
      // Add metadata
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
      
      if (metadata.length > 0) {
        message += `\n${metadata.join(' | ')}\n`;
      }
      
      if (info?.webpage_url) {
        message += `\n🔗 <a href="${info.webpage_url}">Ver original</a>`;
      }
      
      // Determine file type and send accordingly
      const fileInfo = await new (await import('../../services/download/file-manager')).FileManager(
        botConfig.options.downloadFallback.tempDir,
        botConfig.options.downloadFallback.maxFileSize
      ).validateFile(filePath);
      
      if (fileInfo.isVideo) {
        await ctx.replyWithVideo(new InputFile(filePath), {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true
        });
      } else if (fileInfo.isAudio) {
        await ctx.replyWithAudio(new InputFile(filePath), {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true
        });
      } else if (fileInfo.isImage) {
        await ctx.replyWithPhoto(new InputFile(filePath), {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true
        });
      } else {
        // Fallback to document
        await ctx.replyWithDocument(new InputFile(filePath), {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true
        });
      }
      
      // Delete processing message
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, processingMessage.message_id);
      } catch (error) {
        console.log('Could not delete processing message:', error);
      }
      
      // Clean up downloaded file
      const downloadService = getDownloadService();
      await downloadService.cleanup(filePath);
      
      console.log(`✅ Successfully sent downloaded content from ${extractor}`);
      
    } catch (error) {
      console.error('Error sending downloaded content:', error);
      throw error;
    }
  }

  /**
   * Gets emoji for extractor/platform
   */
  private static getExtractorEmoji(extractor: string): string {
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
      'generic': '⬬'
    };
    
    return emojis[extractor.toLowerCase()] || emojis['generic'];
  }

  /**
   * Programa el borrado de un mensaje después de un delay
   */
  private static async scheduleMessageDeletion(ctx: Context, messageId: number): Promise<void> {
    const delay = getDeleteDelay();
    
    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, messageId);
        console.log(`✅ Mensaje original eliminado: ${messageId}`);
      } catch (error) {
        console.error(`❌ Error al eliminar mensaje ${messageId}:`, error);
        // Don't throw error - message deletion failure shouldn't break the flow
      }
    }, delay);
  }
} 