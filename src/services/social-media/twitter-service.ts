import { BaseSocialMediaService } from './base-service';
import { SocialMediaPost, MediaItem } from '../../types/social-media';

export class TwitterService extends BaseSocialMediaService {
  constructor(baseUrl: string = 'https://api.fxtwitter.com') {
    super(baseUrl, 'twitter');
  }

  canHandle(url: string): boolean {
    if (!this.isValidUrl(url)) return false;
    
    const urlObj = new URL(url);
    return urlObj.hostname.includes('twitter.com') || 
           urlObj.hostname.includes('x.com') ||
           urlObj.hostname.includes('t.co');
  }

  async extractPost(url: string): Promise<SocialMediaPost> {
    const tweetId = this.extractTweetId(url);
    const apiUrl = `${this.baseUrl}/status/${tweetId}`;
    
    try {
      const data = await this.makeRequest(apiUrl);
      
      return {
        id: data.tweet.id,
        platform: 'twitter',
        url: data.tweet.url,
        author: data.tweet.author.name,
        content: data.tweet.text,
        media: this.extractMedia(data.tweet),
        timestamp: new Date(data.tweet.date),
        likes: data.tweet.likes,
        shares: data.tweet.retweets,
        comments: data.tweet.replies
      };
    } catch (error) {
      throw new Error(`Failed to extract Twitter post: ${error}`);
    }
  }

  getFixedUrl(url: string): string {
    const tweetId = this.extractTweetId(url);
    return `${this.baseUrl}/status/${tweetId}`;
  }

  private extractTweetId(url: string): string {
    // Extraer ID del tweet de diferentes formatos de URL
    const patterns = [
      /twitter\.com\/\w+\/status\/(\d+)/,
      /x\.com\/\w+\/status\/(\d+)/,
      /t\.co\/\w+/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || this.extractIdFromUrl(url);
      }
    }

    return this.extractIdFromUrl(url);
  }

  private extractMedia(tweet: any): MediaItem[] {
    const media: MediaItem[] = [];

    if (tweet.media?.photos) {
      tweet.media.photos.forEach((photo: any) => {
        media.push({
          type: 'image',
          url: photo.url,
          thumbnail: photo.url
        });
      });
    }

    if (tweet.media?.videos) {
      tweet.media.videos.forEach((video: any) => {
        media.push({
          type: 'video',
          url: video.url,
          thumbnail: video.thumbnail_url,
          duration: video.duration
        });
      });
    }

    if (tweet.media?.gifs) {
      tweet.media.gifs.forEach((gif: any) => {
        media.push({
          type: 'gif',
          url: gif.url,
          thumbnail: gif.url
        });
      });
    }

    return media;
  }
} 