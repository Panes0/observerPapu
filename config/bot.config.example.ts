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
    
    // Access control settings
    enableWhitelist: true, // Enable whitelist verification
    requireOwnerInGroup: true, // Require owner to be in the group for bot to respond
    ownerId: 123456789, // Replace with your Telegram user ID
    whitelistedUsers: [123456789], // Array of user IDs allowed to use the bot
  }
}; 