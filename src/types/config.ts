export interface BotConfigOptions {
  // Enable or disable bot features
  enableSocialMedia: boolean;
  enableScreamMode: boolean;
  enableMenu: boolean;
  
  // Bot behavior settings
  silentReplies: boolean;
  logMessages: boolean;
  
  // Access control settings
  enableWhitelist: boolean;
  requireOwnerInGroup: boolean;
  ownerId: number | null;
  whitelistedUsers: number[];
}

export interface BotConfig {
  token: string;
  options: BotConfigOptions;
} 