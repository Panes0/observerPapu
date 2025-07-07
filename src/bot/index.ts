import { Bot } from "grammy";
import { SocialMediaHandler } from "./handlers/social-media-handler";
import { registerSocialMediaCommands } from "./commands/social-media-commands";
import { isSocialMediaUrl } from "../utils/url-utils";
import { botConfig } from "../../config/bot.config";

// Create a new bot
const bot = new Bot(botConfig.token);

// Registrar comandos de redes sociales
registerSocialMediaCommands(bot);

//This function would be added to the dispatcher as a handler for messages coming from the Bot API
bot.on("message", async (ctx) => {
  //Print to console
  console.log(
    `${ctx.from?.first_name} wrote ${
      "text" in ctx.message ? ctx.message.text : ""
    }`,
  );

  // Verificar si el mensaje contiene URLs de redes sociales
  if (ctx.message.text && isSocialMediaUrl(ctx.message.text)) {
    try {
      await SocialMediaHandler.handleMessage(ctx);
      return; // No procesar más si se manejó como URL de redes sociales
    } catch (error) {
      console.error('Error handling social media message:', error);
      // Continuar con el procesamiento normal si falla
    }
  }

  // Simple forwarding without additional processing
  await ctx.copyMessage(ctx.message.chat.id);
});

//Start the Bot
bot.start();

export { bot }; 