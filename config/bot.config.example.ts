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
    },
  }
}; 