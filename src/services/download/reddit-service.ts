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
   * Downloads Reddit video by extracting direct URL first
   */
  async downloadRedditVideo(url: string, youtubeDlService: any): Promise<DownloadResult> {
    try {
      console.log(`🔄 Starting Reddit video download for: ${url}`);
      
      // First, extract the direct video URL using Reddit API
      const redditInfo = await this.extractVideoInfo(url);
      if (!redditInfo || !redditInfo.formats || redditInfo.formats.length === 0) {
        throw new Error('No video URL found in Reddit post');
      }
      
      const directVideoUrl = redditInfo.formats[0].url;
      console.log(`🎯 Direct Reddit video URL: ${directVideoUrl}`);
      
      // Download the direct video URL using simple HTTP download (bypass youtube-dl metadata extraction)
      const downloadResult = await this.downloadDirectVideoFile(directVideoUrl, redditInfo);
      
              if (downloadResult.success) {
          // Override the info with Reddit-specific data
          const redditInfo = await this.extractVideoInfo(url);
          downloadResult.info = redditInfo;
          downloadResult.extractor = 'reddit';
          
          console.log(`✅ Reddit video download successful`);
        }
      
      return downloadResult;
      
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
      const filePath = `${tempDir}/${fileName}`;
      
      // Ensure temp directory exists
      const fs = await import('fs');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Download the video file
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'video/mp4,video/*,*/*',
          'Referer': 'https://www.reddit.com/'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get content length for file size
      const contentLength = response.headers.get('content-length');
      const fileSize = contentLength ? parseInt(contentLength) : undefined;
      
      if (fileSize && fileSize > 50 * 1024 * 1024) { // 50MB limit
        throw new Error(`File too large: ${fileSize} bytes`);
      }
      
      // Write file to disk
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      fs.writeFileSync(filePath, buffer);
      
      console.log(`✅ Reddit video downloaded: ${filePath} (${buffer.length} bytes)`);
      
              return {
          success: true,
          filePath: filePath,
          fileName: fileName,
          fileSize: buffer.length,
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
} 