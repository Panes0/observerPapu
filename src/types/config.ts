export interface BotConfigOptions {
  // Enable or disable bot features
  enableSocialMedia: boolean;
  
  // Bot behavior settings
  silentReplies: boolean;
  logMessages: boolean;
  
  // Access control settings
  enableWhitelist: boolean;
  requireOwnerInGroup: boolean;
  ownerId: number | null;
  whitelistedUsers: number[];
  
  // Social media display options
  socialMediaDisplay: {
    showPlatform: boolean;      // Show platform name (Twitter, Instagram, etc.)
    showAuthor: boolean;        // Show author name
    showContent: boolean;       // Show post content/text
    showStats: boolean;         // Show likes, retweets, comments
    showOriginalLink: boolean;  // Show "Ver original" link
  };
}

export interface BotConfig {
  token: string;
  options: BotConfigOptions;
} 