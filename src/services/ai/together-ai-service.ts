import { AIService, AIRequest, AIResponse, AIServiceConfig } from '../../types/ai';

interface TogetherAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export class TogetherAIService implements AIService {
  private config: AIServiceConfig | null = null;

  constructor(config?: AIServiceConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Configura el servicio con la configuración proporcionada
   */
  configure(config: AIServiceConfig): void {
    this.config = config;
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return this.config !== null && 
           this.config.apiKey !== '' &&
           this.config.baseUrl !== '';
  }

  /**
   * Genera una respuesta usando Together AI
   */
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    if (!this.isConfigured() || !this.config) {
      return {
        content: '',
        model: '',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        finishReason: 'error',
        success: false,
        error: 'Servicio de IA no configurado correctamente'
      };
    }

    try {
      const requestBody = {
        model: request.model || this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: this.config.systemPrompt || 'Eres un asistente helpful que responde de forma breve y concisa. Tus respuestas deben ser de 1-2 oraciones máximo. Ve directo al punto.'
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature ?? this.config.temperature,
        top_p: request.topP ?? 1,
        stop: request.stop
      };

      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          content: '',
          model: requestBody.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          finishReason: 'error',
          success: false,
          error: `HTTP ${response.status}: ${errorData}`
        };
      }

      const data = await response.json() as TogetherAIResponse;

      if (!data.choices || data.choices.length === 0) {
        return {
          content: '',
          model: requestBody.model,
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          finishReason: 'error',
          success: false,
          error: 'No se recibió respuesta válida de la IA'
        };
      }

      const choice = data.choices[0];
      const content = choice.message?.content || '';

      return {
        content,
        model: data.model || requestBody.model,
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        finishReason: choice.finish_reason || 'stop',
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en TogetherAI:', errorMessage);

      return {
        content: '',
        model: request.model || this.config.defaultModel,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        finishReason: 'error',
        success: false,
        error: `Error de conexión: ${errorMessage}`
      };
    }
  }

  /**
   * Valida la configuración del servicio
   */
  validateConfig(config: AIServiceConfig): boolean {
    return config.apiKey.trim() !== '' &&
           config.baseUrl.trim() !== '' &&
           config.defaultModel.trim() !== '' &&
           config.maxTokens > 0 &&
           config.temperature >= 0 && config.temperature <= 2;
  }
} 