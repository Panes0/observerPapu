import { ImageSearchService, ImageSearchOptions, ImageSearchResponse, ImageSearchResult } from '../../types/image-search';

/**
 * Interfaces para la respuesta de DuckDuckGo
 */
interface DuckDuckGoImageResult {
  title?: string;
  image?: string;
  thumbnail?: string;
  width?: string;
  height?: string;
  source?: string;
}

interface DuckDuckGoImageResponse {
  results?: DuckDuckGoImageResult[];
}

/**
 * Servicio de búsqueda de imágenes usando DuckDuckGo
 */
export class DuckDuckGoImageService implements ImageSearchService {
  private readonly baseUrl = 'https://duckduckgo.com';
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Busca imágenes en DuckDuckGo
   */
  async searchImages(query: string, options: ImageSearchOptions = {}): Promise<ImageSearchResponse> {
    try {
      const { maxResults = 20, safeSearch = 'moderate', region = 'us-en' } = options;
      
      // Limpiar y validar la query
      const cleanQuery = this.sanitizeQuery(query);
      if (!cleanQuery) {
        return {
          query,
          results: [],
          totalResults: 0,
          success: false,
          error: 'Query inválida'
        };
      }

      // Primero necesitamos obtener un token de DuckDuckGo
      const token = await this.getToken(cleanQuery);
      if (!token) {
        return {
          query,
          results: [],
          totalResults: 0,
          success: false,
          error: 'No se pudo obtener token de DuckDuckGo'
        };
      }

      // Realizar la búsqueda de imágenes
      const searchResults = await this.performImageSearch(cleanQuery, token, {
        maxResults,
        safeSearch,
        region
      });

      return {
        query,
        results: searchResults.slice(0, maxResults),
        totalResults: searchResults.length,
        success: true
      };

    } catch (error) {
      console.error('Error in DuckDuckGo image search:', error);
      return {
        query,
        results: [],
        totalResults: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene el token necesario para la búsqueda
   */
  private async getToken(query: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `q=${encodeURIComponent(query)}&t=h_&ia=images`
      });

      const html = await response.text();
      
      // Extraer el token del HTML
      const tokenMatch = html.match(/vqd=([\d-]+)/);
      return tokenMatch ? tokenMatch[1] : null;
    } catch (error) {
      console.error('Error getting DuckDuckGo token:', error);
      return null;
    }
  }

  /**
   * Realiza la búsqueda de imágenes con el token
   */
  private async performImageSearch(
    query: string, 
    token: string, 
    options: { maxResults: number; safeSearch: string; region: string }
  ): Promise<ImageSearchResult[]> {
    try {
      const searchUrl = `${this.baseUrl}/i.js`;
      const params = new URLSearchParams({
        l: options.region,
        o: 'json',
        q: query,
        vqd: token,
        f: ',,,',
        p: options.safeSearch === 'strict' ? '1' : '0'
      });

      const response = await fetch(`${searchUrl}?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Referer': 'https://duckduckgo.com/'
        }
      });

      const data = await response.json() as DuckDuckGoImageResponse;
      
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((result: DuckDuckGoImageResult) => ({
        title: result.title || 'Sin título',
        url: result.image || '',
        thumbnailUrl: result.thumbnail || result.image || '',
        width: result.width ? parseInt(result.width) : 0,
        height: result.height ? parseInt(result.height) : 0,
        source: result.source || 'DuckDuckGo'
      })).filter((result: ImageSearchResult) => result.url);

    } catch (error) {
      console.error('Error performing image search:', error);
      return [];
    }
  }

  /**
   * Limpia y valida la query de búsqueda
   */
  private sanitizeQuery(query: string): string {
    return query
      .trim()
      .replace(/[^\w\s\-\u00C0-\u017F]/g, '') // Permitir caracteres especiales y acentos
      .replace(/\s+/g, ' ')
      .substring(0, 100); // Limitar longitud
  }

  /**
   * Obtiene una imagen aleatoria de los resultados
   */
  async getRandomImage(query: string, options: ImageSearchOptions = {}): Promise<ImageSearchResult | null> {
    const response = await this.searchImages(query, { ...options, maxResults: 50 });
    
    if (!response.success || response.results.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * response.results.length);
    return response.results[randomIndex];
  }
} 