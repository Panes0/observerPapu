/**
 * Tipos para el servicio de búsqueda de imágenes
 */

export interface ImageSearchResult {
  title: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  source: string;
}

export interface ImageSearchResponse {
  query: string;
  results: ImageSearchResult[];
  totalResults: number;
  success: boolean;
  error?: string;
}

export interface ImageSearchOptions {
  maxResults?: number;
  safeSearch?: 'strict' | 'moderate' | 'off';
  region?: string;
  size?: 'small' | 'medium' | 'large' | 'wallpaper';
  color?: string;
  type?: 'photo' | 'clipart' | 'gif' | 'transparent' | 'line';
}

export interface ImageSearchService {
  searchImages(query: string, options?: ImageSearchOptions): Promise<ImageSearchResponse>;
}

export interface FormattedImageResult {
  message: string;
  imageUrl: string;
  thumbnailUrl?: string;
  query: string;
  success: boolean;
} 