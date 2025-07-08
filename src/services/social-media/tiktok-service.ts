import { BaseSocialMediaService } from './base-service';
import { SocialMediaPost, MediaItem } from '../../types/social-media';

export class TikTokService extends BaseSocialMediaService {
  private fallbackApis = [
    'https://tikwm.com',
    'https://snapinsta.app',    
    'https://vxtiktok.com'
  ];
  
  private currentApiIndex = 0;

  constructor(baseUrl: string = 'https://vxtiktok.com') {
    super(baseUrl, 'tiktok');
  }

  canHandle(url: string): boolean {
    if (!this.isValidUrl(url)) return false;
    
    const urlObj = new URL(url);
    return urlObj.hostname.includes('tiktok.com') || 
           urlObj.hostname.includes('vm.tiktok.com') ||
           urlObj.hostname.includes('vt.tiktok.com');
  }

  async extractPost(url: string): Promise<SocialMediaPost> {
    const videoId = this.extractVideoId(url);
    let lastError: Error | null = null;

    console.log(`🔍 Extracting TikTok post for video ID: ${videoId}`);

    // Try multiple APIs
    for (let apiIndex = 0; apiIndex < this.fallbackApis.length; apiIndex++) {
      const apiUrl = this.fallbackApis[apiIndex];
      
      try {
        console.log(`🔄 Trying TikTok API ${apiIndex + 1}/${this.fallbackApis.length}: ${apiUrl}`);
        
        if (apiUrl.includes('vxtiktok.com')) {
          const result = await this.extractWithVxTikTok(videoId, apiUrl);
          console.log(`✅ Successfully extracted using VxTikTok API`);
          return result;
        } else if (apiUrl.includes('tikwm.com')) {
          const result = await this.extractWithTikwm(url, apiUrl);
          console.log(`✅ Successfully extracted using TikWM API`);
          return result;
        } else if (apiUrl.includes('snapinsta.app')) {
          const result = await this.extractWithSnapinsta(url, apiUrl);
          console.log(`✅ Successfully extracted using Snapinsta API`);
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Failed with API ${apiUrl}:`, error instanceof Error ? error.message : error);
        continue;
      }
    }

    // If all APIs fail, try alternative method
    try {
      console.log(`🔄 All APIs failed, trying alternative method...`);
      const result = await this.extractWithAlternativeMethod(url);
      console.log(`✅ Successfully extracted using alternative method`);
      return result;
    } catch (error) {
      console.error(`❌ All TikTok extraction methods failed. Last error: ${lastError?.message || error}`);
      throw new Error(`All TikTok extraction methods failed. Last error: ${lastError?.message || error}`);
    }
  }

  private async extractWithVxTikTok(videoId: string, apiUrl: string): Promise<SocialMediaPost> {
    const endpoint = `${apiUrl}/api/video/${videoId}`;
    const data = await this.makeRequest(endpoint);
    
    // Validate response structure
    if (!data) {
      throw new Error('Invalid response structure: no data received');
    }
    
    if (!data.author || !data.author.uniqueId) {
      throw new Error('Invalid response structure: missing author information');
    }
    
    const author = data.author.uniqueId;
    const postId = data.id || videoId;
    const postUrl = data.url || `https://www.tiktok.com/@${author}/video/${videoId}`;
    const content = data.desc || `TikTok video by ${author}`;
    const media = this.extractMedia(data);
    
    return {
      id: postId,
      platform: 'tiktok',
      url: postUrl,
      author: author,
      content: content,
      media: media,
      timestamp: new Date(data.createTime ? data.createTime * 1000 : Date.now()),
      likes: data.stats ? data.stats.diggCount || 0 : 0,
      shares: data.stats ? data.stats.shareCount || 0 : 0,
      comments: data.stats ? data.stats.commentCount || 0 : 0
    };
  }

  private async extractWithTikwm(url: string, apiUrl: string): Promise<SocialMediaPost> {
    const endpoint = `${apiUrl}/api/`;
    
    // Use URLSearchParams instead of FormData for better Node.js compatibility
    const params = new URLSearchParams();
    params.append('url', url);
    
    const data = await this.makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    // Validate response structure
    if (!data || !data.data) {
      throw new Error('Invalid response structure: missing data object');
    }
    
    const postData = data.data;
    
    // Validate required fields
    if (!postData.author || !postData.author.unique_id) {
      throw new Error('Invalid response structure: missing author information');
    }
    
    const videoId = postData.id || this.extractVideoId(url);
    const author = postData.author.unique_id;
    const title = postData.title || `TikTok video by ${author}`;
    const playUrl = postData.play || postData.video_url || postData.url;
    const coverUrl = postData.cover || postData.thumbnail || postData.image;
    
    if (!playUrl) {
      throw new Error('Invalid response structure: missing video URL');
    }
    
    return {
      id: videoId,
      platform: 'tiktok',
      url: `https://www.tiktok.com/@${author}/video/${videoId}`,
      author: author,
      content: title,
      media: [{
        type: 'video',
        url: playUrl,
        thumbnail: coverUrl,
        duration: postData.duration || 0
      }],
      timestamp: new Date(postData.create_time ? postData.create_time * 1000 : Date.now()),
      likes: postData.digg_count || 0,
      shares: postData.share_count || 0,
      comments: postData.comment_count || 0
    };
  }

  private async extractWithSnapinsta(url: string, apiUrl: string): Promise<SocialMediaPost> {
    const endpoint = `${apiUrl}/api/tiktok/video`;
    
    // Use URLSearchParams instead of FormData for better Node.js compatibility
    const params = new URLSearchParams();
    params.append('url', url);
    
    const data = await this.makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    // Validate response structure
    if (!data) {
      throw new Error('Invalid response structure: no data received');
    }
    
    if (!data.author || !data.author.unique_id) {
      throw new Error('Invalid response structure: missing author information');
    }
    
    const videoId = data.id || this.extractVideoId(url);
    const author = data.author.unique_id;
    const content = data.desc || `TikTok video by ${author}`;
    const videoUrl = data.video ? data.video.download_addr : null;
    const thumbnail = data.video ? data.video.cover : null;
    const duration = data.video ? data.video.duration : 0;
    
    if (!videoUrl) {
      throw new Error('Invalid response structure: missing video URL');
    }
    
    return {
      id: videoId,
      platform: 'tiktok',
      url: `https://www.tiktok.com/@${author}/video/${videoId}`,
      author: author,
      content: content,
      media: [{
        type: 'video',
        url: videoUrl,
        thumbnail: thumbnail,
        duration: duration
      }],
      timestamp: new Date(data.create_time ? data.create_time * 1000 : Date.now()),
      likes: data.stats ? data.stats.digg_count || 0 : 0,
      shares: data.stats ? data.stats.share_count || 0 : 0,
      comments: data.stats ? data.stats.comment_count || 0 : 0
    };
  }

  private async extractWithAlternativeMethod(url: string): Promise<SocialMediaPost> {
    // Fallback: Try to extract basic info from the URL itself
    const videoId = this.extractVideoId(url);
    const username = this.extractUsername(url);
    
    // Try web scraping as last resort
    try {
      return await this.extractWithWebScraping(url);
    } catch (error) {
      console.log('Web scraping failed, using basic extraction');
    }
    
    return {
      id: videoId,
      platform: 'tiktok',
      url: url,
      author: username || 'unknown',
      content: `TikTok video by ${username || 'unknown'}`,
      media: [],
      timestamp: new Date(),
      likes: 0,
      shares: 0,
      comments: 0
    };
  }

  private async extractWithWebScraping(url: string): Promise<SocialMediaPost> {
    // Try to scrape the TikTok page directly
    const html = await this.makeRequest(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    }) as string;

    const videoId = this.extractVideoId(url);
    const username = this.extractUsername(url);

    // Extract basic info from HTML (this is a simplified approach)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' | TikTok', '').trim() : '';

    return {
      id: videoId,
      platform: 'tiktok',
      url: url,
      author: username || 'unknown',
      content: title || `TikTok video by ${username || 'unknown'}`,
      media: [],
      timestamp: new Date(),
      likes: 0,
      shares: 0,
      comments: 0
    };
  }

  getFixedUrl(url: string): string {
    const videoId = this.extractVideoId(url);
    return `https://www.tiktok.com/@user/video/${videoId}`;
  }

  private extractVideoId(url: string): string {
    // Extraer ID del video de TikTok
    const patterns = [
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
      /tiktok\.com\/v\/(\d+)/,
      /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
      /vt\.tiktok\.com\/([A-Za-z0-9]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return this.extractIdFromUrl(url);
  }

  private extractUsername(url: string): string {
    const match = url.match(/tiktok\.com\/@([\w.-]+)/);
    return match ? match[1] : 'unknown';
  }

  private extractMedia(data: any): MediaItem[] {
    const media: MediaItem[] = [];

    if (!data) {
      return media;
    }

    // TikTok siempre es video
    if (data.video && data.video.downloadAddr) {
      media.push({
        type: 'video',
        url: data.video.downloadAddr,
        thumbnail: data.video.cover || null,
        duration: data.video.duration || 0
      });
    } else if (data.play) {
      // Fallback for different API response format
      media.push({
        type: 'video',
        url: data.play,
        thumbnail: data.cover || null,
        duration: data.duration || 0
      });
    } else if (data.download) {
      // Another fallback format
      media.push({
        type: 'video',
        url: data.download,
        thumbnail: data.thumbnail || data.cover || null,
        duration: data.duration || 0
      });
    }

    return media;
  }
} 