import { Bot, Context } from 'grammy';
import { SocialMediaHandler } from '../handlers/social-media-handler';
import { SocialMediaManager } from '../../services/social-media';
import { PlatformType } from '../../types/social-media';
import { socialMediaConfig, isAutoDeleteEnabled, getDeleteDelay } from '../../config/social-media-config';
import { getDownloadService, isDownloadServiceConfigured } from '../../services/download';
import { botConfig } from '../../../config/bot.config';
import { FileManager } from '../../services/download/file-manager';

// Create social media manager instance
const socialMediaManager = new SocialMediaManager(botConfig.options);

// Helper function to check if user is owner
function isOwner(ctx: Context): boolean {
  const userId = ctx.from?.id;
  if (!userId) return false;
  
  const ownerId = botConfig.options.ownerId;
  return ownerId ? userId === ownerId : false;
}

export function registerSocialMediaCommands(bot: Bot): void {
  /**
   * Comando /fix - Obtiene URLs fijas para contenido de redes sociales
   */
  bot.command('fix', async (ctx) => {
    await SocialMediaHandler.handleFixCommand(ctx);
  });

  /**
   * Comando /help_social - Muestra ayuda sobre las funcionalidades de redes sociales
   */
  bot.command('help_social', async (ctx) => {
    const helpMessage = `
📱 <b>Funcionalidades de Redes Sociales</b>

Este bot puede procesar contenido de las siguientes plataformas:
🐦 <b>Twitter/X</b> - Usando FxTwitter
📷 <b>Instagram</b> - Usando InstaFix  
🎵 <b>TikTok</b> - Usando vxTikTok

<b>Comandos disponibles:</b>
/fix - Obtiene URLs fijas para contenido de redes sociales
/help_social - Muestra esta ayuda
/autodelete - Gestiona el auto-borrado de mensajes originales
/test - Prueba una URL específica
/status - Muestra el estado de los servicios

<b>Cómo usar:</b>
1. Envía cualquier URL de Twitter, Instagram o TikTok
2. El bot automáticamente detectará y procesará el contenido
3. Usa /fix seguido de una URL para obtener la URL fija

<b>Ejemplos:</b>
• Envía: https://twitter.com/usuario/status/123456789
• Envía: https://instagram.com/p/ABC123/
• Envía: https://tiktok.com/@usuario/video/123456789

<b>Plataformas soportadas:</b>
${socialMediaManager.getSupportedPlatforms().map((platform: PlatformType) => {
  const emojis: Record<string, string> = {
    twitter: '🐦',
    instagram: '📷', 
    tiktok: '🎵'
  };
  return `${emojis[platform]} ${platform.toUpperCase()}`;
}).join('\n')}
    `;

    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
  });

  /**
   * Comando /status - Muestra el estado de los servicios de redes sociales y download fallback
   */
  bot.command('status', async (ctx) => {
    const platforms = socialMediaManager.getSupportedPlatforms();
    let statusMessage = '📊 <b>Estado de los Servicios</b>\n\n';

    // API Services Status
    statusMessage += '🔗 <b>APIs Directas:</b>\n';
    for (const platform of platforms) {
      const service = socialMediaManager.getService(platform);
      const emoji = getPlatformEmoji(platform);
      
      if (service) {
        statusMessage += `${emoji} <b>${platform.toUpperCase()}:</b> ✅ Activo\n`;
      } else {
        statusMessage += `${emoji} <b>${platform.toUpperCase()}:</b> ❌ Inactivo\n`;
      }
    }

    // Download Fallback Status
    statusMessage += '\n⬬ <b>Fallback Universal:</b>\n';
    
    if (botConfig.options.enableDownloadFallback && botConfig.options.downloadFallback.enabled) {
      try {
        const downloadService = getDownloadService();
        const stats = await downloadService.getStats();
        
        statusMessage += `🚀 <b>YouTube-DL:</b> ✅ Activo\n`;
        statusMessage += `📊 <b>Sitios soportados:</b> ${stats.supportedSites}+\n`;
        statusMessage += `📁 <b>Archivos temporales:</b> ${stats.tempFiles}\n`;
        statusMessage += `💾 <b>Espacio usado:</b> ${FileManager.formatFileSize(stats.tempSize)}\n`;
        statusMessage += `⚡ <b>Descargas activas:</b> ${stats.activeConcurrentDownloads}/${stats.maxConcurrentDownloads}\n`;
        
        // Show some popular supported sites
        statusMessage += '\n🌟 <b>Ejemplos de sitios soportados:</b>\n';
        statusMessage += '📺 YouTube, Vimeo, Dailymotion\n';
        statusMessage += '🤖 Reddit, Facebook, Twitch\n';
        statusMessage += '🎧 SoundCloud, Bandcamp\n';
        statusMessage += '📰 BBC, CNN, Reuters\n';
        statusMessage += `🌍 <b>Y ${stats.supportedSites - 20}+ sitios más!</b>\n`;
      } catch (error) {
        statusMessage += `🚀 <b>YouTube-DL:</b> ❌ Error\n`;
        statusMessage += `⚠️ ${error instanceof Error ? error.message : 'Error desconocido'}\n`;
      }
    } else {
      statusMessage += `🚀 <b>YouTube-DL:</b> ❌ Deshabilitado\n`;
    }

    statusMessage += '\n💡 <b>Cómo funciona:</b>\n';
    statusMessage += '1️⃣ APIs rápidas primero (Twitter, Instagram, TikTok)\n';
    statusMessage += '2️⃣ Fallback universal si fallan (cualquier sitio)\n';
    statusMessage += '\n🔗 Envía cualquier URL de video/audio para probar!';
    
    await ctx.reply(statusMessage, { parse_mode: 'HTML' });
  });

  /**
   * Comando /test - Prueba una URL específica
   */
  bot.command('test', async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length === 0) {
      await ctx.reply('❌ Uso: /test <URL>\n\nEjemplo: /test https://twitter.com/usuario/status/123456789');
      return;
    }

    const url = args[0];
    
    // Validar URL
    if (!url.startsWith('http')) {
      await ctx.reply('❌ URL inválida. Debe empezar con http:// o https://');
      return;
    }

    try {
      await SocialMediaHandler.processSocialMediaUrl(ctx, url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      await ctx.reply(`❌ Error al procesar URL: ${errorMessage}`);
    }
  });

  /**
   * Comando /debug_url - Debug URL detection and support
   */
  bot.command('debug_url', async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length === 0) {
      await ctx.reply('❌ Uso: /debug_url <URL>\n\nEjemplo: /debug_url https://reddit.com/r/example');
      return;
    }

    const url = args[0];
    
    try {
      // Test URL detection step by step
      const { detectPlatform, isSocialMediaUrl } = await import('../../utils/url-utils');
      const { isLikelySupported, extractDomain } = await import('../../utils/download-utils');
      
      let debugMessage = `🔍 <b>Debug URL Detection</b>\n\n`;
      debugMessage += `🔗 <b>URL:</b> ${url}\n`;
      
      // Test URL parsing
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        debugMessage += `🌐 <b>Hostname:</b> ${hostname}\n`;
        
        // Test each platform detection manually (matching actual detectPlatform logic)
        const isTwitter = hostname === 'twitter.com' || hostname === 'www.twitter.com' || 
                          hostname === 'x.com' || hostname === 'www.x.com' || 
                          hostname === 't.co' || hostname === 'www.t.co';
        const isInstagram = hostname === 'instagram.com' || hostname === 'www.instagram.com' || 
                           hostname === 'instagr.am' || hostname === 'www.instagr.am';
        const isTikTok = hostname === 'tiktok.com' || hostname === 'www.tiktok.com' || 
                        hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com';
        
        debugMessage += `🐦 <b>Matches Twitter:</b> ${isTwitter ? '✅ Yes' : '❌ No'}\n`;
        debugMessage += `📷 <b>Matches Instagram:</b> ${isInstagram ? '✅ Yes' : '❌ No'}\n`;
        debugMessage += `🎵 <b>Matches TikTok:</b> ${isTikTok ? '✅ Yes' : '❌ No'}\n`;
        
      } catch (urlError) {
        debugMessage += `❌ <b>URL Parse Error:</b> ${urlError}\n`;
      }
      
      // Test function results
      const platform = detectPlatform(url);
      const isSocialMedia = isSocialMediaUrl(url);
      const domain = extractDomain(url);
      const likelySupported = isLikelySupported(url);
      
      debugMessage += `\n📱 <b>detectPlatform() Result:</b> ${platform || 'null'}\n`;
      debugMessage += `🎯 <b>isSocialMediaUrl() Result:</b> ${isSocialMedia ? '✅ Yes' : '❌ No'}\n`;
      debugMessage += `⬬ <b>isLikelySupported() Result:</b> ${likelySupported ? '✅ Yes' : '❓ Unknown'}\n\n`;
      
      // Test youtube-dl-exec if download fallback is enabled
      if (botConfig.options.enableDownloadFallback && botConfig.options.downloadFallback.enabled) {
        debugMessage += `🧪 <b>Testing YouTube-DL Support...</b>\n`;
        
        try {
          const downloadService = getDownloadService();
          const canHandle = await downloadService.canHandle(url);
          debugMessage += `🎯 <b>YouTube-DL Can Handle:</b> ${canHandle ? '✅ Yes' : '❌ No'}\n`;
          
          if (canHandle) {
            try {
              const info = await downloadService.extractInfo(url);
              debugMessage += `📊 <b>Title:</b> ${info.title}\n`;
              debugMessage += `👤 <b>Uploader:</b> ${info.uploader}\n`;
              debugMessage += `🎥 <b>Extractor:</b> ${info.extractor}\n`;
              if (info.duration) {
                debugMessage += `⏱️ <b>Duration:</b> ${FileManager.formatDuration(info.duration)}\n`;
              }
              if (info.view_count) {
                debugMessage += `👁️ <b>Views:</b> ${info.view_count.toLocaleString()}\n`;
              }
            } catch (infoError) {
              debugMessage += `❌ <b>Info Extraction Failed:</b> ${infoError instanceof Error ? infoError.message : 'Unknown error'}\n`;
            }
          }
        } catch (testError) {
          debugMessage += `❌ <b>Test Failed:</b> ${testError instanceof Error ? testError.message : 'Unknown error'}\n`;
        }
      } else {
        debugMessage += `⚠️ <b>Download fallback disabled</b>\n`;
      }
      
      debugMessage += `\n💡 <b>Recommendation:</b>\n`;
      if (isSocialMedia) {
        debugMessage += `This URL will be processed by the ${platform} API first, then fallback if it fails.`;
      } else if (likelySupported) {
        debugMessage += `This URL should go directly to download fallback.`;
      } else {
        debugMessage += `This URL may not be supported by either method.`;
      }
      
      await ctx.reply(debugMessage, { parse_mode: 'HTML' });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      await ctx.reply(`❌ Error during debug: ${errorMessage}`);
    }
  });

  /**
   * Comando /test_youtube <URL> - Específico para probar YouTube URLs
   */
  bot.command('test_youtube', async (ctx) => {
    if (!isOwner(ctx)) return;
    
    const args = ctx.message?.text?.split(' ').slice(1);
    if (!args || args.length === 0) {
      await ctx.reply(`🧪 <b>Test YouTube URL</b>\n\nUso: <code>/test_youtube https://www.youtube.com/shorts/...</code>\n\nPrueba extractores específicos de YouTube con debugging detallado.`, {
        parse_mode: 'HTML'
      });
      return;
    }
    
    const url = args[0];
    
    try {
      let debugMessage = `🧪 <b>Testing YouTube URL</b>\n\n`;
      debugMessage += `🔗 <b>URL:</b> ${url}\n\n`;
      
      // Check if URL looks like YouTube
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      debugMessage += `📺 <b>Is YouTube URL:</b> ${isYouTube ? '✅ Yes' : '❌ No'}\n`;
      
      if (!isYouTube) {
        debugMessage += `⚠️ This doesn't appear to be a YouTube URL.`;
        await ctx.reply(debugMessage, { parse_mode: 'HTML' });
        return;
      }
      
      if (botConfig.options.enableDownloadFallback && isDownloadServiceConfigured()) {
        debugMessage += `\n🔧 <b>Testing YouTube-DL with Enhanced Options...</b>\n`;
        
        try {
          const downloadService = getDownloadService();
          
          // Test if the service can handle it
          const canHandle = await downloadService.canHandle(url);
          debugMessage += `🎯 <b>Can Handle:</b> ${canHandle ? '✅ Yes' : '❌ No'}\n`;
          
          if (canHandle) {
            debugMessage += `\n📊 <b>Extracting Metadata...</b>\n`;
            try {
              const info = await downloadService.extractInfo(url);
              debugMessage += `✅ <b>Success!</b>\n`;
              debugMessage += `📝 <b>Title:</b> ${info.title}\n`;
              debugMessage += `👤 <b>Uploader:</b> ${info.uploader || 'Unknown'}\n`;
              debugMessage += `🎥 <b>Extractor:</b> ${info.extractor}\n`;
              debugMessage += `🆔 <b>ID:</b> ${info.id}\n`;
              
              if (info.duration) {
                debugMessage += `⏱️ <b>Duration:</b> ${FileManager.formatDuration(info.duration)}\n`;
              }
              if (info.view_count) {
                debugMessage += `👁️ <b>Views:</b> ${info.view_count.toLocaleString()}\n`;
              }
              if (info.like_count) {
                debugMessage += `👍 <b>Likes:</b> ${info.like_count.toLocaleString()}\n`;
              }
              if (info.upload_date) {
                debugMessage += `📅 <b>Upload Date:</b> ${info.upload_date}\n`;
              }
              
              debugMessage += `\n💡 <b>Status:</b> Ready for download!`;
              
            } catch (infoError) {
              debugMessage += `❌ <b>Metadata Extraction Failed:</b>\n`;
              debugMessage += `📋 <b>Error:</b> ${infoError instanceof Error ? infoError.message : 'Unknown error'}\n`;
              
              // Additional YouTube-specific debugging
              if (infoError instanceof Error) {
                if (infoError.message.includes('Sign in to confirm')) {
                  debugMessage += `🔒 <b>Likely Cause:</b> Age-restricted or requires sign-in\n`;
                } else if (infoError.message.includes('Video unavailable')) {
                  debugMessage += `🚫 <b>Likely Cause:</b> Video removed or private\n`;
                } else if (infoError.message.includes('No metadata')) {
                  debugMessage += `⚠️ <b>Likely Cause:</b> YouTube format changes or network issue\n`;
                }
              }
              
              debugMessage += `\n💡 <b>Troubleshooting Tips:</b>\n`;
              debugMessage += `• Try updating youtube-dl: <code>npm update youtube-dl-exec</code>\n`;
              debugMessage += `• Check if video is public and not age-restricted\n`;
              debugMessage += `• YouTube Shorts sometimes have different requirements`;
            }
          }
        } catch (testError) {
          debugMessage += `❌ <b>Service Test Failed:</b> ${testError instanceof Error ? testError.message : 'Unknown error'}\n`;
        }
      } else {
        debugMessage += `⚠️ <b>Download fallback disabled or not configured</b>\n`;
      }
      
      await ctx.reply(debugMessage, { parse_mode: 'HTML' });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      await ctx.reply(`❌ Error testing YouTube URL: ${errorMessage}`);
    }
  });

  /**
   * Comando /autodelete - Gestiona el auto-borrado de mensajes originales
   */
  bot.command('autodelete', async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length === 0) {
      // Mostrar estado actual
      const status = isAutoDeleteEnabled() ? '✅ Habilitado' : '❌ Deshabilitado';
      const delay = getDeleteDelay() / 1000; // Convert to seconds
      
      const statusMessage = `
🗑️ <b>Auto-Borrado de Mensajes</b>

<b>Estado actual:</b> ${status}
<b>Delay:</b> ${delay} segundos

<b>Comandos disponibles:</b>
/autodelete on - Habilitar auto-borrado
/autodelete off - Deshabilitar auto-borrado
/autodelete delay <segundos> - Cambiar delay (ej: /autodelete delay 5)

<b>¿Qué hace?</b>
Cuando está habilitado, el bot elimina automáticamente el mensaje original que contiene la URL de redes sociales después de procesarlo.
      `;
      
      await ctx.reply(statusMessage, { parse_mode: 'HTML' });
      return;
    }

    const action = args[0].toLowerCase();
    
    switch (action) {
      case 'on':
        socialMediaConfig.general.autoDeleteOriginalMessage = true;
        await ctx.reply('✅ Auto-borrado habilitado. Los mensajes originales serán eliminados automáticamente.');
        break;
        
      case 'off':
        socialMediaConfig.general.autoDeleteOriginalMessage = false;
        await ctx.reply('❌ Auto-borrado deshabilitado. Los mensajes originales se mantendrán.');
        break;
        
      case 'delay':
        const delayArg = args[1];
        if (!delayArg || isNaN(Number(delayArg))) {
          await ctx.reply('❌ Uso: /autodelete delay <segundos>\n\nEjemplo: /autodelete delay 5');
          return;
        }
        
        const newDelay = parseInt(delayArg) * 1000; // Convert to milliseconds
        socialMediaConfig.general.deleteDelay = newDelay;
        await ctx.reply(`⏱️ Delay cambiado a ${delayArg} segundos.`);
        break;
        
      default:
        await ctx.reply('❌ Comando no válido. Usa /autodelete para ver las opciones disponibles.');
        break;
    }
  });

  /**
   * Comando /test_reddit - Test different Reddit URL formats
   */
  bot.command('test_reddit', async (ctx) => {
    if (!botConfig.options.enableDownloadFallback) {
      await ctx.reply('❌ Download fallback disabled');
      return;
    }
    
    const baseUrl = 'https://www.reddit.com/r/TrackMania/comments/1k3qxf0/trying_to_beat_that_strong_pb_of_yours';
    const testUrls = [
      baseUrl + '/',
      baseUrl + '.json',
      baseUrl + '?utm_source=share',
      'https://v.redd.it/1k3qxf0', // Common Reddit video format
    ];
    
    let testMessage = '🧪 <b>Testing Reddit URL Formats</b>\n\n';
    
    const downloadService = getDownloadService();
    
    for (let i = 0; i < testUrls.length; i++) {
      const testUrl = testUrls[i];
      testMessage += `${i + 1}. Testing: ${testUrl}\n`;
      
      try {
        const canHandle = await downloadService.canHandle(testUrl);
        testMessage += `   Result: ${canHandle ? '✅ Supported' : '❌ Not supported'}\n\n`;
      } catch (error) {
        testMessage += `   Result: ❌ Error - ${error instanceof Error ? error.message : 'Unknown'}\n\n`;
      }
    }
    
    testMessage += '💡 <b>Tip:</b> If none work, this Reddit post might not contain a video, or Reddit changed their format.';
    
    await ctx.reply(testMessage, { parse_mode: 'HTML' });
  });

  /**
   * Comando /test_reddit_api - Test Reddit JSON API extraction
   */
  bot.command('test_reddit_api', async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length === 0) {
      await ctx.reply('❌ Uso: /test_reddit_api <Reddit_URL>\n\nEjemplo: /test_reddit_api https://reddit.com/r/videos/comments/...');
      return;
    }

    const url = args[0];
    
    try {
      const { RedditService } = await import('../../services/download/reddit-service');
      const redditService = new RedditService();
      
      let testMessage = `🧪 <b>Testing Reddit JSON API</b>\n\n`;
      testMessage += `🔗 <b>URL:</b> ${url}\n\n`;
      
      // Test if it's a Reddit URL
      const isReddit = redditService.isRedditUrl(url);
      testMessage += `🤖 <b>Is Reddit URL:</b> ${isReddit ? '✅ Yes' : '❌ No'}\n\n`;
      
      if (!isReddit) {
        testMessage += `❌ Not a Reddit URL`;
        await ctx.reply(testMessage, { parse_mode: 'HTML' });
        return;
      }
      
      // Test JSON API extraction
      testMessage += `📡 <b>Testing Reddit JSON API...</b>\n`;
      
      try {
        const videoInfo = await redditService.extractVideoInfo(url);
        
        if (videoInfo) {
          testMessage += `✅ <b>Video Found!</b>\n`;
          testMessage += `📝 <b>Title:</b> ${videoInfo.title}\n`;
          testMessage += `👤 <b>Author:</b> ${videoInfo.uploader}\n`;
          testMessage += `🎥 <b>Extractor:</b> ${videoInfo.extractor}\n`;
          
          if (videoInfo.duration) {
            testMessage += `⏱️ <b>Duration:</b> ${FileManager.formatDuration(videoInfo.duration)}\n`;
          }
          
          if (videoInfo.formats && videoInfo.formats.length > 0) {
            const format = videoInfo.formats[0];
            testMessage += `🎯 <b>Video URL:</b> Found (${format.width}x${format.height})\n`;
            testMessage += `📦 <b>Format:</b> ${format.ext}\n`;
          }
          
          testMessage += `\n💡 <b>Status:</b> Ready for download with Reddit API!`;
        } else {
          testMessage += `❌ <b>No video found</b>\n`;
          testMessage += `💡 This Reddit post may contain images, text, or external links instead of hosted video.`;
        }
        
      } catch (apiError) {
        testMessage += `❌ <b>Reddit API Error:</b>\n`;
        testMessage += `${apiError instanceof Error ? apiError.message : 'Unknown error'}\n\n`;
        testMessage += `💡 <b>Possible reasons:</b>\n`;
        testMessage += `• Post contains no video content\n`;
        testMessage += `• Video is hosted externally (YouTube, etc.)\n`;
        testMessage += `• Post is deleted or private\n`;
        testMessage += `• Reddit API format changed`;
      }
      
      await ctx.reply(testMessage, { parse_mode: 'HTML' });
      
    } catch (error) {
      await ctx.reply(`❌ Error testing Reddit API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * Obtiene el emoji de la plataforma
 */
function getPlatformEmoji(platform: string): string {
  const emojis: Record<string, string> = {
    twitter: '🐦',
    instagram: '📷',
    tiktok: '🎵'
  };
  
  return emojis[platform] || '📱';
} 