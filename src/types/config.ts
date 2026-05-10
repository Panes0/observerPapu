import type { DownloadConfig } from './download';

export interface BotConfigOptions {
  // Enable or disable bot features
  enableSocialMedia: boolean;
  enableAI: boolean;
  enableDownloadFallback: boolean;
  enableImageDownload: boolean;
  
  // Bot behavior settings
  silentReplies: boolean;
  logMessages: boolean;
  skipFailedProcessMessages: boolean; // Skip sending "failed to process" error messages
  showProcessingMessages: boolean; // Show "🔄 Procesando contenido..." messages (false = only console logs)
  
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
  downloadFallback: DownloadConfig;
  
  // Video processing configuration (ffmpeg optimization)
  videoProcessing: {
    enabled: boolean;            // Enable video optimization for Telegram
    faststart: boolean;          // Move metadata to beginning (fixes Telegram previews)
    reencodeVideos: boolean;     // Force reencode videos (slower but more compatible)
    maxResolution: {             // Maximum video resolution
      width: number;
      height: number;
    };
    compressionLevel: number;    // CRF value (0-51, lower = better quality)
    maxFileSize: number;         // Maximum output file size in bytes
    maxDuration: number;         // Maximum video duration in seconds
    skipOptimizationForSmallFiles: boolean; // Skip optimization for files < 5MB
    showProcessingProgress: boolean;        // Show video processing progress
  };
  
  // Video cache configuration
  videoCache: {
    showCacheIndicator: boolean; // Show "🔄 Contenido desde caché" or copy exactly
  };
  
  // User attribution configuration
  userAttribution: {
    enabled: boolean;            // Show who requested the content
    emoji: string;               // Emoji to use for attribution
    showUsername: boolean;       // Show @username if available
    showFirstName: boolean;      // Show first name
    position: 'top' | 'bottom'; // Where to show the attribution
  };
  
  // Message management configuration
  messageManagement: {
    autoDeleteOriginalMessage: boolean; // Delete original URL message after processing
    deleteDelay: number;                // Delay in milliseconds before deleting (default: 2000)
  };
  
  // Image download configuration
  imageDownload: {
    enabled: boolean;            // Enable image downloading and caching
    maxFileSize: number;         // Maximum image file size in bytes (10MB default)
    allowedTypes: string[];      // Allowed MIME types
    tempDir: string;             // Temporary download directory
    cacheDir: string;            // Cache directory
    timeout: number;             // Download timeout in milliseconds
    showCacheIndicator: boolean; // Show when image is from cache
    cleanupAfterDays: number;    // Days to keep cached images
  };

  // Instagram session-based scraping configuration
  instagramSession: {
    enabled: boolean;            // Enable Instagram session-based scraping
    sessionId: string;           // Instagram sessionid cookie
    dsUserId: string;            // Instagram ds_user_id cookie
    csrfToken?: string;          // Optional Instagram csrftoken cookie
    userAgent?: string;          // User agent string for requests
    requestDelay: number;        // Delay between requests in milliseconds
    validateSessionOnStartup: boolean; // Check session validity on bot startup
  };
}

export interface BotConfig {
  token: string;
  options: BotConfigOptions;
} 