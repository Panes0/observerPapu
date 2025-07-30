export interface BotConfigOptions {
  // Enable or disable bot features
  enableSocialMedia: boolean;
  enableAI: boolean;
  enableDownloadFallback: boolean;
  enableImageDownload: boolean;
  
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
}

export interface BotConfig {
  token: string;
  options: BotConfigOptions;
} 