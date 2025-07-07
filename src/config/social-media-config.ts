import { SocialMediaConfig } from '../types/social-media';

export const socialMediaConfig: SocialMediaConfig = {
  twitter: {
    enabled: true,
    fxTwitterBaseUrl: 'https://api.fxtwitter.com'
  },
  instagram: {
    enabled: true,
    instaFixBaseUrl: 'https://instafix.io'
  },
  tiktok: {
    enabled: true,
    vxTikTokBaseUrl: 'https://vxtiktok.com',
    fallbackApis: [
      'https://vxtiktok.com',
      'https://tikwm.com',
      'https://snapinsta.app'
    ],
    retryAttempts: 3,
    retryDelay: 1000
  },
  general: {
    autoDeleteOriginalMessage: true, // Enable/disable auto-delete
    deleteDelay: 3000 // Delete after 3 seconds
  }
};

/**
 * Obtiene la configuración de una plataforma específica
 */
export function getPlatformConfig(platform: 'twitter' | 'instagram' | 'tiktok') {
  return socialMediaConfig[platform];
}

/**
 * Verifica si una plataforma está habilitada
 */
export function isPlatformEnabled(platform: 'twitter' | 'instagram' | 'tiktok'): boolean {
  return socialMediaConfig[platform].enabled;
}

/**
 * Obtiene todas las plataformas habilitadas
 */
export function getEnabledPlatforms(): Array<'twitter' | 'instagram' | 'tiktok'> {
  return Object.entries(socialMediaConfig)
    .filter(([_, config]) => config.enabled)
    .map(([platform, _]) => platform as 'twitter' | 'instagram' | 'tiktok');
}

/**
 * Obtiene la configuración general
 */
export function getGeneralConfig() {
  return socialMediaConfig.general;
}

/**
 * Verifica si el auto-borrado está habilitado
 */
export function isAutoDeleteEnabled(): boolean {
  return socialMediaConfig.general.autoDeleteOriginalMessage;
}

/**
 * Obtiene el delay para borrar mensajes
 */
export function getDeleteDelay(): number {
  return socialMediaConfig.general.deleteDelay;
} 