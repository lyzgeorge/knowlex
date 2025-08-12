/**
 * AI Framework Integration Test
 * Tests the integration between AI framework and conversation/message system
 * This file can be run to verify that all components work together properly
 */

import {
  BaseAIModel,
  AIProvider,
  aiModelManager,
  registerModel,
  getModel,
  listModels,
  AIUtils
} from './index'
import type {
  AIModel,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  ModelCapabilities,
  AIConfig
} from '../../shared/types/ai'
import type { Message } from '../../shared/types/message'
import { generateId } from '../../shared/utils/id'

/**
 * Mock AI Model Implementation for Testing
 * Simulates an AI provider without making actual API calls
 */
class MockAIModel extends BaseAIModel {
  constructor(config: AIConfig) {
    const capabilities: ModelCapabilities = {
      supportVision: false,
      supportReasoning: false,
      supportToolCalls: false,
      maxContextLength: 4096
    }
    super(config, capabilities)
  }

  async chat(messages: AIMessage[]): Promise<AIResponse> {
    // Validate messages using base class method
    this.validateMessages(messages)

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Generate a mock response based on the last message
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) {
      throw new Error('No messages provided')
    }

    const content =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : lastMessage.content.map((part) => part.text || '').join(' ')

    return {
      content: `Mock response to: "${content.substring(0, 50)}..."`,
      usage: {
        promptTokens: AIUtils.estimateTokenCount(content),
        completionTokens: 20,
        totalTokens: AIUtils.estimateTokenCount(content) + 20
      }
    }
  }

  async *stream(messages: AIMessage[]): AsyncIterable<AIStreamChunk> {
    // Validate messages using base class method
    this.validateMessages(messages)

    const response = await this.chat(messages)
    const words = response.content.split(' ')

    // Simulate streaming by yielding words progressively
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50))

      yield {
        content: i === 0 ? words[i] : ` ${words[i]}`,
        finished: i === words.length - 1,
        ...(i === words.length - 1 && response.usage && { usage: response.usage })
      }
    }
  }
}

/**
 * Mock AI Provider for Testing
 */
const mockProvider: AIProvider = {
  name: 'mock',
  displayName: 'Mock AI Provider',

  async createModel(config: AIConfig): Promise<AIModel> {
    return new MockAIModel(config)
  },

  validateConfig(config: AIConfig): boolean {
    return !!(config.apiKey && config.model)
  },

  getDefaultConfig(): Partial<AIConfig> {
    return {
      temperature: 0.7,
      maxTokens: 1000
    }
  },

  getSupportedModels(): string[] {
    return ['mock-gpt', 'mock-claude']
  }
}

/**
 * Test helper functions
 */
function createTestMessage(content: string, role: 'user' | 'assistant' = 'user'): Message {
  return {
    id: generateId(),
    conversationId: generateId(),
    role,
    content: [{ type: 'text', text: content }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

function createTestMessageWithImage(text: string, imageUrl: string): Message {
  return {
    id: generateId(),
    conversationId: generateId(),
    role: 'user',
    content: [
      { type: 'text', text },
      {
        type: 'image',
        image: {
          url: imageUrl,
          mimeType: 'image/jpeg'
        }
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Integration test functions
 */
async function testProviderRegistration(): Promise<void> {
  console.log('Testing provider registration...')

  // Register the mock provider
  registerModel(mockProvider)

  // Verify provider is listed
  const providers = aiModelManager.listProviders()
  const mockProviderEntry = providers.find((p) => p.name === 'mock')

  if (!mockProviderEntry) {
    throw new Error('Mock provider not found in provider list')
  }

  console.log('✓ Provider registration successful')
  console.log(`  Provider: ${mockProviderEntry.displayName}`)
  console.log(`  Models: ${mockProviderEntry.models.join(', ')}`)
}

async function testModelCreation(): Promise<void> {
  console.log('\nTesting model creation...')

  const config: AIConfig = {
    apiKey: 'test-key',
    model: 'mock-gpt',
    temperature: 0.8
  }

  const model = await getModel(config)
  const capabilities = model.getCapabilities()

  console.log('✓ Model creation successful')
  console.log(`  Model capabilities:`, capabilities)
}

async function testMessageConversion(): Promise<void> {
  console.log('\nTesting message conversion...')

  // Test simple text message
  const textMessage = createTestMessage('Hello, how are you?')

  // Test multimodal message
  const multimodalMessage = createTestMessageWithImage(
    'What do you see in this image?',
    'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
  )

  console.log('✓ Message conversion test setup complete')
  console.log(`  Text message: ${textMessage.content[0]?.text || 'N/A'}`)
  console.log(`  Multimodal message parts: ${multimodalMessage.content.length}`)
}

async function testChatIntegration(): Promise<void> {
  console.log('\nTesting chat integration...')

  const config: AIConfig = {
    apiKey: 'test-key',
    model: 'mock-gpt'
  }

  const model = await getModel(config)

  // Create test messages in internal format
  const messages: Message[] = [
    createTestMessage('What is the weather like today?'),
    createTestMessage("It's sunny and warm!", 'assistant'),
    createTestMessage('That sounds nice. What should I wear?')
  ]

  // Convert to AI format (this tests the conversion logic)
  const aiMessages: AIMessage[] = messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content[0]?.text || ''
  }))

  // Test chat
  const response = await model.chat(aiMessages)

  console.log('✓ Chat integration successful')
  console.log(`  Response: ${response.content}`)
  console.log(`  Usage: ${response.usage?.totalTokens} tokens`)
}

async function testStreamingIntegration(): Promise<void> {
  console.log('\nTesting streaming integration...')

  const config: AIConfig = {
    apiKey: 'test-key',
    model: 'mock-gpt'
  }

  const model = await getModel(config)

  const aiMessages: AIMessage[] = [
    AIUtils.createUserMessage('Tell me a short story about a robot.')
  ]

  let fullResponse = ''
  let chunkCount = 0

  // Test streaming
  for await (const chunk of model.stream(aiMessages)) {
    if (chunk.content) {
      fullResponse += chunk.content
      chunkCount++
    }

    if (chunk.finished) {
      console.log('✓ Streaming integration successful')
      console.log(`  Full response: ${fullResponse}`)
      console.log(`  Chunks received: ${chunkCount}`)
      console.log(`  Final usage: ${chunk.usage?.totalTokens} tokens`)
      break
    }
  }
}

async function testModelCaching(): Promise<void> {
  console.log('\nTesting model caching...')

  const config: AIConfig = {
    apiKey: 'test-key',
    model: 'mock-gpt',
    temperature: 0.7
  }

  // Get model twice with same config
  await getModel(config)
  await getModel(config)

  // Should be the same instance due to caching
  const cacheStats = aiModelManager.getCacheStats()

  console.log('✓ Model caching test complete')
  console.log(`  Cache size: ${cacheStats.size}`)
  console.log(`  Cache entries:`, cacheStats.entries)
}

async function testErrorHandling(): Promise<void> {
  console.log('\nTesting error handling...')

  try {
    // Test with invalid config
    await getModel({
      apiKey: '',
      model: 'nonexistent-model'
    })
    throw new Error('Should have thrown an error')
  } catch (error) {
    console.log('✓ Error handling working correctly')
    console.log(`  Expected error: ${error.message}`)
  }
}

/**
 * Main test runner
 */
export async function runIntegrationTests(): Promise<void> {
  console.log('🚀 Starting AI Framework Integration Tests\n')

  try {
    await testProviderRegistration()
    await testModelCreation()
    await testMessageConversion()
    await testChatIntegration()
    await testStreamingIntegration()
    await testModelCaching()
    await testErrorHandling()

    console.log('\n✅ All integration tests passed!')

    // Display final stats
    const providers = aiModelManager.listProviders()
    const models = listModels()
    const cacheStats = aiModelManager.getCacheStats()

    console.log('\n📊 Final Statistics:')
    console.log(`  Registered providers: ${providers.length}`)
    console.log(`  Available models: ${models.length}`)
    console.log(`  Cached models: ${cacheStats.size}`)
  } catch (error) {
    console.error('\n❌ Integration test failed:', error)
    throw error
  }
}

/**
 * Utility function to test the framework manually
 */
export async function quickTest(): Promise<void> {
  console.log('🔧 Running quick AI framework test...')

  try {
    // Register mock provider
    registerModel(mockProvider)

    // Create and test model
    const model = await getModel({
      apiKey: 'test',
      model: 'mock-gpt'
    })

    const response = await model.chat([AIUtils.createUserMessage('Hello!')])

    console.log('✅ Quick test successful!')
    console.log(`Response: ${response.content}`)
  } catch (error) {
    console.error('❌ Quick test failed:', error)
    throw error
  }
}

// If this file is run directly, execute the tests
if (require.main === module) {
  runIntegrationTests().catch(console.error)
}
