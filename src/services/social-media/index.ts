import { SocialMediaService, SocialMediaPost, PlatformType } from '../../types/social-media';
import { TwitterService } from './twitter-service';
import { InstagramService } from './instagram-service';
import { TikTokService } from './tiktok-service';
import { BotConfigOptions } from '../../types/config';

export class SocialMediaManager {
  private services: Map<PlatformType, SocialMediaService> = new Map();
  private config?: BotConfigOptions;

  constructor(config?: BotConfigOptions) {
    this.config = config;
    this.initializeServices();
  }

  private initializeServices(): void {
    this.services.set('twitter', new TwitterService());
    this.services.set('instagram', new InstagramService('https://instafix.io', this.config));
    this.services.set('tiktok', new TikTokService());
  }

  /**
   * Detecta automáticamente qué servicio usar basado en la URL
   */
  getServiceForUrl(url: string): SocialMediaService | null {
    for (const service of this.services.values()) {
      if (service.canHandle(url)) {
        return service;
      }
    }
    return null;
  }

  /**
   * Obtiene un servicio específico por plataforma
   */
  getService(platform: PlatformType): SocialMediaService | null {
    return this.services.get(platform) || null;
  }

  /**
   * Extrae información de un post de redes sociales
   */
  async extractPost(url: string): Promise<SocialMediaPost> {
    const service = this.getServiceForUrl(url);
    if (!service) {
      throw new Error(`No service found to handle URL: ${url}`);
    }
    return await service.extractPost(url);
  }

  /**
   * Obtiene la URL fija para una plataforma específica
   */
  getFixedUrl(url: string): string {
    const service = this.getServiceForUrl(url);
    if (!service) {
      throw new Error(`No service found to handle URL: ${url}`);
    }
    return service.getFixedUrl(url);
  }

  /**
   * Verifica si una URL es soportada por algún servicio
   */
  isSupportedUrl(url: string): boolean {
    return this.getServiceForUrl(url) !== null;
  }

  /**
   * Obtiene todas las plataformas soportadas
   */
  getSupportedPlatforms(): PlatformType[] {
    return Array.from(this.services.keys());
  }
}

// Exportar servicios individuales para uso directo si es necesario
export { TwitterService } from './twitter-service';
export { InstagramService } from './instagram-service';
export { InstagramSessionService } from './instagram-session-service';
export { TikTokService } from './tiktok-service';
export { BaseSocialMediaService } from './base-service'; 