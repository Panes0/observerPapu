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

/**
 * Tipos para el sistema de memoria de chat
 */

export interface MemoryEntry {
  timestamp: string; // ISO 8601 format
  prompt: string;
  userId: number;
  username?: string; // Optional for better context
}

export interface ChatMemory {
  id: number; // groupId o userId
  type: 'group' | 'user'; // tipo de memoria
  entries: MemoryEntry[];
  lastUpdated: string; // ISO 8601 format
}

export interface MemoryFilterOptions {
  maxEntries: number; // Máximo número de entradas a mantener
  maxAgeHours: number; // Máximo tiempo en horas para mantener entradas
}

export interface MemoryService {
  addEntry(memoryId: number, memoryType: 'group' | 'user', prompt: string, userId: number, username?: string): Promise<void>;
  getMemoryContext(memoryId: number, memoryType: 'group' | 'user'): Promise<string>;
  clearMemory(memoryId: number, memoryType: 'group' | 'user'): Promise<void>;
  getMemoryStats(memoryId: number, memoryType: 'group' | 'user'): Promise<{ totalEntries: number; oldestEntry?: Date }>;
} 