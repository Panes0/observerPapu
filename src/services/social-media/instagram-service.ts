import { BaseSocialMediaService } from './base-service';
import { SocialMediaPost, MediaItem } from '../../types/social-media';

export class InstagramService extends BaseSocialMediaService {
  private fallbackApis: string[] = [
    'https://instafix.io',
    'https://snapinsta.app',
    'https://igram.world'
  ];

  constructor(baseUrl: string = 'https://instafix.io') {
    super(baseUrl, 'instagram');
  }

  canHandle(url: string): boolean {
    if (!this.isValidUrl(url)) return false;
    
    const urlObj = new URL(url);
    return urlObj.hostname.includes('instagram.com') || 
           urlObj.hostname.includes('instagr.am');
  }

  async extractPost(url: string): Promise<SocialMediaPost> {
    const postId = this.extractPostId(url);
    
    // Try multiple APIs in sequence
    for (const apiBaseUrl of this.fallbackApis) {
      try {
        console.log(`🔄 Trying Instagram API: ${apiBaseUrl}`);
        const data = await this.tryExtractFromApi(apiBaseUrl, postId, url);
        if (data) {
          return data;
        }
      } catch (error) {
        console.error(`❌ Failed with ${apiBaseUrl}:`, error);
        continue; // Try next API
      }
    }
    
    throw new Error('All Instagram APIs failed to extract post data');
  }

  private async tryExtractFromApi(apiBaseUrl: string, postId: string, originalUrl: string): Promise<SocialMediaPost | null> {
    const apiUrl = `${apiBaseUrl}/api/post/${postId}`;
    
    try {
      const data = await this.makeRequest(apiUrl);
      
      // Log the response structure for debugging (only for first API)
      if (apiBaseUrl === this.fallbackApis[0]) {
        console.log('Instagram API response structure:', JSON.stringify(data, null, 2));
      }
      
      // Validate required fields
      if (!data) {
        throw new Error('No data received from Instagram API');
      }
      
      // Try different possible structures for owner information
      let author = 'unknown';
      if (data.owner?.username) {
        author = data.owner.username;
      } else if (data.user?.username) {
        author = data.user.username;
      } else if (data.author?.username) {
        author = data.author.username;
      } else if (data.username) {
        author = data.username;
      } else {
        console.warn('⚠️ No username found in Instagram response, using fallback');
      }
      
      // Try different possible structures for caption
      let content = '';
      if (data.caption?.text) {
        content = data.caption.text;
      } else if (data.caption) {
        content = typeof data.caption === 'string' ? data.caption : JSON.stringify(data.caption);
      } else if (data.text) {
        content = data.text;
      } else if (data.description) {
        content = data.description;
      }
      
      return {
        id: data.id || postId,
        platform: 'instagram',
        url: data.url || originalUrl,
        author: author,
        content: content,
        media: this.extractMedia(data),
        timestamp: data.taken_at_timestamp ? new Date(data.taken_at_timestamp * 1000) : new Date(),
        likes: data.likes_count || data.likes || 0,
        comments: data.comments_count || data.comments || 0
      };
    } catch (error) {
      console.error(`Instagram API error with ${apiBaseUrl}:`, error);
      return null; // Return null to try next API
    }
  }

  getFixedUrl(url: string): string {
    const postId = this.extractPostId(url);
    return `${this.fallbackApis[0]}/p/${postId}`;
  }

  private extractPostId(url: string): string {
    // Extraer ID del post de Instagram
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagr\.am\/p\/([A-Za-z0-9_-]+)/,
      /instagr\.am\/reel\/([A-Za-z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return this.extractIdFromUrl(url);
  }

  private extractMedia(data: any): MediaItem[] {
    const media: MediaItem[] = [];

    try {
      // Handle video posts
      if (data.is_video || data.media_type === 'VIDEO') {
        const videoUrl = data.video_url || data.video || data.media_url;
        if (videoUrl) {
          media.push({
            type: 'video',
            url: videoUrl,
            thumbnail: data.display_url || data.thumbnail_url || data.media_url,
            duration: data.video_duration
          });
        }
      } else {
        // Handle carousel posts (multiple images/videos)
        if (data.edge_sidecar_to_children?.edges) {
          data.edge_sidecar_to_children.edges.forEach((edge: any) => {
            const node = edge.node;
            if (node.is_video && node.video_url) {
              media.push({
                type: 'video',
                url: node.video_url,
                thumbnail: node.display_url || node.thumbnail_url,
                duration: node.video_duration
              });
            } else if (node.display_url) {
              media.push({
                type: 'image',
                url: node.display_url,
                thumbnail: node.display_url
              });
            }
          });
        } else if (data.media_url || data.display_url) {
          // Single image post
          const imageUrl = data.media_url || data.display_url;
          media.push({
            type: 'image',
            url: imageUrl,
            thumbnail: imageUrl
          });
        }
      }
    } catch (error) {
      console.error('Error extracting media from Instagram data:', error);
    }

    return media;
  }
} 