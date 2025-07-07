import { Bot, InlineKeyboard } from "grammy";
import { SocialMediaHandler } from "./handlers/social-media-handler";
import { registerSocialMediaCommands } from "./commands/social-media-commands";
import { socialMediaManager } from "../services/social-media";
import { isSocialMediaUrl } from "../utils/url-utils";

// Store bot screaming status
let screaming = false;

// Create a new bot
const bot = new Bot("7674393790:AAGq6faK2NBLibdUhIOVXiPhr4z1vfguI1s");

// Registrar comandos de redes sociales
registerSocialMediaCommands(bot);

//This function handles the /scream command
bot.command("scream", () => {
   screaming = true;
 });

//This function handles /whisper command
bot.command("whisper", () => {
   screaming = false;
 });

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
bot.command("menu", async (ctx) => {
  await ctx.reply(firstMenu, {
    parse_mode: "HTML",
    reply_markup: firstMenuMarkup,
  });
});

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
  //Print to console
  console.log(
    `${ctx.from.first_name} wrote ${
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

  if (screaming && ctx.message.text) {
    //Scream the message
    await ctx.reply(ctx.message.text.toUpperCase(), {
      entities: ctx.message.entities,
    });
  } else {
    //This is equivalent to forwarding, without the sender's name
    await ctx.copyMessage(ctx.message.chat.id);
  }
});

//Start the Bot
bot.start();

export { bot }; 