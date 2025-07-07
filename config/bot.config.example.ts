// Example configuration file for the bot
// Copy this file to bot.config.ts and replace with your actual bot token
import { BotConfig } from '../src/types/config';

export const botConfig: BotConfig = {
  // Your Telegram Bot Token from @BotFather
  token: "YOUR_BOT_TOKEN_HERE",
  
  // Optional: Bot configuration options
  options: {
    // Enable or disable bot features
    enableSocialMedia: true,
    
    // Bot behavior settings
    silentReplies: true, // Use disable_notification for replies
    logMessages: true,   // Log incoming messages to console
    
    // Access control settings
    enableWhitelist: true, // Enable whitelist verification
    requireOwnerInGroup: true, // Require owner to be in the group for bot to respond
    ownerId: null, // Will be set automatically with /setowner command, or replace with your Telegram user ID
    whitelistedUsers: [], // Array of user IDs allowed to use the bot (will be populated automatically)
    
    // Social media display options
    socialMediaDisplay: {
      showPlatform: true,      // Show platform name (Twitter, Instagram, etc.)
      showAuthor: true,        // Show author name
      showContent: true,       // Show post content/text
      showStats: true,         // Show likes, retweets, comments
      showOriginalLink: true,  // Show "Ver original" link
    },
  }
}; 