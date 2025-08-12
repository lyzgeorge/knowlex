# AI Integration

This document describes the AI framework used in Knowlex Desktop, which provides a unified interface for interacting with various AI models.

## AI Framework Overview

**File:** `src/main/ai/manager.ts`, `src/main/ai/base.ts`

The AI framework is designed to be extensible and support multiple AI providers. Its key features include:

-   **Unified Interface**: A consistent API for chat completions and streaming responses across all supported models, defined in `src/main/ai/base.ts`.
-   **Provider System**: A registration system that allows for the easy addition of new AI providers, managed in `src/main/ai/manager.ts`.
-   **Model Management**: A manager that handles model instantiation and caching.
-   **Type Safety**: Comprehensive TypeScript types for all AI-related data structures in `src/shared/types/ai.ts`.

## Supported Providers and Models

### OpenAI

**File:** `src/main/ai/openai.ts`

-   **GPT-4o**: A powerful and cost-effective multimodal model.
-   **GPT-4 Turbo**: A high-performance model with vision capabilities.
-   **GPT-3.5 Turbo**: A fast and efficient model for general tasks.

### Anthropic (Claude)

**File:** `src/main/ai/claude.ts`

-   **Claude 3 Opus**: The most powerful model for complex reasoning.
-   **Claude 3 Sonnet**: A balanced model for a wide range of tasks.
-   **Claude 3 Haiku**: The fastest and most compact model for near-instant responses.

## Usage

The framework provides a simple `getModel` function to obtain a model instance, which can then be used for chat completions or streaming.

### Basic Chat Completion

```typescript
import { getModel } from '@main/ai';

const model = await getModel({
  provider: 'openai',
  apiKey: 'YOUR_API_KEY',
  model: 'gpt-4o',
});

const response = await model.chat(
  messages: AIMessage[],
  options?: AIChatCompletionOptions,
): Promise<AIChatCompletion>
```

### Streaming Responses

```typescript
const stream = await model.stream(
  messages: AIMessage[],
  options?: AIChatCompletionOptions,
): Promise<AsyncIterable<AIStreamChunk>>
```

## Extending the Framework

To add a new AI provider, you must implement the `AIProvider` interface in `src/main/ai/base.ts`, which involves creating a model class that extends `BaseAIModel` and defining the provider's configuration and capabilities.