import { AIResponse, FormattedAIResult } from '../types/ai';

/**
 * Formatea una respuesta exitosa de IA para Telegram
 */
export function formatAIResult(response: AIResponse, prompt: string): FormattedAIResult {
  if (!response.success || !response.content) {
    return formatAIError(prompt, response.error || 'Error desconocido');
  }

  // Limitar la longitud de la respuesta para Telegram (optimizado para respuestas cortas)
  const maxContentLength = 1000; // Reducido para respuestas breves
  let content = response.content.trim();
  
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength) + '...';
  }

  // Formato más simple para respuestas cortas recreativas
  // const message = `🤖 <b>${content}</b>\n\n` +
  //                `💬 <i>${prompt}</i>\n` +
  //                `📊 ${response.totalTokens} tokens`;
	const message = `<b>${content}</b>\n\n` +
									`📊 ${response.totalTokens} tokens`;

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
  return `🤖 <b>Comando /ia - IA Rápida</b>\n\n` +
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
         `• Powered by Together AI\n\n` +
         `<b>💡 Tip:</b> ¡Perfecto para preguntas rápidas en el chat!`;
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