import { AIResponse, FormattedAIResult } from '../types/ai';

/**
 * Calcula el estimado de mililitros de agua consumidos basado en tokens
 * Estimación: ~1 mL por token (basado en consumo energético y refrigeración de centros de datos)
 */
function calculateWaterConsumption(tokens: number): string {
  const mlPerToken = 1; // 1ml por token
  const totalMl = tokens * mlPerToken;
  
  if (totalMl < 1) {
    return "~1 mL";
  } else if (totalMl >= 1000) {
    // Si son 1000 mL o más, mostrar en litros
    const liters = totalMl / 1000;
    return `~${liters.toFixed(2)} L`;
  } else {
    return `~${totalMl} mL`;
  }
}

/**
 * Formatea una respuesta exitosa de IA para Telegram
 */
export function formatAIResult(response: AIResponse, prompt: string, showWaterConsumption: boolean = true): FormattedAIResult {
  if (!response.success || !response.content) {
    return formatAIError(prompt, response.error || 'Error desconocido');
  }

  // Limitar la longitud de la respuesta para Telegram (optimizado para respuestas cortas)
  const maxContentLength = 1000; // Reducido para respuestas breves
  let content = response.content.trim();
  
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength) + '...';
  }

  // Decidir qué mostrar: agua o tokens
  const statsInfo = showWaterConsumption 
    ? `💧 ${calculateWaterConsumption(response.totalTokens)}`
    : `📊 ${response.totalTokens} tokens`;

  // Formato más simple para respuestas cortas recreativas
  // const message = `🤖 <b>${content}</b>\n\n` +
  //                `💬 <i>${prompt}</i>\n` +
  //                `📊 ${response.totalTokens} tokens`;
	const message = `<b>${content}</b>\n\n` +
									`${statsInfo}`;

  return {
    message,
    prompt,
    model: response.model,
    tokensUsed: response.totalTokens,
    success: true
  };
}

/**
 * Formatea un error de IA para Telegram
 */
export function formatAIError(prompt: string, error: string): FormattedAIResult {
  const message = `❌ <b>Error en IA</b>\n\n` +
                 `💭 <b>Prompt:</b> <i>${prompt}</i>\n\n` +
                 `🚫 <b>Error:</b> ${error}\n\n` +
                 `💡 <b>Sugerencias:</b>\n` +
                 `• Verifica la configuración de la API\n` +
                 `• Intenta con un prompt más corto\n` +
                 `• Contacta al administrador si persiste`;

  return {
    message,
    prompt,
    model: 'N/A',
    tokensUsed: 0,
    success: false
  };
}

/**
 * Formatea mensaje cuando el servicio no está configurado
 */
export function formatAINotConfigured(): FormattedAIResult {
  const message = `⚙️ <b>Servicio de IA no configurado</b>\n\n` +
                 `🔧 El servicio de Together AI no está configurado correctamente.\n\n` +
                 `💡 <b>Para configurar:</b>\n` +
                 `• Agrega tu API key de Together AI en la configuración\n` +
                 `• Contacta al administrador del bot\n\n` +
                 `📚 <b>Más información:</b> https://together.ai/`;

  return {
    message,
    prompt: '',
    model: 'N/A',
    tokensUsed: 0,
    success: false
  };
}

/**
 * Obtiene el mensaje de ayuda para el comando /ia
 */
export function getAIHelp(): string {
  return `🤖 <b>Comando /ia - IA Rápida con Memoria</b>\n\n` +
         `<b>Uso:</b>\n` +
         `<code>/ia [tu pregunta]</code>\n\n` +
         `<b>✨ Optimizado para respuestas súper cortas y recreativas</b>\n\n` +
         `<b>Ejemplos:</b>\n` +
         `• <code>/ia ¿Qué es JavaScript?</code>\n` +
         `• <code>/ia ¿Por qué el cielo es azul?</code>\n` +
         `• <code>/ia ¿Cómo funciona internet?</code>\n` +
         `• <code>/ia ¿Qué es la gravedad?</code>\n\n` +
         `<b>Características:</b>\n` +
         `• Respuestas de 1-2 oraciones máximo\n` +
         `• Explicaciones súper simplificadas\n` +
         `• Perfecto para chat recreativo\n` +
         `• 🧠 Memoria inteligente (últimas 10 prompts/24h)\n` +
         `• 👥 Memoria grupal + 👤 memoria personal\n` +
         `• Powered by Together AI\n\n` +
         `<b>Comandos relacionados:</b>\n` +
         `• <code>/memory_stats</code> - Ver memoria actual\n` +
         `• <code>/memory_clear</code> - Limpiar memoria\n` +
         `• <code>/memory_help</code> - Ayuda sobre memoria\n\n` +
         `<b>💡 Tip:</b> ¡El bot recuerda conversaciones recientes contigo!`;
}

/**
 * Valida si un prompt es válido
 */
export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'El prompt no puede estar vacío' };
  }

  if (prompt.trim().length < 3) {
    return { valid: false, error: 'El prompt debe tener al menos 3 caracteres' };
  }

  if (prompt.length > 2000) {
    return { valid: false, error: 'El prompt es demasiado largo (máximo 2000 caracteres)' };
  }

  return { valid: true };
}

/**
 * Limpia y formatea un prompt antes de enviarlo a la IA
 */
export function sanitizePrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
    .replace(/[\r\n]+/g, ' '); // Reemplazar saltos de línea con espacios
}

/**
 * ========================================
 * UTILIDADES PARA MEMORIA DE CHAT
 * ========================================
 */

/**
 * Determina si un chat es un grupo
 */
export function isGroupChat(chatType: string): boolean {
  return chatType === 'group' || chatType === 'supergroup';
}

/**
 * Determina si un chat es privado
 */
export function isPrivateChat(chatType: string): boolean {
  return chatType === 'private';
}

/**
 * Obtiene un identificador seguro para memoria (grupo o usuario)
 */
export function getMemoryId(chatId: number, chatType: string, userId?: number): number | null {
  if (isGroupChat(chatType)) {
    return chatId; // En grupos, usar el chatId
  } else if (isPrivateChat(chatType) && userId) {
    return userId; // En chats privados, usar el userId
  }
  return null;
}

/**
 * Obtiene el tipo de memoria basado en el tipo de chat
 */
export function getMemoryType(chatType: string): 'group' | 'user' | null {
  if (isGroupChat(chatType)) {
    return 'group';
  } else if (isPrivateChat(chatType)) {
    return 'user';
  }
  return null;
}

/**
 * Formatea una respuesta de IA con contexto de memoria
 */
export function formatAIResultWithMemory(
  response: AIResponse, 
  prompt: string, 
  hasMemoryContext: boolean,
  showWaterConsumption: boolean = true
): FormattedAIResult {
  const baseResult = formatAIResult(response, prompt, showWaterConsumption);
  
  if (!baseResult.success) {
    return baseResult;
  }

  // Si se usó contexto de memoria, agregar indicador sutil
  if (hasMemoryContext) {
    // Agregar emoji de memoria de forma discreta
    const memoryIndicator = '🧠';
    baseResult.message = baseResult.message.replace(
      showWaterConsumption ? '💧' : '📊',
      `${memoryIndicator} ${showWaterConsumption ? '💧' : '📊'}`
    );
  }

  return baseResult;
}

/**
 * Valida si se debe usar memoria para un chat
 */
export function shouldUseMemory(chatId: number, chatType: string, userId?: number): boolean {
  // Usar memoria tanto en grupos como en chats privados
  if (isGroupChat(chatType)) {
    return true; // Memoria en grupos
  } else if (isPrivateChat(chatType) && userId) {
    return true; // Memoria en chats privados
  }

  // En el futuro se podrían agregar más condiciones:
  // - Configuración por usuario/grupo
  // - Límites de rate
  // - Blacklist de usuarios/grupos
  
  return false;
}

/**
 * Crea un prompt con contexto de memoria
 */
export function createPromptWithContext(originalPrompt: string, memoryContext: string): string {
  if (!memoryContext.trim()) {
    return originalPrompt;
  }

  // Combinar contexto de memoria con el prompt actual
  return `A continuación tenés las últimas prompts como contexto: ${memoryContext}\n\n Esta es la prompt actual: ${originalPrompt}`;
}

/**
 * Obtiene estadísticas de memoria formateadas para mostrar
 */
export function formatMemoryStats(stats: { totalEntries: number; oldestEntry?: Date }, chatType: string): string {
  if (stats.totalEntries === 0) {
    const context = isGroupChat(chatType) ? 'del grupo' : 'personal';
    return `📊 Sin memoria ${context}`;
  }

  const context = isGroupChat(chatType) ? 'del grupo' : 'personal';
  let message = `📊 <b>Memoria ${context}:</b> ${stats.totalEntries} entradas`;
  
  if (stats.oldestEntry) {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - stats.oldestEntry.getTime()) / (1000 * 60 * 60));
    message += `\n⏰ Entrada más antigua: hace ${diffHours}h`;
  }

  return message;
}

/**
 * Obtiene ayuda específica para memoria
 */
export function getMemoryHelp(): string {
  return `🧠 <b>Sistema de Memoria Inteligente</b>\n\n` +
         `El bot recuerda las últimas conversaciones para dar respuestas más contextuales.\n\n` +
         `<b>Características:</b>\n` +
         `• 👥 Funciona en grupos (memoria compartida)\n` +
         `• 👤 Funciona en chats privados (memoria personal)\n` +
         `• Recuerda las últimas 10 prompts\n` +
         `• Solo prompts de las últimas 24 horas\n` +
         `• Indicador 🧠 cuando usa memoria\n\n` +
         `<b>Comandos:</b>\n` +
         `• <code>/memory_stats</code> - Ver estadísticas\n` +
         `• <code>/memory_clear</code> - Limpiar memoria\n\n` +
         `<b>Privacidad:</b>\n` +
         `• Memoria de grupos es compartida entre miembros\n` +
         `• Memoria privada es solo tuya\n` +
         `• Se auto-limpia después de 24 horas\n\n` +
         `💡 <b>La memoria mejora respuestas contextuales!</b>`;
} 