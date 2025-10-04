import { Context } from 'grammy';
import { botConfig } from '../../config/bot.config';

/**
 * Genera el texto de atribución del usuario que solicitó el contenido
 */
export function getUserAttribution(ctx: Context): string {
  const config = botConfig.options.userAttribution;
  
  if (!config.enabled) {
    return '';
  }
  
  const user = ctx.from;
  if (!user) {
    return '';
  }
  
  let userName = '';
  
  // Priorizar username si está habilitado y disponible
  if (config.showUsername && user.username) {
    userName = `@${user.username}`;
  }
  // Fallback a first name si está habilitado
  else if (config.showFirstName && user.first_name) {
    userName = user.first_name;
  }
  // Fallback final al ID si no hay nada más
  else {
    userName = `Usuario ${user.id}`;
  }
  
  return `${config.emoji} <i>${userName}</i>`;
}

/**
 * Agrega la atribución del usuario a un mensaje existente
 * Solo muestra la atribución si el mensaje original será eliminado
 */
export function addUserAttribution(message: string, ctx: Context): string {
  // Don't show user attribution if the original message won't be deleted
  // (because the original message already shows who sent the URL)
  if (!botConfig.options.messageManagement?.autoDeleteOriginalMessage) {
    return message;
  }
  
  const attribution = getUserAttribution(ctx);
  
  if (!attribution) {
    return message;
  }
  
  const config = botConfig.options.userAttribution;
  
  if (config.position === 'top') {
    return `${attribution}\n\n${message}`;
  } else {
    return `${message}\n\n${attribution}`;
  }
}

/**
 * Formatea el nombre del usuario para mostrar
 */
export function formatUserName(user: any, showUsername: boolean = true, showFirstName: boolean = true): string {
  if (showUsername && user.username) {
    return `@${user.username}`;
  }
  
  if (showFirstName && user.first_name) {
    return user.first_name;
  }
  
  return `Usuario ${user.id}`;
} 