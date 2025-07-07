# 📱 Ejemplo de Uso del Bot en Grupo

## 🎯 Escenarios de Uso

### 1. Procesamiento Automático de URLs

**Usuario envía en el grupo:**
```
https://twitter.com/elonmusk/status/1234567890123456789
```

**Bot responde automáticamente:**
```
🐦 TWITTER
👤 Autor: Elon Musk

📝 Contenido:
Este es el contenido del tweet...

❤️ 1,234 | 🔄 567 | 💬 89

🔗 Ver original
```
*+ imagen/video del tweet*

### 2. Comando /fix para URLs Fijas

**Usuario envía:**
```
/fix https://instagram.com/p/ABC123DEF456/
```

**Bot responde:**
```
🔗 URLs fijas:

📷 INSTAGRAM:
https://instafix.io/p/ABC123DEF456/
```

### 3. Comando /help_social

**Usuario envía:**
```
/help_social
```

**Bot responde:**
```
📱 Funcionalidades de Redes Sociales

Este bot puede procesar contenido de las siguientes plataformas:
🐦 Twitter/X - Usando FxTwitter
📷 Instagram - Usando InstaFix  
🎵 TikTok - Usando vxTikTok

Comandos disponibles:
/fix - Obtiene URLs fijas para contenido de redes sociales
/help_social - Muestra esta ayuda

Cómo usar:
1. Envía cualquier URL de Twitter, Instagram o TikTok
2. El bot automáticamente detectará y procesará el contenido
3. Usa /fix seguido de una URL para obtener la URL fija

Ejemplos:
• Envía: https://twitter.com/usuario/status/123456789
• Envía: https://instagram.com/p/ABC123/
• Envía: https://tiktok.com/@usuario/video/123456789

Plataformas soportadas:
🐦 TWITTER
📷 INSTAGRAM
🎵 TIKTOK
```

### 4. Comando /status

**Usuario envía:**
```
/status
```

**Bot responde:**
```
📊 Estado de los Servicios

🐦 TWITTER: ✅ Activo
📷 INSTAGRAM: ✅ Activo
🎵 TIKTOK: ✅ Activo

💡 Envía una URL de redes sociales para probar los servicios.
```

### 5. Comando /test

**Usuario envía:**
```
/test https://tiktok.com/@usuario/video/1234567890123456789
```

**Bot responde:**
```
🔄 Procesando contenido...

🎵 TIKTOK
👤 Autor: usuario

📝 Contenido:
Descripción del video de TikTok...

❤️ 1,000 | 🔄 500 | 💬 100

🔗 Ver original
```
*+ video de TikTok*

## 🔄 Flujo Completo en Grupo

### Escenario: Compartir Contenido de Redes Sociales

1. **Usuario A** comparte un tweet en el grupo
2. **Bot** detecta automáticamente la URL
3. **Bot** muestra "🔄 Procesando contenido..."
4. **Bot** extrae información del tweet
5. **Bot** envía el contenido con:
   - Información del autor
   - Texto del tweet
   - Estadísticas (likes, retweets, comentarios)
   - Imagen/video si existe
   - Enlace al original

### Escenario: Obtener URL Fija

1. **Usuario B** envía: `/fix https://instagram.com/p/ABC123/`
2. **Bot** responde con la URL fija: `https://instafix.io/p/ABC123/`
3. **Usuario B** puede usar la URL fija para acceder sin restricciones

## 📊 Tipos de Respuesta

### Posts con Imagen
```
🐦 TWITTER
👤 Autor: @usuario

📝 Contenido:
Texto del tweet...

❤️ 1,234 | 🔄 567 | 💬 89

🔗 Ver original
```
*+ imagen adjunta*

### Posts con Video
```
🎵 TIKTOK
👤 Autor: @usuario

📝 Contenido:
Descripción del video...

❤️ 5,000 | 🔄 1,000 | 💬 500

🔗 Ver original
```
*+ video adjunto*

### Posts Solo Texto
```
🐦 TWITTER
👤 Autor: @usuario

📝 Contenido:
Este es un tweet que solo contiene texto sin imágenes ni videos...

❤️ 100 | 🔄 50 | 💬 25

🔗 Ver original
```

## ⚠️ Casos de Error

### URL No Soportada
**Usuario envía:**
```
https://youtube.com/watch?v=dQw4w9WgXcQ
```

**Bot responde:**
```
❌ URL no soportada. Solo se aceptan URLs de Twitter, Instagram y TikTok.
```

### Error de Procesamiento
**Usuario envía:**
```
https://twitter.com/usuario/status/123456789
```

**Bot responde:**
```
🐦 Error al procesar TWITTER

❌ No se pudo procesar el contenido
```

### Comando /test sin URL
**Usuario envía:**
```
/test
```

**Bot responde:**
```
❌ Uso: /test <URL>

Ejemplo: /test https://twitter.com/usuario/status/123456789
```

## 🎉 Beneficios en Grupo

1. **Compartir Contenido Fácilmente**: Los usuarios pueden compartir contenido sin preocuparse por restricciones
2. **Información Detallada**: El bot proporciona contexto completo del contenido
3. **Acceso Sin Restricciones**: Las URLs fijas permiten acceso sin bloqueos
4. **Interacción Mejorada**: El contenido se presenta de forma atractiva y organizada
5. **Herramientas Útiles**: Comandos para testing y ayuda

## 🔧 Configuración para Grupo

### Permisos del Bot
- **Enviar Mensajes**: ✅ Requerido
- **Enviar Medios**: ✅ Requerido
- **Enviar Enlaces**: ✅ Requerido
- **Usar HTML**: ✅ Requerido

### Configuración Recomendada
```typescript
// En src/config/social-media-config.ts
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

---

**¡Tu bot está listo para procesar contenido de redes sociales en tu grupo! 🚀** 