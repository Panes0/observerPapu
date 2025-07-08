/**
 * Tipos para el servicio de IA usando Together AI
 */

export interface AIResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
  success: boolean;
  error?: string;
}

export interface AIRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
}

export interface AIServiceConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export interface AIService {
  generateResponse(request: AIRequest): Promise<AIResponse>;
  isConfigured(): boolean;
}

export interface FormattedAIResult {
  message: string;
  prompt: string;
  model: string;
  tokensUsed: number;
  success: boolean;
} 