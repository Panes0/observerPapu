# 🖼️ Búsqueda de Imágenes - Telegram Bot

## 📋 Descripción

Nueva funcionalidad que permite buscar imágenes usando DuckDuckGo directamente desde Telegram. El bot devuelve URLs de imágenes para que Telegram muestre el preview automáticamente, ahorrando ancho de banda.

## 🚀 Características

- **Búsqueda en DuckDuckGo**: Utiliza la API no oficial de DuckDuckGo
- **Resultados aleatorios**: Cada búsqueda devuelve una imagen diferente
- **URLs directas**: No descarga imágenes, solo envía URLs
- **Previews automáticos**: Telegram muestra el embed automáticamente
- **Búsqueda segura**: SafeSearch habilitado por defecto
- **Manejo de errores**: Respuestas informativas en caso de fallos

## 🎯 Uso

### Comando Principal

```
/img [término de búsqueda]
```

### Ejemplos

```bash
# Buscar gatos
/img gatos

# Buscar paisajes
/img paisaje montañas

# Buscar comida
/img comida italiana

# Buscar tecnología
/img tecnología futurista
```

### Ayuda

```
/img
```

Sin parámetros, muestra la ayuda completa del comando.

## 🔧 Arquitectura

### Estructura de Archivos

```
src/
├── types/
│   └── image-search.ts           # Tipos TypeScript
├── services/
│   └── image-search/
│       ├── index.ts              # Exportaciones principales
│       └── duckduckgo-image-service.ts  # Servicio DuckDuckGo
├── utils/
│   └── image-utils.ts            # Utilidades de formateo
└── ObserverPapu_bot.ts          # Comando /img integrado
```

### Componentes

1. **ImageSearchService**: Interfaz del servicio de búsqueda
2. **DuckDuckGoImageService**: Implementación específica para DuckDuckGo
3. **Image Utils**: Utilidades para formatear respuestas
4. **Types**: Definiciones TypeScript para mayor seguridad

## 🔌 API de DuckDuckGo

### Flujo de Búsqueda

1. **Obtener Token**: Solicita token de búsqueda a DuckDuckGo
2. **Realizar Búsqueda**: Usa el token para buscar imágenes
3. **Procesar Resultados**: Filtra y formatea los resultados
4. **Selección Aleatoria**: Elige una imagen aleatoria de los resultados

### Parámetros de Búsqueda

- **maxResults**: Número máximo de resultados (defecto: 50)
- **safeSearch**: Nivel de filtrado ('strict', 'moderate', 'off')
- **region**: Región de búsqueda (defecto: 'us-en')

## 📱 Integración con Telegram

### Respuesta del Bot

El bot envía dos mensajes:

1. **Mensaje informativo**: Información sobre la imagen encontrada
2. **URL de imagen**: URL directa para que Telegram muestre el preview

### Ejemplo de Respuesta

```
🖼️ Imagen encontrada para: "gatos"

📝 Título: Cute Cat Playing
📏 Dimensiones: 1920x1080px
🔍 Fuente: example.com
🌐 Vía: DuckDuckGo

🔗 Ver imagen completa
```

*Seguido de la URL de la imagen*

## 🛡️ Seguridad y Autorización

- **Autorización requerida**: Solo usuarios autorizados pueden usar el comando
- **Validación de entrada**: Limita longitud y caracteres de la búsqueda
- **SafeSearch**: Filtrado de contenido activado por defecto
- **Manejo de errores**: Respuestas seguras ante fallos

## 🧪 Pruebas

### Script de Pruebas

Ejecutar el script de pruebas:

```bash
node test-image-search.js
```

### Pruebas Incluidas

1. **Búsqueda básica**: Verifica funcionamiento normal
2. **Imagen aleatoria**: Prueba selección aleatoria
3. **Sin resultados**: Manejo de búsquedas vacías
4. **Query inválida**: Validación de entrada

### Pruebas Manuales

1. **Buscar imagen común**: `/img gatos`
2. **Buscar término específico**: `/img paisaje montañas`
3. **Buscar sin parámetros**: `/img` (debe mostrar ayuda)
4. **Buscar término muy largo**: Debe mostrar error
5. **Buscar término muy corto**: Debe mostrar error

## 🔧 Configuración

### Variables de Entorno

No requiere configuración adicional. Usa la configuración existente del bot:

- `botConfig.options.silentReplies`: Notificaciones silenciosas
- `botConfig.options.logMessages`: Logging de búsquedas
- Sistema de autorización existente

### Personalización

Para personalizar el servicio, editar `src/services/image-search/duckduckgo-image-service.ts`:

```typescript
// Cambiar región por defecto
const { maxResults = 20, safeSearch = 'moderate', region = 'es-es' } = options;

// Cambiar User-Agent
private readonly userAgent = 'Tu-User-Agent-Personalizado';

// Cambiar número de resultados por defecto
async getRandomImage(query: string, options: ImageSearchOptions = {}): Promise<ImageSearchResult | null> {
  const response = await this.searchImages(query, { ...options, maxResults: 100 });
  // ...
}
```

## 🚨 Limitaciones

1. **API no oficial**: DuckDuckGo puede cambiar sin aviso
2. **Rate limiting**: Posibles límites de velocidad
3. **Disponibilidad**: Dependiente de la disponibilidad de DuckDuckGo
4. **Filtrado**: Algunos resultados pueden estar filtrados

## 🔄 Alternativas

Si DuckDuckGo no funciona, considerar:

1. **Unsplash API**: Imágenes profesionales (requiere API key)
2. **Pexels API**: Similar a Unsplash (requiere API key)
3. **Scraping directo**: Más frágil pero sin API

## 📊 Logging

El bot registra las búsquedas exitosas:

```
🖼️ Imagen encontrada para "gatos" por UserName (123456789)
```

## 🎯 Casos de Uso

- **Entretenimiento**: Buscar imágenes divertidas
- **Información**: Visualizar conceptos
- **Educación**: Mostrar ejemplos visuales
- **Conversación**: Añadir contexto visual

## 🛠️ Mantenimiento

### Monitoreo

- Verificar logs de errores regularmente
- Probar búsquedas comunes periódicamente
- Monitorear tiempo de respuesta

### Actualizaciones

- Mantener User-Agent actualizado
- Verificar cambios en la API de DuckDuckGo
- Actualizar filtros de seguridad según necesidades 