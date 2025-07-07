// Example configuration file for the bot
// Copy this file to bot.config.ts and replace with your actual bot token

export const botConfig = {
  // Your Telegram Bot Token from @BotFather
  token: "YOUR_BOT_TOKEN_HERE",
  
  // Optional: Bot configuration options
  options: {
    // Enable or disable bot features
    enableSocialMedia: true,
    enableScreamMode: true,
    enableMenu: true,
    
    // Bot behavior settings
    silentReplies: true, // Use disable_notification for replies
    logMessages: true,   // Log incoming messages to console
  }
}; 