# Knowlex Desktop API 参考文档

## 概述

本文档描述了 Knowlex Desktop 应用中的 API 接口，包括 IPC 通信接口、共享类型定义和核心服务接口。

## IPC 通信接口

### 渲染进程 API (window.api)

渲染进程通过 `window.api` 对象与主进程通信，所有方法都是异步的。

#### 基础方法

##### `ping()`

测试 IPC 通信连接。

**语法**
```typescript
window.api.ping(): Promise<string>
```

**返回值**
- `Promise<string>` - 返回 "pong" 字符串

**示例**
```typescript
const result = await window.api.ping()
console.log(result) // "pong"
```

##### `invoke<T>(channel, data?)`

通用 IPC 调用方法。

**语法**
```typescript
window.api.invoke<T = any>(channel: string, data?: any): Promise<T>
```

**参数**
- `channel` (string) - IPC 通道名称
- `data` (any, 可选) - 传递给主进程的数据

**返回值**
- `Promise<T>` - 主进程返回的数据

**示例**
```typescript
// 调用数据库查询
const users = await window.api.invoke<User[]>('db:users:findAll')

// 调用带参数的方法
const user = await window.api.invoke<User>('db:users:findById', { id: '123' })
```

##### `onStream(channel, callback)`

监听流式数据。

**语法**
```typescript
window.api.onStream(channel: string, callback: (data: any) => void): () => void
```

**参数**
- `channel` (string) - 流式数据通道名称
- `callback` (function) - 数据接收回调函数

**返回值**
- `function` - 取消监听的函数

**示例**
```typescript
// 监听 AI 回复流
const unsubscribe = window.api.onStream('ai:chat:stream', (chunk) => {
  console.log('Received chunk:', chunk)
})

// 取消监听
unsubscribe()
```

## 共享类型定义

### IPC 通信类型

#### `IPCRequest<T>`

IPC 请求数据结构。

```typescript
interface IPCRequest<T = any> {
  id: string        // 请求唯一标识符
  channel: string   // IPC 通道名称
  data: T          // 请求数据
  timestamp: number // 请求时间戳
}
```

#### `IPCResponse<T>`

IPC 响应数据结构。

```typescript
interface IPCResponse<T = any> {
  id: string        // 对应请求的标识符
  success: boolean  // 请求是否成功
  data?: T         // 响应数据（成功时）
  error?: string   // 错误信息（失败时）
  timestamp: number // 响应时间戳
}
```

### 数据库实体类型

#### `Project`

项目实体。

```typescript
interface Project {
  id: string           // 项目唯一标识符
  name: string         // 项目名称
  description?: string // 项目描述
  created_at: string   // 创建时间 (ISO 8601)
  updated_at: string   // 更新时间 (ISO 8601)
}
```

#### `Conversation`

对话实体。

```typescript
interface Conversation {
  id: string          // 对话唯一标识符
  project_id?: string // 所属项目 ID（可选）
  title: string       // 对话标题
  created_at: string  // 创建时间 (ISO 8601)
  updated_at: string  // 更新时间 (ISO 8601)
}
```

#### `Message`

消息实体。

```typescript
interface Message {
  id: string             // 消息唯一标识符
  conversation_id: string // 所属对话 ID
  role: 'user' | 'assistant' // 消息角色
  content: string        // 消息内容
  files?: string[]       // 附件文件列表
  created_at: string     // 创建时间 (ISO 8601)
}
```

#### `ProjectFile`

项目文件实体。

```typescript
interface ProjectFile {
  id: string                              // 文件唯一标识符
  project_id: string                      // 所属项目 ID
  filename: string                        // 文件名
  filepath: string                        // 文件路径
  file_size: number                       // 文件大小（字节）
  file_hash: string                       // 文件哈希值
  status: 'processing' | 'completed' | 'failed' // 处理状态
  created_at: string                      // 创建时间 (ISO 8601)
  updated_at: string                      // 更新时间 (ISO 8601)
}
```

#### `TextChunk`

文本块实体（用于向量化）。

```typescript
interface TextChunk {
  id: string          // 文本块唯一标识符
  file_id: string     // 所属文件 ID
  content: string     // 文本内容
  chunk_index: number // 块索引
  embedding?: number[] // 向量嵌入（可选）
  created_at: string  // 创建时间 (ISO 8601)
}
```

#### `ProjectMemory`

项目记忆实体。

```typescript
interface ProjectMemory {
  id: string                    // 记忆唯一标识符
  project_id: string            // 所属项目 ID
  type: 'user' | 'system'       // 记忆类型
  content: string               // 记忆内容
  created_at: string            // 创建时间 (ISO 8601)
  updated_at: string            // 更新时间 (ISO 8601)
}
```

#### `KnowledgeCard`

知识卡片实体。

```typescript
interface KnowledgeCard {
  id: string          // 知识卡片唯一标识符
  project_id: string  // 所属项目 ID
  title: string       // 卡片标题
  content: string     // 卡片内容
  tags?: string[]     // 标签列表
  created_at: string  // 创建时间 (ISO 8601)
  updated_at: string  // 更新时间 (ISO 8601)
}
```

#### `AppSettings`

应用设置实体。

```typescript
interface AppSettings {
  id: string         // 设置唯一标识符
  key: string        // 设置键名
  value: string      // 设置值
  updated_at: string // 更新时间 (ISO 8601)
}
```

### 业务逻辑类型

#### `OpenAIConfig`

OpenAI API 配置。

```typescript
interface OpenAIConfig {
  apiKey: string         // API 密钥
  baseURL?: string       // API 基础 URL（可选）
  model: string          // 聊天模型名称
  embeddingModel: string // 嵌入模型名称
}
```

#### `ChatMessage`

聊天消息。

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' // 消息角色
  content: string                       // 消息内容
  files?: FileInfo[]                    // 附件信息
}
```

#### `FileInfo`

文件信息。

```typescript
interface FileInfo {
  name: string    // 文件名
  content: string // 文件内容
  size: number    // 文件大小（字节）
}
```

#### `RAGResult`

RAG 检索结果。

```typescript
interface RAGResult {
  content: string     // 文本内容
  filename: string    // 来源文件名
  score: number       // 相似度分数
  chunk_index: number // 文本块索引
}
```

#### `KnowlexError`

应用错误类型。

```typescript
interface KnowlexError {
  code: string    // 错误代码
  message: string // 错误消息
  details?: any   // 错误详情（可选）
}
```

## 服务接口

### DatabaseService

数据库服务接口（待实现）。

```typescript
class DatabaseService {
  // TODO: 实现数据库服务方法
  // - 连接管理
  // - CRUD 操作
  // - 事务处理
  // - 迁移管理
}
```

### IPCService

IPC 服务接口（待实现）。

```typescript
class IPCService {
  // TODO: 实现 IPC 服务方法
  // - 通道注册
  // - 消息路由
  // - 错误处理
  // - 流式数据处理
}
```

## 错误处理

### 错误代码

| 代码 | 描述 | 处理方式 |
|------|------|----------|
| `IPC_TIMEOUT` | IPC 调用超时 | 重试或提示用户 |
| `IPC_CHANNEL_NOT_FOUND` | IPC 通道不存在 | 检查通道名称 |
| `DATABASE_ERROR` | 数据库操作失败 | 记录日志并提示用户 |
| `FILE_NOT_FOUND` | 文件不存在 | 提示用户选择有效文件 |
| `PERMISSION_DENIED` | 权限不足 | 提示用户授权 |

### 错误处理示例

```typescript
try {
  const result = await window.api.invoke('some-operation', data)
  // 处理成功结果
} catch (error) {
  if (error instanceof Error) {
    console.error('Operation failed:', error.message)
    // 根据错误类型进行处理
    switch (error.message) {
      case 'IPC_TIMEOUT':
        // 重试逻辑
        break
      case 'DATABASE_ERROR':
        // 显示用户友好的错误消息
        break
      default:
        // 通用错误处理
        break
    }
  }
}
```

## 使用示例

### 基础 IPC 通信

```typescript
// 渲染进程中
const App: React.FC = () => {
  const [status, setStatus] = useState<string>('Connecting...')

  useEffect(() => {
    // 测试连接
    window.api.ping()
      .then(() => setStatus('Connected'))
      .catch(() => setStatus('Connection failed'))
  }, [])

  return <div>Status: {status}</div>
}
```

### 流式数据处理

```typescript
const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const unsubscribe = window.api.onStream('ai:response', (chunk) => {
      setMessages(prev => [...prev, chunk])
    })

    return unsubscribe
  }, [])

  return (
    <div>
      {messages.map((msg, index) => (
        <div key={index}>{msg}</div>
      ))}
    </div>
  )
}
```

## 版本信息

- **API 版本**: 0.1.0
- **最后更新**: 2025-01-08
- **兼容性**: Electron 28.3.3+

## 更新日志

### v0.1.0 (2025-01-08)

- 初始 API 设计
- 基础 IPC 通信接口
- 共享类型定义
- 数据库实体类型

---

**注意**: 本文档描述的是当前实现的接口。随着开发进展，接口可能会发生变化。请关注更新日志获取最新信息。