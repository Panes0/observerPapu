import { Bot } from 'grammy';
import { SocialMediaHandler } from '../handlers/social-media-handler';
import { socialMediaManager } from '../../services/social-media';
import { socialMediaConfig, isAutoDeleteEnabled, getDeleteDelay } from '../../config/social-media-config';

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
${socialMediaManager.getSupportedPlatforms().map(platform => {
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
   * Comando /status - Muestra el estado de los servicios de redes sociales
   */
  bot.command('status', async (ctx) => {
    const platforms = socialMediaManager.getSupportedPlatforms();
    let statusMessage = '📊 <b>Estado de los Servicios</b>\n\n';

    for (const platform of platforms) {
      const service = socialMediaManager.getService(platform);
      const emoji = getPlatformEmoji(platform);
      
      if (service) {
        statusMessage += `${emoji} <b>${platform.toUpperCase()}:</b> ✅ Activo\n`;
      } else {
        statusMessage += `${emoji} <b>${platform.toUpperCase()}:</b> ❌ Inactivo\n`;
      }
    }

    statusMessage += '\n💡 Envía una URL de redes sociales para probar los servicios.';
    
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
    
    if (!socialMediaManager.isSupportedUrl(url)) {
      await ctx.reply('❌ URL no soportada. Solo se aceptan URLs de Twitter, Instagram y TikTok.');
      return;
    }

    try {
      await SocialMediaHandler.processSocialMediaUrl(ctx, url);
    } catch (error) {
      await ctx.reply('❌ Error al procesar la URL de prueba.');
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