# 📦 Sistema de Caché de Videos

El bot incluye un sistema inteligente de caché de videos que evita reprocessar URLs que ya han sido descargadas anteriormente, ahorrando tiempo y recursos.

## 🎯 ¿Cómo Funciona?

### 1. **Verificación de Caché**
- Cuando llega una URL procesable, el bot primero verifica si ya existe en el caché
- Si existe, hace **forward** del mensaje original (ocultando el autor)
- Si no existe, procesa normalmente

### 2. **Almacenamiento Automático**
- Cada video procesado exitosamente se guarda automáticamente en el caché
- Se almacena la relación: `URL → Mensaje de Telegram`
- Incluye metadata como plataforma, título, autor, duración

### 3. **Forward Inteligente**
- Los mensajes desde caché se reenvían **sin mostrar el autor original**
- Se edita el caption para indicar que viene del caché
- Mantiene la calidad original del video

## 📊 Estructura del Caché

### Archivo de Almacenamiento
```
.video-cache/
└── video-cache.json
```

### Estructura de Datos
```json
{
  "version": "1.0",
  "lastUpdated": 1672531200000,
  "totalEntries": 150,
  "entries": {
    "abc123def456": {
      "url": "https://youtube.com/watch?v=...",
      "cleanUrl": "https://youtube.com/watch?v=...",
      "messageId": 12345,
      "chatId": -1001234567890,
      "platform": "youtube",
      "urlHash": "abc123def456",
      "timestamp": 1672531200000,
      "title": "Video Title",
      "author": "Channel Name",
      "duration": 180,
      "fileSize": 5242880
    }
  }
}
```

## 🔧 Comandos de Gestión

### `/video_cache_stats`
Muestra estadísticas detalladas del caché:
- Número total de videos cacheados
- Cache hits/misses y ratio de aciertos
- Estadísticas por plataforma
- Tamaño total estimado
- Fechas de entradas más antigua y reciente

### `/video_cache_cleanup`
Limpia entradas antiguas del caché:
- Elimina videos más antiguos que 30 días
- Mantiene máximo 500 entradas
- Verifica que los mensajes aún existan en Telegram

### `/video_cache_clear`
Limpia completamente el caché (**solo owner**):
- Elimina todas las entradas
- Resetea estadísticas
- Acción irreversible

## 🎨 Beneficios

### ⚡ **Velocidad**
- **Respuesta instantánea** para URLs ya procesadas
- No hay tiempo de descarga ni procesamiento
- Forward directo desde Telegram

### 💾 **Ahorro de Recursos**
- No re-descarga videos existentes
- Reduce uso de ancho de banda
- Menos carga en los servidores de yt-dlp

### 🔄 **Reutilización Inteligente**
- Un video descargado beneficia a **todos los chats**
- Perfecto para URLs populares que se comparten múltiples veces
- Eficiente en grupos activos

### 🔒 **Privacidad**
- El forward **oculta el autor original**
- No se revelan nombres de usuarios anteriores
- Mantiene la confidencialidad

## 📱 Plataformas Soportadas

El caché funciona con **todas las plataformas** detectadas por el bot:
- YouTube, Vimeo, Dailymotion
- Twitter/X, Instagram, TikTok
- Facebook, Reddit, Twitch
- Kick, SoundCloud, Bandcamp
- **Y 1000+ sitios más** soportados por yt-dlp

## 🛠️ Configuración Técnica

### Generación de Hash
```typescript
// Cada URL se convierte en un hash único
const urlHash = crypto
  .createHash('sha256')
  .update(cleanUrl(url).toLowerCase())
  .digest('hex')
  .substring(0, 16);
```

### Limpieza Automática
- **Edad máxima**: 30 días por defecto
- **Límite de entradas**: 500 por defecto  
- **Verificación de existencia**: Los mensajes eliminados se quitan del caché
- **Validación de mensajes**: Se verifica que los forwards aún funcionen

### Estructura de Archivos
```
src/
├── services/
│   └── video-cache/
│       ├── index.ts
│       └── video-cache-service.ts
└── types/
    └── video-cache.ts
```

## 📈 Estadísticas de Ejemplo

```
📦 Estadísticas del Caché de Videos

📊 General:
• Videos cacheados: 247
• Cache hits: 89
• Cache misses: 158
• Ratio de aciertos: 36.0%
• Tamaño total: 1.2 GB

🎥 Por plataforma:
• youtube: 125
• tiktok: 67
• twitter: 34
• instagram: 21

📅 Fechas:
• Más antiguo: 15/12/2024
• Más reciente: 25/01/2025
```

## 🚀 Flujo Completo

### Primer Procesamiento
1. Usuario envía: `https://youtube.com/watch?v=abc123`
2. Bot verifica caché → **MISS**
3. Bot descarga y procesa video → **30 segundos**
4. Bot envía video y guarda en caché
5. **Resultado**: Video procesado y cacheado

### Segundo Procesamiento (mismo video)
1. Usuario envía: `https://youtube.com/watch?v=abc123`
2. Bot verifica caché → **HIT** ✅
3. Bot hace forward del mensaje → **1 segundo**
4. **Resultado**: Video instantáneo desde caché

## 🔧 Mantenimiento

### Limpieza Recomendada
```bash
# Semanal - limpiar entradas antiguas
/video_cache_cleanup

# Mensual - revisar estadísticas  
/video_cache_stats

# Según necesidad - limpieza completa (solo owner)
/video_cache_clear
```

### Monitoreo
- **Ratio óptimo de hits**: >30% indica buen funcionamiento
- **Crecimiento del caché**: Revisar periódicamente el tamaño
- **Plataformas populares**: Identificar contenido más solicitado

## 💡 Notas Importantes

### Limitaciones
- El caché **no funciona entre servidores diferentes**
- Los mensajes deben existir en Telegram para el forward
- El hash se basa en la URL limpia (sin parámetros de tracking)

### Compatibilidad
- Compatible con **todos los tipos de mensajes** (video, audio, imagen)
- Funciona con archivos de cualquier tamaño soportado por Telegram
- Mantiene la calidad original del contenido

### Seguridad
- No almacena contenido real, solo referencias a mensajes
- Hashes únicos previenen colisiones
- Limpieza automática previene acumulación excesiva

---

## 🎉 Resultado

¡El sistema de caché transforma la experiencia del usuario!

**Antes**: ⏳ Esperar 30-60 segundos por cada video  
**Después**: ⚡ Videos instantáneos desde caché

¡Especialmente útil para grupos activos donde se comparten videos populares frecuentemente! 