export interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'instagram' | 'tiktok';
  url: string;
  author: string;
  content?: string;
  media?: MediaItem[];
  timestamp: Date;
  likes?: number;
  shares?: number;
  comments?: number;
  originalPost?: SocialMediaPost; // For replies, this contains the original post
}

export interface MediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnail?: string;
  duration?: number; // for videos
}

export interface SocialMediaService {
  canHandle(url: string): boolean;
  extractPost(url: string): Promise<SocialMediaPost>;
  getFixedUrl(url: string): string;
}

export interface SocialMediaConfig {
  twitter: {
    enabled: boolean;
    fxTwitterBaseUrl: string;
  };
  instagram: {
    enabled: boolean;
    instaFixBaseUrl: string;
  };
  tiktok: {
    enabled: boolean;
    vxTikTokBaseUrl: string;
    fallbackApis?: string[];
    retryAttempts?: number;
    retryDelay?: number;
  };
  general: {
    autoDeleteOriginalMessage: boolean;
    deleteDelay: number; // milliseconds
  };
}

export type PlatformType = 'twitter' | 'instagram' | 'tiktok'; 