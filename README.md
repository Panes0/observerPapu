# 🤖 Papu Panes Bot - Integración de Redes Sociales

Bot de Telegram que procesa automáticamente contenido de redes sociales usando FxTwitter, InstaFix y vxTikTok.

## 🚀 Funcionalidades

### ✅ Funcionalidades Originales (Mantenidas)
- Comando `/scream` - Convierte mensajes a mayúsculas
- Comando `/whisper` - Desactiva el modo scream
- Comando `/menu` - Menú interactivo con botones
- Forwarding automático de mensajes

### 🆕 Nuevas Funcionalidades de Redes Sociales
- **Detección Automática**: Detecta URLs de Twitter, Instagram y TikTok
- **Procesamiento de Contenido**: Extrae información y medios de posts
- **Envío Multimedia**: Envía imágenes, videos y GIFs con información
- **URLs Fijas**: Genera enlaces sin restricciones
- **Comandos Útiles**: Herramientas para testing y ayuda

## 📱 Comandos Disponibles

### Comandos Originales
- `/scream` - Activa modo scream (mensajes en mayúsculas)
- `/whisper` - Desactiva modo scream
- `/menu` - Muestra menú interactivo

### Comandos de Redes Sociales
- `/fix` - Obtiene URLs fijas para contenido de redes sociales
- `/help_social` - Muestra ayuda sobre funcionalidades de redes sociales
- `/status` - Muestra el estado de los servicios
- `/test <URL>` - Prueba una URL específica

## 🔧 Instalación y Uso

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar el Bot
```bash
# Copiar archivo de configuración de ejemplo
cp config/bot.config.example.ts config/bot.config.ts

# Editar config/bot.config.ts y agregar tu token del bot
```

### 3. Probar la Integración
```bash
npm test
```

### 4. Ejecutar el Bot
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

## 🎯 Cómo Usar

### Procesamiento Automático
Simplemente envía una URL de redes sociales al bot y automáticamente:
1. Detectará la plataforma
2. Extraerá el contenido
3. Enviará el post con información detallada

### Ejemplos de URLs Soportadas

#### Twitter/X
```
https://twitter.com/usuario/status/1234567890123456789
https://x.com/usuario/status/1234567890123456789
https://t.co/ABC123
```

#### Instagram
```
https://instagram.com/p/ABC123DEF456/
https://instagram.com/reel/ABC123DEF456/
https://instagr.am/p/ABC123/
```

#### TikTok
```
https://tiktok.com/@usuario/video/1234567890123456789
https://vm.tiktok.com/ABC123/
https://vt.tiktok.com/ABC123/
```

### Comandos de Prueba

```bash
# Probar detección de URLs
/test https://twitter.com/elonmusk/status/1234567890123456789

# Ver estado de servicios
/status

# Obtener ayuda
/help_social
```

## 🏗️ Arquitectura

El bot utiliza una arquitectura modular:

```
papuPanes_bot.ts (Bot principal)
├── src/services/social-media/ (Servicios de plataformas)
├── src/utils/ (Utilidades)
├── src/bot/handlers/ (Manejadores del bot)
├── src/bot/commands/ (Comandos)
└── src/config/ (Configuración)
```

### Componentes Principales

- **SocialMediaManager**: Coordina todos los servicios
- **SocialMediaHandler**: Maneja mensajes del bot
- **URL Utils**: Detecta y procesa URLs
- **Media Utils**: Formatea contenido para Telegram

## 🔌 APIs Integradas

- **FxTwitter**: `https://api.fxtwitter.com`
- **InstaFix**: `https://instafix.io`
- **vxTikTok**: `https://vxtiktok.com`

## 📊 Flujo de Procesamiento

1. **Recepción**: Bot recibe mensaje con URL
2. **Detección**: Identifica si es URL de redes sociales
3. **Extracción**: Obtiene información via API
4. **Formateo**: Prepara contenido para Telegram
5. **Envío**: Envía multimedia con información

## 🛠️ Configuración

### Configuración del Bot

1. **Copiar archivo de configuración**:
   ```bash
   cp config/bot.config.example.ts config/bot.config.ts
   ```

2. **Editar configuración**:
   Edita `config/bot.config.ts` y reemplaza `YOUR_BOT_TOKEN_HERE` con tu token real del bot.

   ```typescript
   export const botConfig = {
     token: "TU_TOKEN_REAL_AQUI",
     options: {
       enableSocialMedia: true,    // Habilitar funcionalidades de redes sociales
       enableScreamMode: true,     // Habilitar comandos /scream y /whisper
       enableMenu: true,           // Habilitar comando /menu
       silentReplies: true,        // Usar notificaciones silenciosas
       logMessages: true,          // Loggear mensajes en consola
     }
   };
   ```

### Habilitar/Deshabilitar Plataformas
Edita `src/config/social-media-config.ts`:

```typescript
export const socialMediaConfig: SocialMediaConfig = {
  twitter: {
    enabled: true,  // Cambiar a false para deshabilitar
    fxTwitterBaseUrl: 'https://api.fxtwitter.com'
  },
  // ...
};
```

### URLs de APIs Personalizadas
Puedes cambiar las URLs base de las APIs:

```typescript
twitter: {
  enabled: true,
  fxTwitterBaseUrl: 'https://tu-instancia-fxtwitter.com'
}
```

### Opciones de Configuración

| Opción | Descripción | Valor por defecto |
|--------|-------------|-------------------|
| `enableSocialMedia` | Habilita procesamiento de URLs de redes sociales | `true` |
| `enableScreamMode` | Habilita comandos `/scream` y `/whisper` | `true` |
| `enableMenu` | Habilita comando `/menu` | `true` |
| `silentReplies` | Usa notificaciones silenciosas para respuestas | `true` |
| `logMessages` | Loggea mensajes entrantes en consola | `true` |

## 🧪 Testing

### Script de Pruebas
```bash
npm test
```

Este script prueba:
- Detección de URLs
- Extracción de URLs de texto
- Estado de servicios
- Generación de URLs fijas

### Pruebas Manuales
1. Envía una URL de Twitter al bot
2. Verifica que procese correctamente
3. Usa `/status` para verificar servicios
4. Usa `/test <URL>` para pruebas específicas

## 🔍 Logs y Debugging

El bot incluye logs detallados:

```
🔍 URL de redes sociales detectada, procesando...
🔄 Procesando contenido...
✅ Contenido procesado exitosamente
```

### Errores Comunes
- **API no disponible**: Verificar URLs de APIs
- **Rate limiting**: Esperar antes de nuevas peticiones
- **URLs inválidas**: Verificar formato de URLs

## 📝 Notas Importantes

- Las APIs de terceros pueden tener límites de rate
- Algunas URLs pueden requerir autenticación
- El contenido multimedia puede tener restricciones de tamaño
- Siempre manejar errores de red y timeouts

## 🚀 Próximas Mejoras

- [ ] Soporte para YouTube
- [ ] Caché de contenido
- [ ] Estadísticas de uso
- [ ] Configuración por chat
- [ ] Filtros de contenido

## 🤝 Contribución

Para agregar nuevas funcionalidades:

1. Mantener la arquitectura modular
2. Seguir los patrones establecidos
3. Agregar tipos TypeScript apropiados
4. Incluir manejo de errores
5. Documentar cambios

---

**¡Tu bot ahora puede procesar contenido de redes sociales automáticamente! 🎉** 