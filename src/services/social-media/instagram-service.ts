import { BaseSocialMediaService } from './base-service';
import { SocialMediaPost, MediaItem } from '../../types/social-media';

export class InstagramService extends BaseSocialMediaService {
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
    const apiUrl = `${this.baseUrl}/api/post/${postId}`;
    
    try {
      const data = await this.makeRequest(apiUrl);
      
      return {
        id: data.id,
        platform: 'instagram',
        url: data.url,
        author: data.owner.username,
        content: data.caption?.text,
        media: this.extractMedia(data),
        timestamp: new Date(data.taken_at_timestamp * 1000),
        likes: data.likes_count,
        comments: data.comments_count
      };
    } catch (error) {
      throw new Error(`Failed to extract Instagram post: ${error}`);
    }
  }

  getFixedUrl(url: string): string {
    const postId = this.extractPostId(url);
    return `${this.baseUrl}/p/${postId}`;
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

    if (data.is_video) {
      media.push({
        type: 'video',
        url: data.video_url,
        thumbnail: data.display_url,
        duration: data.video_duration
      });
    } else {
      // Para posts con múltiples imágenes
      if (data.edge_sidecar_to_children?.edges) {
        data.edge_sidecar_to_children.edges.forEach((edge: any) => {
          const node = edge.node;
          if (node.is_video) {
            media.push({
              type: 'video',
              url: node.video_url,
              thumbnail: node.display_url,
              duration: node.video_duration
            });
          } else {
            media.push({
              type: 'image',
              url: node.display_url,
              thumbnail: node.display_url
            });
          }
        });
      } else {
        // Post con una sola imagen
        media.push({
          type: 'image',
          url: data.display_url,
          thumbnail: data.display_url
        });
      }
    }

    return media;
  }
} 