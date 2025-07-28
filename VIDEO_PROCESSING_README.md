# 📹 Video Processing - Optimización para Telegram

Este módulo optimiza automáticamente los videos descargados para garantizar que se visualicen correctamente en Telegram.

## 🎯 Problema Solucionado

Los videos descargados con yt-dlp a menudo tienen los **metadatos posicionados al final del archivo** (moov atom), lo que causa que:

- ❌ Telegram no pueda generar previsualizaciones
- ❌ Los videos no se reproduzcan inline
- ❌ No se muestren miniaturas correctamente
- ❌ La experiencia de usuario sea pobre

## ✅ Solución Implementada

El sistema utiliza **fluent-ffmpeg** para:

1. **Mover metadatos al principio** (faststart) - **SOLUCIONA EL PROBLEMA PRINCIPAL**
2. **Optimizar resolución** para Telegram (máximo 720p)
3. **Comprimir videos** grandes cuando sea necesario
4. **Mantener compatibilidad** con todos los dispositivos

## 🔧 Configuración

### Instalación de Dependencias

```bash
npm install fluent-ffmpeg @types/fluent-ffmpeg
```

### Configuración en `bot.config.ts`

```typescript
videoProcessing: {
  enabled: true,                     // Habilitar optimización
  faststart: true,                   // ⭐ CLAVE: Mover metadatos al principio
  reencodeVideos: false,             // Solo recodificar cuando sea necesario
  maxResolution: {                   
    width: 1280,                     // Máximo 1280px de ancho
    height: 720                      // Máximo 720px de alto
  },
  compressionLevel: 28,              // CRF 28 = buena calidad/tamaño
  maxFileSize: 50 * 1024 * 1024,    // 50MB máximo
  maxDuration: 300,                  // 5 minutos máximo
  skipOptimizationForSmallFiles: true, // Omitir archivos < 5MB
  showProcessingProgress: true,      // Mostrar progreso
}
```

## 🚀 Funcionamiento

### Flujo de Procesamiento

1. **Descarga** → Video se descarga con yt-dlp
2. **Verificación** → Se verifica si necesita optimización
3. **Procesamiento** → ffmpeg optimiza el video:
   ```bash
   ffmpeg -i input.mp4 -movflags +faststart -c:v libx264 -crf 28 output.mp4
   ```
4. **Envío** → Video optimizado se envía a Telegram
5. **Limpieza** → Archivos temporales se eliminan

### Detección Inteligente

El sistema **automáticamente detecta** si un video necesita optimización:

- ✅ **Procesa:** Videos > 5MB sin faststart
- ✅ **Procesa:** Videos con resolución > 720p  
- ✅ **Procesa:** Videos con codec incompatible
- ⏭️ **Omite:** Videos ya optimizados
- ⏭️ **Omite:** Videos pequeños (< 5MB) si está configurado

## 📊 Beneficios

### Para el Usuario
- ✅ **Previsualizaciones instantáneas** en Telegram
- ✅ **Reproducción inline** sin problemas
- ✅ **Miniaturas correctas** en chats
- ✅ **Carga más rápida** de videos

### Para el Bot
- 📉 **Archivos más pequeños** (reducción promedio 15-30%)
- ⚡ **Envío más rápido** a Telegram
- 🔄 **Mejor compatibilidad** con todos los dispositivos
- 💾 **Uso eficiente** del ancho de banda

## 🛠️ Opciones Avanzadas

### Configuraciones por Casos de Uso

#### Calidad Máxima (Archivos más grandes)
```typescript
videoProcessing: {
  compressionLevel: 18,              // Mayor calidad
  reencodeVideos: false,             // Solo faststart
  skipOptimizationForSmallFiles: true
}
```

#### Compresión Agresiva (Archivos más pequeños)
```typescript
videoProcessing: {
  compressionLevel: 35,              // Mayor compresión
  maxResolution: { width: 854, height: 480 }, // 480p
  reencodeVideos: true               // Forzar recodificación
}
```

#### Solo Faststart (Más rápido)
```typescript
videoProcessing: {
  faststart: true,
  reencodeVideos: false,             // Solo mover metadatos
  skipOptimizationForSmallFiles: true
}
```

## 📈 Métricas y Logging

### Logs del Sistema
```
📹 Starting video optimization: ffmpeg -i input.mp4 -movflags +faststart...
📹 Processing video: 45%
✅ Video optimization completed
📹 Video optimized: 25.4MB → 18.7MB (26.4% reduction)
💾 Cache SAVED for https://example.com/video.mp4 (fallback)
🗑️ Cleaned up optimized video: video_optimized.mp4
```

### Información en Telegram
```
🎵 TIKTOK
👤 Autor: @usuario

📝 Título:
Video increíble de TikTok

⏱️ 0:45 | 📦 18.7MB | 👁️ 1,234,567

📹 Optimizado para Telegram (26.4% reducción)

🔗 Ver original
```

## 🔧 Troubleshooting

### Problemas Comunes

#### ffmpeg no encontrado
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Descargar desde https://ffmpeg.org/download.html
```

#### Videos siguen sin previsualizaciones
- ✅ Verificar que `faststart: true`
- ✅ Verificar que ffmpeg esté funcionando
- ✅ Revisar logs de procesamiento
- ✅ Probar con `reencodeVideos: true`

#### Procesamiento muy lento
- ⚡ Reducir `compressionLevel` (ej: 35)
- ⚡ Habilitar `skipOptimizationForSmallFiles`
- ⚡ Reducir `maxResolution`

#### Archivos muy grandes
- 📦 Aumentar `compressionLevel` (ej: 32)
- 📦 Reducir `maxResolution` a 480p
- 📦 Reducir `maxDuration`

### Debug Mode

Para debugging detallado:

```typescript
videoProcessing: {
  enabled: true,
  showProcessingProgress: true,      // Mostrar progreso completo
  // ... otras opciones
}
```

## 🎮 Comandos de Prueba

Puedes probar la funcionalidad con estos ejemplos:

```
# Video de YouTube (automáticamente se optimiza)
https://youtube.com/watch?v=dQw4w9WgXcQ

# Video de TikTok (faststart aplicado)
https://tiktok.com/@user/video/123456789

# Video de Instagram (optimización completa)
https://instagram.com/reel/ABC123DEF456/
```

## 📝 Notas Técnicas

### Parámetros ffmpeg Utilizados

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \           # Codec H.264 (compatible)
  -crf 28 \                # Calidad constante
  -preset medium \         # Velocidad/calidad balanceada
  -profile:v high \        # Perfil H.264 alto
  -level 4.0 \             # Nivel de compatibilidad
  -pix_fmt yuv420p \       # Formato de píxeles compatible
  -movflags +faststart \   # ⭐ CLAVE: Metadatos al principio
  -c:a aac \               # Codec AAC para audio
  -b:a 128k \              # Bitrate de audio 128kbps
  -f mp4 \                 # Formato MP4
  output.mp4
```

### Formatos Soportados

**Entrada:** Cualquier formato soportado por yt-dlp
- ✅ MP4, WebM, AVI, MOV, MKV, FLV, 3GP
- ✅ Streams de video (HLS, DASH)
- ✅ Videos de redes sociales

**Salida:** MP4 optimizado para Telegram
- ✅ H.264 + AAC
- ✅ Metadatos al principio
- ✅ Máximo 720p
- ✅ Formato compatible universalmente

## 🤝 Contribución

Para mejorar el procesamiento de videos:

1. **Optimización de algoritmos** de detección
2. **Nuevos presets** para diferentes casos de uso
3. **Soporte para más formatos** de salida
4. **Mejoras en performance** del procesamiento

El módulo está diseñado para ser **extensible** y **configurable** según las necesidades específicas de cada implementación. 