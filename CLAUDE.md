# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm start` - Run the bot in production mode using `ts-node ./ObserverPapu_bot.ts`
- `npm run dev` - Run bot in development mode with auto-reload using `ts-node-dev`
- `npm test` - Run social media integration tests using `./test-social-media.ts`
- `npm run test:bot` - Basic test command (currently placeholder)

### Development Notes
- No explicit lint or typecheck commands in package.json - TypeScript compilation is handled by ts-node
- Main entry point is `ObserverPapu_bot.ts` in the root directory
- Uses ts-node-dev for hot reloading during development

### Configuration Setup
```bash
# Copy example configuration and edit with your tokens
cp config/bot.config.example.ts config/bot.config.ts
```

## Architecture Overview

This is a comprehensive Telegram bot built with TypeScript that processes social media URLs and provides AI-powered features. The architecture follows a modular service-based design:

### Core Architecture
- **Main Bot File**: `ObserverPapu_bot.ts` - Central bot logic with Grammy framework
- **Service Layer**: `src/services/` - Modular services for different functionalities
  - `social-media/` - Platform-specific services (Twitter, Instagram, TikTok)
  - `ai/` - Together AI integration and memory management
  - `download/` - File management and youtube-dl-exec fallback
  - `video-processing/` - FFmpeg video optimization
  - `video-cache/` - Video message caching system
  - `image-search/` and `image-cache/` - Image search and caching
- **Handler Layer**: `src/bot/handlers/` - Message and event processing
- **Commands**: `src/bot/commands/` - Bot command definitions
- **Utilities**: `src/utils/` - Shared utility functions
- **Type Definitions**: `src/types/` - TypeScript interfaces and types
- **Configuration**: `config/` - Bot configuration files (gitignored except examples)

### Key Services Architecture

**Social Media Processing**:
- `SocialMediaManager` coordinates all platform services
- Individual services for Twitter (FxTwitter API), Instagram (InstaFix + Session), TikTok (vxTikTok)
- Instagram session-based scraping using browser cookies (experimental)
- Universal fallback using `youtube-dl-exec` for 1000+ sites
- Video cache system to avoid reprocessing identical content

**AI Integration**:
- Together AI service with configurable models (default: Llama-2-7b-chat-hf)
- Memory system for conversation context (user/group-specific) stored in `.chat-memory/`
- Configurable system prompts, token limits, and temperature settings
- Water consumption display option instead of token usage
- Commands: `/ai`, `/memory_stats`, `/memory_clear`, `/memory_help`

**Video Processing**:
- FFmpeg-based video optimization for Telegram compatibility
- Automatic faststart metadata positioning for preview support
- Resolution and file size optimization

**Download Management**:
- File manager for temporary downloads in `temp_downloads/`
- Reddit-specific extraction service
- Universal youtube-dl-exec fallback supporting 1000+ sites
- Concurrent download limiting and automatic cleanup
- Configurable quality, file size, and duration limits
- Image download and caching system

## Configuration System

The bot uses a comprehensive configuration system in `config/bot.config.ts`:

### Essential Configuration Areas
- **Bot Token**: Telegram API token from @BotFather
- **Access Control**: Whitelist system with owner verification via `/setowner`
- **Feature Toggles**: Enable/disable AI, social media, download fallback, image search
- **AI Configuration**: Together AI API key, model selection, system prompts
- **Download Settings**: youtube-dl-exec quality, file size limits, blocked domains
- **Video Processing**: FFmpeg optimization, resolution limits, faststart metadata
- **Display Options**: User attribution, cache indicators, message management
- **Service Settings**: API keys, quality settings, processing options
- **Instagram Session**: Browser cookie authentication for better extraction

### Access Control
- Owner auto-configuration via `/setowner` command (private chat only)
- Whitelist-based user authorization with automatic population
- Group presence verification for owner (configurable)
- Different authorization levels for URL processing vs. commands
- Commands: `/setowner`, `/botinfo`, `/auth` for access management
- Silent rejection for unauthorized users

### Instagram Session Setup (Experimental)

To enable Instagram session-based scraping:

1. **Extract cookies from browser**:
   - Login to Instagram in your browser
   - Go to your Instagram profile page
   - Open Developer Tools (F12)
   - Go to Network tab
   - Refresh the page or click on any timeline/graphql request
   - Look in Request Headers for:
     - `ds_user_id=YOUR_USER_ID`
     - `sessionid=YOUR_SESSION_ID`
     - `csrftoken=YOUR_CSRF_TOKEN` (optional)

2. **Configure bot**:
   ```typescript
   instagramSession: {
     enabled: true,
     sessionId: "YOUR_SESSION_ID_HERE",
     dsUserId: "YOUR_DS_USER_ID_HERE",
     csrfToken: "YOUR_CSRF_TOKEN_HERE", // optional
     requestDelay: 2000,
     validateSessionOnStartup: true,
   }
   ```

3. **Important notes**:
   - Cookies expire when you log out or switch accounts
   - Session scraping has rate limits (2 seconds between requests)
   - Use only for personal/testing purposes
   - Falls back to API services if session fails

## Important Implementation Details

### URL Processing Flow
1. Extract URLs from messages using `extractUrls()` utility in `src/utils/url-utils.ts`
2. Check if URLs are processable via `isProcessableUrl()` - filters out YouTube livestreams
3. Traditional social media URLs (Twitter, Instagram, TikTok) use dedicated services:
   - TwitterService uses FxTwitter API
   - InstagramService tries session scraping first, then InstaFix API fallback
   - TikTokService uses vxTikTok API
4. Other URLs fall back to youtube-dl-exec if enabled (supports 1000+ sites)
5. Videos are processed through FFmpeg for Telegram compatibility
6. Results are cached to avoid reprocessing identical content
7. User attribution and message management applied based on configuration

### Video Cache System
- Stores processed video messages by URL hash
- Configurable cache indicators (transparent or visible)
- Automatic cleanup of old entries
- Platform-specific statistics tracking

### Memory System (AI)
- File-based storage in `.chat-memory/` directory (gitignored)
- Separate contexts for users vs. groups using unique identifiers
- Automatic context injection for AI responses with memory
- Memory statistics tracking and management commands
- Configurable memory usage via `shouldUseMemory()` utility
- Commands: `/memory_stats`, `/memory_clear`, `/memory_help`

### Error Handling Patterns
- Services implement retry logic with exponential backoff
- Graceful degradation when APIs fail
- Comprehensive logging for debugging
- Silent rejection for unauthorized users

## Development Guidelines

### Adding New Social Media Platforms
1. Create service class extending `BaseSocialMediaService` in `src/services/social-media/`
2. Implement required methods: `canHandle()`, `extractPost()`, `getFixedUrl()`
3. Add URL pattern detection in `src/utils/url-utils.ts`
4. Register service in `SocialMediaManager` constructor
5. Update `PlatformType` in type definitions
6. Add service export in `src/services/social-media/index.ts`

### Adding New Commands
1. Create command handler in `src/bot/commands/` or add to existing command files
2. Register commands in `ObserverPapu_bot.ts` bot initialization
3. Implement authorization checking using whitelist verification
4. Follow existing error handling patterns with try-catch blocks
5. Add help text and usage examples
6. Consider adding command to help system or dedicated help commands

### Video Processing Extensions
1. Extend `VideoOptimizer` class for new formats
2. Update quality/resolution configurations
3. Test Telegram compatibility thoroughly

## File Structure Notes

- Configuration files in `config/` are gitignored (except examples)
- Temporary files use `temp_downloads/` directory
- Chat memory stored in `.chat-memory/` (gitignored)
- Video cache and image cache are persistent but gitignored
- Image cache uses `.image-cache/` directory
- All TypeScript with strict type checking enabled
- Main dependencies: Grammy (Telegram), fluent-ffmpeg, youtube-dl-exec, form-data
- Development dependencies: ts-node, ts-node-dev for hot reloading

## Key Bot Features and Commands

### Social Media Commands
- `/fix <url>` - Get fixed URLs for social media content
- `/help_social` - Social media functionality help
- `/status` - Service status check
- `/test <url>` - Test URL processing

### AI Commands
- `/ai <prompt>` - AI interaction with memory context
- `/memory_stats` - Memory usage statistics
- `/memory_clear` - Clear chat memory
- `/memory_help` - Memory system help

### Image Search Commands
- `/img <query>` - Search and display images
- `/imgd <query>` - Search and download images
- `/imgstats` - Image cache statistics
- `/imgclear` - Clear image cache
- `/imgclean` - Clean old image cache entries

### Administration Commands
- `/setowner` - Auto-configure bot owner (private chat only)
- `/botinfo` - Bot information and security status
- `/auth` - Check authorization status

## Important Implementation Patterns

### Service Pattern
- All major functionality is encapsulated in service classes
- Services are registered and managed through manager classes
- Dependency injection through configuration objects

### Error Handling
- Comprehensive try-catch blocks with user-friendly error messages
- Graceful degradation when services fail
- Silent rejection for unauthorized users
- Detailed logging for debugging

### Configuration Management
- Centralized configuration in `config/bot.config.ts`
- Feature toggles for all major functionality
- Environment-specific settings support
- Example configuration file for easy setup