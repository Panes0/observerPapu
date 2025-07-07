import { Bot, InlineKeyboard } from "grammy";
import { SocialMediaHandler } from "./src/bot/handlers/social-media-handler";
import { registerSocialMediaCommands } from "./src/bot/commands/social-media-commands";
import { isSocialMediaUrl } from "./src/utils/url-utils";
import { botConfig } from "./config/bot.config";

//Store bot screaming status
let screaming = false;

// Create a new bot using configuration
const bot = new Bot(botConfig.token);

// Registrar comandos de redes sociales si está habilitado
if (botConfig.options.enableSocialMedia) {
  registerSocialMediaCommands(bot);
}

//This function handles the /scream command
if (botConfig.options.enableScreamMode) {
  bot.command("scream", () => {
     screaming = true;
   });

  //This function handles /whisper command
  bot.command("whisper", () => {
     screaming = false;
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
    await ctx.reply(firstMenu, {
      parse_mode: "HTML",
      reply_markup: firstMenuMarkup,
      disable_notification: botConfig.options.silentReplies, // Silent reply
    });
  });
}

//This handler processes back button on the menu
bot.callbackQuery(backButton, async (ctx) => {
  //Update message content with corresponding menu section
  await ctx.editMessageText(firstMenu, {
    reply_markup: firstMenuMarkup,
    parse_mode: "HTML",
   });
 });

//This handler processes next button on the menu
bot.callbackQuery(nextButton, async (ctx) => {
  //Update message content with corresponding menu section
  await ctx.editMessageText(secondMenu, {
    reply_markup: secondMenuMarkup,
    parse_mode: "HTML",
   });
 });


//This function would be added to the dispatcher as a handler for messages coming from the Bot API
bot.on("message", async (ctx) => {
  //Print to console if logging is enabled
  if (botConfig.options.logMessages) {
    console.log(
      `${ctx.from.first_name} wrote ${
        "text" in ctx.message ? ctx.message.text : ""
      }`,
    );
  }

  // Verificar si el mensaje contiene URLs de redes sociales
  if (ctx.message.text && isSocialMediaUrl(ctx.message.text)) {
    try {
      console.log("🔍 URL de redes sociales detectada, procesando...");
      await SocialMediaHandler.handleMessage(ctx);
      return; // No procesar más si se manejó como URL de redes sociales
    } catch (error) {
      console.error('❌ Error handling social media message:', error);
      // Continuar con el procesamiento normal si falla
    }
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
