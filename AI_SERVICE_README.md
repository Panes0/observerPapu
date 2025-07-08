# 🤖 Servicio de IA Rápida - Together AI Integration

## 📋 Descripción

Nueva funcionalidad que integra Together AI en el bot de Telegram para **respuestas súper cortas y recreativas**. El comando `/ia` está optimizado para generar respuestas de 1-2 oraciones máximo, perfecto para uso casual en chats grupales. Mantiene el mismo sistema de autorización que las redes sociales.

## 🚀 Características

- **Respuestas súper cortas**: 1-2 oraciones máximo para uso recreativo
- **System prompt optimizado**: Instruye al modelo para respuestas breves y simplificadas
- **Formato minimalista**: Presentación limpia sin información técnica excesiva
- **Together AI Integration**: Utiliza la API oficial de Together AI
- **Sistema de autorización**: Respeta la whitelist y configuración existente
- **Tokens optimizados**: Configuración reducida (150 tokens) para respuestas rápidas
- **Validación de prompts**: Validación de entrada para mayor seguridad
- **Manejo de errores**: Respuestas informativas en caso de fallos
- **Logging**: Registro de uso con información de tokens

## 🎯 Uso

### Comando Principal

```
/ia [tu pregunta o prompt]
```

### Ejemplos

```bash
# Conceptos básicos (respuesta: 1-2 oraciones)
/ia ¿Qué es JavaScript?
# 🤖 JavaScript es un lenguaje de programación que se usa principalmente para hacer páginas web interactivas. Es como el cerebro que hace que los sitios web respondan a tus clics y acciones.

# Ciencia simple
/ia ¿Por qué el cielo es azul?
# 🤖 El cielo es azul porque la atmósfera dispersa más la luz azul que otros colores cuando la luz solar la atraviesa. Es como cuando juegas con un prisma y ves diferentes colores.

# Tecnología
/ia ¿Cómo funciona internet?
# 🤖 Internet es como una red gigante de computadoras conectadas que se envían mensajes entre sí. Tu computadora habla con otras para traerte páginas web, videos y mensajes.

# Preguntas rápidas
/ia ¿Qué es la gravedad?
# 🤖 La gravedad es la fuerza invisible que atrae las cosas hacia el centro de la Tierra. Por eso las cosas caen hacia abajo en lugar de flotar.
```

### Ayuda

```
/ia
```

Sin parámetros, muestra la ayuda completa del comando.

## ⚙️ Configuración

### 1. Obtener API Key de Together AI

1. Ve a [together.ai](https://together.ai/)
2. Crea una cuenta o inicia sesión
3. Obtén tu API key desde el dashboard

### 2. Configurar el Bot

Edita tu archivo `config/bot.config.ts` (copia de `bot.config.example.ts`):

```typescript
export const botConfig: BotConfig = {
  token: "TU_BOT_TOKEN",
  options: {
    // ... otras configuraciones
    
    // Habilitar IA
    enableAI: true, // Activar funcionalidad de IA
    
    // Configuración de IA (optimizada para respuestas cortas)
    ai: {
      apiKey: "TU_API_KEY_DE_TOGETHER_AI", // Tu API key real
      baseUrl: "https://api.together.xyz", // URL base de Together AI
      defaultModel: "meta-llama/Llama-2-7b-chat-hf", // Modelo por defecto
      maxTokens: 150, // Optimizado para respuestas de 1-2 oraciones
      temperature: 0.7, // Creatividad (0.0 - 2.0)
    },
  }
};
```

### 3. Modelos Disponibles

Puedes cambiar el modelo por defecto por alguno de estos:

```typescript
// Modelos recomendados para Together AI
defaultModel: "meta-llama/Llama-2-7b-chat-hf",     // Llama 2 7B (rápido)
defaultModel: "meta-llama/Llama-2-13b-chat-hf",    // Llama 2 13B (más capaz)
defaultModel: "meta-llama/Llama-2-70b-chat-hf",    // Llama 2 70B (más avanzado)
defaultModel: "togethercomputer/RedPajama-INCITE-Chat-3B-v1", // Alternativa ligera
```

### 4. Parámetros de Configuración

| Parámetro | Descripción | Rango | Recomendado |
|-----------|-------------|-------|-------------|
| `apiKey` | Tu API key de Together AI | string | Requerido |
| `baseUrl` | URL base de la API | string | `https://api.together.xyz` |
| `defaultModel` | Modelo a usar por defecto | string | `meta-llama/Llama-2-7b-chat-hf` |
| `maxTokens` | Máximo tokens por respuesta | 1-4096 | 150 |
| `temperature` | Creatividad de respuestas | 0.0-2.0 | 0.7 |

### 5. System Prompt Optimizado

El servicio incluye automáticamente un **system prompt** que instruye al modelo para generar respuestas cortas:

```
"Eres un asistente helpful que responde de forma MUY breve y concisa. 
Tus respuestas deben ser de 1-2 oraciones máximo. 
Simplifica conceptos complejos y ve directo al punto. 
Responde en español y de manera amigable pero eficiente."
```

Este prompt garantiza que todas las respuestas sean:
- **Súper breves** (1-2 oraciones)
- **Simplificadas** (conceptos complejos explicados fácilmente)
- **Directas** (sin información extra innecesaria)
- **Amigables** (tono conversacional para chat recreativo)

## 🔧 Arquitectura

### Estructura de Archivos

```
src/
├── types/
│   └── ai.ts                        # Tipos TypeScript para IA
├── services/
│   └── ai/
│       ├── index.ts                 # Exportaciones principales
│       └── together-ai-service.ts   # Servicio Together AI
├── utils/
│   └── ai-utils.ts                  # Utilidades de formateo
└── ObserverPapu_bot.ts             # Comando /ia integrado
```

### Componentes

1. **AIService**: Interfaz del servicio de IA
2. **TogetherAIService**: Implementación específica para Together AI
3. **AI Utils**: Utilidades para formatear respuestas y validar prompts
4. **Types**: Definiciones TypeScript para mayor seguridad

## 🔐 Autorización

El comando `/ia` utiliza el mismo sistema de autorización que el resto del bot:

- **Whitelist habilitada**: Solo usuarios autorizados pueden usar el comando
- **Whitelist deshabilitada**: Todos los usuarios pueden usar el comando
- **Chats privados**: Funcionamiento normal según whitelist
- **Grupos**: Requiere autorización según configuración

## 🛡️ Validaciones y Límites

### Validación de Prompts

- **Mínimo**: 3 caracteres
- **Máximo**: 2000 caracteres
- **Sanitización**: Limpia espacios extra y saltos de línea

### Límites de Respuesta

- **Máximo**: 1000 caracteres (optimizado para respuestas cortas)
- **Tokens**: 150 por defecto (para respuestas de 1-2 oraciones)
- **Formato**: Presentación minimalista sin exceso de información técnica

## 📊 Logging y Monitoreo

El bot registra automáticamente:

```
🤖 IA consultada por UserName (123456789) - Tokens: 245
```

Información incluida:
- Usuario que hizo la consulta
- ID del usuario
- Tokens utilizados en la respuesta

## 🚨 Manejo de Errores

### Errores Comunes

1. **Servicio no configurado**
   ```
   ⚙️ Servicio de IA no configurado
   🔧 El servicio de Together AI no está configurado correctamente.
   ```

2. **API Key inválida**
   ```
   ❌ Error en IA
   🚫 Error: HTTP 401: Unauthorized
   ```

3. **Prompt muy largo**
   ```
   ❌ El prompt es demasiado largo (máximo 2000 caracteres)
   ```

4. **Servicio deshabilitado**
   ```
   ❌ El servicio de IA está deshabilitado
   ```

## 💰 Costos y Límites

Together AI tiene su propio sistema de pricing. Revisa:

- [Precios de Together AI](https://together.ai/pricing)
- Límites de tu plan
- Uso de tokens por modelo

## 🔄 Actualización y Mantenimiento

### Activar/Desactivar

```typescript
// Desactivar IA temporalmente
enableAI: false,
```

### Cambiar modelo en tiempo real

```typescript
// Cambiar a modelo más avanzado
defaultModel: "meta-llama/Llama-2-70b-chat-hf",
```

### Monitoreo

- Revisar logs para uso excesivo
- Verificar errores de API
- Monitorear costos en Together AI dashboard

## 🎯 Casos de Uso Recreativos

- **Curiosidades rápidas**: "¿Por qué los gatos ronronean?"
- **Conceptos básicos**: "¿Qué es blockchain?" 
- **Preguntas de trivia**: "¿Cuál es el animal más rápido?"
- **Explicaciones simples**: "¿Cómo funcionan los imanes?"
- **Datos curiosos**: "¿Por qué bostezamos?"
- **Chat casual**: Preguntas divertidas para animar conversaciones
- **Mini-explicaciones**: Conceptos complejos en palabras simples

## 🛠️ Troubleshooting

### Problemas Comunes

1. **No responde nada**
   - Verificar que `enableAI: true`
   - Comprobar API key válida
   - Revisar autorización del usuario

2. **Error 401**
   - API key incorrecta o expirada
   - Verificar cuenta de Together AI

3. **Respuestas cortadas**
   - Aumentar `maxTokens` en configuración
   - Usar prompts más específicos

4. **Muy lento**
   - Cambiar a modelo más pequeño
   - Reducir `maxTokens`

### Verificación de Estado

El bot incluye validación automática:
- Configuración válida al inicio
- API key presente
- Modelo válido

## 📚 Recursos Adicionales

- [Together AI Documentation](https://docs.together.ai/)
- [Available Models](https://docs.together.ai/docs/inference-models)
- [API Reference](https://docs.together.ai/reference/)
- [Pricing](https://together.ai/pricing)

## 🤝 Soporte

Si tienes problemas:

1. Verifica la configuración paso a paso
2. Revisa los logs del bot para errores
3. Comprueba tu saldo en Together AI
4. Verifica que la API key tenga permisos

¡Disfruta de tu nuevo asistente de IA integrado! 🤖✨ 