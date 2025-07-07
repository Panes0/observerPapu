import { PlatformType } from '../types/social-media';

/**
 * Extrae URLs de un texto
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Detecta la plataforma de una URL
 */
export function detectPlatform(url: string): PlatformType | null {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();

  if (hostname.includes('twitter.com') || hostname.includes('x.com') || hostname.includes('t.co')) {
    return 'twitter';
  }

  if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
    return 'instagram';
  }

  if (hostname.includes('tiktok.com') || hostname.includes('vm.tiktok.com') || hostname.includes('vt.tiktok.com')) {
    return 'tiktok';
  }

  return null;
}

/**
 * Valida si una URL es válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpia una URL removiendo parámetros innecesarios
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remover parámetros de tracking comunes
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Obtiene el dominio de una URL
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Verifica si una URL es de redes sociales
 */
export function isSocialMediaUrl(url: string): boolean {
  return detectPlatform(url) !== null;
} 