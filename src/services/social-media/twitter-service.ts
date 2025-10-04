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
    // Usamos expansiones para obtener también los tweets referenciados y su media
    const apiUrl = `${this.baseUrl}/status/${tweetId}?expansions=referenced_tweets.id,attachments.media_keys&tweet.fields=attachments,referenced_tweets,created_at,public_metrics,author_id&media.fields=url,type,duration_ms`;
    
    try {
      const data = await this.makeRequest(apiUrl);
      
      // Extraer media del tweet principal
      let allMedia = this.extractMedia(data.tweet);
      let originalPost: SocialMediaPost | undefined;
      
      // Si hay tweets referenciados (respuestas, retweets, etc.) y están incluidos en la respuesta
      if (data.includes?.tweets) {
        for (const referencedTweet of data.includes.tweets) {
          const referencedMedia = this.extractMedia(referencedTweet);
          // Agregar la media del tweet referenciado al array principal
          allMedia = [...allMedia, ...referencedMedia];
          
          // Si este es el tweet original (primera respuesta o tweet padre), crear el objeto original
          if (!originalPost) {
            originalPost = {
              id: referencedTweet.id,
              platform: 'twitter',
              url: referencedTweet.url || `https://twitter.com/i/status/${referencedTweet.id}`,
              author: referencedTweet.author?.name || 'Unknown',
              content: referencedTweet.text,
              media: referencedMedia,
              timestamp: new Date(referencedTweet.date || referencedTweet.created_at),
              likes: referencedTweet.likes,
              shares: referencedTweet.retweets,
              comments: referencedTweet.replies
            };
          }
        }
      }
      
      // Si hay media expandida en includes
      if (data.includes?.media) {
        const expandedMedia = this.extractExpandedMedia(data.includes.media);
        // Combinar con la media ya extraída, evitando duplicados
        expandedMedia.forEach(media => {
          if (!allMedia.some(existing => existing.url === media.url)) {
            allMedia.push(media);
          }
        });
      }
      
      return {
        id: data.tweet.id,
        platform: 'twitter',
        url: data.tweet.url,
        author: data.tweet.author.name,
        content: data.tweet.text,
        media: allMedia,
        timestamp: new Date(data.tweet.date),
        likes: data.tweet.likes,
        shares: data.tweet.retweets,
        comments: data.tweet.replies,
        originalPost
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

  private extractExpandedMedia(mediaArray: any[]): MediaItem[] {
    const media: MediaItem[] = [];

    mediaArray.forEach((item: any) => {
      if (item.type === 'photo') {
        media.push({
          type: 'image',
          url: item.url,
          thumbnail: item.url
        });
      } else if (item.type === 'video') {
        media.push({
          type: 'video',
          url: item.url,
          thumbnail: item.preview_image_url || item.url,
          duration: item.duration_ms ? Math.floor(item.duration_ms / 1000) : undefined
        });
      } else if (item.type === 'animated_gif') {
        media.push({
          type: 'gif',
          url: item.url,
          thumbnail: item.preview_image_url || item.url
        });
      }
    });

    return media;
  }
} 