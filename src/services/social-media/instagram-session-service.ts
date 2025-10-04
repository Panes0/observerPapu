import { SocialMediaPost, MediaItem } from '../../types/social-media';

interface InstagramSessionConfig {
  sessionId: string;
  dsUserId: string;
  csrfToken?: string;
  userAgent?: string;
}

interface InstagramGraphQLResponse {
  data: {
    xdt_shortcode_media?: {
      id: string;
      shortcode: string;
      display_url: string;
      is_video: boolean;
      video_url?: string;
      video_duration?: number;
      edge_media_to_caption: {
        edges: Array<{
          node: {
            text: string;
          };
        }>;
      };
      owner: {
        username: string;
        id: string;
      };
      edge_media_preview_like: {
        count: number;
      };
      edge_media_to_comment: {
        count: number;
      };
      edge_sidecar_to_children?: {
        edges: Array<{
          node: {
            id: string;
            display_url: string;
            is_video: boolean;
            video_url?: string;
            video_duration?: number;
          };
        }>;
      };
      taken_at_timestamp: number;
    };
  };
  status: string;
}

export class InstagramSessionService {
  private config: InstagramSessionConfig;
  private baseUrl = 'https://www.instagram.com';
  private lastRequestTime = 0;
  private requestDelay = 2000; // 2 seconds between requests

  constructor(config: InstagramSessionConfig) {
    this.config = config;
    
    // Set default user agent if not provided
    if (!this.config.userAgent) {
      this.config.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
  }

  /**
   * Extract Instagram post data using session cookies
   */
  async extractPost(url: string): Promise<SocialMediaPost> {
    const postId = this.extractPostId(url);
    if (!postId) {
      throw new Error('Could not extract post ID from URL');
    }

    // Rate limiting
    await this.respectRateLimit();

    try {
      // Try GraphQL endpoint first
      const data = await this.fetchPostDataGraphQL(postId);
      return this.transformToSocialMediaPost(data, url);
    } catch (error) {
      console.error('❌ Instagram session service failed:', error);
      throw new Error(`Failed to extract Instagram post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if session is still valid
   */
  async validateSession(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/accounts/edit/');
      return response.status === 200;
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return false;
    }
  }

  /**
   * Extract post ID from Instagram URL
   */
  private extractPostId(url: string): string | null {
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

    return null;
  }

  /**
   * Fetch post data using Instagram's GraphQL API
   */
  private async fetchPostDataGraphQL(postId: string): Promise<InstagramGraphQLResponse> {
    const graphqlUrl = `${this.baseUrl}/graphql/query/`;
    
    // Instagram GraphQL query hash for post data (may need to be updated)
    const queryHash = 'b3055c01b4b222b8a47dc12b090e4e64'; // This hash may need to be updated
    const variables = JSON.stringify({
      shortcode: postId,
      child_comment_count: 3,
      fetch_comment_count: 40,
      parent_comment_count: 24,
      has_threaded_comments: false
    });

    const params = new URLSearchParams({
      query_hash: queryHash,
      variables: variables
    });

    const response = await this.makeRequest(`/graphql/query/?${params.toString()}`);
    
    if (!response.data?.xdt_shortcode_media) {
      // Try alternative endpoint if GraphQL fails
      return await this.fetchPostDataAlternative(postId);
    }

    return response as InstagramGraphQLResponse;
  }

  /**
   * Alternative method using Instagram's web interface
   */
  private async fetchPostDataAlternative(postId: string): Promise<InstagramGraphQLResponse> {
    const postUrl = `/p/${postId}/`;
    const response = await this.makeRequest(postUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });

    // Parse HTML response to extract JSON data
    if (typeof response === 'string') {
      const jsonMatch = response.match(/window\._sharedData = ({.*?});/);
      if (jsonMatch) {
        const sharedData = JSON.parse(jsonMatch[1]);
        const postData = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
        
        if (postData) {
          return {
            data: { xdt_shortcode_media: postData },
            status: 'ok'
          };
        }
      }
    }

    throw new Error('Could not extract post data from Instagram response');
  }

  /**
   * Make authenticated request to Instagram
   */
  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'User-Agent': this.config.userAgent,
      'Cookie': `sessionid=${this.config.sessionId}; ds_user_id=${this.config.dsUserId}${this.config.csrfToken ? `; csrftoken=${this.config.csrfToken}` : ''}`,
      'X-Requested-With': 'XMLHttpRequest',
      'X-IG-App-ID': '936619743392459',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.instagram.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      ...options.headers
    };

    if (this.config.csrfToken) {
      headers['X-CSRFToken'] = this.config.csrfToken;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        ...options
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Instagram session expired or invalid');
        }
        if (response.status === 429) {
          throw new Error('Instagram rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Request failed: ${error}`);
    }
  }

  /**
   * Transform Instagram API response to SocialMediaPost format
   */
  private transformToSocialMediaPost(response: InstagramGraphQLResponse, originalUrl: string): SocialMediaPost {
    const post = response.data.xdt_shortcode_media;
    if (!post) {
      throw new Error('No post data found in Instagram response');
    }

    // Extract caption
    const caption = post.edge_media_to_caption?.edges?.[0]?.node?.text || '';

    // Extract media items
    const media = this.extractMediaItems(post);

    return {
      id: post.id,
      platform: 'instagram',
      url: originalUrl,
      author: post.owner.username,
      content: caption,
      media: media,
      timestamp: new Date(post.taken_at_timestamp * 1000),
      likes: post.edge_media_preview_like?.count || 0,
      comments: post.edge_media_to_comment?.count || 0
    };
  }

  /**
   * Extract media items from Instagram post data
   */
  private extractMediaItems(post: any): MediaItem[] {
    const media: MediaItem[] = [];

    try {
      // Handle carousel posts (multiple images/videos)
      if (post.edge_sidecar_to_children?.edges) {
        post.edge_sidecar_to_children.edges.forEach((edge: any) => {
          const node = edge.node;
          if (node.is_video && node.video_url) {
            media.push({
              type: 'video',
              url: node.video_url,
              thumbnail: node.display_url,
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
      } else {
        // Single media post
        if (post.is_video && post.video_url) {
          media.push({
            type: 'video',
            url: post.video_url,
            thumbnail: post.display_url,
            duration: post.video_duration
          });
        } else if (post.display_url) {
          media.push({
            type: 'image',
            url: post.display_url,
            thumbnail: post.display_url
          });
        }
      }
    } catch (error) {
      console.error('❌ Error extracting media from Instagram post:', error);
    }

    return media;
  }

  /**
   * Rate limiting to avoid being blocked
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      console.log(`⏰ Rate limiting: waiting ${waitTime}ms before next Instagram request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Update session configuration
   */
  updateConfig(config: Partial<InstagramSessionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}