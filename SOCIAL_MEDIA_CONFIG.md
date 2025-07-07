# Configuración de Redes Sociales

## Opciones de Display

El bot permite configurar qué elementos mostrar en los mensajes de redes sociales. Puedes personalizar la apariencia de los posts según tus preferencias modificando el archivo de configuración.

### Opciones Disponibles

- **showPlatform**: Mostrar el nombre de la plataforma (Twitter, Instagram, TikTok)
- **showAuthor**: Mostrar el nombre del autor del post
- **showContent**: Mostrar el contenido/texto del post
- **showStats**: Mostrar estadísticas (likes, retweets, comentarios)
- **showOriginalLink**: Mostrar el enlace "Ver original"

### Configuración

Modifica estas opciones en `config/bot.config.ts`:

```typescript
socialMediaDisplay: {
  showPlatform: true,      // Mostrar plataforma
  showAuthor: true,        // Mostrar autor
  showContent: true,       // Mostrar contenido
  showStats: true,         // Mostrar estadísticas
  showOriginalLink: true,  // Mostrar enlace original
},
```

**Nota**: Después de cambiar la configuración, necesitas reiniciar el bot para que los cambios surtan efecto.

### Ejemplos de Configuración

#### Configuración Mínima (solo contenido)
```typescript
socialMediaDisplay: {
  showPlatform: false,
  showAuthor: false,
  showContent: true,
  showStats: false,
  showOriginalLink: false,
},
```

#### Configuración Completa (todo visible)
```typescript
socialMediaDisplay: {
  showPlatform: true,
  showAuthor: true,
  showContent: true,
  showStats: true,
  showOriginalLink: true,
},
```

#### Solo Información Básica
```typescript
socialMediaDisplay: {
  showPlatform: true,
  showAuthor: true,
  showContent: true,
  showStats: false,
  showOriginalLink: true,
},
```

#### Solo Contenido y Estadísticas
```typescript
socialMediaDisplay: {
  showPlatform: false,
  showAuthor: false,
  showContent: true,
  showStats: true,
  showOriginalLink: false,
},
```

### Resultado

Con estas opciones puedes personalizar completamente cómo se ven los mensajes de redes sociales en tu bot. Por ejemplo:

**Configuración completa:**
```
🐦 TWITTER
👤 Autor: Angel SC

📝 Contenido:
El nuevo casting de Tomás Mazza después de rajar a Alonso

❤️ 46,237 | 🔄 2,321 | 💬 47

🔗 Ver original
```

**Configuración mínima:**
```
El nuevo casting de Tomás Mazza después de rajar a Alonso
```

**Solo información básica:**
```
🐦 TWITTER
👤 Autor: Angel SC

📝 Contenido:
El nuevo casting de Tomás Mazza después de rajar a Alonso

🔗 Ver original
```

**Solo contenido y estadísticas:**
```
📝 Contenido:
El nuevo casting de Tomás Mazza después de rajar a Alonso

❤️ 46,237 | 🔄 2,321 | 💬 47
```

### Cómo Aplicar Cambios

1. Edita el archivo `config/bot.config.ts`
2. Cambia los valores `true`/`false` según tus preferencias
3. Guarda el archivo
4. Reinicia el bot para que los cambios surtan efecto 