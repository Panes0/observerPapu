import { SocialMediaService, SocialMediaPost } from '../../types/social-media';

export abstract class BaseSocialMediaService implements SocialMediaService {
  protected baseUrl: string;
  protected platform: string;
  protected maxRetries: number = 3;
  protected retryDelay: number = 1000; // 1 second

  constructor(baseUrl: string, platform: string) {
    this.baseUrl = baseUrl;
    this.platform = platform;
  }

  abstract canHandle(url: string): boolean;
  abstract extractPost(url: string): Promise<SocialMediaPost>;
  abstract getFixedUrl(url: string): string;

  protected async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (response.status === 403) {
          throw new Error(`Access forbidden (403) - ${this.platform} may be blocking requests`);
        }
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`Rate limited (429), waiting ${delay}ms before retry ${attempt}/${this.maxRetries}`);
          await this.sleep(delay);
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt}/${this.maxRetries} failed for ${this.platform}:`, error);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    console.error(`All ${this.maxRetries} attempts failed for ${this.platform}`);
    throw lastError!;
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected extractIdFromUrl(url: string): string {
    // Implementación base que puede ser sobrescrita por servicios específicos
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1].split('?')[0];
  }

  protected isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
} 