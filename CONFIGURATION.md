# ⚙️ Guía de Configuración del Bot

Esta guía te ayudará a configurar correctamente el bot de Telegram.

## 🔐 Configuración Inicial

### 1. Obtener Token del Bot

1. Ve a [@BotFather](https://t.me/botfather) en Telegram
2. Envía `/newbot` para crear un nuevo bot
3. Sigue las instrucciones y guarda el token que te proporcione

### 2. Configurar el Bot

1. **Copiar archivo de ejemplo**:
   ```bash
   cp config/bot.config.example.ts config/bot.config.ts
   ```

2. **Editar configuración**:
   Abre `config/bot.config.ts` y reemplaza `YOUR_BOT_TOKEN_HERE` con tu token real.

## 📋 Opciones de Configuración

### Configuración Básica

```typescript
export const botConfig = {
  // Token de tu bot (obligatorio)
  token: "TU_TOKEN_AQUI",
  
  // Opciones del bot
  options: {
    // Funcionalidades principales
    enableSocialMedia: true,    // Procesamiento de redes sociales
    enableScreamMode: true,     // Comandos /scream y /whisper
    enableMenu: true,           // Comando /menu
    
    // Comportamiento
    silentReplies: true,        // Notificaciones silenciosas
    logMessages: true,          // Log de mensajes en consola
  }
};
```

### Descripción de Opciones

| Opción | Tipo | Descripción | Valor por defecto |
|--------|------|-------------|-------------------|
| `token` | `string` | Token del bot de Telegram | **Obligatorio** |
| `enableSocialMedia` | `boolean` | Habilita procesamiento de URLs de redes sociales | `true` |
| `enableScreamMode` | `boolean` | Habilita comandos `/scream` y `/whisper` | `true` |
| `enableMenu` | `boolean` | Habilita comando `/menu` | `true` |
| `silentReplies` | `boolean` | Usa notificaciones silenciosas para respuestas | `true` |
| `logMessages` | `boolean` | Loggea mensajes entrantes en consola | `true` |

## 🔧 Configuraciones Avanzadas

### Configuración de Redes Sociales

Para configurar las APIs de redes sociales, edita `src/config/social-media-config.ts`:

```typescript
export const socialMediaConfig: SocialMediaConfig = {
  twitter: {
    enabled: true,
    fxTwitterBaseUrl: 'https://api.fxtwitter.com'
  },
  instagram: {
    enabled: true,
    instaFixBaseUrl: 'https://instafix.io'
  },
  tiktok: {
    enabled: true,
    vxTikTokBaseUrl: 'https://vxtiktok.com'
  }
};
```

### Variables de Entorno (Opcional)

Si prefieres usar variables de entorno, puedes modificar `config/bot.config.ts`:

```typescript
export const botConfig = {
  token: process.env.BOT_TOKEN || "TU_TOKEN_AQUI",
  options: {
    enableSocialMedia: process.env.ENABLE_SOCIAL_MEDIA !== 'false',
    enableScreamMode: process.env.ENABLE_SCREAM_MODE !== 'false',
    enableMenu: process.env.ENABLE_MENU !== 'false',
    silentReplies: process.env.SILENT_REPLIES !== 'false',
    logMessages: process.env.LOG_MESSAGES !== 'false',
  }
};
```

Y crear un archivo `.env`:
```env
BOT_TOKEN=TU_TOKEN_AQUI
ENABLE_SOCIAL_MEDIA=true
ENABLE_SCREAM_MODE=true
ENABLE_MENU=true
SILENT_REPLIES=true
LOG_MESSAGES=true
```

## 🚨 Seguridad

### Archivos Sensibles

Los siguientes archivos contienen información sensible y **NO** deben ser subidos a Git:

- `config/bot.config.ts` - Contiene tu token del bot
- `.env` - Variables de entorno (si las usas)

Estos archivos ya están incluidos en `.gitignore`.

### Buenas Prácticas

1. **Nunca** subas tu token a repositorios públicos
2. **Usa** diferentes tokens para desarrollo y producción
3. **Revisa** regularmente los permisos de tu bot
4. **Mantén** actualizadas las dependencias

## 🧪 Verificación de Configuración

### Test de Configuración

Para verificar que tu configuración es correcta:

```bash
# Verificar que el archivo de configuración existe
ls config/bot.config.ts

# Verificar que el token no es el de ejemplo
grep -v "YOUR_BOT_TOKEN_HERE" config/bot.config.ts
```

### Comandos de Verificación

Una vez que el bot esté ejecutándose:

- `/status` - Verifica el estado de los servicios
- `/help_social` - Muestra ayuda sobre funcionalidades
- Envía una URL de redes sociales para probar el procesamiento

## 🔄 Actualización de Configuración

### Cambios en Tiempo de Ejecución

Algunas opciones requieren reiniciar el bot:

- `token` - Requiere reinicio
- `enableSocialMedia` - Requiere reinicio
- `enableScreamMode` - Requiere reinicio
- `enableMenu` - Requiere reinicio

Otras opciones se aplican inmediatamente:

- `silentReplies` - Se aplica inmediatamente
- `logMessages` - Se aplica inmediatamente

## 📞 Soporte

Si tienes problemas con la configuración:

1. Verifica que el token sea correcto
2. Asegúrate de que el bot esté habilitado en @BotFather
3. Revisa los logs del bot para errores
4. Verifica que todas las dependencias estén instaladas

## 🔗 Enlaces Útiles

- [@BotFather](https://t.me/botfather) - Crear y configurar bots
- [GrammY Documentation](https://grammy.dev/) - Documentación del framework
- [Telegram Bot API](https://core.telegram.org/bots/api) - API oficial 