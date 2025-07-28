import { Context, InputFile } from 'grammy';
import { socialMediaManager } from '../../services/social-media';
import { extractUrls, isSocialMediaUrl, isProcessableUrl, getDomain } from '../../utils/url-utils';
import { formatPostForTelegram, formatErrorMessage, getMainMediaType } from '../../utils/media-utils';
import { SocialMediaPost } from '../../types/social-media';
// Removed old social-media-config imports - now using main bot config
import { getDownloadService } from '../../services/download';
import { botConfig } from '../../../config/bot.config';
import { FileManager } from '../../services/download/file-manager';
import { videoCacheService } from '../../services/video-cache';
import { getVideoOptimizer } from '../../services/video-processing';
import { addUserAttribution } from '../../utils/user-utils';
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
        // Compact error logging for failed URL processing
        const domain = this.detectPlatformFromUrl(url);
        const errorMsg = error instanceof Error ? error.message.split('\n')[0] : 'Unknown error';
        console.log(`❌ Failed to process ${domain.toUpperCase()} URL: ${errorMsg}`);
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
    // **PASO 1: Verificar caché de videos**
    const cachedEntry = videoCacheService.getCachedEntry(url);
    if (cachedEntry) {
      try {
        let copiedMessage: any;
        
        if (botConfig.options.videoCache?.showCacheIndicator) {
          // Mostrar indicador de caché con atribución del usuario
          let cacheMessage = `🔄 <b>Contenido desde caché</b>\n\n🔗 <a href="${url}">Ver original</a>`;
          cacheMessage = addUserAttribution(cacheMessage, ctx);
          
          copiedMessage = await ctx.api.copyMessage(
            ctx.chat!.id, 
            cachedEntry.chatId, 
            cachedEntry.messageId,
            {
              caption: cacheMessage,
              parse_mode: 'HTML',
              disable_notification: botConfig.options.silentReplies
            }
          );
        } else {
          // Copiar exactamente igual que la primera vez (preserva caption original automáticamente)
          copiedMessage = await ctx.api.copyMessage(
            ctx.chat!.id, 
            cachedEntry.chatId, 
            cachedEntry.messageId,
            {
              disable_notification: botConfig.options.silentReplies
            }
          );
          
          // TODO: Implementar atribución para mensajes de caché
          // Por ahora, los mensajes del caché se muestran exactamente igual que la primera vez
          // La atribución se aplicará solo a contenido nuevo hasta que mejoremos el sistema de caché
        }
        
        console.log(`💾 Video enviado desde caché: ${cachedEntry.platform} - ${url}`);
        
        return; // Terminar aquí si el caché funcionó
      } catch (copyError) {
        console.log(`❌ Error al copiar desde caché, procesando normalmente: ${copyError}`);
        // Remover entrada inválida del caché
        videoCacheService.removeEntry(url);
      }
    }

    // **PASO 2: Procesamiento normal si no hay caché**
    // Mostrar mensaje de "procesando"
    const processingMessage = await ctx.reply('🔄 Procesando contenido...', { 
      parse_mode: 'HTML',
      disable_notification: true // Silent reply
    });

    let sentMessage: any = null;

    try {
      // Extraer información del post
      const post = await socialMediaManager.extractPost(url);
      
      // Formatear mensaje
      let formattedMessage = formatPostForTelegram(post);
      
      // Agregar atribución del usuario
      formattedMessage = addUserAttribution(formattedMessage, ctx);
      
      // Enviar contenido según el tipo de medio
      sentMessage = await this.sendPostContent(ctx, post, formattedMessage);
      
      // **PASO 3: Guardar en caché si se envió correctamente**
      if (sentMessage && sentMessage.message_id && ctx.chat?.id) {
        const platform = this.detectPlatformFromUrl(url);
        const metadata = {
          title: post.content || post.media?.[0]?.url,
          author: post.author,
          duration: post.media?.[0]?.duration,
          fileSize: undefined // No tenemos info del tamaño aún
        };
        
        videoCacheService.addEntry(
          url,
          sentMessage.message_id,
          ctx.chat.id,
          platform,
          metadata
        );
        
        console.log(`💾 Video guardado en caché: ${platform} - ${url} -> mensaje ${sentMessage.message_id}`);
      }
      
      // Eliminar mensaje de procesamiento
      await ctx.api.deleteMessage(ctx.chat!.id, processingMessage.message_id);
      
      // Auto-delete original message if enabled
      if (botConfig.options.messageManagement?.autoDeleteOriginalMessage && ctx.message?.message_id) {
        await this.scheduleMessageDeletion(ctx, ctx.message.message_id);
      }
      
    } catch (error) {
      // More compact error logging - full stack trace is usually not needed
      const platformName = this.detectPlatformFromUrl(url);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`⚠️ ${platformName.toUpperCase()} service unavailable: ${errorMsg.split('\n')[0]}`);
      
      // 🆕 TRY DOWNLOAD FALLBACK BEFORE GIVING UP!
      if (botConfig.options.enableDownloadFallback && botConfig.options.downloadFallback.enabled) {
        try {
          console.log(`🔄 ${platformName.toUpperCase()} API failed, trying universal download fallback...`);
          
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
            const sentMessage = await this.sendDownloadedContent(ctx, downloadResult, processingMessage, url);
            
            // Auto-delete original message if enabled
            if (botConfig.options.messageManagement?.autoDeleteOriginalMessage && ctx.message?.message_id) {
              await this.scheduleMessageDeletion(ctx, ctx.message.message_id);
            }
            
            return; // Success with fallback!
          } else {
            console.log('Download fallback also failed:', downloadResult.error);
          }
        } catch (downloadError) {
          const errorMsg = downloadError instanceof Error ? downloadError.message.split('\n')[0] : 'Unknown error';
          console.log(`⚠️ Download fallback failed: ${errorMsg}`);
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
  private static async sendPostContent(ctx: Context, post: SocialMediaPost, message: string): Promise<any> {
    const mediaType = getMainMediaType(post);
    
    if (!mediaType || !post.media || post.media.length === 0) {
      // Solo texto
      try {
        const sentMessage = await ctx.reply(message, { 
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
        return sentMessage;
      } catch (error) {
        console.error('Error sending text message:', error);
        // Try without HTML parsing as fallback
        const sentMessage = await ctx.reply(message.replace(/<[^>]*>/g, ''), {
          disable_notification: true // Silent reply
        });
        return sentMessage;
      }
    }

    const mainMedia = post.media[0];

    try {
      let sentMessage: any;
      if (mediaType === 'image') {
        sentMessage = await ctx.replyWithPhoto(mainMedia.url, {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
      } else if (mediaType === 'video') {
        sentMessage = await ctx.replyWithVideo(mainMedia.url, {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
      } else if (mediaType === 'gif') {
        sentMessage = await ctx.replyWithAnimation(mainMedia.url, {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
      }
      return sentMessage;
    } catch (error) {
      console.error('Error sending media:', error);
      // Fallback a mensaje de texto si falla el envío de medios
      try {
        const sentMessage = await ctx.reply(message, { 
          parse_mode: 'HTML',
          disable_notification: true // Silent reply
        });
        return sentMessage;
      } catch (textError) {
        console.error('Error sending fallback text message:', textError);
        // Final fallback: send without HTML
        const sentMessage = await ctx.reply(message.replace(/<[^>]*>/g, ''), {
          disable_notification: true // Silent reply
        });
        return sentMessage;
      }
    }
  }

  /**
   * Detecta la plataforma desde una URL
   */
  private static detectPlatformFromUrl(url: string): string {
    const domain = getDomain(url).toLowerCase();
    
    // Mapeo de dominios a plataformas
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'youtube';
    if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter';
    if (domain.includes('instagram.com')) return 'instagram';
    if (domain.includes('tiktok.com')) return 'tiktok';
    if (domain.includes('facebook.com')) return 'facebook';
    if (domain.includes('reddit.com')) return 'reddit';
    if (domain.includes('vimeo.com')) return 'vimeo';
    if (domain.includes('twitch.tv')) return 'twitch';
    if (domain.includes('kick.com')) return 'kick';
    if (domain.includes('dailymotion.com')) return 'dailymotion';
    if (domain.includes('soundcloud.com')) return 'soundcloud';
    if (domain.includes('bandcamp.com')) return 'bandcamp';
    if (domain.includes('bilibili.com')) return 'bilibili';
    if (domain.includes('vk.com')) return 'vk';
    
    // Fallback al dominio principal
    return domain.replace('www.', '').split('.')[0];
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
   * Sends downloaded content and handles caching
   */
  private static async sendDownloadedContent(ctx: Context, downloadResult: any, processingMessage: any, url: string): Promise<any> {
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
      
      // Agregar atribución del usuario
      message = addUserAttribution(message, ctx);
      
      // Determine file type and send accordingly
      const fileInfo = await new (await import('../../services/download/file-manager')).FileManager(
        botConfig.options.downloadFallback.tempDir,
        botConfig.options.downloadFallback.maxFileSize
      ).validateFile(filePath);
      
      let finalFilePath = filePath;
      let sentMessage: any;
      
      // 📹 OPTIMIZE VIDEO FOR TELEGRAM if enabled and it's a video file
      if (fileInfo.isVideo && botConfig.options.videoProcessing?.enabled) {
        try {
          const fileSize = fs.statSync(filePath).size;
          const shouldOptimize = !botConfig.options.videoProcessing.skipOptimizationForSmallFiles || 
                                fileSize > 5 * 1024 * 1024; // 5MB threshold
          
          if (shouldOptimize) {
            // Show video processing message
            if (botConfig.options.videoProcessing.showProcessingProgress) {
              await ctx.api.editMessageText(
                ctx.chat!.id,
                processingMessage.message_id,
                '📹 Optimizando video para Telegram...',
                { parse_mode: 'HTML' }
              );
            }
            
            const videoOptimizer = getVideoOptimizer(botConfig.options.downloadFallback.tempDir);
            const optimizationResult = await videoOptimizer.optimizeVideo(filePath, {
              faststart: botConfig.options.videoProcessing.faststart,
              reencode: botConfig.options.videoProcessing.reencodeVideos,
              crf: botConfig.options.videoProcessing.compressionLevel,
              maxResolution: botConfig.options.videoProcessing.maxResolution,
              maxDuration: botConfig.options.videoProcessing.maxDuration,
              maxFileSize: botConfig.options.videoProcessing.maxFileSize
            });
            
            if (optimizationResult.success && optimizationResult.optimizedPath) {
              finalFilePath = optimizationResult.optimizedPath;
              
              if (optimizationResult.wasOptimized) {
                const processingTime = optimizationResult.processingTime! / 1000;
                console.log(`📹 Video optimized in ${processingTime.toFixed(1)}s for better Telegram compatibility`);
                
                // Add optimization info to message
                const sizeReduction = optimizationResult.sizeReduction || 0;
                if (sizeReduction > 0) {
                  message += `\n📹 <i>Optimizado para Telegram (${sizeReduction.toFixed(1)}% reducción)</i>`;
                } else {
                  message += `\n📹 <i>Optimizado para Telegram</i>`;
                }
              }
            } else {
              console.log('⚠️ Video optimization failed, using original file:', optimizationResult.error);
            }
          }
        } catch (optimizationError) {
          console.error('❌ Error durante optimización de video:', optimizationError);
          // Continue with original file if optimization fails
        }
      }
      
      if (fileInfo.isVideo) {
        sentMessage = await ctx.replyWithVideo(new InputFile(finalFilePath), {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true
        });
      } else if (fileInfo.isAudio) {
        sentMessage = await ctx.replyWithAudio(new InputFile(filePath), {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true
        });
      } else if (fileInfo.isImage) {
        sentMessage = await ctx.replyWithPhoto(new InputFile(filePath), {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true
        });
      } else {
        // Fallback to document
        sentMessage = await ctx.replyWithDocument(new InputFile(filePath), {
          caption: message,
          parse_mode: 'HTML',
          disable_notification: true
        });
      }
      
      // 🆕 ADD TO VIDEO CACHE
      try {
        const platform = this.detectPlatformFromUrl(url);
        await videoCacheService.addEntry(
          url,
          sentMessage.message_id,
          ctx.chat!.id,
          platform,
          {
            title: info?.title,
            author: info?.uploader,
            duration: duration,
            fileSize: fileSize
          }
        );
        console.log(`💾 Cache SAVED for ${url} (fallback)`);
      } catch (cacheError) {
        console.error('Error saving to cache:', cacheError);
        // Don't fail the whole operation if cache fails
      }
      
      // Delete processing message
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, processingMessage.message_id);
      } catch (error) {
        console.log('Could not delete processing message:', error);
      }
      
      // Clean up downloaded files (both original and optimized)
      const downloadService = getDownloadService();
      await downloadService.cleanup(filePath);
      
      // Clean up optimized file if it's different from original
      if (finalFilePath !== filePath && fs.existsSync(finalFilePath)) {
        try {
          await fs.promises.unlink(finalFilePath);
          console.log(`🗑️ Cleaned up optimized video: ${finalFilePath}`);
        } catch (cleanupError) {
          console.error('Error cleaning up optimized video:', cleanupError);
        }
      }
      
      console.log(`✅ Successfully sent downloaded content from ${extractor}`);
      
      return sentMessage;
      
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
    const delay = botConfig.options.messageManagement?.deleteDelay || 2000;
    
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