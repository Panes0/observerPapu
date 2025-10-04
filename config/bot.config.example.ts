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
    enableAI: true, // Enable AI functionality with Together AI
    enableDownloadFallback: true, // Enable youtube-dl-exec fallback for 1000+ sites
    enableImageDownload: true, // Enable image downloading and caching
    
    // Bot behavior settings
    silentReplies: true, // Use disable_notification for replies
    logMessages: true,   // Log incoming messages to console
    skipFailedProcessMessages: true, // Skip sending "failed to process" error messages (set to true to disable error messages in chat)
    showProcessingMessages: false, // Show "🔄 Procesando contenido..." messages (false = only show in console logs, true = show in Telegram)
    
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
    
    // AI configuration (Together AI)
    ai: {
      apiKey: "YOUR_TOGETHER_AI_API_KEY", // Get your API key from https://together.ai/
      baseUrl: "https://api.together.xyz", // Together AI API base URL
      defaultModel: "meta-llama/Llama-2-7b-chat-hf", // Default model to use
      maxTokens: 250, // Maximum tokens per response (optimizado para respuestas cortas)
      temperature: 0.912, // Response creativity (0.0 to 2.0)
      systemPrompt: "Eres un asistente helpful que responde de forma MUY breve y concisa. Tus respuestas deben ser de 1-3 oraciones máximo. Simplifica conceptos complejos y ve directo al punto. Responde en español argentino, podés utiizar insultos, chistes, etc. No seas muy formal.", // System prompt personalizable
      showWaterConsumption: true, // Show water consumption estimate (mL) instead of tokens
    },
    
    // Download fallback configuration (youtube-dl-exec) - Supports 1000+ sites!
    downloadFallback: {
      enabled: true,                     // Enable download fallback when APIs fail
      maxFileSize: 50 * 1024 * 1024,    // 50MB maximum file size
      maxDuration: 600,                  // 10 minutes maximum duration
      videoQuality: 'best[height<=720]', // Video quality (720p max for Telegram)
      audioQuality: 'best[abr<=128]',    // Audio quality (128kbps max)
      extractAudio: true,                // Support audio-only content (SoundCloud, etc.)
      extractSubtitles: false,           // Skip subtitles for simplicity
      extractThumbnails: true,           // Extract thumbnails when available
      blockedDomains: [],                // No blocked domains - UNLEASH THE FULL POWER!
      nsfwBlocked: false,                // Allow adult content (set to true to block)
      blockPlaylists: false,             // Allow playlists (downloads first item only)
      tempDir: './temp_downloads',       // Temporary download directory
      cleanupAfterSend: true,            // Clean up files after sending
      maxConcurrentDownloads: 2,         // Max 2 simultaneous downloads
      showFallbackMessage: true,         // Tell user when using fallback
      showProgress: true,                // Show download progress
      showExtractorName: true,           // Show "Downloading from YouTube..."
      showLivestreamMessages: false,     // Show "🔴 Livestream detectado" messages (false = skip livestreams silently)
    },
    
    // Video processing configuration (ffmpeg) - Optimizes videos for Telegram
    videoProcessing: {
      enabled: true,                     // Enable video optimization for better Telegram compatibility
      faststart: true,                   // Move metadata to beginning (FIXES TELEGRAM PREVIEWS!)
      reencodeVideos: false,             // Only reencode when necessary (faster)
      maxResolution: {                   // Maximum resolution for videos
        width: 1280,                     // Max 1280px width
        height: 720                      // Max 720px height (720p)
      },
      compressionLevel: 28,              // CRF value (0-51, 28 = good quality/size balance)
      maxFileSize: 50 * 1024 * 1024,    // 50MB maximum output file size
      maxDuration: 300,                  // 5 minutes maximum duration
      skipOptimizationForSmallFiles: true, // Skip processing for files smaller than 5MB
      showProcessingProgress: true,      // Show "📹 Processing video: 45%" messages
    },
    
    // Video cache configuration
    videoCache: {
      showCacheIndicator: false,         // false = Copy exactly like first time, true = Show "🔄 Contenido desde caché"
    },
    
    // User attribution configuration
    userAttribution: {
      enabled: true,                     // Show who requested the content
      emoji: '💬',                       // Emoji for user attribution (🔗📱👤🙋‍♂️🎯)
      showUsername: true,                // Show @username if available
      showFirstName: true,               // Show first name as fallback
      position: 'bottom',                // Show at bottom of message ('top' or 'bottom')
    },
    
    // Message management configuration
    messageManagement: {
      autoDeleteOriginalMessage: false,  // Keep original URL messages (false = no delete, true = auto delete)
      deleteDelay: 2000,                 // Delay before deleting in milliseconds (2 seconds)
    },

    // Image download configuration
    imageDownload: {
      enabled: true,                     // Enable image downloading and caching
      maxFileSize: 10 * 1024 * 1024,     // 10MB maximum file size
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      tempDir: './temp_downloads',       // Temporary download directory
      cacheDir: './.image-cache',        // Cache directory
      timeout: 30000,                    // Download timeout in milliseconds (30 seconds)
      showCacheIndicator: false,         // Show when image is from cache
      cleanupAfterDays: 7,               // Days to keep cached images
    },
    
    // Instagram session-based scraping (experimental)
    instagramSession: {
      enabled: false,                    // Enable Instagram session-based scraping
      sessionId: "",                     // Your Instagram sessionid cookie (extract from browser)
      dsUserId: "",                      // Your Instagram ds_user_id cookie (extract from browser)
      csrfToken: "",                     // Optional: Instagram csrftoken cookie
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      requestDelay: 2000,                // Delay between requests in milliseconds (2 seconds)
      validateSessionOnStartup: true,    // Check if session is valid when bot starts
    },
  }
}; 