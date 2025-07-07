# Integración de Redes Sociales - Telegram Bot

Esta documentación describe la arquitectura modular implementada para integrar FxTwitter, InstaFix y vxTikTok en el bot de Telegram.

## 🏗️ Arquitectura Modular

### Estructura de Archivos

```
src/
├── services/
│   └── social-media/
│       ├── index.ts              # Manager principal y fábrica de servicios
│       ├── base-service.ts       # Clase base abstracta
│       ├── twitter-service.ts    # Servicio específico para Twitter
│       ├── instagram-service.ts  # Servicio específico para Instagram
│       └── tiktok-service.ts     # Servicio específico para TikTok
├── types/
│   └── social-media.ts           # Tipos TypeScript
├── utils/
│   ├── url-utils.ts              # Utilidades para manejo de URLs
│   └── media-utils.ts            # Utilidades para formateo de medios
├── bot/
│   ├── handlers/
│   │   └── social-media-handler.ts # Manejador principal del bot
│   └── commands/
│       └── social-media-commands.ts # Comandos específicos
└── config/
    └── social-media-config.ts    # Configuración de servicios
```

## 🔧 Componentes Principales

### 1. Tipos y Interfaces (`types/social-media.ts`)

Define las interfaces principales:
- `SocialMediaPost`: Estructura de datos para posts
- `SocialMediaService`: Contrato para servicios de plataformas
- `MediaItem`: Estructura para medios (imágenes, videos, GIFs)

### 2. Servicios Base (`services/social-media/`)

#### BaseSocialMediaService
- Clase abstracta que implementa funcionalidad común
- Manejo de errores y validación de URLs
- Métodos protegidos para requests HTTP

#### Servicios Específicos
- **TwitterService**: Integración con FxTwitter API
- **InstagramService**: Integración con InstaFix API  
- **TikTokService**: Integración con vxTikTok API

### 3. SocialMediaManager (`services/social-media/index.ts`)

Fábrica y coordinador principal:
- Detecta automáticamente qué servicio usar
- Proporciona interfaz unificada para todas las plataformas
- Manejo de errores centralizado

### 4. Utilidades

#### URL Utils (`utils/url-utils.ts`)
- Extracción de URLs de texto
- Detección de plataformas
- Limpieza de URLs (remover tracking)

#### Media Utils (`utils/media-utils.ts`)
- Formateo de posts para Telegram
- Manejo de emojis por plataforma
- Formateo de estadísticas

### 5. Handlers del Bot (`bot/handlers/social-media-handler.ts`)

- Procesamiento automático de URLs en mensajes
- Envío de contenido multimedia
- Manejo de errores con fallbacks

### 6. Comandos (`bot/commands/social-media-commands.ts`)

Comandos disponibles:
- `/fix` - Obtiene URLs fijas
- `/help_social` - Ayuda sobre funcionalidades
- `/status` - Estado de servicios
- `/test` - Prueba URLs específicas

## 🚀 Uso

### Integración en el Bot Principal

```typescript
import { SocialMediaHandler } from "./handlers/social-media-handler";
import { registerSocialMediaCommands } from "./commands/social-media-commands";
import { isSocialMediaUrl } from "../utils/url-utils";

// Registrar comandos
registerSocialMediaCommands(bot);

// En el handler de mensajes
bot.on("message", async (ctx) => {
  if (ctx.message.text && isSocialMediaUrl(ctx.message.text)) {
    await SocialMediaHandler.handleMessage(ctx);
    return;
  }
  // ... resto del procesamiento
});
```

### Uso Directo de Servicios

```typescript
import { socialMediaManager } from './services/social-media';

// Extraer información de un post
const post = await socialMediaManager.extractPost(url);

// Obtener URL fija
const fixedUrl = socialMediaManager.getFixedUrl(url);

// Verificar si una URL es soportada
const isSupported = socialMediaManager.isSupportedUrl(url);
```

## 🔌 APIs Integradas

### FxTwitter
- **Base URL**: `https://api.fxtwitter.com`
- **Endpoint**: `/status/{tweet_id}`
- **Soporte**: Twitter/X, t.co links

### InstaFix
- **Base URL**: `https://instafix.io`
- **Endpoint**: `/api/post/{post_id}`
- **Soporte**: Instagram posts, reels

### vxTikTok
- **Base URL**: `https://vxtiktok.com`
- **Endpoint**: `/api/video/{video_id}`
- **Soporte**: TikTok videos

## 🎯 Características

### ✅ Ventajas de la Arquitectura

1. **Modularidad**: Cada plataforma es un servicio independiente
2. **Extensibilidad**: Fácil agregar nuevas plataformas
3. **Mantenibilidad**: Código organizado y separado por responsabilidades
4. **Reutilización**: Servicios pueden usarse independientemente
5. **Configurabilidad**: Fácil habilitar/deshabilitar plataformas
6. **Manejo de Errores**: Sistema robusto de fallbacks

### 🔄 Flujo de Procesamiento

1. **Detección**: El bot detecta URLs en mensajes
2. **Identificación**: Determina la plataforma automáticamente
3. **Extracción**: Obtiene información del post via API
4. **Formateo**: Prepara el contenido para Telegram
5. **Envío**: Envía contenido multimedia con información

### 📱 Funcionalidades del Bot

- **Procesamiento Automático**: Detecta y procesa URLs automáticamente
- **Contenido Multimedia**: Envía imágenes, videos y GIFs
- **Información Detallada**: Muestra autor, contenido, estadísticas
- **URLs Fijas**: Genera enlaces sin restricciones
- **Comandos Útiles**: Herramientas para testing y ayuda

## 🛠️ Configuración

### Habilitar/Deshabilitar Plataformas

```typescript
// En src/config/social-media-config.ts
export const socialMediaConfig: SocialMediaConfig = {
  twitter: {
    enabled: true,  // Cambiar a false para deshabilitar
    fxTwitterBaseUrl: 'https://api.fxtwitter.com'
  },
  // ...
};
```

### URLs de APIs Personalizadas

Puedes cambiar las URLs base de las APIs modificando la configuración:

```typescript
twitter: {
  enabled: true,
  fxTwitterBaseUrl: 'https://tu-instancia-fxtwitter.com'
}
```

## 🧪 Testing

### Comandos de Prueba

```bash
# Probar una URL específica
/test https://twitter.com/usuario/status/123456789

# Ver estado de servicios
/status

# Obtener ayuda
/help_social
```

### URLs de Ejemplo

- **Twitter**: `https://twitter.com/usuario/status/123456789`
- **Instagram**: `https://instagram.com/p/ABC123/`
- **TikTok**: `https://tiktok.com/@usuario/video/123456789`

## 🔧 Extensión

### Agregar Nueva Plataforma

1. Crear nuevo servicio en `services/social-media/`
2. Extender `BaseSocialMediaService`
3. Implementar métodos requeridos
4. Agregar a `SocialMediaManager`
5. Actualizar tipos y utilidades

### Ejemplo: Agregar YouTube

```typescript
// services/social-media/youtube-service.ts
export class YouTubeService extends BaseSocialMediaService {
  canHandle(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }
  
  async extractPost(url: string): Promise<SocialMediaPost> {
    // Implementación específica para YouTube
  }
  
  getFixedUrl(url: string): string {
    // URL fija para YouTube
  }
}
```

## 📝 Notas Importantes

- Las APIs de terceros pueden tener límites de rate
- Algunas URLs pueden requerir autenticación
- El contenido multimedia puede tener restricciones de tamaño
- Siempre manejar errores de red y timeouts

## 🤝 Contribución

Para agregar nuevas funcionalidades:

1. Mantener la arquitectura modular
2. Seguir los patrones establecidos
3. Agregar tipos TypeScript apropiados
4. Incluir manejo de errores
5. Documentar cambios 