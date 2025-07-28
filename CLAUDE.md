# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm start` - Run the bot in production mode using `ts-node ./ObserverPapu_bot.ts`
- `npm run dev` - Run bot in development mode with auto-reload using `ts-node-dev`
- `npm test` - Run social media integration tests using `./test-social-media.ts`

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
- **Handler Layer**: `src/bot/handlers/` - Message and event processing
- **Utilities**: `src/utils/` - Shared utility functions
- **Type Definitions**: `src/types/` - TypeScript interfaces and types

### Key Services Architecture

**Social Media Processing**:
- `SocialMediaManager` coordinates all platform services
- Individual services for Twitter (FxTwitter API), Instagram (InstaFix), TikTok (vxTikTok)
- Universal fallback using `youtube-dl-exec` for 1000+ sites
- Video cache system to avoid reprocessing identical content

**AI Integration**:
- Together AI service with configurable models
- Memory system for conversation context (user/group-specific)
- Configurable system prompts and token limits

**Video Processing**:
- FFmpeg-based video optimization for Telegram compatibility
- Automatic faststart metadata positioning for preview support
- Resolution and file size optimization

**Download Management**:
- File manager for temporary downloads
- Reddit-specific extraction service
- Concurrent download limiting and cleanup

## Configuration System

The bot uses a comprehensive configuration system in `config/bot.config.ts`:

### Essential Configuration Areas
- **Bot Token**: Telegram API token from @BotFather
- **Access Control**: Whitelist system with owner verification
- **Feature Toggles**: Enable/disable AI, social media, download fallback
- **Service Settings**: API keys, quality settings, processing options

### Access Control
- Owner auto-configuration via `/setowner` command
- Whitelist-based user authorization
- Group presence verification for owner
- Different authorization levels for URL processing vs. commands

## Important Implementation Details

### URL Processing Flow
1. Extract URLs from messages using `extractUrls()` utility
2. Check if URLs are processable via `isProcessableUrl()`
3. Traditional social media URLs use dedicated API services
4. Other URLs fall back to youtube-dl-exec if enabled
5. Videos are cached to avoid reprocessing

### Video Cache System
- Stores processed video messages by URL hash
- Configurable cache indicators (transparent or visible)
- Automatic cleanup of old entries
- Platform-specific statistics tracking

### Memory System (AI)
- File-based storage in `.chat-memory/` directory
- Separate contexts for users vs. groups
- Automatic context injection for AI responses
- Memory statistics and management commands

### Error Handling Patterns
- Services implement retry logic with exponential backoff
- Graceful degradation when APIs fail
- Comprehensive logging for debugging
- Silent rejection for unauthorized users

## Development Guidelines

### Adding New Social Media Platforms
1. Create service class extending `BaseSocialMediaService`
2. Implement URL detection in `url-utils.ts`
3. Add service to `SocialMediaManager`
4. Update configuration types

### Adding New Commands
1. Register commands in bot initialization
2. Implement authorization checking
3. Follow existing error handling patterns
4. Update help documentation

### Video Processing Extensions
1. Extend `VideoOptimizer` class for new formats
2. Update quality/resolution configurations
3. Test Telegram compatibility thoroughly

## File Structure Notes

- Configuration files in `config/` are gitignored (except examples)
- Temporary files use `temp_downloads/` directory
- Chat memory and video cache are persistent but gitignored
- All TypeScript with strict type checking enabled