import { TogetherAIService } from './together-ai-service';
import { AIServiceConfig } from '../../types/ai';

/**
 * Configuración por defecto para Together AI
 */
const defaultConfig: AIServiceConfig = {
  apiKey: '', // Se debe configurar en bot.config.ts
  baseUrl: 'https://api.together.xyz',
  defaultModel: 'meta-llama/Llama-2-7b-chat-hf',
  maxTokens: 150, // Reducido para respuestas más cortas
  temperature: 0.7
};

/**
 * Instancia única del servicio de IA
 * Se configurará automáticamente desde bot.config.ts
 */
export const aiService = new TogetherAIService();

/**
 * Función para configurar el servicio de IA
 */
export function configureAIService(config: Partial<AIServiceConfig>): void {
  const fullConfig = { ...defaultConfig, ...config };
  aiService.configure(fullConfig);
}

/**
 * Exportar tipos
 */
export * from '../../types/ai';

/**
 * Exportar servicio
 */
export { TogetherAIService }; 