import { DownloadInfo, DownloadResult } from '../../types/download';

export interface RedditPost {
  title: string;
  author: string;
  subreddit: string;
  url: string;
  is_video: boolean;
  media?: {
    reddit_video?: {
      fallback_url: string;
      dash_url: string;
      duration: number;
      height: number;
      width: number;
    };
  };
  secure_media?: {
    reddit_video?: {
      fallback_url: string;
      dash_url: string;
      duration: number;
      height: number;
      width: number;
    };
  };
  preview?: {
    reddit_video_preview?: {
      fallback_url: string;
      dash_url: string;
      duration: number;
      height: number;
      width: number;
    };
  };
  crosspost_parent_list?: RedditPost[];
}

export interface RedditApiResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
  };
}

export class RedditService {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Checks if URL is a Reddit URL
   */
  isRedditUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase().includes('reddit.com');
    } catch {
      return false;
    }
  }

  /**
   * Extracts video information from Reddit post using JSON API
   */
  async extractVideoInfo(url: string): Promise<DownloadInfo | undefined> {
    if (!this.isRedditUrl(url)) {
      throw new Error('Not a Reddit URL');
    }

    try {
      console.log(`🔍 Extracting Reddit video info from: ${url}`);
      
      // Convert Reddit URL to JSON API URL
      const jsonUrl = this.getJsonApiUrl(url);
      console.log(`📡 Fetching Reddit JSON: ${jsonUrl}`);
      
      // Fetch Reddit JSON data
      const response = await fetch(jsonUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Reddit API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as RedditApiResponse[];
      
      if (!data || !data[0] || !data[0].data || !data[0].data.children || data[0].data.children.length === 0) {
        throw new Error('Invalid Reddit API response structure');
      }

      const post = data[0].data.children[0].data;
      console.log(`📝 Reddit post: "${post.title}" by u/${post.author}`);

      // Extract video information
      const videoInfo = this.extractVideoFromPost(post);
      
      if (!videoInfo) {
        // Check if it's a crosspost with video
        if (post.crosspost_parent_list && post.crosspost_parent_list.length > 0) {
          console.log('🔄 Checking crosspost for video content...');
          const crosspostVideo = this.extractVideoFromPost(post.crosspost_parent_list[0]);
          if (crosspostVideo) {
            console.log('✅ Found video in crosspost');
            return this.createDownloadInfo(post, crosspostVideo, url);
          }
        }
        
        throw new Error('No video content found in Reddit post');
      }

      console.log(`✅ Found Reddit video: ${videoInfo.fallback_url}`);
      return this.createDownloadInfo(post, videoInfo, url);

    } catch (error) {
      console.error(`❌ Reddit extraction failed:`, error);
      throw error;
    }
  }

  /**
   * Converts Reddit URL to JSON API URL
   */
  private getJsonApiUrl(url: string): string {
    // Remove trailing slash and add .json
    const cleanUrl = url.replace(/\/$/, '');
    return cleanUrl + '.json';
  }

  /**
   * Extracts video data from Reddit post object
   */
  private extractVideoFromPost(post: RedditPost): any | null {
    // Check various locations where Reddit stores video data
    const videoSources = [
      post.media?.reddit_video,
      post.secure_media?.reddit_video,
      post.preview?.reddit_video_preview,
    ];

    for (const video of videoSources) {
      if (video && video.fallback_url) {
        return video;
      }
    }

    return null;
  }

  /**
   * Creates DownloadInfo object from Reddit post and video data
   */
  private createDownloadInfo(post: RedditPost, video: any, originalUrl: string): DownloadInfo {
    return {
      id: this.extractPostId(originalUrl),
      title: post.title,
      description: `Reddit post from r/${post.subreddit}`,
      uploader: `u/${post.author}`,
      upload_date: undefined, // Reddit doesn't provide easy access to creation date in this format
      duration: video.duration,
      view_count: undefined, // Not available in basic Reddit API
      like_count: undefined, // Would need additional API calls
      dislike_count: undefined,
      comment_count: undefined,
      extractor: 'reddit',
      extractor_key: 'reddit',
      webpage_url: originalUrl,
      original_url: originalUrl,
      thumbnail: undefined, // Could be extracted from preview if needed
      thumbnails: [],
      formats: [{
        format_id: 'reddit_video',
        url: video.fallback_url,
        ext: 'mp4',
        width: video.width,
        height: video.height,
        filesize: undefined,
        tbr: undefined,
        vbr: undefined,
        abr: undefined,
      }],
      filesize: undefined,
      _type: 'video' as const,
    };
  }

  /**
   * Extracts post ID from Reddit URL
   */
  private extractPostId(url: string): string {
    const match = url.match(/\/comments\/([a-zA-Z0-9]+)\//);
    return match ? match[1] : 'unknown';
  }

  /**
   * Gets the direct video URL for downloading
   */
  async getDirectVideoUrl(url: string): Promise<string> {
    const videoInfo = await this.extractVideoInfo(url);
    
    if (!videoInfo || !videoInfo.formats || videoInfo.formats.length === 0) {
      throw new Error('No video URL found in Reddit post');
    }

    return videoInfo.formats[0].url;
  }

  /**
   * Downloads Reddit video by using yt-dlp which handles DASH manifests properly
   */
  async downloadRedditVideo(url: string, youtubeDlService: any): Promise<DownloadResult> {
    try {
      console.log(`🔄 Starting Reddit video download using yt-dlp: ${url}`);

      // Use yt-dlp to download Reddit videos - it handles DASH manifests and audio merging
      // Skip Reddit detection to avoid infinite loop
      const result = await youtubeDlService.downloadMedia(url, true);

      if (result.success) {
        console.log(`✅ Reddit video download successful via yt-dlp`);
        result.extractor = 'reddit';
      }

      return result;

    } catch (error) {
      console.error(`❌ Reddit video download failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reddit download failed',
        extractor: 'reddit'
      };
    }
  }

  /**
   * Downloads video file directly via HTTP (bypassing youtube-dl metadata extraction)
   */
  private async downloadDirectVideoFile(videoUrl: string, redditInfo: DownloadInfo | undefined): Promise<DownloadResult> {
    try {
      console.log(`📥 Downloading Reddit video directly: ${videoUrl}`);

      // Generate filename
      const timestamp = Date.now();
      const cleanTitle = redditInfo?.title
        ? redditInfo.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50)
        : 'reddit_video';
      const fileName = `${timestamp}_${cleanTitle}.mp4`;
      const tempDir = './temp_downloads'; // Should get this from config
      const videoFilePath = `${tempDir}/${timestamp}_${cleanTitle}_video.mp4`;
      const audioFilePath = `${tempDir}/${timestamp}_${cleanTitle}_audio.mp4`;
      const finalFilePath = `${tempDir}/${fileName}`;

      // Ensure temp directory exists
      const fs = await import('fs');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Download the video file
      console.log(`📥 Downloading video stream...`);
      const videoResponse = await fetch(videoUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'video/mp4,video/*,*/*',
          'Referer': 'https://www.reddit.com/'
        }
      });

      if (!videoResponse.ok) {
        throw new Error(`HTTP ${videoResponse.status}: ${videoResponse.statusText}`);
      }

      // Get content length for file size
      const contentLength = videoResponse.headers.get('content-length');
      const fileSize = contentLength ? parseInt(contentLength) : undefined;

      if (fileSize && fileSize > 50 * 1024 * 1024) { // 50MB limit
        throw new Error(`File too large: ${fileSize} bytes`);
      }

      // Write video file to disk
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      fs.writeFileSync(videoFilePath, videoBuffer);
      console.log(`✅ Video stream downloaded: ${videoBuffer.length} bytes`);

      // Try to download audio stream
      // Reddit audio is typically at the same base URL but with DASH_audio.mp4 or DASH_AUDIO_128.mp4
      const audioUrl = this.getAudioUrl(videoUrl);
      let hasAudio = false;

      if (audioUrl) {
        try {
          console.log(`📥 Downloading audio stream: ${audioUrl}`);
          const audioResponse = await fetch(audioUrl, {
            headers: {
              'User-Agent': this.userAgent,
              'Accept': 'audio/mp4,audio/*,*/*',
              'Referer': 'https://www.reddit.com/'
            }
          });

          if (audioResponse.ok) {
            const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
            fs.writeFileSync(audioFilePath, audioBuffer);
            console.log(`✅ Audio stream downloaded: ${audioBuffer.length} bytes`);
            hasAudio = true;
          } else {
            console.log(`⚠️ Audio stream not available (${audioResponse.status})`);
          }
        } catch (audioError) {
          console.log(`⚠️ Could not download audio:`, audioError);
        }
      }

      // Merge video and audio if both exist
      if (hasAudio) {
        console.log(`🔄 Merging video and audio streams...`);
        await this.mergeVideoAndAudio(videoFilePath, audioFilePath, finalFilePath);

        // Clean up temporary files
        fs.unlinkSync(videoFilePath);
        fs.unlinkSync(audioFilePath);
        console.log(`✅ Video and audio merged successfully`);
      } else {
        // No audio available, just rename video file
        console.log(`⚠️ No audio stream found, using video-only file`);
        fs.renameSync(videoFilePath, finalFilePath);
      }

      const finalFileSize = fs.statSync(finalFilePath).size;
      console.log(`✅ Reddit video ready: ${finalFilePath} (${finalFileSize} bytes)`);

      return {
        success: true,
        filePath: finalFilePath,
        fileName: fileName,
        fileSize: finalFileSize,
        duration: redditInfo?.duration,
        info: redditInfo,
        extractor: 'reddit'
      };

    } catch (error) {
      console.error(`❌ Direct video download failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Direct download failed',
        extractor: 'reddit'
      };
    }
  }

  /**
   * Gets the audio URL from a Reddit video URL
   */
  private getAudioUrl(videoUrl: string): string | null {
    try {
      // Reddit video URLs typically look like:
      // https://v.redd.it/abc123/DASH_720.mp4
      // Audio is at:
      // https://v.redd.it/abc123/DASH_audio.mp4 or DASH_AUDIO_128.mp4

      // Try common audio file patterns
      const audioPatterns = [
        'DASH_audio.mp4',
        'DASH_AUDIO_128.mp4',
        'DASH_AUDIO_64.mp4',
        'audio.mp4'
      ];

      // Extract base URL (everything before the last /)
      const lastSlashIndex = videoUrl.lastIndexOf('/');
      if (lastSlashIndex === -1) return null;

      const baseUrl = videoUrl.substring(0, lastSlashIndex);

      // Try the most common pattern first
      return `${baseUrl}/DASH_audio.mp4`;

    } catch {
      return null;
    }
  }

  /**
   * Merges video and audio files using FFmpeg
   */
  private async mergeVideoAndAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
    const ffmpeg = await import('fluent-ffmpeg');

    return new Promise((resolve, reject) => {
      const command = ffmpeg.default(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v copy',      // Copy video codec (no re-encoding)
          '-c:a aac',       // Convert audio to AAC
          '-strict experimental',
          '-shortest'       // Match shortest stream duration
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err));

      // Hide terminal window on Windows
      // @ts-ignore - _spawnOptions is not in the type definitions but exists
      if (process.platform === 'win32') {
        command._spawnOptions = { windowsHide: true };
      }

      command.run();
    });
  }
} 