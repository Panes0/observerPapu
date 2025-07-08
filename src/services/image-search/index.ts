import { DuckDuckGoImageService } from './duckduckgo-image-service';

/**
 * Instancia única del servicio de búsqueda de imágenes
 */
export const imageSearchService = new DuckDuckGoImageService();

/**
 * Exportar tipos
 */
export * from '../../types/image-search';

/**
 * Exportar servicio
 */
export { DuckDuckGoImageService }; 