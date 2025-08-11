# LLM 服务接口文档

## 概述

LLM 服务是 Knowlex 桌面智能助理的核心组件，负责与 OpenAI API 的集成，提供聊天、嵌入、标题生成等功能。本文档详细描述了 LLM 服务的接口、功能和错误处理策略。

## 架构设计

### 服务层次结构

```
Frontend (React)
    ↓
LLM Client (llm-client.ts)
    ↓
IPC Communication
    ↓
LLM IPC Handlers (llm-ipc.handlers.ts)
    ↓
LLM Service (llm.service.ts)
    ↓
OpenAI JS SDK
    ↓
OpenAI API
```

### 核心服务

1. **LLMService**: 核心 LLM 服务，处理与 OpenAI API 的直接交互
2. **ChatService**: 聊天服务，管理对话和消息
3. **EmbeddingService**: 嵌入服务，处理文本分块和向量化
4. **LLMClient**: 前端客户端，提供 React 应用的接口

## LLM 服务 API

### 初始化和配置

#### `initialize(config: LLMConfig): Promise<void>`

初始化 LLM 服务。

**参数:**
```typescript
interface LLMConfig {
  apiKey: string          // OpenAI API 密钥
  baseURL?: string        // API 基础 URL (可选)
  model: string           // 默认聊天模型
  embeddingModel: string  // 默认嵌入模型
  timeout?: number        // 请求超时时间 (毫秒)
  maxRetries?: number     // 最大重试次数
  temperature?: number    // 默认温度参数
  maxTokens?: number      // 默认最大 token 数
}
```

**示例:**
```typescript
await llmService.initialize({
  apiKey: 'sk-...',
  model: 'gpt-3.5-turbo',
  embeddingModel: 'text-embedding-3-small',
  timeout: 30000,
  maxRetries: 3
})
```

#### `updateConfig(updates: Partial<LLMConfig>): Promise<void>`

更新服务配置。

#### `getConfig(): LLMConfig | null`

获取当前配置。

### 连接测试

#### `testConnection(config?: Partial<LLMConfig>): Promise<ConnectionTestResult>`

测试 API 连接。

**返回值:**
```typescript
interface ConnectionTestResult {
  success: boolean
  latency?: number        // 响应延迟 (毫秒)
  error?: string         // 错误信息
  details?: Record<string, any>
}
```

### 聊天功能

#### `chat(request: ChatRequest): Promise<ChatResponse>`

发送聊天消息（非流式）。

**请求参数:**
```typescript
interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  projectId?: string
  conversationId?: string
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: FileInfo[]
}
```

**响应:**
```typescript
interface ChatResponse {
  id: string
  content: string
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  metadata?: Record<string, any>
}
```

#### `chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>`

发送聊天消息（流式）。

**流式响应:**
```typescript
interface StreamChunk {
  id: string
  type: 'start' | 'token' | 'complete' | 'error'
  content?: string
  error?: IPCError
  metadata?: {
    model?: string
    usage?: TokenUsage
  }
}
```

**使用示例:**
```typescript
for await (const chunk of llmService.chatStream(request)) {
  if (chunk.type === 'token') {
    console.log('Token:', chunk.content)
  } else if (chunk.type === 'complete') {
    console.log('Complete:', chunk.metadata)
  }
}
```

### 嵌入功能

#### `generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>`

生成文本嵌入向量。

**请求参数:**
```typescript
interface EmbeddingRequest {
  texts: string[]
  model?: string
  dimensions?: number
}
```

**响应:**
```typescript
interface EmbeddingResponse {
  embeddings: number[][]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}
```

### 标题和摘要生成

#### `generateTitle(request: TitleGenerationRequest): Promise<string>`

为对话生成标题。

#### `generateSummary(request: SummaryGenerationRequest): Promise<string>`

为对话生成摘要。

## 聊天服务 API

### 对话管理

#### `createConversation(request: CreateConversationRequest): Promise<Conversation>`

创建新对话。

#### `getConversations(projectId?: string): Promise<Conversation[]>`

获取对话列表。

#### `updateConversation(conversationId: string, updates: object): Promise<void>`

更新对话信息。

#### `deleteConversation(conversationId: string): Promise<void>`

删除对话。

#### `moveConversation(conversationId: string, projectId: string | null): Promise<void>`

移动对话到项目。

### 消息管理

#### `sendMessage(request: SendMessageRequest): Promise<Message>`

发送消息（非流式）。

#### `sendMessageStream(request: SendMessageRequest): AsyncGenerator`

发送消息（流式）。

#### `editMessage(request: EditMessageRequest): Promise<Message>`

编辑消息。

#### `regenerateMessage(request: RegenerateMessageRequest): Promise<Message>`

重新生成消息。

#### `getMessages(conversationId: string): Promise<Message[]>`

获取对话消息列表。

## 文件处理

### 临时文件导入

聊天界面支持临时文件导入，用于当前对话的上下文：

- **支持格式**: `.txt`, `.md`
- **文件限制**: 最多 10 个文件，单文件最大 1MB
- **处理方式**: 读取为纯文本，添加到消息上下文
- **存储策略**: 不进行持久化存储

### 文件内容处理

```typescript
// 文件内容会被格式化为：
const formattedContent = `
${originalContent}

--- 文件: ${fileName} ---
${fileContent}
--- 文件结束 ---
`
```

## 错误处理策略

### 错误分类

1. **配置错误** (`LLM_INVALID_CONFIG`)
   - API 密钥无效
   - 配置参数错误

2. **API 错误** (`LLM_API_ERROR`)
   - 网络连接错误
   - API 服务错误
   - 请求格式错误

3. **限流错误** (`LLM_RATE_LIMIT`)
   - API 调用频率限制
   - 配额超限

### 重试机制

#### 重试配置

```typescript
interface RetryConfig {
  maxRetries: number      // 最大重试次数 (默认: 3)
  baseDelay: number       // 基础延迟时间 (默认: 1000ms)
  maxDelay: number        // 最大延迟时间 (默认: 10000ms)
  backoffFactor: number   // 退避因子 (默认: 2)
}
```

#### 可重试错误

- HTTP 状态码: 429 (限流), 500, 502, 503, 504
- 错误类型: `rate_limit_exceeded`, `server_error`, `timeout`
- 网络错误: `ECONNRESET`, `ETIMEDOUT`

#### 指数退避算法

```typescript
const delay = Math.min(
  baseDelay * Math.pow(backoffFactor, attempt),
  maxDelay
)
```

### 错误处理示例

```typescript
try {
  const response = await llmService.chat(request)
  return response
} catch (error) {
  if (error.code === 'LLM_RATE_LIMIT') {
    // 处理限流错误
    console.warn('Rate limit exceeded, please try again later')
  } else if (error.code === 'LLM_INVALID_CONFIG') {
    // 处理配置错误
    console.error('Invalid API configuration')
  } else {
    // 处理其他错误
    console.error('LLM service error:', error.message)
  }
  throw error
}
```

## 前端集成

### React Hook 使用

```typescript
import { useChat, useConversation } from '@/hooks'

function ChatComponent() {
  const { sendMessage, sendMessageStream, state } = useChat(conversationId)
  
  const handleSendMessage = async () => {
    try {
      const message = await sendMessage('Hello, AI!')
      console.log('Response:', message)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }
  
  const handleStreamMessage = async () => {
    try {
      const stream = await sendMessageStream('Tell me a story')
      if (stream) {
        for await (const chunk of stream) {
          if (chunk.type === 'token') {
            // 处理流式 token
          }
        }
      }
    } catch (error) {
      console.error('Stream failed:', error)
    }
  }
  
  return (
    <div>
      {state.isLoading && <div>Loading...</div>}
      {state.error && <div>Error: {state.error}</div>}
      <button onClick={handleSendMessage}>Send Message</button>
      <button onClick={handleStreamMessage}>Stream Message</button>
    </div>
  )
}
```

### 文件上传处理

```typescript
import { llmClient } from '@/lib/llm-client'

function FileUploadComponent() {
  const handleFileUpload = async (files: File[]) => {
    // 验证文件
    const validation = llmClient.validateFiles(files, {
      maxSize: 1024 * 1024, // 1MB
      maxCount: 10,
      allowedTypes: ['.txt', '.md']
    })
    
    if (!validation.valid) {
      console.error('File validation failed:', validation.errors)
      return
    }
    
    // 读取文件内容
    try {
      const fileInfos = await llmClient.readFilesAsText(files)
      // 发送带文件的消息
      await sendMessage('Analyze these files', files)
    } catch (error) {
      console.error('Failed to read files:', error)
    }
  }
  
  return (
    <input
      type="file"
      multiple
      accept=".txt,.md"
      onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
    />
  )
}
```

## 性能优化

### 1. 连接池管理

- 复用 OpenAI 客户端实例
- 合理设置超时时间
- 实现连接健康检查

### 2. 请求优化

- 批量处理嵌入请求
- 实现请求去重
- 使用适当的模型参数

### 3. 缓存策略

- 缓存嵌入结果
- 缓存模型响应（适当场景）
- 实现 LRU 缓存清理

### 4. 流式处理优化

- 合理设置块大小
- 实现背压控制
- 及时清理资源

## 监控和日志

### 日志级别

- **ERROR**: 服务错误、API 失败
- **WARN**: 重试警告、配置问题
- **INFO**: 服务状态、请求统计
- **DEBUG**: 详细调试信息

### 监控指标

- API 调用延迟
- 错误率和重试率
- Token 使用统计
- 并发请求数

### 日志示例

```typescript
// 成功请求
console.log('✓ LLM chat completed', {
  model: 'gpt-3.5-turbo',
  tokens: 150,
  latency: 1200
})

// 重试警告
console.warn('⚠️ LLM request retry', {
  attempt: 2,
  error: 'Rate limit exceeded',
  nextRetryIn: 2000
})

// 错误日志
console.error('✗ LLM request failed', {
  error: 'Invalid API key',
  model: 'gpt-3.5-turbo',
  conversationId: 'conv-123'
})
```

## 安全考虑

### 1. API 密钥管理

- 加密存储 API 密钥
- 避免在日志中暴露密钥
- 实现密钥轮换机制

### 2. 输入验证

- 验证消息内容长度
- 过滤恶意输入
- 限制文件类型和大小

### 3. 输出过滤

- 检查响应内容安全性
- 实现内容过滤规则
- 记录异常响应

## 故障排除

### 常见问题

1. **API 密钥无效**
   - 检查密钥格式和有效性
   - 确认账户状态和权限

2. **请求超时**
   - 调整超时设置
   - 检查网络连接
   - 减少请求复杂度

3. **限流错误**
   - 实现请求限流
   - 增加重试延迟
   - 升级 API 计划

4. **模型不可用**
   - 检查模型名称
   - 确认模型权限
   - 使用备用模型

### 调试工具

```typescript
// 启用详细日志
llmService.updateConfig({ debugMode: true })

// 测试连接
const result = await llmService.testConnection()
console.log('Connection test:', result)

// 检查配置
const config = llmService.getConfig()
console.log('Current config:', config)
```

## 版本兼容性

- **OpenAI JS SDK**: v4.20.1+
- **Node.js**: 18.0.0+
- **TypeScript**: 5.0+
- **Electron**: 28.0+

## 更新日志

### v1.0.0 (2024-01-10)
- 初始版本发布
- 支持基础聊天功能
- 实现流式响应
- 添加文件导入支持
- 完成错误处理和重试机制