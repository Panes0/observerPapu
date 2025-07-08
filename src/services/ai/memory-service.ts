import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryService, ChatMemory, MemoryEntry, MemoryFilterOptions } from '../../types/ai';

export class ChatMemoryService implements MemoryService {
  private static instance: ChatMemoryService;
  private cache = new Map<string, ChatMemory>(); // Cambiado a string key para soportar tipo_id
  private readonly memoryDir = '.chat-memory';
  private readonly filterOptions: MemoryFilterOptions = {
    maxEntries: 10,
    maxAgeHours: 24
  };

  // Locks para evitar escrituras concurrentes
  private readonly writeLocks = new Map<string, Promise<void>>(); // Cambiado a string key

  private constructor() {
    this.ensureMemoryDirectory();
  }

  public static getInstance(): ChatMemoryService {
    if (!ChatMemoryService.instance) {
      ChatMemoryService.instance = new ChatMemoryService();
    }
    return ChatMemoryService.instance;
  }

  /**
   * Asegura que el directorio de memoria existe
   */
  private async ensureMemoryDirectory(): Promise<void> {
    try {
      await fs.access(this.memoryDir);
    } catch {
      await fs.mkdir(this.memoryDir, { recursive: true });
      console.log(`📁 Directorio de memoria creado: ${this.memoryDir}`);
    }
  }

  /**
   * Genera una clave única para cache y locks
   */
  private getMemoryKey(memoryId: number, memoryType: 'group' | 'user'): string {
    return `${memoryType}_${memoryId}`;
  }

  /**
   * Obtiene el path del archivo de memoria
   */
  private getMemoryFilePath(memoryId: number, memoryType: 'group' | 'user'): string {
    return path.join(this.memoryDir, `${memoryType}_${memoryId}.json`);
  }

  /**
   * Carga la memoria desde archivo o cache
   */
  private async loadMemory(memoryId: number, memoryType: 'group' | 'user'): Promise<ChatMemory> {
    const memoryKey = this.getMemoryKey(memoryId, memoryType);
    
    // Verificar cache primero
    if (this.cache.has(memoryKey)) {
      return this.cache.get(memoryKey)!;
    }

    const filePath = this.getMemoryFilePath(memoryId, memoryType);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const memory: ChatMemory = JSON.parse(data);
      
      // Validar estructura
      if (!memory.id || !memory.type || !Array.isArray(memory.entries)) {
        throw new Error('Invalid memory file structure');
      }

      // Cargar en cache
      this.cache.set(memoryKey, memory);
      return memory;
    } catch (error) {
      // Si el archivo no existe o está corrupto, crear memoria nueva
      const newMemory: ChatMemory = {
        id: memoryId,
        type: memoryType,
        entries: [],
        lastUpdated: new Date().toISOString()
      };
      
      this.cache.set(memoryKey, newMemory);
      return newMemory;
    }
  }

  /**
   * Guarda la memoria en archivo
   */
  private async saveMemory(memory: ChatMemory): Promise<void> {
    const filePath = this.getMemoryFilePath(memory.id, memory.type);
    const memoryKey = this.getMemoryKey(memory.id, memory.type);
    
    // Actualizar timestamp
    memory.lastUpdated = new Date().toISOString();
    
    // Escribir archivo
    await fs.writeFile(filePath, JSON.stringify(memory, null, 2), 'utf-8');
    
    // Actualizar cache
    this.cache.set(memoryKey, memory);
  }

  /**
   * Filtra entradas según los criterios de tiempo y cantidad
   */
  private filterEntries(entries: MemoryEntry[]): MemoryEntry[] {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (this.filterOptions.maxAgeHours * 60 * 60 * 1000));

    // Filtrar por tiempo (últimas 24 horas)
    const recentEntries = entries.filter(entry => {
      const entryTime = new Date(entry.timestamp);
      return entryTime >= cutoffTime;
    });

    // Ordenar por timestamp (más reciente primero) y tomar las últimas N
    const sortedEntries = recentEntries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, this.filterOptions.maxEntries);

    // Devolver ordenadas cronológicamente (más antigua primero) para contexto
    return sortedEntries.reverse();
  }

  /**
   * Maneja locks para evitar escrituras concurrentes
   */
  private async withLock<T>(memoryId: number, memoryType: 'group' | 'user', operation: () => Promise<T>): Promise<T> {
    const memoryKey = this.getMemoryKey(memoryId, memoryType);
    
    // Esperar a que termine cualquier operación previa
    if (this.writeLocks.has(memoryKey)) {
      await this.writeLocks.get(memoryKey);
    }

    // Crear nuevo lock
    const lockPromise = operation();
    this.writeLocks.set(memoryKey, lockPromise.then(() => {}, () => {}));

    try {
      const result = await lockPromise;
      return result;
    } finally {
      // Limpiar lock cuando termine
      this.writeLocks.delete(memoryKey);
    }
  }

  /**
   * Agrega una nueva entrada de memoria
   */
  public async addEntry(memoryId: number, memoryType: 'group' | 'user', prompt: string, userId: number, username?: string): Promise<void> {
    await this.withLock(memoryId, memoryType, async () => {
      const memory = await this.loadMemory(memoryId, memoryType);
      
      const newEntry: MemoryEntry = {
        timestamp: new Date().toISOString(),
        prompt: prompt.trim(),
        userId,
        username
      };

      memory.entries.push(newEntry);
      
      // Filtrar entradas antes de guardar
      memory.entries = this.filterEntries(memory.entries);
      
      await this.saveMemory(memory);
      
      const context = memoryType === 'group' ? 'grupo' : 'usuario';
      console.log(`💾 Memoria actualizada para ${context} ${memoryId}: ${memory.entries.length} entradas`);
    });
  }

  /**
   * Obtiene el contexto de memoria formateado para la IA
   */
  public async getMemoryContext(memoryId: number, memoryType: 'group' | 'user'): Promise<string> {
    const memory = await this.loadMemory(memoryId, memoryType);
    const filteredEntries = this.filterEntries(memory.entries);

    if (filteredEntries.length === 0) {
      return '';
    }

    // Formatear entradas para contexto
    const contextLines = filteredEntries.map(entry => {
      const username = entry.username ? `@${entry.username}` : `User${entry.userId}`;
      return `${username}: ${entry.prompt}`;
    });

    const contextType = memoryType === 'group' ? 'del grupo' : 'personal';
    const context = `Conversación reciente ${contextType}:\n${contextLines.join('\n')}\n\nResponde considerando este contexto:`;
    
    const contextDesc = memoryType === 'group' ? 'grupo' : 'usuario';
    console.log(`🧠 Contexto generado para ${contextDesc} ${memoryId}: ${filteredEntries.length} entradas`);
    return context;
  }

  /**
   * Limpia la memoria
   */
  public async clearMemory(memoryId: number, memoryType: 'group' | 'user'): Promise<void> {
    await this.withLock(memoryId, memoryType, async () => {
      const filePath = this.getMemoryFilePath(memoryId, memoryType);
      const memoryKey = this.getMemoryKey(memoryId, memoryType);
      
      // Limpiar cache
      this.cache.delete(memoryKey);
      
      // Eliminar archivo
      try {
        await fs.unlink(filePath);
        const context = memoryType === 'group' ? 'grupo' : 'usuario';
        console.log(`🗑️ Memoria limpiada para ${context} ${memoryId}`);
      } catch (error) {
        // El archivo puede no existir, no es un error crítico
        const context = memoryType === 'group' ? 'grupo' : 'usuario';
        console.log(`💡 No había archivo de memoria para ${context} ${memoryId}`);
      }
    });
  }

  /**
   * Obtiene estadísticas de la memoria
   */
  public async getMemoryStats(memoryId: number, memoryType: 'group' | 'user'): Promise<{ totalEntries: number; oldestEntry?: Date }> {
    const memory = await this.loadMemory(memoryId, memoryType);
    const filteredEntries = this.filterEntries(memory.entries);

    const stats = {
      totalEntries: filteredEntries.length,
      oldestEntry: filteredEntries.length > 0 
        ? new Date(filteredEntries[0].timestamp)
        : undefined
    };

    return stats;
  }

  /**
   * Limpia la cache (útil para testing o gestión de memoria)
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache de memoria limpiada');
  }

  /**
   * Obtiene información de debug sobre el estado del servicio
   */
  public getDebugInfo(): { cachedMemories: string[]; totalCacheSize: number } {
    return {
      cachedMemories: Array.from(this.cache.keys()),
      totalCacheSize: this.cache.size
    };
  }
}

// Export singleton instance
export const memoryService = ChatMemoryService.getInstance(); 