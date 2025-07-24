export interface BotConfigOptions {
  // Enable or disable bot features
  enableSocialMedia: boolean;
  enableAI: boolean;
  enableDownloadFallback: boolean;
  
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
  
  // AI configuration
  ai: {
    apiKey: string;
    baseUrl: string;
    defaultModel: string;
    maxTokens: number;
    temperature: number;
    systemPrompt?: string;
    showWaterConsumption: boolean; // Show water consumption estimate instead of tokens
  };
  
  // Download fallback configuration (youtube-dl-exec)
  downloadFallback: {
    enabled: boolean;
    maxFileSize: number;         // Maximum file size in bytes (50MB default)
    maxDuration: number;         // Maximum video duration in seconds (10 min default)
    videoQuality: string;        // Video quality selector (e.g., 'best[height<=720]')
    audioQuality: string;        // Audio quality selector (e.g., 'best[abr<=128]')
    extractAudio: boolean;       // Support audio-only content
    extractSubtitles: boolean;   // Extract subtitles
    extractThumbnails: boolean;  // Extract thumbnails
    blockedDomains: string[];    // Domains to block (empty = allow all)
    nsfwBlocked: boolean;        // Block NSFW content detection
    blockPlaylists: boolean;     // Block playlist URLs
    tempDir: string;             // Temporary download directory
    cleanupAfterSend: boolean;   // Clean up files after sending
    maxConcurrentDownloads: number; // Max simultaneous downloads
    showFallbackMessage: boolean;   // Show when using fallback
    showProgress: boolean;          // Show download progress
    showExtractorName: boolean;     // Show "Downloading from YouTube..."
  };
}

export interface BotConfig {
  token: string;
  options: BotConfigOptions;
} 