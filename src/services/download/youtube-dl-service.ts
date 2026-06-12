import youtubeDl from 'youtube-dl-exec';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { DownloadInfo, DownloadResult, DownloadConfig } from '../../types/download';
import { FileManager } from './file-manager';
import { RedditService } from './reddit-service';

const streamPipeline = promisify(pipeline);

export class YouTubeDLService {
  private fileManager: FileManager;
  private config: DownloadConfig;
  private supportedSites: string[] = [];
  private sitesLastUpdated: number = 0;
  private activeConcurrentDownloads: number = 0;
  private redditService: RedditService;

  constructor(config: DownloadConfig) {
    this.config = config;
    this.fileManager = new FileManager(
      config.tempDir,
      config.maxFileSize,
      config.cleanupAfterSend
    );
    this.redditService = new RedditService();
  }

  /**
   * Gets list of all supported extractors (cached for 1 hour)
   */
  async getSupportedSites(): Promise<string[]> {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Return cached list if it's fresh
    if (this.supportedSites.length > 0 && (now - this.sitesLastUpdated) < oneHour) {
      return this.supportedSites;
    }

    try {
      console.log('🔄 Fetching supported sites list...');
      const result = await youtubeDl('', {
        listExtractors: true
      }, {
        windowsHide: true  // Hide terminal window on Windows
      });

      if (typeof result === 'string') {
        this.supportedSites = result
          .split('\n')
          .filter((line: string) => line.trim() && !line.startsWith(' '))
          .map((line: string) => line.trim());
        
        this.sitesLastUpdated = now;
        console.log(`✅ Found ${this.supportedSites.length} supported extractors`);
      }
    } catch (error) {
      console.error('❌ Error fetching supported sites:', error);
      // Return a basic list as fallback
      this.supportedSites = [
        'youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'reddit',
        'twitch', 'vimeo', 'dailymotion', 'soundcloud', 'bandcamp'
      ];
    }

    return this.supportedSites;
  }

  /**
   * Checks if a URL can be handled by youtube-dl
   */
  async canHandle(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Check blocked domains
      if (this.config.blockedDomains.includes(domain)) {
        return false;
      }

      // Try to extract info without downloading to verify support
      await this.extractInfo(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if domain is blocked
   */
  private isBlocked(domain: string): boolean {
    return this.config.blockedDomains.some(blocked => 
      domain.includes(blocked) || blocked.includes(domain)
    );
  }

  /**
   * Extracts metadata without downloading
   */
  async extractInfo(url: string): Promise<DownloadInfo> {
    try {
      console.log(`🔍 Extracting info for: ${url}`);
      
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const isTwitter = url.includes('twitter.com') || url.includes('x.com') || url.includes('t.co');

      // Enhanced options with Instagram-specific handling
      let options: any = {
        dumpJson: true,
        skipDownload: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        referer: 'https://www.youtube.com/',
        addHeader: ['Accept-Language:en-US,en;q=0.9'],
        ...((isYouTube || isTwitter) && this.config.cookiesFile ? { cookies: this.config.cookiesFile } : {})
      };

      // Twitter-specific options
      if (isTwitter) {
        options = {
          ...options,
          referer: 'https://x.com/',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          addHeader: [
            'Accept-Language:en-US,en;q=0.9',
            'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Origin:https://x.com'
          ]
        };
      }

      // Instagram-specific options
      if (url.includes('instagram.com')) {
        console.log('🔍 Detected Instagram URL, using Instagram-specific options');
        options = {
          ...options,
          // Use desktop user agent for better compatibility
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          // Instagram-specific headers
          addHeader: [
            'Accept-Language:en-US,en;q=0.9',
            'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding:gzip, deflate, br',
            'DNT:1',
            'Connection:keep-alive',
            'Upgrade-Insecure-Requests:1',
            'Sec-Fetch-Dest:document',
            'Sec-Fetch-Mode:navigate',
            'Sec-Fetch-Site:none'
          ],
          // Additional Instagram options
          noCheckCertificate: true
          // Removed cookies: '' - it's causing parameter parsing issues
          // Removed sleepInterval - it's causing parameter parsing issues
        };
      }
      
      console.log(`🛠️ Using options:`, JSON.stringify(options, null, 2));

      const result = await youtubeDl(url, options, {
        windowsHide: true  // Hide terminal window on Windows
      });

      console.log(`📋 Raw result type: ${typeof result}`);
      console.log(`📋 Raw result length: ${typeof result === 'string' ? result.length : 'N/A'}`);
      
      if (typeof result === 'string' && result.length > 0) {
        console.log(`📋 First 200 chars: ${result.substring(0, 200)}...`);
      } else if (typeof result === 'object' && result) {
        console.log(`📋 Object keys: ${Object.keys(result).slice(0, 10).join(', ')}...`);
      }

      let info: DownloadInfo;
      
      if (typeof result === 'string') {
        if (!result.trim()) {
          throw new Error('No metadata returned or empty result');
        }
        info = JSON.parse(result) as DownloadInfo;
      } else if (typeof result === 'object' && result) {
        // youtube-dl-exec sometimes returns parsed object directly
        info = result as DownloadInfo;
      } else {
        throw new Error('No metadata returned or empty result');
      }
      
      // Validate extracted info
      this.validateInfo(info);
      
      console.log(`✅ Extracted info: ${info.title} by ${info.uploader} (${info.extractor})`);
      return info;
    } catch (error) {
      console.error(`❌ Error extracting info:`, error);
      
      // Try fallback approach for Instagram
      if (url.includes('instagram.com')) {
        console.log(`🔄 Trying Instagram fallback approach...`);
        try {
          const fallbackOptions = {
            dumpJson: true,
            skipDownload: true,
            // Try without forced extractor
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            noCheckCertificate: true,
            // Try mobile user agent
            addHeader: [
              'Accept-Language:en-US,en;q=0.9',
              'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            ]
          };

          const fallbackResult = await youtubeDl(url, fallbackOptions, {
            windowsHide: true  // Hide terminal window on Windows
          });

          let fallbackInfo: DownloadInfo;
          
          if (typeof fallbackResult === 'string') {
            if (!fallbackResult.trim()) {
              throw new Error('Instagram fallback returned empty string');
            }
            fallbackInfo = JSON.parse(fallbackResult) as DownloadInfo;
          } else if (typeof fallbackResult === 'object' && fallbackResult) {
            fallbackInfo = fallbackResult as DownloadInfo;
          } else {
            throw new Error('Instagram fallback returned invalid result');
          }
          
          console.log(`✅ Instagram fallback succeeded`);
          this.validateInfo(fallbackInfo);
          return fallbackInfo;
        } catch (fallbackError) {
          console.error(`❌ Instagram fallback also failed:`, fallbackError);
        }
      }
      
      // Try fallback approach for YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        console.log(`🔄 Trying YouTube fallback approach...`);
        try {
          const fallbackOptions: any = {
            dumpJson: true,
            skipDownload: true,
            format: 'best[height<=720]',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            noCheckCertificate: true,
            preferFreeFormats: true,
            ...(this.config.cookiesFile ? { cookies: this.config.cookiesFile } : {})
          };

          const fallbackResult = await youtubeDl(url, fallbackOptions, {
            windowsHide: true  // Hide terminal window on Windows
          });

          let fallbackInfo: DownloadInfo;
          
          if (typeof fallbackResult === 'string') {
            if (!fallbackResult.trim()) {
              throw new Error('Fallback returned empty string');
            }
            fallbackInfo = JSON.parse(fallbackResult) as DownloadInfo;
          } else if (typeof fallbackResult === 'object' && fallbackResult) {
            fallbackInfo = fallbackResult as DownloadInfo;
          } else {
            throw new Error('Fallback returned invalid result');
          }
          
          console.log(`✅ Fallback succeeded`);
          this.validateInfo(fallbackInfo);
          return fallbackInfo;
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed:`, fallbackError);
        }
      }
      
      throw new Error(`Failed to extract info: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Downloads media from URL
   */
  async downloadMedia(url: string, skipRedditDetection: boolean = false): Promise<DownloadResult> {
    // Check concurrent downloads limit
    if (this.activeConcurrentDownloads >= this.config.maxConcurrentDownloads) {
      throw new Error('Maximum concurrent downloads reached');
    }

    this.activeConcurrentDownloads++;

    try {
      console.log(`⬬ Starting download for: ${url}`);
      console.log(`🔍 Skip Reddit detection: ${skipRedditDetection}`);
      console.log(`🤖 Is Reddit URL: ${this.redditService.isRedditUrl(url)}`);
      
      // 🆕 Try Reddit API first for Reddit URLs (unless explicitly skipped)
      if (!skipRedditDetection && this.redditService.isRedditUrl(url)) {
        console.log(`🤖 Detected Reddit URL, trying Reddit API first...`);
        try {
          const redditResult = await this.redditService.downloadRedditVideo(url, this);
          if (redditResult.success) {
            console.log(`✅ Reddit API download successful`);
            return redditResult;
          } else {
            console.log(`⚠️ Reddit API failed, falling back to youtube-dl: ${redditResult.error}`);
          }
        } catch (redditError) {
          console.log(`⚠️ Reddit API failed, falling back to youtube-dl: ${redditError instanceof Error ? redditError.message : redditError}`);
        }
      }
      
      // Extract info first
      const info = await this.extractInfo(url);
      
      // Additional validations based on config
      this.validateDownload(info);
      
      // Generate output filename
      const fileName = this.fileManager.generateFileName(url, info.title, undefined);
      const outputPath = this.fileManager.getTempPath(fileName);
      const outputTemplate = this.fileManager.getTempPath(`${Date.now()}_%(title)s.%(ext)s`);

      const isYouTubeDownload = url.includes('youtube.com') || url.includes('youtu.be');
      const isTwitterDownload = url.includes('twitter.com') || url.includes('x.com') || url.includes('t.co');

      // Prepare download options
      const downloadOptions: any = {
        output: outputTemplate,
        format: this.buildFormatSelector(info),
        writeInfoJson: true,
        ...((isYouTubeDownload || isTwitterDownload) && this.config.cookiesFile ? { cookies: this.config.cookiesFile } : {})
      };

      // Twitter-specific download headers
      if (isTwitterDownload) {
        downloadOptions.referer = 'https://x.com/';
        downloadOptions.addHeader = [
          'Accept-Language:en-US,en;q=0.9',
          'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Origin:https://x.com'
        ];
      }

      // Handle playlists
      if (info._type === 'playlist') {
        if (this.config.blockPlaylists) {
          throw new Error('Playlists are blocked');
        }
        // Download only first item from playlist
        downloadOptions.playlistItems = '1';
      }

      console.log(`🎯 Using format: ${downloadOptions.format}`);

      // Execute download
      const result = await youtubeDl(url, downloadOptions, {
        windowsHide: true  // Hide terminal window on Windows
      });

      // Find the downloaded file
      const downloadedFile = await this.findDownloadedFile(outputTemplate, info.title || 'download');
      
      if (!downloadedFile) {
        throw new Error('Downloaded file not found');
      }

      // Validate the downloaded file
      const fileInfo = await this.fileManager.validateFile(downloadedFile);
      
      console.log(`✅ Download completed: ${fileInfo.path} (${FileManager.formatFileSize(fileInfo.size)})`);
      
      return {
        success: true,
        filePath: fileInfo.path,
        fileName: path.basename(fileInfo.path),
        fileSize: fileInfo.size,
        duration: info.duration,
        thumbnail: await this.findThumbnailFile(downloadedFile),
        info: info,
        extractor: info.extractor
      };

    } catch (error) {
      console.error(`❌ Download failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
        extractor: url.includes('youtube') ? 'youtube' : 'unknown'
      };
    } finally {
      this.activeConcurrentDownloads--;
    }
  }

  /**
   * Validates extracted info against config constraints
   */
  private validateInfo(info: DownloadInfo): void {
    if (!info.title) {
      throw new Error('No title found');
    }

    if (!info.extractor) {
      throw new Error('No extractor identified');
    }

    // Check NSFW content
    if (this.config.nsfwBlocked) {
      const nsfwKeywords = ['porn', 'nsfw', 'adult', 'xxx', 'sex'];
      const title = info.title.toLowerCase();
      const uploader = (info.uploader || '').toLowerCase();
      
      if (nsfwKeywords.some(keyword => title.includes(keyword) || uploader.includes(keyword))) {
        throw new Error('NSFW content blocked');
      }
    }
  }

  /**
   * Validates download constraints
   */
  private validateDownload(info: DownloadInfo): void {
    // Check duration
    if (info.duration && info.duration > this.config.maxDuration) {
      throw new Error(`Video too long: ${FileManager.formatDuration(info.duration)} (max: ${FileManager.formatDuration(this.config.maxDuration)})`);
    }

    // Check estimated file size
    if (info.filesize && info.filesize > this.config.maxFileSize) {
      throw new Error(`File too large: ${FileManager.formatFileSize(info.filesize)} (max: ${FileManager.formatFileSize(this.config.maxFileSize)})`);
    }
  }

  /**
   * Builds format selector based on config and content type
   */
  private buildFormatSelector(info: DownloadInfo): string {
    const maxSize = Math.floor(this.config.maxFileSize / (1024 * 1024)); // Convert to MB

    // For audio-only content
    if (this.isAudioContent(info)) {
      return `${this.config.audioQuality}[filesize<${maxSize}M]/best[filesize<${maxSize}M]/best`;
    }

    // For Twitter/Reddit - use universal format selector (YouTube format IDs don't apply)
    const extractor = (info.extractor || '').toLowerCase();
    if (extractor === 'twitter' || extractor === 'reddit') {
      return 'bestvideo[height<=720]+bestaudio/best[height<=720]/bestvideo+bestaudio/best';
    }

    // For YouTube content - use format IDs that work reliably across different YouTube content
    // Include both AVC1 (H.264) and VP9 formats for maximum compatibility
    const formatSelectors = [
      // VP9 formats (often work better for Shorts and newer videos)
      '606+233',    // 480p VP9 + audio
      '605+233',    // 360p VP9 + audio
      '604+233',    // 240p VP9 + audio
      '603+233',    // 144p VP9 + audio (high fps)
      '602+233',    // 144p VP9 + audio (low fps)

      // AVC1 (H.264) formats (traditional formats)
      '232+233',    // 720p H.264 + audio
      '231+233',    // 480p H.264 + audio
      '230+233',    // 360p H.264 + audio
      '229+233',    // 240p H.264 + audio
      '269+233',    // 144p H.264 + audio

      // Fallback to video-only formats (will be silent)
      '606', '605', '604', '603', '602',  // VP9 video-only
      '232', '231', '230', '229', '269',  // H.264 video-only

      // Universal fallbacks for non-YouTube content
      'bestvideo[height<=720]+bestaudio/best[height<=720]/bestvideo+bestaudio/best'
    ];

    return formatSelectors.join('/');
  }

  /**
   * Checks if content is audio-only
   */
  private isAudioContent(info: DownloadInfo): boolean {
    const audioExtractors = ['soundcloud', 'bandcamp', 'audiomack', 'spotify'];
    return audioExtractors.includes(info.extractor.toLowerCase());
  }

  /**
   * Finds the downloaded file from output template
   */
  private async findDownloadedFile(outputTemplate: string, expectedTitle: string): Promise<string | null> {
    const tempDir = path.dirname(outputTemplate);
    const files = await fs.promises.readdir(tempDir);
    
    // Look for files that match the expected pattern
    const timestamp = path.basename(outputTemplate).split('_')[0];
    const candidates = files.filter(file => 
      file.startsWith(timestamp) && 
      !file.endsWith('.info.json') && 
      !file.endsWith('.jpg') && 
      !file.endsWith('.png') &&
      !file.endsWith('.webp')
    );
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Return the first candidate (should be the main file)
    return path.join(tempDir, candidates[0]);
  }

  /**
   * Finds thumbnail file for the download
   */
  private async findThumbnailFile(videoPath: string): Promise<string | undefined> {
    if (!this.config.extractThumbnails) {
      return undefined;
    }

    const baseName = path.parse(videoPath).name;
    const thumbnailExts = ['.jpg', '.png', '.webp'];
    
    for (const ext of thumbnailExts) {
      const thumbnailPath = path.join(path.dirname(videoPath), baseName + ext);
      if (fs.existsSync(thumbnailPath)) {
        return thumbnailPath;
      }
    }
    
    return undefined;
  }

  /**
   * Cleans up downloaded files
   */
  async cleanup(filePath: string): Promise<void> {
    await this.fileManager.cleanup(filePath);
  }

  /**
   * Gets service statistics
   */
  async getStats(): Promise<{
    supportedSites: number;
    tempFiles: number;
    tempSize: number;
    activeConcurrentDownloads: number;
    maxConcurrentDownloads: number;
  }> {
    const supportedSites = await this.getSupportedSites();
    const { fileCount, totalSize } = await this.fileManager.getDirectoryStats();
    
    return {
      supportedSites: supportedSites.length,
      tempFiles: fileCount,
      tempSize: totalSize,
      activeConcurrentDownloads: this.activeConcurrentDownloads,
      maxConcurrentDownloads: this.config.maxConcurrentDownloads
    };
  }

  /**
   * Performs maintenance tasks
   */
  async performMaintenance(): Promise<void> {
    console.log('🧹 Performing download service maintenance...');

    // Clean up old files
    await this.fileManager.cleanupOldFiles(1);

    // Refresh supported sites list
    await this.getSupportedSites();

    console.log('✅ Maintenance completed');
  }

  /**
   * Downloads a Twitter/X video directly from a twimg CDN URL using bearer token auth.
   * Bypasses yt-dlp which reliably fails with 403 on Twitter m3u8 streams.
   */
  async downloadTwitterDirect(cdnUrl: string): Promise<DownloadResult> {
    console.log(`🐦 Downloading Twitter video directly: ${cdnUrl}`);

    const ext = cdnUrl.split('?')[0].split('.').pop() || 'mp4';
    const fileName = `${Date.now()}_twitter_video.${ext}`;
    const filePath = this.fileManager.getTempPath(fileName);

    try {
      const response = await fetch(cdnUrl, {
        headers: {
          'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'Referer': 'https://twitter.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'x-twitter-client-language': 'en',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status} fetching Twitter CDN URL` };
      }

      if (!response.body) {
        return { success: false, error: 'Empty response body from Twitter CDN' };
      }

      const fileStream = fs.createWriteStream(filePath);
      await streamPipeline(response.body as any, fileStream);

      const fileInfo = await this.fileManager.validateFile(filePath);
      console.log(`✅ Twitter direct download completed: ${fileInfo.path} (${FileManager.formatFileSize(fileInfo.size)})`);

      return {
        success: true,
        filePath: fileInfo.path,
        fileName: path.basename(fileInfo.path),
        fileSize: fileInfo.size,
        extractor: 'twitter'
      };
    } catch (error) {
      try { fs.unlinkSync(filePath); } catch {}
      console.error(`❌ Twitter direct download failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twitter direct download failed'
      };
    }
  }
} 