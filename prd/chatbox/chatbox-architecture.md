# Chatbox 架构文档

完整的 Chatbox 应用程序架构设计文档，包括整体架构、数据库设计、通信设计、接口设计、UI 设计以及所有服务的详细功能说明。

## 目录
1. [整体架构设计](#1-整体架构设计)
2. [数据库设计](#2-数据库设计)
3. [通信设计](#3-通信设计)
4. [接口设计](#4-接口设计)
5. [UI设计](#5-ui设计)
6. [服务详解](#6-主要服务功能梳理)

## 1. 整体架构设计

### 核心架构
Chatbox 采用三层架构设计，基于 Electron 构建跨平台桌面应用：

```
┌─────────────────────────────────────┐
│        渲染进程 (Renderer)           │
│    React + TypeScript + Jotai      │
│         用户界面和交互              │
├─────────────────────────────────────┤
│        主进程 (Main Process)        │
│   Node.js + Electron + SQLite      │
│     系统服务和数据处理              │
├─────────────────────────────────────┤
│        共享代码 (Shared)            │
│   AI模型系统 + 核心类型定义          │
│        跨进程共享逻辑               │
└─────────────────────────────────────┘
```

### 架构分层

**主进程 (`src/main/`)**
- 应用生命周期管理 (窗口、菜单、托盘)
- 数据存储和知识库系统 (SQLite + 向量数据库)
- 系统集成 (快捷键、自启动、代理)
- 文件处理和解析服务
- MCP (Model Context Protocol) 服务器管理
- 安全的 IPC 通信桥接

**渲染进程 (`src/renderer/`)**
- React 用户界面 (聊天、设置、文件管理)
- Jotai 响应式状态管理
- TanStack Router 路由系统
- 平台抽象层 (跨平台兼容)
- 组件化 UI 设计系统

**共享代码 (`src/shared/`)**
- AI 模型提供商统一接口 (15+ 提供商支持)
- 核心数据类型 (消息、会话、设置)
- 网络请求和错误处理
- 通用工具函数

### 技术栈

- **应用框架**: Electron 跨平台桌面应用
- **前端框架**: React 18 + TypeScript
- **状态管理**: Jotai 原子化状态管理
- **路由系统**: TanStack Router 类型安全路由
- **UI 组件**: Mantine + Material-UI 混合设计系统
- **样式方案**: 自定义主题 + CSS-in-JS
- **数据存储**: SQLite + LibSQLVector 向量数据库
- **AI 集成**: Vercel AI SDK + 15+ 提供商支持
- **文档处理**: Mastra RAG 系统
- **国际化**: i18next 多语言支持 (13+ 语言)

### 核心功能模块

**1. 多模态 AI 对话系统**
- 支持 15+ AI 提供商 (OpenAI, Claude, Gemini, 国产大模型等)
- 流式对话响应和推理过程显示
- 多模态内容支持 (文本、图片、文件、工具调用)
- 会话分支和消息编辑功能

**2. 知识库 RAG 系统**
- 本地文档解析 (PDF, Word, Excel, EPUB 等)
- 向量化存储和语义检索
- 文档分块和并发处理
- 重排序模型优化检索结果

**3. 多会话管理**
- 无限会话创建和组织
- 会话设置独立配置
- 消息历史和搜索
- 数据导入导出

**4. 插件生态 (MCP)**
- Model Context Protocol 标准实现
- 外部工具和服务集成
- 可扩展的功能架构
- 安全的 stdio/HTTP 通信

**5. 跨平台兼容**
- 桌面端 (Windows, macOS, Linux)
- Web 端浏览器支持
- 移动端 (iOS, Android) 通过 Capacitor
- 统一的平台抽象层

## 2. 数据库设计

### 存储架构概览

Chatbox 采用多层存储架构，确保数据安全性和性能：

```
存储层次结构
├── 应用配置 (electron-store)
│   ├── settings.json - 全局设置
│   ├── sessions/ - 会话数据
│   └── backups/ - 自动备份
├── SQLite 数据库 (知识库)
│   ├── knowledge_base - 知识库元数据
│   ├── kb_file - 文件信息
│   └── kb_<id> - 向量数据表
└── 文件系统
    ├── images/ - 图片存储
    ├── documents/ - 文档缓存
    └── temp/ - 临时文件
```

### SQLite 数据库设计

#### 核心表结构

**知识库表 (knowledge_base)**
```sql
CREATE TABLE knowledge_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  embedding_model TEXT NOT NULL,      -- 嵌入模型 (如 "openai:text-embedding-ada-002")
  rerank_model TEXT,                  -- 重排序模型 (如 "cohere:rerank-english-v2.0")
  vision_model TEXT,                  -- 视觉模型 (用于 OCR)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**文件表 (kb_file)**
```sql
CREATE TABLE kb_file (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kb_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,      -- 已处理的块数
  total_chunks INTEGER DEFAULT 0,     -- 总块数
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|done|failed|paused
  error TEXT,                         -- 错误信息
  metadata TEXT,                      -- JSON格式的额外元数据
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processing_started_at DATETIME,     -- 处理开始时间 (用于超时检测)
  completed_at DATETIME,              -- 处理完成时间
  FOREIGN KEY (kb_id) REFERENCES knowledge_base(id) ON DELETE CASCADE
);

CREATE INDEX idx_kb_file_kb_id ON kb_file(kb_id);
CREATE INDEX idx_kb_file_status ON kb_file(status);
```

#### 向量存储设计

向量数据通过 LibSQLVector 管理，每个知识库对应一个向量表：

**向量表 (kb_<knowledge_base_id>)**
```sql
-- 由 LibSQLVector 自动创建
CREATE VIRTUAL TABLE kb_1 USING vector(
  embedding[1536],          -- 向量维度 (取决于嵌入模型)
  file_id INTEGER,          -- 关联文件ID
  chunk_index INTEGER,      -- 文档块索引
  chunk_text TEXT,          -- 原始文本内容
  chunk_metadata TEXT       -- 块级元数据 (JSON)
);
```

### 数据存储策略

#### 1. 应用配置存储 (electron-store)

**设置文件结构**
```typescript
interface StoreType {
  settings: Settings              // 全局应用设置
  configs: Config                 // 应用配置 (UUID等)
  lastShownAboutDialogVersion: string
}

interface Settings {
  language: string                // 界面语言
  theme: 'light' | 'dark' | 'auto'
  temperature: number             // AI 模型温度
  providers: ProviderSettings[]   // AI 提供商配置
  shortcuts: ShortcutSettings     // 快捷键配置
  // ... 更多设置
}
```

**会话存储**
- 每个会话独立存储为 JSON 文件
- 文件路径: `sessions/session-<id>.json`
- 支持懒加载和增量保存

#### 2. 文件存储管理

**图片存储 (Blob Storage)**
```typescript
// 存储结构
images/
├── <hash1>.png
├── <hash2>.jpg
└── ...

// API 接口
setStoreBlob(key: string, dataUrl: string): Promise<void>
getStoreBlob(key: string): Promise<string | null>
delStoreBlob(key: string): Promise<void>
```

**文档缓存**
- 上传的文档存储在 `documents/` 目录
- 文件名使用安全的路径编码
- 支持重复数据删除

#### 3. 数据生命周期管理

**自动备份机制**
```typescript
backup(): Promise<string | undefined>
clearBackups(): Promise<void>
needBackup(): boolean
```

**备份策略**:
- 10分钟间隔检查备份需求
- 最近2天: 保留每小时备份
- 最近30天: 保留每日备份
- 30天后: 自动删除旧备份

**文件处理状态机**
```
pending → processing → done
   ↓         ↓          ↑
   ↓      failed    paused
   ↓         ↓          ↓
   └─────→ retry ←──────┘
```

### 性能优化设计

#### 1. 数据库优化
- 适当的索引策略 (kb_id, status, created_at)
- 事务处理确保数据一致性
- 连接池管理 (单例模式)
- 查询超时和重试机制

#### 2. 向量检索优化
- 批量向量化处理 (batch size: 50)
- 异步并发处理 (concurrency: 8)
- 缓存热点查询结果
- 分页和流式加载

#### 3. 存储空间管理
- 文件去重和压缩
- 定期清理临时文件
- 监控磁盘空间使用
- 智能缓存淘汰策略

## 3. 通信设计

### IPC 通信架构

Chatbox 采用安全的进程间通信 (IPC) 设计，确保主进程和渲染进程的数据安全传输：

```
渲染进程 (Frontend)    主进程 (Backend)
      │                      │
      │   contextBridge       │
      ├──────────────────────►│ 安全API暴露
      │                      │
      │   ipcRenderer.invoke  │
      ├──────────────────────►│ 异步请求-响应
      │                      │
      │   webContents.send    │
      │◄──────────────────────┤ 事件推送
      │                      │
```

#### 1. 安全桥接层 (preload.ts)

**API 暴露机制**
```typescript
// 主进程暴露的安全API
interface ElectronAPI {
  invoke: <T = any>(channel: string, ...args: any[]) => Promise<T>
  on: (channel: string, callback: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
}

// 通过 contextBridge 安全暴露
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
```

**安全特性**:
- 白名单式通道访问
- JSON 序列化防止代码注入
- 类型安全的参数传递
- 自动错误处理和重试

#### 2. 请求-响应通信模式

**IPC 通道分类**
```typescript
// 系统信息类
'getVersion' | 'getPlatform' | 'getArch' | 'getHostname'

// 数据存储类  
'store:get' | 'store:set' | 'store:delete'
'blob:get' | 'blob:set' | 'blob:delete'

// 知识库类
'kb:list' | 'kb:create' | 'kb:search' | 'kb:file:upload'

// 系统集成类
'openLink' | 'setFullscreen' | 'ensureProxy' | 'ensureShortcuts'
```

**调用示例**
```typescript
// 渲染进程调用
const settings = await window.electronAPI.invoke('store:get', 'settings')
const searchResults = await window.electronAPI.invoke('kb:search', { 
  kbId: 1, 
  query: 'AI技术发展' 
})

// 主进程处理
ipcMain.handle('kb:search', async (event, { kbId, query }) => {
  try {
    return await searchKnowledgeBase(kbId, query)
  } catch (error) {
    sentry.captureException(error)
    throw error
  }
})
```

#### 3. 事件推送机制

**系统事件**
```typescript
// 主题变化通知
nativeTheme.on('updated', () => {
  mainWindow.webContents.send('system-theme-updated')
})

// 应用更新通知
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded')
})

// 深度链接导航
app.on('open-url', (event, url) => {
  mainWindow.webContents.send('navigate-to', url)
})
```

### AI 服务通信架构

#### 1. 统一模型接口

**抽象基类设计**
```typescript
abstract class AbstractAISDKModel implements ModelInterface {
  // 统一的流式聊天接口
  async chat(messages: CoreMessage[], options: CallChatCompletionOptions) {
    const model = this.getChatModel()
    const result = await streamText({
      model,
      messages,
      onChunk: this.handleStreamChunk,
      onFinish: this.handleStreamFinish,
      ...options
    })
    return result
  }
  
  // 提供商特定实现
  protected abstract getProvider(): Provider
  protected abstract getChatModel(): LanguageModelV1
}
```

#### 2. 网络请求层

**代理和网络配置**
```typescript
// 请求工厂函数
function createAfetch(platformInfo: PlatformInfo) {
  return async function afetch(url: string, init?: RequestInit, options = {}) {
    // 平台特定头部注入
    if (isChatboxAPI(url)) {
      init.headers = {
        ...init.headers,
        'CHATBOX-PLATFORM': platformInfo.platform,
        'CHATBOX-PLATFORM-TYPE': platformInfo.type,
      }
    }
    
    // 代理配置
    if (useProxy && !isLocalHost(url)) {
      return fetchWithProxy(url, init, proxySettings)
    }
    
    return fetch(url, init)
  }
}
```

**错误处理和重试**
```typescript
// 指数退避重试
async function retryRequest<T>(
  fn: () => Promise<T>, 
  maxRetries: number,
  baseDelay: number = 500
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }
}
```

#### 3. 流式响应处理

**实时内容更新**
```typescript
async function handleStreamResponse(stream: StreamTextResult) {
  for await (const chunk of stream.textStream) {
    // 实时更新UI
    updateMessageContent(chunk)
    
    // 推理内容检测
    if (isReasoningContent(chunk)) {
      updateReasoningDisplay(chunk)
    }
    
    // 工具调用处理
    if (isToolCall(chunk)) {
      await executeToolCall(chunk)
    }
  }
}
```

### MCP 协议通信

#### 1. 传输层设计

**stdio 传输**
```typescript
class StdioTransport {
  private process: ChildProcess
  
  async start(command: string, args: string[], env?: Record<string, string>) {
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env }
    })
    
    this.setupEventHandlers()
  }
  
  async send(message: JSONRPCMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = generateId()
      this.pendingRequests.set(id, { resolve, reject })
      
      this.process.stdin.write(JSON.stringify({
        ...message,
        id
      }) + '\n')
    })
  }
}
```

#### 2. JSON-RPC 协议

**消息格式**
```typescript
interface JSONRPCRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}
```

**方法调用示例**
```typescript
// 获取可用工具
const tools = await mcpTransport.send({
  method: 'tools/list',
  params: {}
})

// 执行工具调用
const result = await mcpTransport.send({
  method: 'tools/call',
  params: {
    name: 'web_search',
    arguments: { query: 'AI技术发展趋势' }
  }
})
```

### 安全通信设计

#### 1. 数据验证和清理

**输入验证**
```typescript
function validateIpcInput(channel: string, data: any): boolean {
  // 通道白名单检查
  if (!ALLOWED_CHANNELS.includes(channel)) {
    throw new Error(`Unauthorized channel: ${channel}`)
  }
  
  // 数据类型验证
  if (channel.startsWith('kb:') && !isValidKnowledgeBaseRequest(data)) {
    throw new Error('Invalid knowledge base request')
  }
  
  return true
}
```

#### 2. 错误处理和监控

**统一错误处理**
```typescript
// IPC 错误处理
ipcMain.handle('*', async (event, channel, ...args) => {
  try {
    validateIpcInput(channel, args)
    return await handleRequest(channel, ...args)
  } catch (error) {
    sentry.captureException(error, {
      tags: {
        component: 'ipc',
        channel: channel
      }
    })
    throw error
  }
})
```

#### 3. 性能监控

**请求性能追踪**
```typescript
async function trackedInvoke<T>(
  channel: string, 
  ...args: any[]
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await electronAPI.invoke(channel, ...args)
    
    // 记录成功请求
    analytics.track('ipc_request', {
      channel,
      duration: performance.now() - startTime,
      status: 'success'
    })
    
    return result
  } catch (error) {
    // 记录失败请求
    analytics.track('ipc_request', {
      channel,
      duration: performance.now() - startTime,
      status: 'error',
      error: error.message
    })
    
    throw error
  }
}
```

## 4. 接口设计

### 核心数据接口

#### 消息系统接口

**Message 接口 - 统一消息结构**
```typescript
interface Message {
  id: string                          // 唯一标识符
  role: MessageRole                   // 消息角色
  contentParts: MessageContentParts[] // 结构化内容
  reasoningContent?: string           // 推理内容 (Claude等)
  timestamp?: number                  // 时间戳
  tokensUsed?: number                 // 使用的令牌数
  generating?: boolean                // 是否正在生成
  
  // 性能指标
  wordCount?: number
  tokenCount?: number
  firstTokenLatency?: number
  
  // 错误处理
  errorCode?: number
  error?: string
  errorExtra?: Record<string, unknown>
}

type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

type MessageContentParts = 
  | MessageTextPart      // 纯文本内容
  | MessageImagePart     // 图片内容
  | MessageInfoPart      // 信息提示
  | MessageToolCallPart  // 工具调用
  | MessageReasoningPart // 推理过程
```

**会话系统接口**
```typescript
interface Session {
  id: string                              // 会话ID
  type?: SessionType                      // 会话类型
  name: string                            // 会话名称
  messages: Message[]                     // 消息列表
  settings?: SessionSettings              // 会话设置
  threads?: SessionThread[]               // 对话分支
  messageForksHash?: Record<string, ForkData> // 消息分叉
  starred?: boolean                       // 是否收藏
  copilotId?: string                      // 助手ID
}

type SessionType = 'chat' | 'picture'

interface SessionSettings {
  provider: ModelProvider                 // AI提供商
  modelId: string                        // 模型ID
  maxContextMessageCount: number          // 最大上下文消息数
  temperature: number                     // 温度参数
  topP: number                           // TopP参数
  maxTokens?: number                     // 最大令牌数
  providerOptions?: ProviderOptions      // 提供商特定选项
}
```

### AI 模型接口设计

#### 统一模型接口
```typescript
interface ModelInterface {
  name: string                           // 模型名称
  modelId: string                        // 模型标识符
  
  // 能力检测
  isSupportVision(): boolean             // 是否支持视觉
  isSupportToolUse(scope?: ToolUseScope): boolean // 是否支持工具使用
  isSupportReasoning(): boolean          // 是否支持推理
  
  // 核心功能
  chat(
    messages: CoreMessage[], 
    options: CallChatCompletionOptions
  ): Promise<StreamTextResult>           // 聊天功能
  
  paint(prompt: string, num: number): Promise<string[]> // 图片生成
}

interface CallChatCompletionOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
  onChunk?: (chunk: any) => void         // 流式回调
  onFinish?: (result: any) => void       // 完成回调
  tools?: Tool[]                         // 可用工具
  toolChoice?: ToolChoice                // 工具选择策略
  providerOptions?: Record<string, any>  // 提供商选项
}
```

#### 抽象基类
```typescript
abstract class AbstractAISDKModel implements ModelInterface {
  protected options: ModelOptions
  protected dependencies: ModelDependencies
  
  constructor(options: ModelOptions, dependencies: ModelDependencies) {
    this.options = options
    this.dependencies = dependencies
  }
  
  // 抽象方法 - 子类必须实现
  protected abstract getProvider(): Pick<Provider, 'languageModel'>
  protected abstract getChatModel(): LanguageModelV1
  
  // 统一实现的核心方法
  public async chat(
    messages: CoreMessage[],
    options: CallChatCompletionOptions
  ): Promise<StreamTextResult> {
    const model = this.getChatModel()
    const callSettings = this.getCallSettings(options)
    
    return await streamText({
      model,
      messages: this.preprocessMessages(messages),
      ...callSettings,
      onChunk: this.createChunkHandler(options.onChunk),
      onFinish: options.onFinish,
    })
  }
}
```

### IPC API 接口

#### 系统级 API
```typescript
interface SystemAPI {
  // 应用信息
  getVersion(): Promise<string>
  getPlatform(): Promise<NodeJS.Platform>
  getArch(): Promise<string>
  getHostname(): Promise<string>
  getLocale(): Promise<string>
  
  // 窗口控制
  setFullscreen(fullscreen: boolean): Promise<void>
  isFullscreen(): Promise<boolean>
  relaunch(): Promise<void>
  
  // 系统集成
  openLink(url: string): Promise<void>
  ensureShortcuts(settings: ShortcutSettings): Promise<void>
  ensureProxy(proxy?: string): Promise<void>
  ensureAutoLaunch(enable: boolean): Promise<void>
}
```

#### 存储 API
```typescript
interface StorageAPI {
  // 配置存储
  getStoreValue<T>(key: string): Promise<T>
  setStoreValue<T>(key: string, value: T): Promise<void>
  delStoreValue(key: string): Promise<void>
  
  // 二进制存储
  getStoreBlob(key: string): Promise<string | null>
  setStoreBlob(key: string, value: string): Promise<void>
  delStoreBlob(key: string): Promise<void>
  listStoreBlobKeys(): Promise<string[]>
}
```

#### 知识库 API
```typescript
interface KnowledgeBaseAPI {
  // 知识库管理
  'kb:list'(): Promise<KnowledgeBase[]>
  'kb:create'(data: CreateKnowledgeBaseRequest): Promise<KnowledgeBase>
  'kb:update'(id: number, data: UpdateKnowledgeBaseRequest): Promise<void>
  'kb:delete'(id: number): Promise<void>
  
  // 文件管理
  'kb:file:list'(kbId: number): Promise<KnowledgeBaseFile[]>
  'kb:file:list-paginated'(kbId: number, offset: number, limit: number): Promise<{
    files: KnowledgeBaseFile[]
    total: number
  }>
  'kb:file:upload'(kbId: number, filePath: string): Promise<KnowledgeBaseFile>
  'kb:file:delete'(fileId: number): Promise<void>
  'kb:file:retry'(fileId: number): Promise<void>
  'kb:file:pause'(fileId: number): Promise<void>
  'kb:file:resume'(fileId: number): Promise<void>
  
  // 搜索和检索
  'kb:search'(request: SearchRequest): Promise<SearchResult[]>
  'kb:file:read-chunks'(request: ReadChunksRequest): Promise<ChunkResult[]>
}

interface SearchRequest {
  kbId: number
  query: string
  limit?: number
}

interface SearchResult {
  fileId: number
  chunkIndex: number
  content: string
  score: number
  metadata?: Record<string, any>
}
```

#### MCP API
```typescript
interface MCPAPI {
  // 传输管理
  'mcp:stdio-transport:create'(config: MCPTransportConfig): Promise<string>
  'mcp:stdio-transport:start'(transportId: string): Promise<void>
  'mcp:stdio-transport:send'(
    transportId: string, 
    message: JSONRPCMessage
  ): Promise<any>
  'mcp:stdio-transport:close'(transportId: string): Promise<void>
  
  // 事件监听
  addMcpStdioTransportEventListener(
    transportId: string,
    event: string,
    callback: (...args: any[]) => void
  ): void
}

interface MCPTransportConfig {
  command: string
  args: string[]
  env?: Record<string, string>
}
```

### 平台抽象接口

#### 平台统一接口
```typescript
interface Platform {
  type: PlatformType                     // 平台类型
  
  // 系统集成
  getVersion(): Promise<string>
  shouldUseDarkColors(): Promise<boolean>
  onSystemThemeChange(callback: () => void): () => void
  openLink(url: string): Promise<void>
  
  // 存储操作  
  setStoreValue(key: string, value: any): Promise<void>
  getStoreValue(key: string): Promise<any>
  delStoreValue(key: string): Promise<void>
  
  // 文件处理
  parseFileLocally(file: File): Promise<{
    key?: string
    isSupported: boolean
  }>
  
  // 功能控制器
  getKnowledgeBaseController(): KnowledgeBaseController
}

type PlatformType = 'web' | 'desktop' | 'mobile'
```

#### 桌面平台实现
```typescript
class DesktopPlatform implements Platform {
  type: PlatformType = 'desktop'
  
  async getVersion(): Promise<string> {
    return await window.electronAPI.invoke('getVersion')
  }
  
  async setStoreValue(key: string, value: any): Promise<void> {
    return await window.electronAPI.invoke('setStoreValue', key, value)
  }
  
  getKnowledgeBaseController(): KnowledgeBaseController {
    return new DesktopKnowledgeBaseController()
  }
}
```

#### Web 平台实现
```typescript
class WebPlatform implements Platform {
  type: PlatformType = 'web'
  private storage = localforage
  
  async getVersion(): Promise<string> {
    return process.env.npm_package_version || 'unknown'
  }
  
  async setStoreValue(key: string, value: any): Promise<void> {
    return await this.storage.setItem(key, value)
  }
  
  getKnowledgeBaseController(): KnowledgeBaseController {
    return new WebKnowledgeBaseController() // 降级实现
  }
}
```

### 错误处理接口

#### 错误类型定义
```typescript
abstract class BaseError extends Error {
  public code: number = 1
  public context?: Record<string, any>
  
  constructor(message: string, context?: Record<string, any>) {
    super(message)
    this.context = context
  }
}

class ApiError extends BaseError {
  public code = 10001
  public responseBody?: string
  public statusCode?: number
}

class KnowledgeBaseError extends BaseError {
  public code = 20001
}

class MCPError extends BaseError {
  public code = 30001
  public transportId?: string
}
```

#### 错误处理器接口
```typescript
interface ErrorHandler {
  captureException(error: Error, context?: Record<string, any>): void
  withScope(callback: (scope: any) => void): void
}

interface SentryAdapter extends ErrorHandler {
  configureScope(callback: (scope: any) => void): void
  addBreadcrumb(breadcrumb: any): void
}
```

## 5. UI设计

### 设计系统架构

#### 主题系统设计
```typescript
// 双主题系统 - Mantine + Material-UI
interface ChatboxTheme {
  // 基础色彩系统
  colors: {
    'chatbox-primary': [string, ...],      // 主色调 (9个色阶)
    'chatbox-secondary': [string, ...],    // 次要色调
    'chatbox-background-primary': [string, ...], // 背景色
    'chatbox-border-primary': [string, ...],     // 边框色
    'chatbox-brand': [string, ...],        // 品牌色
  }
  
  // 响应式断点
  breakpoints: {
    xs: '576px',
    sm: '768px', 
    md: '992px',
    lg: '1200px',
    xl: '1400px'
  }
  
  // 组件默认样式
  components: {
    Text: { defaultProps: { size: 'sm', c: 'chatbox-primary' } },
    Button: { defaultProps: { color: 'chatbox-brand' } },
    Modal: { defaultProps: { zIndex: 1000 } }
  }
}
```

#### 布局系统
```
应用布局结构
┌─────────────────────────────────────────┐
│              应用根容器                  │
├─────────────┬───────────────────────────┤
│             │           Header          │
│   Sidebar   ├───────────────────────────┤
│             │                           │
│ SessionList │       MessageList         │
│             │                           │
│             ├───────────────────────────┤
│             │         InputBox          │
└─────────────┴───────────────────────────┘
```

### 核心组件设计

#### 1. 消息系统组件

**MessageList 组件 - 虚拟化消息列表**
```typescript
interface MessageListProps {
  className?: string
  currentSession: Session
}

// 关键特性
const MessageList: React.FC<MessageListProps> = ({ currentSession }) => {
  return (
    <Virtuoso
      data={currentMessageList}
      increaseViewportBy={{ top: 2000, bottom: 2000 }}  // 性能优化
      followOutput={true}                                // 自动滚动
      restoreStateFrom={sessionScrollPositionCache}     // 状态恢复
      itemContent={(index, message) => (
        <Message 
          key={message.id}
          msg={message}
          sessionId={currentSession.id}
          sessionType={currentSession.type}
          preferCollapsedCodeBlock={index < currentMessageList.length - 10}
        />
      )}
    />
  )
}
```

**Message 组件 - 多模态消息渲染**
```typescript
interface MessageProps {
  sessionId: string
  sessionType: SessionType
  msg: Message
  preferCollapsedCodeBlock?: boolean  // 性能优化
  hiddenButtonGroup?: boolean
  small?: boolean
  collapseThreshold?: number
}

// 支持的内容类型
const MessageContentRenderer = {
  text: TextContentPart,          // Markdown + 语法高亮
  image: ImageContentPart,        // 图片预览 + OCR结果
  info: InfoContentPart,          // 系统信息提示
  'tool-call': ToolCallPart,      // 工具调用展示
  reasoning: ReasoningPart,       // 推理过程展示
  artifact: ArtifactPart,         // 代码预览执行
}
```

**InputBox 组件 - 多模态输入界面**
```typescript
interface InputBoxProps {
  sessionId?: string
  sessionType?: SessionType
  generating?: boolean
  model?: { provider: string; modelId: string }
  onSubmit?(payload: InputBoxPayload): Promise<boolean>
  onSelectModel?(provider: string, model: string): void
}

interface InputBoxPayload {
  input: string                   // 文本输入
  pictureKeys?: string[]          // 图片附件
  attachments?: File[]            // 文件附件
  links?: { url: string }[]       // 链接附件
  needGenerating?: boolean        // 是否需要生成
}

// 功能特性
const InputBoxFeatures = {
  fileUpload: '拖拽上传文件',
  imagePreview: '图片预览和压缩',
  webBrowsing: 'Web搜索集成',
  knowledgeBase: '知识库文档选择',
  mcpTools: 'MCP工具集成',
  draftSaving: '草稿自动保存',
  shortcuts: '可配置快捷键',
  modelSelector: '内联模型切换'
}
```

#### 2. 导航和布局组件

**Sidebar 组件 - 可响应侧边栏**
```typescript
interface SidebarProps {
  className?: string
}

// 响应式设计
const Sidebar: React.FC<SidebarProps> = () => {
  const [showSidebar] = useAtom(atoms.showSidebarAtom)
  const screenSize = useScreenChange()
  
  // 移动端抽屉模式，桌面端持久模式
  const DrawerComponent = screenSize === 'mobile' ? Drawer : Box
  
  return (
    <DrawerComponent>
      <Stack spacing={0}>
        <ActionButtons />      {/* 新建聊天、图片生成、设置 */}
        <SessionList />        {/* 会话列表 */}
        <UserSection />        {/* 用户信息 */}
      </Stack>
    </DrawerComponent>
  )
}
```

**SessionList 组件 - 可排序会话列表**
```typescript
interface SessionListProps {
  className?: string
}

// DnD Kit 拖拽排序
const SessionList: React.FC<SessionListProps> = () => {
  const [sessions, setSessions] = useAtom(atoms.sessionsListAtom)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )
  
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={sessions} strategy={verticalListSortingStrategy}>
        {sessions.map(session => (
          <SortableSessionItem key={session.id} session={session} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

#### 3. 设置和配置组件

**设置页面路由结构**
```
/settings/
├── general                 # 通用设置
├── chat                   # 聊天设置  
├── provider/              # AI提供商配置
│   ├── index             # 提供商列表
│   ├── $providerId       # 单个提供商设置
│   └── chatbox-ai        # ChatboxAI特殊设置
├── knowledge-base         # 知识库管理
├── mcp                   # MCP服务器管理
└── web-search            # Web搜索设置
```

**ModelSelector 组件 - 智能模型选择器**
```typescript
interface ModelSelectorProps {
  value?: { provider: string; modelId: string }
  onChange?: (provider: string, modelId: string) => void
  favorites?: boolean        // 是否显示收藏模型
  grouped?: boolean         // 是否按提供商分组
  showCapabilities?: boolean // 是否显示模型能力
}

// 模型能力标识
const CapabilityBadges = {
  vision: <Badge>👁️ 视觉</Badge>,
  reasoning: <Badge>🧠 推理</Badge>,
  tool_use: <Badge>🔧 工具</Badge>,
  web_search: <Badge>🌐 搜索</Badge>
}
```

### 状态管理设计

#### Jotai 原子化状态架构
```typescript
// 状态原子分层设计
const StateArchitecture = {
  // 核心数据原子
  core: {
    settingsAtom: atom<Settings>(),
    sessionsListAtom: atomWithStorage<SessionMeta[]>(),
    currentSessionAtom: atom<Session | null>()
  },
  
  // 派生状态原子
  derived: {
    currentMessageListAtom: atom(get => {
      const session = get(currentSessionAtom)
      const threadHash = get(currentThreadHistoryHashAtom)
      return computeMessageContext(session, threadHash)
    }),
    
    providersAtom: atom(get => {
      const settings = get(settingsAtom)
      return mergeProvidersWithDefaults(settings.providers)
    })
  },
  
  // UI 状态原子
  ui: {
    showSidebarAtom: atom<boolean>(true),
    messageScrollingAtom: atom<RefObject<VirtuosoHandle>>(),
    inputBoxWebBrowsingModeAtom: atom<boolean>(false),
    quoteAtom: atom<string>('')
  }
}
```

#### 响应式更新模式
```typescript
// 原子间依赖关系
const AtomDependencies = {
  // 设置变更自动同步到平台
  settingsAtom: (newSettings, prevSettings) => {
    if (newSettings.shortcuts !== prevSettings.shortcuts) {
      platform.ensureShortcuts(newSettings.shortcuts)
    }
    if (newSettings.proxy !== prevSettings.proxy) {
      platform.ensureProxy(newSettings.proxy)
    }
  },
  
  // 会话切换自动更新UI
  currentSessionIdAtom: (sessionId) => {
    // 清理输入状态
    setQuote('')
    setInputBoxWebBrowsingMode(false)
    // 恢复滚动位置
    restoreScrollPosition(sessionId)
  }
}
```

### 组件复用设计

#### 通用UI组件库
```typescript
// 自定义组件系统
const UIComponents = {
  // 表单控件
  forms: {
    PasswordTextField: '密码输入框',
    LazyNumberInput: '延迟数字输入',
    CreatableSelect: '可创建选择器',
    SimpleSelect: '简单选择器'
  },
  
  // 滑块控件
  sliders: {
    TemperatureSlider: '温度调节滑块',
    TopPSlider: 'TopP调节滑块', 
    MaxTokensSlider: '最大令牌滑块',
    MaxContextSlider: '最大上下文滑块'
  },
  
  // 业务组件
  business: {
    MessageParts: '消息内容部分',
    KnowledgeBaseComponents: '知识库组件',
    MCPComponents: 'MCP管理组件',
    ProviderComponents: '提供商配置组件'
  }
}
```

#### 性能优化策略
```typescript
// 组件性能优化
const PerformanceOptimizations = {
  virtualization: {
    component: 'React Virtuoso',
    purpose: '大列表虚拟滚动',
    usage: 'MessageList, SessionList'
  },
  
  memoization: {
    technique: 'React.memo + useMemo',
    purpose: '防止不必要重渲染',
    usage: 'Message, SessionItem'
  },
  
  lazyLoading: {
    technique: 'React.lazy + Suspense',
    purpose: '代码分割',
    usage: '设置页面, 模态框组件'
  },
  
  debouncing: {
    technique: 'lodash.debounce',
    purpose: '减少频繁操作',
    usage: '搜索输入, 设置保存'
  }
}
```

### 国际化设计

#### 多语言支持系统
```typescript
// i18n 配置
const I18nConfiguration = {
  languages: [
    'en', 'zh-CN', 'zh-TW', 'ja', 'ko', 
    'de', 'fr', 'es', 'pt', 'ru', 'ar', 'hi', 'th'
  ],
  
  structure: {
    'src/renderer/i18n/locales/': {
      'en/': ['common.json', 'settings.json', 'errors.json'],
      'zh-CN/': ['common.json', 'settings.json', 'errors.json'],
      // ... 其他语言
    }
  },
  
  usage: {
    component: "const { t } = useTranslation()",
    template: "t('common:button.save')",
    interpolation: "t('message.tokenCount', { count: 150 })"
  }
}
```

### 主题和样式系统

#### 自适应主题设计
```typescript
// 主题响应系统
const ThemeSystem = {
  detection: {
    system: 'nativeTheme.shouldUseDarkColors',
    user: 'settings.theme', // 'light' | 'dark' | 'auto'
    realtime: 'onSystemThemeChange event'
  },
  
  implementation: {
    mantine: 'createTheme({ colorScheme })',
    materialUI: 'createTheme({ palette: { mode } })',
    css: 'CSS Custom Properties'
  },
  
  components: {
    adaptive: '组件自动适配主题',
    override: '特殊组件主题覆盖',
    transition: '主题切换动画'
  }
}
```

#### 响应式设计策略
```typescript
// 响应式断点系统
const ResponsiveStrategy = {
  breakpoints: {
    mobile: '< 768px',    // 移动端
    tablet: '768-1024px', // 平板
    desktop: '> 1024px'   // 桌面端
  },
  
  adaptations: {
    sidebar: {
      mobile: 'Drawer (抽屉)',
      desktop: 'Persistent (持久)'
    },
    
    messageList: {
      mobile: '简化操作按钮',
      desktop: '完整操作菜单'
    },
    
    inputBox: {
      mobile: '触摸优化',
      desktop: '键盘快捷键'
    }
  }
}
```

## 6. 服务详解

### 主进程核心服务

#### 1. 应用控制器 (main.ts)
**功能**: Electron 应用生命周期和窗口管理

```typescript
// 核心函数详解
class MainController {
  // 窗口管理
  async createWindow(): Promise<BrowserWindow> {
    // 创建主窗口，配置安全策略和开发者工具
    // 返回: BrowserWindow 实例
  }
  
  showOrHideWindow(): void {
    // 智能窗口显示/隐藏，处理焦点状态
    // 用途: 全局快捷键和托盘交互
  }
  
  // 快捷键管理
  registerShortcuts(settings?: ShortcutSetting): void {
    // 注册全局快捷键，支持自定义配置
    // 参数: 快捷键设置对象
  }
  
  unregisterShortcuts(): void {
    // 清理所有全局快捷键注册
  }
  
  // 系统托盘
  createTray(): Tray {
    // 创建系统托盘图标和上下文菜单
    // 返回: Tray 实例
  }
  
  // 快捷键验证
  isValidShortcut(shortcut: string): boolean {
    // 验证快捷键格式，确保包含非修饰键
    // 返回: 是否为有效快捷键
  }
}
```

#### 2. 存储管理器 (store-node.ts)  
**功能**: 持久化存储和备份恢复

```typescript
class StoreManager {
  // 核心存储操作
  getSettings(): Settings {
    // 获取应用设置，合并默认值
    // 返回: 完整的设置对象
  }
  
  getConfig(): Config {
    // 获取应用配置，自动创建UUID
    // 返回: 配置对象
  }
  
  // 备份系统
  async backup(): Promise<string | undefined> {
    // 创建带时间戳的配置备份
    // 返回: 备份文件路径或undefined
  }
  
  getBackups(): BackupFile[] {
    // 获取所有备份文件，按时间排序
    // 返回: 备份文件信息数组
  }
  
  async clearBackups(): Promise<void> {
    // 智能备份清理：保留最近2天每小时、30天每日备份
  }
  
  // 二进制存储
  async getStoreBlob(key: string): Promise<string | null> {
    // 读取二进制数据 (图片、文件)
    // 参数: 存储键名
    // 返回: 文件内容或null
  }
  
  async setStoreBlob(key: string, value: string): Promise<void> {
    // 存储二进制数据到文件系统
    // 参数: 键名、数据内容
  }
}
```

#### 3. 知识库系统

**数据库管理器 (knowledge-base/db.ts)**
```typescript
class KnowledgeBaseDB {
  async initializeDatabase(): Promise<void> {
    // 初始化SQLite数据库和向量存储
    // 创建表结构，设置crypto polyfill
  }
  
  getDatabase(): Client {
    // 获取LibSQL客户端单例
    // 返回: 数据库客户端
  }
  
  getVectorStore(): LibSQLVector {
    // 获取向量存储实例
    // 返回: 向量数据库接口
  }
  
  async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    // 数据库事务包装器，自动回滚错误
    // 参数: 事务操作函数
    // 返回: 操作结果
  }
  
  async checkProcessingTimeouts(): Promise<void> {
    // 检测并处理超时的文件处理任务 (5分钟超时)
  }
}
```

**文件处理器 (knowledge-base/file-loaders.ts)**
```typescript
class FileProcessor {
  async processFileWithMastra(
    filePath: string, 
    fileMeta: FileMeta, 
    kbId: number
  ): Promise<void> {
    // 完整文件处理流水线：解析→分块→向量化→存储
    // 支持断点续传，批量处理 (50块/批次)
    // 参数: 文件路径、元数据、知识库ID
  }
  
  async searchKnowledgeBase(
    kbId: number, 
    query: string
  ): Promise<SearchResult[]> {
    // 语义搜索：向量相似度+重排序
    // 参数: 知识库ID、查询文本
    // 返回: 搜索结果数组 (相关度排序)
  }
  
  async startWorkerLoop(): Promise<void> {
    // 启动后台处理循环，3秒轮询间隔
    // 自动处理pending状态的文件
  }
  
  async readChunks(
    kbId: number, 
    chunks: ChunkReference[]
  ): Promise<ChunkResult[]> {
    // 批量读取指定文档块内容
    // 参数: 知识库ID、块引用数组
    // 返回: 块内容结果
  }
}
```

**IPC处理器 (knowledge-base/ipc-handlers.ts)**
```typescript
class KnowledgeBaseIPC {
  registerKnowledgeBaseHandlers(): void {
    // 注册所有知识库相关IPC通道
    
    // 知识库管理
    'kb:list' -> 列出所有知识库
    'kb:create' -> 创建新知识库
    'kb:update' -> 更新知识库配置
    'kb:delete' -> 删除知识库
    
    // 文件管理  
    'kb:file:list' -> 列出知识库文件
    'kb:file:upload' -> 上传文件到知识库
    'kb:file:delete' -> 删除文件
    'kb:file:retry' -> 重试失败文件
    'kb:file:pause' -> 暂停处理
    'kb:file:resume' -> 恢复处理
    
    // 搜索功能
    'kb:search' -> 语义搜索
    'kb:file:read-chunks' -> 读取文档块
  }
}
```

#### 4. MCP协议服务 (mcp/ipc-stdio-transport.ts)

```typescript
class MCPTransport {
  async createStdioTransport(config: MCPTransportConfig): Promise<string> {
    // 创建stdio传输通道
    // 参数: 传输配置 (命令、参数、环境变量)
    // 返回: 传输ID
  }
  
  async startTransport(transportId: string): Promise<void> {
    // 启动MCP服务器进程
    // 设置stdin/stdout管道通信
  }
  
  async sendMessage(
    transportId: string, 
    message: JSONRPCMessage
  ): Promise<any> {
    // 发送JSON-RPC消息到MCP服务器
    // 参数: 传输ID、消息对象
    // 返回: 服务器响应
  }
  
  async closeTransport(transportId: string): Promise<void> {
    // 优雅关闭传输通道和子进程
  }
  
  async enhanceEnv(configEnv?: Record<string, string>): Promise<Record<string, string>> {
    // 增强环境变量，合并shell环境
    // 确保MCP服务器有正确的PATH和环境
  }
}
```

### 渲染进程核心服务

#### 1. 状态管理 (stores/)

**会话状态原子 (atoms/sessionAtoms.ts)**
```typescript
// 核心原子定义
export const sessionsListAtom = atomWithStorage<SessionMeta[]>('chat-sessions-list', [])
export const currentSessionIdAtom = atom<string | null>(null)
export const currentSessionAtom = atom<Session | null>((get) => {
  const sessionId = get(currentSessionIdAtom)
  const sessionsList = get(sessionsListAtom)
  
  // 智能会话选择：验证ID存在性，自动回退
  if (!sessionId && sessionsList.length > 0) {
    return loadSession(sessionsList[0].id)
  }
  
  return sessionId ? loadSession(sessionId) : null
})

export const currentMessageListAtom = atom<Message[]>((get) => {
  const session = get(currentSessionAtom)
  const threadHash = get(currentThreadHistoryHashAtom)
  
  // 复杂消息上下文计算：处理分支、迁移数据
  return computeMessageContext(session, threadHash)
})
```

**设置状态原子 (atoms/settingsAtoms.ts)**
```typescript
// 焦点原子 - 细粒度响应
export const settingsAtom = atom<Settings>(() => {
  // 合并默认设置和存储设置，处理迁移
  return migrateSettings(storedSettings, defaultSettings)
})

export const languageAtom = focusAtom(settingsAtom, (optic) => optic.prop('language'))
export const themeAtom = focusAtom(settingsAtom, (optic) => optic.prop('theme'))
export const providersAtom = atom((get) => {
  const settings = get(settingsAtom)
  // 合并内置和自定义提供商
  return mergeProvidersWithDefaults(settings.providers)
})
```

**会话操作 (sessionActions.ts)**
```typescript
class SessionActions {
  async sendMessage(payload: InputBoxPayload): Promise<boolean> {
    // 发送消息的完整流程
    // 1. 验证输入和模型配置
    // 2. 创建用户消息
    // 3. 调用AI模型
    // 4. 处理流式响应
    // 5. 更新会话状态
  }
  
  async regenerateMessage(messageId: string): Promise<void> {
    // 重新生成AI回复
    // 保留原始用户消息，替换AI回复
  }
  
  async createSession(type: SessionType = 'chat'): Promise<string> {
    // 创建新会话
    // 生成UUID，设置默认名称，保存到存储
    // 返回: 新会话ID
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    // 删除会话和相关数据
    // 处理当前会话切换逻辑
  }
}
```

#### 2. 平台抽象层

**桌面平台 (platform/desktop_platform.ts)**
```typescript
class DesktopPlatform implements Platform {
  type: PlatformType = 'desktop'
  
  async getVersion(): Promise<string> {
    return await window.electronAPI.invoke('getVersion')
  }
  
  async setStoreValue(key: string, value: any): Promise<void> {
    return await window.electronAPI.invoke('setStoreValue', key, value)
  }
  
  async parseFileLocally(file: File): Promise<{key?: string; isSupported: boolean}> {
    // 调用主进程解析文件，返回存储键和支持状态
    return await window.electronAPI.invoke('parseFileLocally', file)
  }
  
  getKnowledgeBaseController(): KnowledgeBaseController {
    return new DesktopKnowledgeBaseController()
  }
}
```

**Web平台 (platform/web_platform.ts)**
```typescript
class WebPlatform implements Platform {
  type: PlatformType = 'web'
  private storage = localforage
  
  async getVersion(): Promise<string> {
    return process.env.npm_package_version || 'unknown'
  }
  
  async setStoreValue(key: string, value: any): Promise<void> {
    return await this.storage.setItem(key, value)
  }
  
  async parseFileLocally(file: File): Promise<{key?: string; isSupported: boolean}> {
    // Web环境的文件处理降级实现
    return { isSupported: false }
  }
  
  getKnowledgeBaseController(): KnowledgeBaseController {
    return new WebKnowledgeBaseController() // 降级实现
  }
}
```

### 共享服务核心

#### 1. AI模型抽象基类 (shared/models/abstract-ai-sdk.ts)

```typescript
abstract class AbstractAISDKModel implements ModelInterface {
  // 抽象方法 - 子类必须实现
  protected abstract getProvider(): Pick<Provider, 'languageModel'>
  protected abstract getChatModel(): LanguageModelV1
  
  // 统一聊天接口
  async chat(
    messages: CoreMessage[], 
    options: CallChatCompletionOptions
  ): Promise<StreamTextResult> {
    const model = this.getChatModel()
    const callSettings = this.getCallSettings(options)
    
    return await streamText({
      model,
      messages: this.preprocessMessages(messages),
      ...callSettings,
      onChunk: this.createChunkHandler(options.onChunk),
      onFinish: options.onFinish,
    })
  }
  
  // 能力检测
  isSupportVision(): boolean {
    // 基于模型ID检测视觉能力
    const visionModels = ['gpt-4-vision', 'claude-3', 'gemini-pro-vision']
    return visionModels.some(model => this.modelId.includes(model))
  }
  
  isSupportToolUse(): boolean {
    // 检测工具使用能力
    return !this.modelId.includes('legacy')
  }
  
  // 推理内容处理
  private createChunkHandler(onChunk?: (chunk: any) => void) {
    return (chunk: any) => {
      // 处理推理内容、工具调用、普通文本
      this.processReasoningContent(chunk)
      this.processToolCalls(chunk)
      onChunk?.(chunk)
    }
  }
}
```

#### 2. 具体模型实现

**OpenAI实现 (shared/models/openai.ts)**
```typescript
export default class OpenAI extends AbstractAISDKModel {
  protected getProvider() {
    return createOpenAI({
      apiKey: this.options.apiKey,
      baseURL: this.options.apiHost,
      fetch: createFetchWithProxy(this.options.useProxy, this.dependencies),
      headers: this.getProviderHeaders(),
    })
  }
  
  protected getChatModel() {
    const provider = this.getProvider()
    return provider.chat(this.options.model.modelId)
  }
  
  async paint(prompt: string, num: number): Promise<string[]> {
    // DALL-E图片生成实现
    const provider = this.getProvider()
    const result = await provider.images.generate({
      prompt,
      n: num,
      size: '1024x1024',
    })
    return result.data.map(img => img.url)
  }
}
```

**Claude实现 (shared/models/claude.ts)**
```typescript
export default class Claude extends AbstractAISDKModel {
  isSupportReasoning(): boolean {
    // Claude 3.5 Sonnet支持推理
    return this.options.model.modelId.includes('3-5-sonnet')
  }
  
  protected getCallSettings(options: CallChatCompletionOptions): CallSettings {
    const isReasoningModel = this.isSupportReasoning()
    
    if (isReasoningModel) {
      return {
        ...super.getCallSettings(options),
        providerOptions: {
          anthropic: {
            thinking: options.enableReasoning ?? true
          }
        }
      }
    }
    
    return super.getCallSettings(options)
  }
}
```

#### 3. 请求处理 (shared/request/request.ts)

```typescript
export function createAfetch(platformInfo: PlatformInfo) {
  return async function afetch(
    url: RequestInfo | URL, 
    init?: RequestInit, 
    options: AfetchOptions = {}
  ) {
    const retry = options.retry || 0
    let lastError: Error
    
    // 重试循环
    for (let i = 0; i <= retry; i++) {
      try {
        // 平台特定头部注入
        if (isChatboxAPI(url)) {
          init = injectPlatformHeaders(init, platformInfo)
        }
        
        const response = await fetch(url, init)
        
        if (!response.ok) {
          throw await parseAPIError(response)
        }
        
        return response
      } catch (error) {
        lastError = error
        if (i < retry) {
          // 指数退避
          await delay(500 * Math.pow(2, i))
        }
      }
    }
    
    throw lastError
  }
}
```

### 工具函数和错误处理

#### 消息处理工具 (shared/utils/message.ts)
```typescript
export function migrateMessage(message: LegacyMessage): Message {
  // 消息格式迁移：legacy content -> contentParts
  if (!message.contentParts && 'content' in message) {
    message.contentParts = [{ type: 'text', text: message.content }]
  }
  
  // Web搜索迁移：webBrowsing -> tool-call
  if ('webBrowsing' in message) {
    message.contentParts.unshift({
      type: 'tool-call',
      state: 'result',
      toolName: 'web_search',
      result: message.webBrowsing
    })
  }
  
  return message
}

export function sequenceMessages(messages: Message[]): Message[] {
  // 确保消息序列符合LLM要求：system -> user -> assistant交替
  const sequenced = []
  let lastRole = null
  
  for (const msg of messages) {
    if (msg.role === lastRole) {
      // 合并连续相同角色的消息
      const lastMsg = sequenced[sequenced.length - 1]
      lastMsg.contentParts = [...lastMsg.contentParts, ...msg.contentParts]
    } else {
      sequenced.push(msg)
      lastRole = msg.role
    }
  }
  
  return sequenced
}
```

---

这个完整的架构文档涵盖了Chatbox应用的所有核心组件和服务，为开发者提供了清晰的代码组织结构和实现细节参考。每个服务都有明确的职责分工，通过统一的接口设计实现了良好的模块化和可扩展性。
