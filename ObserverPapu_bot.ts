import { Bot, InlineKeyboard, Context } from "grammy";
import { SocialMediaHandler } from "./src/bot/handlers/social-media-handler";
import { registerSocialMediaCommands } from "./src/bot/commands/social-media-commands";
import { isSocialMediaUrl, extractUrls } from "./src/utils/url-utils";
import { botConfig } from "./config/bot.config";

//Store bot screaming status
let screaming = false;

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
  if (!isWhitelisted) {
    return false;
  }

  // If owner presence is required and this is a group chat
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
      // Check if owner is in the group and not banned
      return chatMember.status !== 'left' && chatMember.status !== 'kicked';
    } catch (error) {
      console.log('⚠️ No se pudo verificar la presencia del owner en el grupo:', error);
      return false;
    }
  }

  return true;
}

// Helper function to check if social media links should be processed even for unauthorized users
async function shouldProcessSocialMediaLinks(ctx: Context): Promise<boolean> {
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
        console.log(`🔗 Procesando link de usuario no autorizado (${ctx.from?.first_name}) - Owner presente en grupo`);
        return true;
      }
    } catch (error) {
      console.log('⚠️ Error verificando presencia del owner para procesamiento de links:', error);
    }
  }

  return false;
}

// Create a new bot using configuration
const bot = new Bot(botConfig.token);

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



//This function handles the /scream command
if (botConfig.options.enableScreamMode) {
  bot.command("scream", async (ctx) => {
    const isAuthorized = await isUserAuthorized(ctx);
    if (!isAuthorized) {
      return;
    }
    screaming = true;
    await ctx.reply("🔊 Modo grito activado", {
      disable_notification: botConfig.options.silentReplies,
    });
  });

  //This function handles /whisper command
  bot.command("whisper", async (ctx) => {
    const isAuthorized = await isUserAuthorized(ctx);
    if (!isAuthorized) {
      return;
    }
    screaming = false;
    await ctx.reply("🔇 Modo grito desactivado", {
      disable_notification: botConfig.options.silentReplies,
    });
  });
}

//Pre-assign menu text
const firstMenu = "<b>Menu 1</b>\n\nA beautiful menu with a shiny inline button.";
const secondMenu = "<b>Menu 2</b>\n\nA better menu with even more shiny inline buttons.";

//Pre-assign button text
const nextButton = "Next";
const backButton = "Back";
const tutorialButton = "Tutorial";

//Build keyboards
const firstMenuMarkup = new InlineKeyboard().text(nextButton, nextButton);
 
const secondMenuMarkup = new InlineKeyboard().text(backButton, backButton).text(tutorialButton, "https://core.telegram.org/bots/tutorial");


//This handler sends a menu with the inline buttons we pre-assigned above
if (botConfig.options.enableMenu) {
  bot.command("menu", async (ctx) => {
    const isAuthorized = await isUserAuthorized(ctx);
    if (!isAuthorized) {
      return;
    }
    await ctx.reply(firstMenu, {
      parse_mode: "HTML",
      reply_markup: firstMenuMarkup,
      disable_notification: botConfig.options.silentReplies, // Silent reply
    });
  });
}

//This handler processes back button on the menu
bot.callbackQuery(backButton, async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    await ctx.answerCallbackQuery("No autorizado");
    return;
  }
  //Update message content with corresponding menu section
  await ctx.editMessageText(firstMenu, {
    reply_markup: firstMenuMarkup,
    parse_mode: "HTML",
   });
 });

//This handler processes next button on the menu
bot.callbackQuery(nextButton, async (ctx) => {
  const isAuthorized = await isUserAuthorized(ctx);
  if (!isAuthorized) {
    await ctx.answerCallbackQuery("No autorizado");
    return;
  }
  //Update message content with corresponding menu section
  await ctx.editMessageText(secondMenu, {
    reply_markup: secondMenuMarkup,
    parse_mode: "HTML",
   });
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

  // Verificar si el mensaje contiene URLs de redes sociales
  if (ctx.message.text) {
    const urls = extractUrls(ctx.message.text);
    const socialMediaUrls = urls.filter((url: string) => isSocialMediaUrl(url));
    
    if (socialMediaUrls.length > 0) {
      // Use special authorization for social media links
      const shouldProcess = await shouldProcessSocialMediaLinks(ctx);
      if (!shouldProcess) {
        if (botConfig.options.logMessages) {
          console.log(`🚫 Link de redes sociales rechazado: ${ctx.from?.first_name} (${ctx.from?.id})`);
        }
        return;
      }
      
      try {
        console.log("🔍 URL de redes sociales detectada, procesando...");
        await SocialMediaHandler.handleMessage(ctx);
        return; // No procesar más si se manejó como URL de redes sociales
      } catch (error) {
        console.error('❌ Error handling social media message:', error);
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

  // Solo responder si está en modo scream y el mensaje tiene texto
  if (screaming && ctx.message.text) {
    //Scream the message
    await ctx.reply(ctx.message.text.toUpperCase(), {
      entities: ctx.message.entities,
      disable_notification: botConfig.options.silentReplies, // Silent reply
    });
  }
  // Si no es un comando, no es una URL de redes sociales, y no está en modo scream,
  // simplemente no hacer nada (no responder al mensaje)
});

// Global error handler
bot.catch((err) => {
  console.error('Bot error:', err);
  // Log the error but don't crash the bot
});

//Start the Bot
bot.start();
