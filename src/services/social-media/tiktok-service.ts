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

    // Try multiple APIs
    for (let apiIndex = 0; apiIndex < this.fallbackApis.length; apiIndex++) {
      const apiUrl = this.fallbackApis[apiIndex];
      
      try {
        console.log(`Trying TikTok API: ${apiUrl}`);
        
        if (apiUrl.includes('vxtiktok.com')) {
          return await this.extractWithVxTikTok(videoId, apiUrl);
        } else if (apiUrl.includes('tikwm.com')) {
          return await this.extractWithTikwm(videoId, apiUrl);
        } else if (apiUrl.includes('snapinsta.app')) {
          return await this.extractWithSnapinsta(videoId, apiUrl);
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed with API ${apiUrl}:`, error);
        continue;
      }
    }

    // If all APIs fail, try alternative method
    try {
      return await this.extractWithAlternativeMethod(url);
    } catch (error) {
      throw new Error(`All TikTok extraction methods failed. Last error: ${lastError?.message || error}`);
    }
  }

  private async extractWithVxTikTok(videoId: string, apiUrl: string): Promise<SocialMediaPost> {
    const endpoint = `${apiUrl}/api/video/${videoId}`;
    const data = await this.makeRequest(endpoint);
    
    return {
      id: data.id,
      platform: 'tiktok',
      url: data.url,
      author: data.author.uniqueId,
      content: data.desc,
      media: this.extractMedia(data),
      timestamp: new Date(data.createTime * 1000),
      likes: data.stats.diggCount,
      shares: data.stats.shareCount,
      comments: data.stats.commentCount
    };
  }

  private async extractWithTikwm(videoId: string, apiUrl: string): Promise<SocialMediaPost> {
    const endpoint = `${apiUrl}/api/`;
    
    // Use URLSearchParams instead of FormData for better Node.js compatibility
    const params = new URLSearchParams();
    params.append('url', `https://www.tiktok.com/@user/video/${videoId}`);
    
    const data = await this.makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    return {
      id: videoId,
      platform: 'tiktok',
      url: `https://www.tiktok.com/@${data.data.author.unique_id}/video/${videoId}`,
      author: data.data.author.unique_id,
      content: data.data.title,
      media: [{
        type: 'video',
        url: data.data.play,
        thumbnail: data.data.cover,
        duration: data.data.duration
      }],
      timestamp: new Date(),
      likes: data.data.digg_count,
      shares: data.data.share_count,
      comments: data.data.comment_count
    };
  }

  private async extractWithSnapinsta(videoId: string, apiUrl: string): Promise<SocialMediaPost> {
    const endpoint = `${apiUrl}/api/tiktok/video`;
    
    // Use URLSearchParams instead of FormData for better Node.js compatibility
    const params = new URLSearchParams();
    params.append('url', `https://www.tiktok.com/@user/video/${videoId}`);
    
    const data = await this.makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    return {
      id: videoId,
      platform: 'tiktok',
      url: `https://www.tiktok.com/@${data.author.unique_id}/video/${videoId}`,
      author: data.author.unique_id,
      content: data.desc,
      media: [{
        type: 'video',
        url: data.video.download_addr,
        thumbnail: data.video.cover,
        duration: data.video.duration
      }],
      timestamp: new Date(data.create_time * 1000),
      likes: data.stats.digg_count,
      shares: data.stats.share_count,
      comments: data.stats.comment_count
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

    // TikTok siempre es video
    if (data.video && data.video.downloadAddr) {
      media.push({
        type: 'video',
        url: data.video.downloadAddr,
        thumbnail: data.video.cover,
        duration: data.video.duration
      });
    } else if (data.play) {
      // Fallback for different API response format
      media.push({
        type: 'video',
        url: data.play,
        thumbnail: data.cover,
        duration: data.duration
      });
    }

    return media;
  }
} 