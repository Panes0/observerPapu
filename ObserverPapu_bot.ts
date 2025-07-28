import { Bot, Context } from "grammy";
import { SocialMediaHandler } from "./src/bot/handlers/social-media-handler";
import { registerSocialMediaCommands } from "./src/bot/commands/social-media-commands";
import { isSocialMediaUrl, extractUrls, isProcessableUrl } from "./src/utils/url-utils";
import { botConfig } from "./config/bot.config";
import { imageSearchService } from "./src/services/image-search";
import { formatImageResult, formatImageError, formatNoImagesFound, getImageSearchHelp } from "./src/utils/image-utils";
import { aiService, configureAIService, memoryService } from "./src/services/ai";
import { configureDownloadService, getDownloadService } from "./src/services/download";
import { 
  formatAIResult, 
  formatAIError, 
  formatAINotConfigured, 
  getAIHelp, 
  validatePrompt, 
  sanitizePrompt,
  // Nuevas utilidades para memoria
  shouldUseMemory,
  getMemoryId,
  getMemoryType,
  formatAIResultWithMemory,
  createPromptWithContext,
  formatMemoryStats,
  getMemoryHelp
} from "./src/utils/ai-utils";

// Cache for bot owner ID
let cachedOwnerId: number | null = null;

// Helper function to get bot owner ID automatically
async function getBotOwnerId(bot: Bot): Promise<number | null> {
  if (cachedOwnerId) {
    return cachedOwnerId;
  }

  try {
    // Get bot information
    const botInfo = await bot.api.getMe();
    console.log(`🤖 Bot info: ${botInfo.first_name} (@${botInfo.username})`);
    
    // Try to get bot owner from webhook info or bot info
    // Note: Telegram doesn't directly provide owner ID, but we can try alternative methods
    
    // Method 1: Try to get from bot info (if available)
    if (botInfo.id) {
      console.log(`📋 Bot ID: ${botInfo.id}`);
    }
    
          // For now, we'll use the configured ownerId as fallback
      const configuredOwnerId = botConfig.options.ownerId;
      if (configuredOwnerId) {
        cachedOwnerId = configuredOwnerId;
        console.log(`👑 Owner ID configurado: ${cachedOwnerId}`);
        return cachedOwnerId;
      }
    
    console.log('⚠️ No se pudo obtener el owner ID automáticamente. Usando configuración manual.');
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo información del bot:', error);
    return null;
  }
}

// Helper function to check if user is whitelisted
async function isUserAuthorized(ctx: Context): Promise<boolean> {
  // Check if whitelist is enabled
  if (!botConfig.options.enableWhitelist) {
    return true; // If whitelist is disabled, allow all users
  }

  const userId = ctx.from?.id;
  if (!userId) {
    return false;
  }

  // Special handling for private chats
  if (ctx.chat?.type === 'private') {
    // In private chats, allow if:
    // 1. User is in whitelist, OR
    // 2. No owner is configured yet (first-time setup)
    const whitelistedUsers = botConfig.options.whitelistedUsers || [];
    const isWhitelisted = whitelistedUsers.includes(userId);
    const hasOwner = botConfig.options.ownerId || cachedOwnerId;
    
    if (isWhitelisted) {
      return true; // User is authorized
    }
    
    if (!hasOwner) {
      // No owner configured yet - allow for initial setup
      console.log(`🔧 Configuración inicial: permitiendo acceso a ${ctx.from?.first_name} (${userId})`);
      return true;
    }
    
    return false; // User not in whitelist and owner is configured
  }

  // For group chats, check whitelist first
  const whitelistedUsers = botConfig.options.whitelistedUsers || [];
  const isWhitelisted = whitelistedUsers.includes(userId);
  
  // If user is whitelisted, allow immediately
  if (isWhitelisted) {
    return true;
  }

  // If user is not whitelisted, check if owner is present in group (if required)
  if (botConfig.options.requireOwnerInGroup && ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    try {
      // Try to get owner ID automatically first
      let ownerId = await getBotOwnerId(bot);
      
      // Fallback to configured ownerId
      if (!ownerId) {
        ownerId = botConfig.options.ownerId;
      }
      
      if (!ownerId) {
        console.log('⚠️ Owner ID no está configurado. Usa /setowner para configurarlo automáticamente');
        return false;
      }
      
      const chatMember = await ctx.api.getChatMember(ctx.chat.id, ownerId);
      const ownerPresent = chatMember.status !== 'left' && chatMember.status !== 'kicked';
      
      if (ownerPresent) {
        console.log(`✅ Usuario no autorizado permitido (${ctx.from?.first_name}) - Owner presente en grupo`);
        return true;
      }
    } catch (error) {
      console.log('⚠️ No se pudo verificar la presencia del owner en el grupo:', error);
      return false;
    }
  }

  return false;
}

// Helper function to check if processable URLs should be processed even for unauthorized users
async function shouldProcessProcessableUrls(ctx: Context): Promise<boolean> {
  // If whitelist is disabled, always process
  if (!botConfig.options.enableWhitelist) {
    return true;
  }

  const userId = ctx.from?.id;
  if (!userId) {
    return false;
  }

  // For private chats, use normal authorization
  if (ctx.chat?.type === 'private') {
    return await isUserAuthorized(ctx);
  }

  // For group chats, check if user is whitelisted
  const whitelistedUsers = botConfig.options.whitelistedUsers || [];
  const isWhitelisted = whitelistedUsers.includes(userId);
  
  // If user is whitelisted, allow processing
  if (isWhitelisted) {
    return true;
  }

  // If user is not whitelisted, check if owner is present in group
  if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    try {
      let ownerId = await getBotOwnerId(bot);
      if (!ownerId) {
        ownerId = botConfig.options.ownerId;
      }
      
      if (!ownerId) {
        return false; // No owner configured
      }
      
      const chatMember = await ctx.api.getChatMember(ctx.chat.id, ownerId);
      const ownerPresent = chatMember.status !== 'left' && chatMember.status !== 'kicked';
      
      if (ownerPresent) {
        console.log(`🔗 Procesando URL de usuario no autorizado (${ctx.from?.first_name}) - Owner presente en grupo`);
        return true;
      }
    } catch (error) {
      console.log('⚠️ Error verificando presencia del owner para procesamiento de URLs:', error);
    }
  }

  return false;
}

// Create a new bot using configuration
const bot = new Bot(botConfig.token);

// Configurar el servicio de IA si está habilitado
if (botConfig.options.enableAI) {
  configureAIService(botConfig.options.ai);
}

// Configurar el servicio de descarga si está habilitado
if (botConfig.options.enableDownloadFallback) {
  configureDownloadService(botConfig.options.downloadFallback);
  // Mostrar estadísticas de sitios soportados
  (async () => {
    try {
      const { getSupportedSitesStats } = await import("./src/utils/url-utils");
      const stats = getSupportedSitesStats();
      console.log(`🚀 Universal download service enabled - Supporting ${stats.totalDomains} domains from ${stats.totalExtractors} yt-dlp extractors!`);
    } catch (error) {
      console.log('🚀 Universal download service enabled - Supporting 1000+ sites!');
    }
  })();
}

// Registrar comandos de redes sociales si está habilitado
if (botConfig.options.enableSocialMedia) {
  registerSocialMediaCommands(bot);
}

// Comando para configurar el owner automáticamente
bot.command("setowner", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("❌ No se pudo obtener tu ID de usuario");
    return;
  }
  
  // Solo permitir en chats privados
  if (ctx.chat?.type !== 'private') {
    await ctx.reply("❌ Este comando solo funciona en chats privados con el bot");
    return;
  }
  
  // Check if user is authorized (allows first-time setup)
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    await ctx.reply("❌ No tienes permisos para configurar el owner");
    return;
  }
  
  // Set the owner ID
  cachedOwnerId = userId;
  botConfig.options.ownerId = userId;
  
  // Add to whitelist if not already there
  if (!botConfig.options.whitelistedUsers?.includes(userId)) {
    botConfig.options.whitelistedUsers = botConfig.options.whitelistedUsers || [];
    botConfig.options.whitelistedUsers.push(userId);
  }
  
  await ctx.reply(`✅ Owner configurado exitosamente!\n👑 Tu ID: ${userId}\n🔐 Has sido agregado a la whitelist`, {
    disable_notification: botConfig.options.silentReplies,
  });
  
  console.log(`👑 Owner configurado: ${userId} (${ctx.from?.first_name})`);
});

// Comando para verificar el estado de autorización del usuario
bot.command("auth", async (ctx) => {
  const userId = ctx.from?.id;
  const chatType = ctx.chat?.type;
  
  if (!userId) {
    await ctx.reply("❌ No se pudo obtener tu ID de usuario");
    return;
  }
  
  const whitelistedUsers = botConfig.options.whitelistedUsers || [];
  const isWhitelisted = whitelistedUsers.includes(userId);
  const hasOwner = botConfig.options.ownerId || cachedOwnerId;
  
  let statusMessage = `🔐 <b>Estado de Autorización</b>\n\n`;
  statusMessage += `👤 <b>Usuario:</b> ${ctx.from?.first_name}\n`;
  statusMessage += `🆔 <b>ID:</b> ${userId}\n`;
  statusMessage += `💬 <b>Chat:</b> ${chatType}\n`;
  statusMessage += `🔐 <b>Whitelist:</b> ${isWhitelisted ? '✅ Autorizado' : '❌ No autorizado'}\n`;
  statusMessage += `👑 <b>Owner configurado:</b> ${hasOwner ? '✅ Sí' : '❌ No'}\n`;
  
  if (chatType === 'private') {
    if (!hasOwner) {
      statusMessage += `\n💡 <b>Configuración inicial:</b> Puedes usar /setowner para configurar el owner`;
    } else if (!isWhitelisted) {
      statusMessage += `\n❌ <b>Acceso denegado:</b> No estás en la whitelist`;
    } else {
      statusMessage += `\n✅ <b>Acceso permitido:</b> Estás autorizado`;
    }
  } else {
    if (!isWhitelisted) {
      statusMessage += `\n❌ <b>Acceso denegado:</b> No estás en la whitelist`;
    } else if (botConfig.options.requireOwnerInGroup) {
      statusMessage += `\n👥 <b>Verificación de grupo:</b> Se requiere que el owner esté presente`;
    } else {
      statusMessage += `\n✅ <b>Acceso permitido:</b> Estás autorizado`;
    }
  }
  
  await ctx.reply(statusMessage, {
    parse_mode: "HTML",
    disable_notification: botConfig.options.silentReplies,
  });
});

// Comando para mostrar información del bot y owner
bot.command("botinfo", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const botInfo = await bot.api.getMe();
    const ownerId = await getBotOwnerId(bot);
    
    let infoMessage = `🤖 <b>Información del Bot</b>\n\n`;
    infoMessage += `📝 <b>Nombre:</b> ${botInfo.first_name}\n`;
    infoMessage += `🔗 <b>Username:</b> @${botInfo.username}\n`;
    infoMessage += `🆔 <b>Bot ID:</b> ${botInfo.id}\n`;
    
    if (ownerId) {
      infoMessage += `👑 <b>Owner ID:</b> ${ownerId}\n`;
    } else {
      infoMessage += `⚠️ <b>Owner ID:</b> No configurado\n`;
    }
    
    infoMessage += `\n🔐 <b>Whitelist:</b> ${botConfig.options.enableWhitelist ? '✅ Habilitada' : '❌ Deshabilitada'}\n`;
    infoMessage += `👥 <b>Owner en grupo:</b> ${botConfig.options.requireOwnerInGroup ? '✅ Requerido' : '❌ No requerido'}\n`;
    
    if (botConfig.options.whitelistedUsers?.length) {
      infoMessage += `📋 <b>Usuarios autorizados:</b> ${botConfig.options.whitelistedUsers.length}\n`;
    }
    
    await ctx.reply(infoMessage, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
  } catch (error) {
    await ctx.reply("❌ Error obteniendo información del bot");
  }
});

// Comando para mostrar información del grupo y verificar presencia del owner
bot.command("groupinfo", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const chat = ctx.chat;
    if (!chat) {
      await ctx.reply("❌ No se pudo obtener información del chat");
      return;
    }
    
    let infoMessage = `📋 <b>Información del Grupo</b>\n\n`;
    infoMessage += `📝 <b>Nombre:</b> ${chat.title || 'Chat privado'}\n`;
    infoMessage += `🆔 <b>Chat ID:</b> ${chat.id}\n`;
    infoMessage += `💬 <b>Tipo:</b> ${chat.type}\n`;
    
    if (chat.username) {
      infoMessage += `🔗 <b>Username:</b> @${chat.username}\n`;
    }
    
    // Verificar presencia del owner
    const ownerId = await getBotOwnerId(bot) || botConfig.options.ownerId;
    if (ownerId && (chat.type === 'group' || chat.type === 'supergroup')) {
      try {
        const chatMember = await ctx.api.getChatMember(chat.id, ownerId);
        const ownerStatus = chatMember.status;
        const ownerPresent = ownerStatus !== 'left' && ownerStatus !== 'kicked';
        
        infoMessage += `\n👑 <b>Owner (${ownerId}):</b> ${ownerPresent ? '✅ Presente' : '❌ No presente'}\n`;
        infoMessage += `📊 <b>Estado:</b> ${ownerStatus}\n`;
        
        if (ownerPresent) {
          infoMessage += `\n💡 <b>Links de redes sociales:</b> Se procesarán incluso de usuarios no autorizados`;
        } else {
          infoMessage += `\n⚠️ <b>Links de redes sociales:</b> Solo usuarios autorizados`;
        }
             } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
         infoMessage += `\n❌ <b>Error verificando owner:</b> ${errorMessage}`;
       }
    } else if (!ownerId) {
      infoMessage += `\n⚠️ <b>Owner:</b> No configurado`;
    }
    
    // Información del usuario actual
    const currentUser = ctx.from;
    if (currentUser) {
      const whitelistedUsers = botConfig.options.whitelistedUsers || [];
      const isWhitelisted = whitelistedUsers.includes(currentUser.id);
      
      infoMessage += `\n\n👤 <b>Usuario actual:</b> ${currentUser.first_name}\n`;
      infoMessage += `🆔 <b>ID:</b> ${currentUser.id}\n`;
      infoMessage += `🔐 <b>Autorizado:</b> ${isWhitelisted ? '✅ Sí' : '❌ No'}`;
    }
    
    await ctx.reply(infoMessage, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
  } catch (error) {
    await ctx.reply("❌ Error obteniendo información del grupo");
  }
});

// Comando para buscar imágenes
bot.command("img", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length === 0) {
      const helpMessage = getImageSearchHelp();
      await ctx.reply(helpMessage, {
        parse_mode: "HTML",
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    const query = args.join(' ').trim();
    
    if (query.length < 2) {
      await ctx.reply("❌ La búsqueda debe tener al menos 2 caracteres", {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    if (query.length > 100) {
      await ctx.reply("❌ La búsqueda es demasiado larga (máximo 100 caracteres)", {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    // Mostrar mensaje de carga
    const loadingMessage = await ctx.reply("🔍 Buscando imágenes...", {
      disable_notification: botConfig.options.silentReplies,
    });

    // Buscar imagen aleatoria
    const imageResult = await imageSearchService.getRandomImage(query, {
      maxResults: 50,
      safeSearch: 'moderate'
    });

    // Eliminar mensaje de carga
    try {
      await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);
    } catch (error) {
      console.log('No se pudo eliminar el mensaje de carga:', error);
    }

    if (!imageResult) {
      const noResultsMessage = formatNoImagesFound(query);
      await ctx.reply(noResultsMessage.message, {
        parse_mode: "HTML",
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    // Formatear el resultado
    const formattedResult = formatImageResult(imageResult, query);
    
    // Enviar un solo mensaje con toda la información y la URL para que Telegram muestre el preview
    await ctx.reply(formattedResult.message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });

    // Log de la búsqueda
    if (botConfig.options.logMessages) {
      console.log(`🖼️ Imagen encontrada para "${query}" por ${ctx.from?.first_name} (${ctx.from?.id})`);
    }

  } catch (error) {
    console.error('Error en comando /img:', error);
    
    const args = ctx.message?.text?.split(' ').slice(1);
    const query = args?.join(' ').trim() || 'búsqueda';
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    const formattedError = formatImageError(query, errorMessage);
    await ctx.reply(formattedError.message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// Comando para buscar imágenes sin filtro de seguridad
bot.command("imgx", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length === 0) {
      const helpMessage = `🖼️ <b>Comando /imgx - Búsqueda de Imágenes Sin Filtro</b>\n\n` +
                         `<b>Uso:</b>\n` +
                         `<code>/imgx [término de búsqueda]</code>\n\n` +
                         `<b>⚠️ ADVERTENCIA:</b>\n` +
                         `Este comando busca imágenes <b>SIN filtro de seguridad</b>.\n` +
                         `Los resultados pueden contener contenido adulto o explícito.\n\n` +
                         `<b>Ejemplos:</b>\n` +
                         `• <code>/imgx arte</code>\n` +
                         `• <code>/imgx fotografía</code>\n` +
                         `• <code>/imgx naturaleza</code>\n\n` +
                         `<b>Diferencias con /img:</b>\n` +
                         `• <code>/img</code> - SafeSearch habilitado (contenido filtrado)\n` +
                         `• <code>/imgx</code> - SafeSearch deshabilitado (sin filtros)\n\n` +
                         `<b>Nota:</b> Usa este comando con responsabilidad.`;
      
      await ctx.reply(helpMessage, {
        parse_mode: "HTML",
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    const query = args.join(' ').trim();
    
    if (query.length < 2) {
      await ctx.reply("❌ La búsqueda debe tener al menos 2 caracteres", {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    if (query.length > 100) {
      await ctx.reply("❌ La búsqueda es demasiado larga (máximo 100 caracteres)", {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    // Mostrar mensaje de carga con advertencia
    const loadingMessage = await ctx.reply("🔍 Buscando imágenes sin filtro...", {
      disable_notification: botConfig.options.silentReplies,
    });

    // Buscar imagen aleatoria SIN SafeSearch
    const imageResult = await imageSearchService.getRandomImage(query, {
      maxResults: 50,
      safeSearch: 'off'  // ⚠️ SafeSearch desactivado
    });

    // Eliminar mensaje de carga
    try {
      await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);
    } catch (error) {
      console.log('No se pudo eliminar el mensaje de carga:', error);
    }

    if (!imageResult) {
      const noResultsMessage = formatNoImagesFound(query);
      await ctx.reply(noResultsMessage.message, {
        parse_mode: "HTML",
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    // Formatear el resultado (usa la misma función que /img)
    const formattedResult = formatImageResult(imageResult, query);
    
    // Agregar advertencia al mensaje
    const warningMessage = `⚠️` + formattedResult.message;
    
    // Enviar un solo mensaje con toda la información y la URL para que Telegram muestre el preview
    await ctx.reply(warningMessage, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });

    // Log de la búsqueda
    if (botConfig.options.logMessages) {
      console.log(`🖼️ Imagen SIN FILTRO encontrada para "${query}" por ${ctx.from?.first_name} (${ctx.from?.id})`);
    }

  } catch (error) {
    console.error('Error en comando /imgx:', error);
    
    const args = ctx.message?.text?.split(' ').slice(1);
    const query = args?.join(' ').trim() || 'búsqueda';
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    const formattedError = formatImageError(query, errorMessage);
    await ctx.reply(formattedError.message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// Comando para usar IA con Together AI (ahora con memoria)
bot.command("ia", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  // Verificar si el servicio de IA está habilitado
  if (!botConfig.options.enableAI) {
    await ctx.reply("❌ El servicio de IA está deshabilitado", {
      disable_notification: botConfig.options.silentReplies,
    });
    return;
  }
  
  try {
    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length === 0) {
      const helpMessage = getAIHelp();
      await ctx.reply(helpMessage, {
        parse_mode: "HTML",
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    const prompt = args.join(' ').trim();
    
    // Validar el prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      await ctx.reply(`❌ ${validation.error}`, {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    // Verificar si el servicio está configurado
    if (!aiService.isConfigured()) {
      const notConfiguredMessage = formatAINotConfigured();
      await ctx.reply(notConfiguredMessage.message, {
        parse_mode: "HTML",
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }

    // Mostrar mensaje de carga
    const loadingMessage = await ctx.reply("🤖 Generando respuesta...", {
      disable_notification: botConfig.options.silentReplies,
    });

    // === LÓGICA DE MEMORIA ===
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    
    let hasMemoryContext = false;
    let finalPrompt = sanitizePrompt(prompt);
    
    // Verificar si usar memoria (grupos y chats privados)
    if (chatId && chatType && userId && shouldUseMemory(chatId, chatType, userId)) {
      const memoryId = getMemoryId(chatId, chatType, userId);
      const memoryType = getMemoryType(chatType);
      
      if (memoryId && memoryType) {
        try {
          // Obtener contexto de memoria
          const memoryContext = await memoryService.getMemoryContext(memoryId, memoryType);
          
          if (memoryContext) {
            finalPrompt = createPromptWithContext(finalPrompt, memoryContext);
            hasMemoryContext = true;
            const contextDesc = memoryType === 'group' ? 'grupo' : 'usuario';
            console.log(`🧠 Usando memoria para ${contextDesc} ${memoryId}: ${memoryContext.split('\n').length - 2} entradas`);
          }
          
          // Agregar entrada actual a memoria (async, no esperamos)
          memoryService.addEntry(memoryId, memoryType, prompt, userId, username).catch(error => {
            console.error('Error agregando entrada a memoria:', error);
          });
        } catch (error) {
          console.error('Error procesando memoria:', error);
          // Continuar sin memoria en caso de error
        }
      }
    }
    
    // Generar respuesta de IA (con o sin contexto de memoria)
    const aiResponse = await aiService.generateResponse({
      prompt: finalPrompt,
    });

    // Eliminar mensaje de carga
    try {
      await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);
    } catch (error) {
      console.log('No se pudo eliminar el mensaje de carga:', error);
    }

    // Formatear y enviar respuesta (con indicador de memoria si aplica)
    const formattedResult = formatAIResultWithMemory(
      aiResponse, 
      prompt, 
      hasMemoryContext,
      botConfig.options.ai.showWaterConsumption
    );
    
    await ctx.reply(formattedResult.message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });

    // Log de la consulta
    if (botConfig.options.logMessages) {
      const memoryIndicator = hasMemoryContext ? ' (con memoria)' : '';
      console.log(`🤖 IA consultada por ${ctx.from?.first_name} (${ctx.from?.id}) - Tokens: ${formattedResult.tokensUsed}${memoryIndicator}`);
    }

  } catch (error) {
    console.error('Error en comando /ia:', error);
    
    const args = ctx.message?.text?.split(' ').slice(1);
    const prompt = args?.join(' ').trim() || 'consulta';
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    const formattedError = formatAIError(prompt, errorMessage);
    await ctx.reply(formattedError.message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// ========================================
// COMANDOS DE MEMORIA
// ========================================

// Comando para ver estadísticas de memoria
bot.command("memory_stats", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;
  
  if (!chatId || !chatType || !userId) {
    await ctx.reply("❌ No se pudo obtener información del chat o usuario", {
      disable_notification: botConfig.options.silentReplies,
    });
    return;
  }
  
  if (!shouldUseMemory(chatId, chatType, userId)) {
    await ctx.reply("💡 La memoria no está disponible para este tipo de chat", {
      disable_notification: botConfig.options.silentReplies,
    });
    return;
  }
  
  try {
    const memoryId = getMemoryId(chatId, chatType, userId);
    const memoryType = getMemoryType(chatType);
    
    if (!memoryId || !memoryType) {
      await ctx.reply("❌ No se pudo obtener identificador de memoria", {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }
    
    const stats = await memoryService.getMemoryStats(memoryId, memoryType);
    const formattedStats = formatMemoryStats(stats, chatType);
    
    await ctx.reply(formattedStats, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas de memoria:', error);
    await ctx.reply("❌ Error obteniendo estadísticas de memoria", {
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// Comando para limpiar memoria
bot.command("memory_clear", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;
  
  if (!chatId || !chatType || !userId) {
    await ctx.reply("❌ No se pudo obtener información del chat o usuario", {
      disable_notification: botConfig.options.silentReplies,
    });
    return;
  }
  
  if (!shouldUseMemory(chatId, chatType, userId)) {
    await ctx.reply("💡 La memoria no está disponible para este tipo de chat", {
      disable_notification: botConfig.options.silentReplies,
    });
    return;
  }
  
  try {
    const memoryId = getMemoryId(chatId, chatType, userId);
    const memoryType = getMemoryType(chatType);
    
    if (!memoryId || !memoryType) {
      await ctx.reply("❌ No se pudo obtener identificador de memoria", {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }
    
    await memoryService.clearMemory(memoryId, memoryType);
    
    const context = memoryType === 'group' ? 'del grupo' : 'personal';
    await ctx.reply(`🗑️ <b>Memoria ${context} limpiada</b>\n\nTodas las conversaciones anteriores han sido eliminadas.`, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    
    if (botConfig.options.logMessages) {
      const contextDesc = memoryType === 'group' ? 'grupo' : 'usuario';
      console.log(`🗑️ Memoria limpiada para ${contextDesc} ${memoryId} por ${ctx.from?.first_name} (${ctx.from?.id})`);
    }
    
  } catch (error) {
    console.error('Error limpiando memoria:', error);
    await ctx.reply("❌ Error limpiando memoria", {
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// Comando para mostrar ayuda sobre memoria
bot.command("memory_help", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  const helpMessage = getMemoryHelp();
  await ctx.reply(helpMessage, {
    parse_mode: "HTML",
    disable_notification: botConfig.options.silentReplies,
  });
});

// Comando para mostrar estadísticas del caché de videos
bot.command("video_cache_stats", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const { videoCacheService } = await import("./src/services/video-cache");
    const stats = videoCacheService.getStats();
    
    let message = `📦 <b>Estadísticas del Caché de Videos</b>\n\n`;
    message += `📊 <b>General:</b>\n`;
    message += `• <b>Videos cacheados:</b> ${stats.totalEntries}\n`;
    message += `• <b>Cache hits:</b> ${stats.cacheHits}\n`;
    message += `• <b>Cache misses:</b> ${stats.cacheMisses}\n`;
    message += `• <b>Ratio de aciertos:</b> ${(stats.hitRatio * 100).toFixed(1)}%\n`;
    message += `• <b>Tamaño total:</b> ${stats.totalSize > 0 ? (stats.totalSize / (1024 * 1024)).toFixed(1) + ' MB' : 'N/A'}\n\n`;
    
    if (Object.keys(stats.platformStats).length > 0) {
      message += `🎥 <b>Por plataforma:</b>\n`;
      Object.entries(stats.platformStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([platform, count]) => {
          message += `• ${platform}: ${count}\n`;
        });
      message += `\n`;
    }
    
    if (stats.oldestEntry > 0) {
      const oldestDate = new Date(stats.oldestEntry);
      const newestDate = new Date(stats.newestEntry);
      message += `📅 <b>Fechas:</b>\n`;
      message += `• <b>Más antiguo:</b> ${oldestDate.toLocaleDateString()}\n`;
      message += `• <b>Más reciente:</b> ${newestDate.toLocaleDateString()}\n`;
    }
    
    await ctx.reply(message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas del caché:', error);
    await ctx.reply("❌ Error obteniendo estadísticas del caché", {
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// Comando para limpiar el caché de videos
bot.command("video_cache_clear", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const { videoCacheService } = await import("./src/services/video-cache");
    
    // Solo el owner puede limpiar completamente el caché
    const userId = ctx.from?.id;
    const isOwner = userId === botConfig.options.ownerId;
    
    if (!isOwner) {
      await ctx.reply("❌ Solo el owner puede limpiar el caché completamente", {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
    }
    
    const statsBefore = videoCacheService.getStats();
    videoCacheService.clearCache();
    
    await ctx.reply(`🗑️ <b>Caché de videos limpiado</b>\n\nSe eliminaron ${statsBefore.totalEntries} entradas del caché.`, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    
  } catch (error) {
    console.error('Error limpiando caché:', error);
    await ctx.reply("❌ Error limpiando caché", {
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// Comando para limpiar entradas antiguas del caché
bot.command("video_cache_cleanup", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const { videoCacheService } = await import("./src/services/video-cache");
    
    // Limpiar entradas más antiguas que 30 días
    const removedCount = await videoCacheService.cleanup({
      olderThanDays: 30,
      maxEntries: 500
    }, bot.api);
    
    if (removedCount > 0) {
      await ctx.reply(`🧹 <b>Limpieza completada</b>\n\nSe eliminaron ${removedCount} entradas antiguas del caché.`, {
        parse_mode: "HTML",
        disable_notification: botConfig.options.silentReplies,
      });
    } else {
      await ctx.reply("✅ No se encontraron entradas antiguas para eliminar", {
        disable_notification: botConfig.options.silentReplies,
      });
    }
    
  } catch (error) {
    console.error('Error en limpieza del caché:', error);
    await ctx.reply("❌ Error en limpieza del caché", {
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// Comando para mostrar estadísticas de sitios soportados
bot.command("supported_sites", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const { getSupportedSitesStats } = await import("./src/utils/url-utils");
    const stats = getSupportedSitesStats();
    
    let message = `🌐 <b>Sitios Soportados por yt-dlp</b>\n\n`;
    message += `📊 <b>Estadísticas:</b>\n`;
    message += `• <b>Extractores:</b> ${stats.totalExtractors}\n`;
    message += `• <b>Dominios únicos:</b> ${stats.totalDomains}\n\n`;
    
    message += `📱 <b>Ejemplos principales:</b>\n`;
    const examples = ['youtube.com', 'kick.com', 'vimeo.com', 'dailymotion.com', 'twitch.tv', 
                     'facebook.com', 'instagram.com', 'tiktok.com', 'twitter.com', 'reddit.com',
                     'soundcloud.com', 'bandcamp.com', 'bilibili.com', 'bbc.co.uk', 'cnn.com'];
    
    examples.forEach(domain => {
      if (stats.domains.includes(domain)) {
        message += `✅ ${domain}\n`;
      }
    });
    
    message += `\n💡 <b>Nota:</b> Solo se muestran algunos ejemplos principales. El bot detecta automáticamente URLs de todos los ${stats.totalDomains} dominios soportados.`;
    
    await ctx.reply(message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas de sitios soportados:', error);
    await ctx.reply("❌ Error obteniendo estadísticas de sitios soportados", {
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

// Comando para configurar el manejo de mensajes
bot.command("message_config", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  const args = ctx.message?.text?.split(' ').slice(1);
  
  if (!args || args.length === 0) {
    // Mostrar configuración actual
    const config = botConfig.options.messageManagement;
    
    let message = `🗂️ <b>Configuración de Mensajes</b>\n\n`;
    message += `📋 <b>Estado actual:</b>\n`;
    message += `• <b>Auto-eliminar originales:</b> ${config?.autoDeleteOriginalMessage ? '✅ Sí' : '❌ No'}\n`;
    message += `• <b>Delay de eliminación:</b> ${(config?.deleteDelay || 2000) / 1000} segundos\n\n`;
    
    if (config?.autoDeleteOriginalMessage) {
      message += `🔄 <b>Comportamiento actual:</b>\n`;
      message += `Los mensajes con URLs se eliminan automáticamente después de procesar el contenido.\n\n`;
    } else {
      message += `💾 <b>Comportamiento actual:</b>\n`;
      message += `Los mensajes con URLs se mantienen (no se eliminan).\n\n`;
    }
    
    message += `💡 <b>Comandos disponibles:</b>\n`;
    message += `• <code>/message_config autodelete on</code> - Habilitar auto-eliminación\n`;
    message += `• <code>/message_config autodelete off</code> - Deshabilitar auto-eliminación\n`;
    message += `• <code>/message_config delay [segundos]</code> - Cambiar delay (ej: 3)\n`;
    message += `• <code>/message_config toggle</code> - Alternar auto-eliminación\n`;
    
    await ctx.reply(message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    return;
  }
  
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'autodelete':
      if (args[1] === 'on') {
        if (!botConfig.options.messageManagement) {
          botConfig.options.messageManagement = { autoDeleteOriginalMessage: true, deleteDelay: 2000 };
        } else {
          botConfig.options.messageManagement.autoDeleteOriginalMessage = true;
        }
        await ctx.reply("✅ Auto-eliminación de mensajes originales habilitada", {
          disable_notification: botConfig.options.silentReplies,
        });
      } else if (args[1] === 'off') {
        if (!botConfig.options.messageManagement) {
          botConfig.options.messageManagement = { autoDeleteOriginalMessage: false, deleteDelay: 2000 };
        } else {
          botConfig.options.messageManagement.autoDeleteOriginalMessage = false;
        }
        await ctx.reply("❌ Auto-eliminación de mensajes originales deshabilitada", {
          disable_notification: botConfig.options.silentReplies,
        });
      } else {
        await ctx.reply("❌ Usa: on o off", {
          disable_notification: botConfig.options.silentReplies,
        });
      }
      break;
      
    case 'toggle':
      if (!botConfig.options.messageManagement) {
        botConfig.options.messageManagement = { autoDeleteOriginalMessage: true, deleteDelay: 2000 };
      } else {
        botConfig.options.messageManagement.autoDeleteOriginalMessage = !botConfig.options.messageManagement.autoDeleteOriginalMessage;
      }
      
      const newState = botConfig.options.messageManagement.autoDeleteOriginalMessage;
      await ctx.reply(`${newState ? '✅' : '❌'} Auto-eliminación ${newState ? 'habilitada' : 'deshabilitada'}`, {
        disable_notification: botConfig.options.silentReplies,
      });
      break;
      
    case 'delay':
      if (args[1] && !isNaN(Number(args[1]))) {
        const seconds = Number(args[1]);
        if (seconds < 1 || seconds > 60) {
          await ctx.reply("❌ El delay debe estar entre 1 y 60 segundos", {
            disable_notification: botConfig.options.silentReplies,
          });
          return;
        }
        
        if (!botConfig.options.messageManagement) {
          botConfig.options.messageManagement = { autoDeleteOriginalMessage: false, deleteDelay: seconds * 1000 };
        } else {
          botConfig.options.messageManagement.deleteDelay = seconds * 1000;
        }
        
        await ctx.reply(`✅ Delay de eliminación cambiado a ${seconds} segundos`, {
          disable_notification: botConfig.options.silentReplies,
        });
      } else {
        await ctx.reply("❌ Especifica un número de segundos válido (1-60)", {
          disable_notification: botConfig.options.silentReplies,
        });
      }
      break;
      
    default:
      await ctx.reply("❌ Comando no válido. Usa /message_config sin parámetros para ver ayuda.", {
        disable_notification: botConfig.options.silentReplies,
      });
  }
});

// Comando para configurar la atribución del usuario
bot.command("user_attribution", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  const args = ctx.message?.text?.split(' ').slice(1);
  
  if (!args || args.length === 0) {
    // Mostrar configuración actual
    const config = botConfig.options.userAttribution;
    
    let message = `👤 <b>Configuración de Atribución</b>\n\n`;
    message += `📋 <b>Estado actual:</b>\n`;
    message += `• <b>Habilitado:</b> ${config.enabled ? '✅ Sí' : '❌ No'}\n`;
    message += `• <b>Emoji:</b> ${config.emoji}\n`;
    message += `• <b>Mostrar username:</b> ${config.showUsername ? '✅ Sí' : '❌ No'}\n`;
    message += `• <b>Mostrar nombre:</b> ${config.showFirstName ? '✅ Sí' : '❌ No'}\n`;
    message += `• <b>Posición:</b> ${config.position === 'top' ? 'Arriba' : 'Abajo'}\n\n`;
    
    if (config.enabled) {
      const user = ctx.from;
      if (user) {
        let exampleName = '';
        if (config.showUsername && user.username) {
          exampleName = `@${user.username}`;
        } else if (config.showFirstName && user.first_name) {
          exampleName = user.first_name;
        } else {
          exampleName = `Usuario ${user.id}`;
        }
        message += `📋 <b>Ejemplo con tu usuario:</b>\n`;
        message += `${config.emoji} <i>${exampleName}</i>\n\n`;
      }
    }
    
    message += `💡 <b>Comandos disponibles:</b>\n`;
    message += `• <code>/user_attribution on</code> - Habilitar atribución\n`;
    message += `• <code>/user_attribution off</code> - Deshabilitar atribución\n`;
    message += `• <code>/user_attribution emoji [emoji]</code> - Cambiar emoji (ej: 🔗)\n`;
    message += `• <code>/user_attribution position top</code> - Mostrar arriba\n`;
    message += `• <code>/user_attribution position bottom</code> - Mostrar abajo\n`;
    message += `• <code>/user_attribution username on/off</code> - Mostrar @username\n`;
    message += `• <code>/user_attribution name on/off</code> - Mostrar nombre\n`;
    
    await ctx.reply(message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    return;
  }
  
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'on':
      botConfig.options.userAttribution.enabled = true;
      await ctx.reply("✅ Atribución de usuario habilitada", {
        disable_notification: botConfig.options.silentReplies,
      });
      break;
      
    case 'off':
      botConfig.options.userAttribution.enabled = false;
      await ctx.reply("❌ Atribución de usuario deshabilitada", {
        disable_notification: botConfig.options.silentReplies,
      });
      break;
      
    case 'emoji':
      if (args[1]) {
        botConfig.options.userAttribution.emoji = args[1];
        await ctx.reply(`✅ Emoji cambiado a: ${args[1]}`, {
          disable_notification: botConfig.options.silentReplies,
        });
      } else {
        await ctx.reply("❌ Especifica un emoji. Ejemplo: /user_attribution emoji 🔗", {
          disable_notification: botConfig.options.silentReplies,
        });
      }
      break;
      
    case 'position':
      if (args[1] === 'top' || args[1] === 'bottom') {
        botConfig.options.userAttribution.position = args[1];
        await ctx.reply(`✅ Posición cambiada a: ${args[1] === 'top' ? 'Arriba' : 'Abajo'}`, {
          disable_notification: botConfig.options.silentReplies,
        });
      } else {
        await ctx.reply("❌ Posición válida: top o bottom", {
          disable_notification: botConfig.options.silentReplies,
        });
      }
      break;
      
    case 'username':
      if (args[1] === 'on') {
        botConfig.options.userAttribution.showUsername = true;
        await ctx.reply("✅ Mostrar @username habilitado", {
          disable_notification: botConfig.options.silentReplies,
        });
      } else if (args[1] === 'off') {
        botConfig.options.userAttribution.showUsername = false;
        await ctx.reply("❌ Mostrar @username deshabilitado", {
          disable_notification: botConfig.options.silentReplies,
        });
      } else {
        await ctx.reply("❌ Usa: on o off", {
          disable_notification: botConfig.options.silentReplies,
        });
      }
      break;
      
    case 'name':
      if (args[1] === 'on') {
        botConfig.options.userAttribution.showFirstName = true;
        await ctx.reply("✅ Mostrar nombre habilitado", {
          disable_notification: botConfig.options.silentReplies,
        });
      } else if (args[1] === 'off') {
        botConfig.options.userAttribution.showFirstName = false;
        await ctx.reply("❌ Mostrar nombre deshabilitado", {
          disable_notification: botConfig.options.silentReplies,
        });
      } else {
        await ctx.reply("❌ Usa: on o off", {
          disable_notification: botConfig.options.silentReplies,
        });
      }
      break;
      
    default:
      await ctx.reply("❌ Comando no válido. Usa /user_attribution sin parámetros para ver ayuda.", {
        disable_notification: botConfig.options.silentReplies,
      });
  }
});

// Comando para configurar el comportamiento del caché
bot.command("cache_config", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  const args = ctx.message?.text?.split(' ').slice(1);
  
  if (!args || args.length === 0) {
    // Mostrar configuración actual
    const showIndicator = botConfig.options.videoCache?.showCacheIndicator ?? false;
    
    let message = `⚙️ <b>Configuración del Caché</b>\n\n`;
    message += `📋 <b>Estado actual:</b>\n`;
    message += `• <b>Mostrar indicador de caché:</b> ${showIndicator ? '✅ Sí' : '❌ No'}\n\n`;
    
    if (showIndicator) {
      message += `🔄 <b>Comportamiento actual:</b>\n`;
      message += `Los videos del caché muestran "🔄 Contenido desde caché"\n\n`;
    } else {
      message += `🎭 <b>Comportamiento actual:</b>\n`;
      message += `Los videos del caché se ven exactamente igual que la primera vez\n\n`;
    }
    
    message += `💡 <b>Comandos disponibles:</b>\n`;
    message += `• <code>/cache_config show</code> - Mostrar indicador de caché\n`;
    message += `• <code>/cache_config hide</code> - Ocultar indicador (transparente)\n`;
    message += `• <code>/cache_config toggle</code> - Alternar configuración\n`;
    
    await ctx.reply(message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    return;
  }
  
  const command = args[0].toLowerCase();
  let newValue: boolean;
  let actionText: string;
  
  switch (command) {
    case 'show':
      newValue = true;
      actionText = 'Los videos del caché mostrarán "🔄 Contenido desde caché"';
      break;
    case 'hide':
      newValue = false;
      actionText = 'Los videos del caché se verán exactamente igual que la primera vez';
      break;
    case 'toggle':
      newValue = !(botConfig.options.videoCache?.showCacheIndicator ?? false);
      actionText = newValue ? 
        'Los videos del caché mostrarán "🔄 Contenido desde caché"' :
        'Los videos del caché se verán exactamente igual que la primera vez';
      break;
    default:
      await ctx.reply("❌ Comando no válido. Usa: show, hide, o toggle", {
        disable_notification: botConfig.options.silentReplies,
      });
      return;
  }
  
  // Actualizar configuración
  if (!botConfig.options.videoCache) {
    botConfig.options.videoCache = { showCacheIndicator: false };
  }
  botConfig.options.videoCache.showCacheIndicator = newValue;
  
  await ctx.reply(`✅ <b>Configuración actualizada</b>\n\n${actionText}`, {
    parse_mode: "HTML",
    disable_notification: botConfig.options.silentReplies,
  });
});

// Comando para mostrar información sobre procesamiento de videos
bot.command("video_processing_info", async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    return;
  }
  
  try {
    const videoConfig = botConfig.options.videoProcessing;
    
    let message = `📹 <b>Procesamiento de Videos</b>\n\n`;
    
    if (!videoConfig?.enabled) {
      message += `❌ <b>Estado:</b> Deshabilitado\n\n`;
      message += `💡 Para habilitar el procesamiento de videos, configura:\n`;
      message += `<code>videoProcessing.enabled = true</code> en bot.config.ts\n\n`;
      message += `🎯 <b>Beneficios del procesamiento:</b>\n`;
      message += `• ✅ Previsualizaciones en Telegram\n`;
      message += `• ✅ Reproducción inline\n`;
      message += `• ✅ Miniaturas correctas\n`;
      message += `• 📦 Archivos más pequeños\n`;
    } else {
      message += `✅ <b>Estado:</b> Habilitado\n\n`;
      message += `⚙️ <b>Configuración actual:</b>\n`;
      message += `• <b>Faststart:</b> ${videoConfig.faststart ? '✅' : '❌'}\n`;
      message += `• <b>Recodificación:</b> ${videoConfig.reencodeVideos ? 'Forzada' : 'Solo si es necesario'}\n`;
      message += `• <b>Resolución máxima:</b> ${videoConfig.maxResolution?.width}x${videoConfig.maxResolution?.height}\n`;
      message += `• <b>Nivel de compresión:</b> CRF ${videoConfig.compressionLevel}\n`;
      message += `• <b>Tamaño máximo:</b> ${Math.round(videoConfig.maxFileSize / (1024 * 1024))}MB\n`;
      message += `• <b>Duración máxima:</b> ${Math.round(videoConfig.maxDuration / 60)} minutos\n`;
      message += `• <b>Omitir archivos pequeños:</b> ${videoConfig.skipOptimizationForSmallFiles ? '✅' : '❌'}\n`;
      message += `• <b>Mostrar progreso:</b> ${videoConfig.showProcessingProgress ? '✅' : '❌'}\n\n`;
      
      message += `🎯 <b>Qué hace el procesamiento:</b>\n`;
      message += `• 📹 Mueve metadatos al principio (faststart)\n`;
      message += `• 🔧 Optimiza resolución para Telegram\n`;
      message += `• 📦 Comprime videos grandes\n`;
      message += `• ⚡ Mejora velocidad de carga\n\n`;
      
      message += `💡 <b>Nota:</b> Los videos se procesan automáticamente cuando se detectan URLs. No es necesario hacer nada adicional.`;
    }
    
    await ctx.reply(message, {
      parse_mode: "HTML",
      disable_notification: botConfig.options.silentReplies,
    });
    
  } catch (error) {
    console.error('Error obteniendo información de procesamiento de videos:', error);
    await ctx.reply("❌ Error obteniendo información de procesamiento de videos", {
      disable_notification: botConfig.options.silentReplies,
    });
  }
});

//This function would be added to the dispatcher as a handler for messages coming from the Bot API
bot.on("message", async (ctx) => {
  // Check if user is authorized to use the bot
  const isAuthorized = await isUserAuthorized(ctx);
  
  //Print to console if logging is enabled
  if (botConfig.options.logMessages) {
    console.log(
      `${ctx.from?.first_name} wrote ${
        "text" in ctx.message ? ctx.message.text : ""
      }`,
    );
  }

  // Verificar si el mensaje contiene URLs procesables
  if (ctx.message.text) {
    const urls = extractUrls(ctx.message.text);
    const processableUrls = urls.filter((url: string) => isProcessableUrl(url));
    
    // Handle all processable URLs (includes all social media, video sites, and more)
    if (processableUrls.length > 0) {
             // Use special authorization for processable links
       const shouldProcess = await shouldProcessProcessableUrls(ctx);
      if (!shouldProcess) {
        if (botConfig.options.logMessages) {
          console.log(`🚫 URL procesable rechazada: ${ctx.from?.first_name} (${ctx.from?.id})`);
        }
        return;
      }
      
      try {
        console.log("🔍 URL procesable detectada, procesando...");
        
        // Process URLs that are traditional social media (Twitter, Instagram, TikTok) with the main handler
        const traditionalSocialMediaUrls = processableUrls.filter((url: string) => isSocialMediaUrl(url));
        if (traditionalSocialMediaUrls.length > 0) {
          await SocialMediaHandler.handleMessage(ctx);
          return;
        }
        
        // Process other URLs with download fallback if enabled
        if (botConfig.options.enableDownloadFallback && botConfig.options.downloadFallback.enabled) {
          for (const url of processableUrls) {
            await SocialMediaHandler.processSocialMediaUrl(ctx, url);
          }
          return;
        } else {
          // If download fallback is not enabled, show a helpful message
          await ctx.reply("🔗 URL detectada pero el servicio de descarga universal está deshabilitado", {
            disable_notification: botConfig.options.silentReplies,
          });
          return;
        }
        
      } catch (error) {
        console.error('❌ Error handling processable URL:', error);
        // Continuar con el procesamiento normal si falla
      }
    }
  }

  // For non-social media messages, use normal authorization
  if (!isAuthorized) {
    // Silent rejection - don't respond to unauthorized users
    if (botConfig.options.logMessages) {
      console.log(`🚫 Usuario no autorizado: ${ctx.from?.first_name} (${ctx.from?.id})`);
    }
    return;
  }

  // Si no es un comando o una URL de redes sociales,
  // simplemente no hacer nada (no responder al mensaje)
});

// Global error handler
bot.catch((err) => {
  console.error('Bot error:', err);
  // Log the error but don't crash the bot
});

//Start the Bot
bot.start();
