# Knowlex Desktop Application - Technical Design Document v5.0

## 1. Overview and Architecture Principles

### 1.1 Project Vision

Knowlex is a cross-platform desktop application built with Electron that serves as an intelligent workspace for researchers, developers, technical writers, and analysts. The application integrates AI-powered conversations, project management, and knowledge accumulation into a unified work environment.

**Core Value Propositions:**
- **Dual-Mode RAG System**: Project-internal mode with vector search and project memory, and project-external mode for lightweight conversations with temporary file uploads
- **Project-Centric Workspace**: Aggregates conversations, files, memory, and notes into structured project environments
- **Editable Knowledge Sources**: Files stored as Markdown format with re-indexing capabilities
- **Complete Local Privacy**: All data stored locally using libsql (SQLite) for both structured and vector data
- **Multi-Modal Conversations**: Support for text, images, citations with streaming responses

### 1.2 Architecture Design Principles

**Three-Layer Electron Architecture** (inspired by Chatbox):
```
┌─────────────────────────────────────┐
│        Renderer Process             │
│    React + TypeScript + Jotai      │
│         UI and Interactions         │
├─────────────────────────────────────┤
│        Main Process                 │
│   Node.js + Electron + libsql      │
│     System Services & Data          │
├─────────────────────────────────────┤
│        Shared Code                  │
│   AI Model System + Core Types     │
│        Cross-Process Logic          │
└─────────────────────────────────────┘
```

**Core Design Principles:**
- **Unified Model Interface**: Abstract base classes for AI providers with consistent chat/embedding APIs
- **Atomic State Management**: Jotai-based reactive state with fine-grained updates
- **Secure IPC Communication**: Type-safe, validated communication between processes
- **Platform Abstraction**: Unified interface supporting desktop, web, and future mobile platforms
- **Extensible Plugin Architecture**: MCP (Model Context Protocol) support for external tools

## 2. System Architecture

### 2.1 Project Structure

**设计原则：**
- 功能单一，职责明确
- 模块化设计，便于测试和维护
- 避免过度抽象，保持代码简洁
- 优先可读性和可维护性

```
knowlex/
├── src/
│   ├── main/                     # 主进程 (Node.js + Electron)
│   │   ├── main.ts               # 应用入口：窗口创建、生命周期管理
│   │   ├── preload.ts            # IPC桥接：安全API暴露、contextBridge配置
│   │   ├── window.ts             # 窗口管理：创建、最小化、全屏、主题适配
│   │   ├── menu.ts               # 菜单管理：应用菜单、上下文菜单、快捷键
│   │   ├── database/             # 数据库模块
│   │   │   ├── index.ts          # 数据库连接：getDB(), closeDB(), 连接管理
│   │   │   ├── migrations.ts     # 数据库迁移：runMigrations(), 版本控制
│   │   │   └── queries.ts        # 常用查询：预定义查询函数、SQL模板
│   │   ├── services/             # 业务服务
│   │   │   ├── project.ts        # 项目管理：CRUD操作、项目统计
│   │   │   ├── conversation.ts   # 会话管理：创建、删除、移动、标题生成
│   │   │   ├── message.ts        # 消息管理：增删改查、流式处理
│   │   │   ├── file-temp.ts      # 临时文件处理：文本提取、格式验证
│   │   │   ├── file-project.ts   # 项目文件处理：上传、RAG处理、状态管理
│   │   │   ├── embedding.ts      # 向量化服务：文本嵌入、批量处理
│   │   │   ├── search.ts         # 搜索服务：向量检索、全文搜索
│   │   │   └── settings.ts       # 设置管理：配置读写、验证
│   │   ├── ai/                   # AI模型集成
│   │   │   ├── base.ts           # 基础接口：AIModel接口、统一抽象
│   │   │   ├── openai.ts         # OpenAI实现：chat(), stream(), 多模态支持
│   │   │   ├── claude.ts         # Claude实现：推理内容、工具调用
│   │   │   └── manager.ts        # 模型管理器：注册、获取、能力检测
│   │   ├── ipc/                  # IPC处理器
│   │   │   ├── project.ts        # 项目相关IPC：'project:*'通道处理
│   │   │   ├── conversation.ts   # 会话相关IPC：'conversation:*'通道处理
│   │   │   ├── file.ts           # 文件相关IPC：'file:*'通道处理
│   │   │   ├── search.ts         # 搜索相关IPC：'search:*'通道处理
│   │   │   └── settings.ts       # 设置相关IPC：'settings:*'通道处理
│   │   └── utils/                # 工具函数
│   │       ├── file.ts           # 文件工具：路径处理、格式检测
│   │       ├── text.ts           # 文本处理：分块、清理、格式化
│   │       └── validation.ts     # 数据验证：输入校验、类型检查
│   │
│   ├── renderer/                 # 渲染进程 (React + TypeScript)
│   │   ├── src/
│   │   │   ├── main.tsx          # React入口：应用挂载、错误边界
│   │   │   ├── App.tsx           # 主应用组件：路由配置、全局状态
│   │   │   ├── components/       # UI组件
│   │   │   │   ├── ui/           # 基础UI组件
│   │   │   │   │   ├── Button.tsx        # 按钮组件：variant支持、点击处理
│   │   │   │   │   ├── Input.tsx         # 输入框组件：受控组件、验证支持
│   │   │   │   │   ├── Modal.tsx         # 模态框组件：打开/关闭状态、遮罩层
│   │   │   │   │   ├── FileCard.tsx      # 文件卡片：信息显示、操作按钮
│   │   │   │   │   └── MessageBubble.tsx # 消息气泡：多部分内容、Markdown渲染
│   │   │   │   ├── layout/       # 布局组件
│   │   │   │   │   ├── Sidebar.tsx       # 侧边栏：项目列表、会话导航
│   │   │   │   │   ├── Header.tsx        # 头部栏：标题、操作按钮
│   │   │   │   │   └── MainLayout.tsx    # 主布局：侧边栏+内容区
│   │   │   │   └── features/     # 功能组件
│   │   │   │       ├── chat/
│   │   │   │       │   ├── ChatInterface.tsx    # 聊天界面：消息列表+输入框
│   │   │   │       │   ├── MessageList.tsx      # 消息列表：虚拟滚动、自动滚动
│   │   │   │       │   ├── InputBox.tsx         # 输入框：文件上传、发送处理
│   │   │   │       │   └── FileUpload.tsx       # 文件上传：拖拽支持、预览
│   │   │   │       ├── project/
│   │   │   │       │   ├── ProjectList.tsx      # 项目列表：卡片显示、CRUD操作
│   │   │   │       │   ├── ProjectDetail.tsx    # 项目详情：信息展示、统计数据
│   │   │   │       │   ├── FileManager.tsx      # 文件管理：上传、状态显示、操作
│   │   │   │       │   └── MemoryManager.tsx    # 记忆管理：项目记忆、笔记管理
│   │   │   │       └── settings/
│   │   │   │           ├── SettingsPanel.tsx    # 设置面板：选项卡、表单组织
│   │   │   │           ├── APISettings.tsx      # API设置：模型配置、连接测试
│   │   │   │           └── GeneralSettings.tsx  # 通用设置：主题、语言、快捷键
│   │   │   ├── stores/           # 状态管理
│   │   │   │   ├── app.ts        # 应用状态：主题、语言、侧边栏显示
│   │   │   │   ├── project.ts    # 项目状态：项目列表、当前项目、CRUD操作
│   │   │   │   ├── conversation.ts # 会话状态：会话列表、消息管理、流式处理
│   │   │   │   └── settings.ts   # 设置状态：API配置、通用设置、持久化
│   │   │   ├── hooks/            # 自定义Hooks
│   │   │   │   ├── useIPC.ts     # IPC通信Hook：统一调用接口、错误处理
│   │   │   │   ├── useChat.ts    # 聊天Hook：消息发送、流式响应处理
│   │   │   │   ├── useFiles.ts   # 文件Hook：上传、删除、状态监听
│   │   │   │   └── useSearch.ts  # 搜索Hook：全局搜索、结果处理
│   │   │   ├── pages/            # 页面组件
│   │   │   │   ├── ChatPage.tsx  # 聊天页面：主聊天界面容器
│   │   │   │   ├── ProjectPage.tsx # 项目页面：项目管理界面
│   │   │   │   └── SettingsPage.tsx # 设置页面：配置管理界面
│   │   │   └── utils/            # 前端工具
│   │   │       ├── format.ts     # 格式化工具：时间、文件大小、数字
│   │   │       ├── theme.ts      # 主题工具：颜色计算、主题切换
│   │   │       └── constants.ts  # 常量定义：UI常量、配置项
│   │   └── index.html            # HTML入口
│   │
│   └── shared/                   # 共享代码
│       ├── types/                # 类型定义
│       │   ├── project.ts        # 项目类型：Project, ProjectFile, ProjectMemory
│       │   ├── conversation.ts   # 会话类型：Conversation, Session, Thread
│       │   ├── message.ts        # 消息类型：Message, MessagePart, ContentType
│       │   ├── file.ts           # 文件类型：FileStatus, ProcessingResult
│       │   └── ipc.ts            # IPC类型：通道定义、请求响应类型
│       ├── constants/            # 常量
│       │   ├── app.ts            # 应用常量：版本、配置、限制
│       │   ├── file.ts           # 文件常量：支持格式、大小限制
│       │   └── ai.ts             # AI常量：模型列表、默认参数
│       └── utils/                # 共享工具
│           ├── id.ts             # ID生成：UUID、短ID生成
│           ├── time.ts           # 时间工具：格式化、相对时间
│           └── validation.ts     # 验证工具：数据校验、类型守卫
│
├── electron.vite.config.ts       # Vite配置
├── tsconfig.json                 # TypeScript配置
└── package.json                  # 项目配置
```

### 2.2 Three-Layer Process Architecture

**Main Process (`src/main/`)**
- Application lifecycle management (windows, menus, tray)
- Data storage and knowledge base system (libsql + vector database)
- System integration (shortcuts, auto-launch, proxy)
- File processing and parsing services
- MCP (Model Context Protocol) server management
- Secure IPC communication bridge

**Renderer Process (`src/renderer/`)**
- React user interface (chat, settings, file management)
- Jotai atomic state management
- Platform abstraction layer (cross-platform compatibility)
- Component-based UI design system
- Real-time streaming response handling

**Shared Code (`src/shared/`)**
- AI model provider unified interface (15+ providers support)
- Core data types (messages, sessions, settings)
- Network requests and error handling
- Common utility functions

### 2.3 开发环境双窗口架构

**设计目标**: 在开发模式下提供主应用界面和调试界面的分离，提高开发效率和调试体验。

**窗口管理策略**:
- **主窗口 (Main Window)**: 
  - 显示用户界面 (`MainApp` 组件)
  - 窗口标题: `Knowlex Desktop`
  - 尺寸: 1200x800 (最小 800x600)
  - 路由: 默认加载 `/` 路由
- **调试窗口 (Debug Window)**: 
  - 显示开发调试界面 (`DebugApp` 组件)
  - 窗口标题: `Knowlex Desktop - Debug Console`
  - 尺寸: 1400x900 (最小 1000x700)
  - 路由: 加载 `/?mode=debug` 路由
  - 自动打开 DevTools
  - 自动定位在主窗口右侧

**路由识别机制**:
- 使用 URL 参数 `?mode=debug` 区分窗口类型
- `App.tsx` 根据 URL 参数动态渲染对应组件
- 支持独立的错误处理和崩溃恢复

**开发体验优化**:
- 开发模式下自动创建两个窗口
- 调试窗口包含数据库测试、IPC框架测试、系统信息等开发工具
- 主窗口专注于用户界面开发和测试
- 独立的窗口生命周期管理

### 2.3 Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Application Framework** | Electron | Cross-platform desktop application |
| **Frontend Framework** | React 18 + TypeScript | User interface development |
| **State Management** | Zustand | Modular state management with persistence |
| **UI Component System** | Chakra UI | Complete component library with theming |
| **Routing System** | TanStack Router | Type-safe routing (if needed) |
| **Data Storage** | libsql (SQLite) | Local database with native vector support |
| **Vector Database** | LibSQLVector | Vector storage and similarity search |
| **AI Integration** | Vercel AI SDK | Unified interface for multiple AI providers |
| **Document Processing** | Custom RAG system | File parsing and vectorization |
| **Build Tool** | Vite (electron-vite) | Development and build tooling |
| **Internationalization** | i18next | Multi-language support |

## 3. 核心功能模块设计

### 3.1 设计原则

**代码简洁性原则：**
- 单一职责，功能明确
- 避免过度抽象和设计模式滥用
- 优先可读性和可维护性
- 接口简单，易于测试

**模块化原则：**
- 功能独立，低耦合
- 代码复用，避免重复
- 错误处理统一
- 支持单元测试

### 3.2 数据库模块 (`src/main/database/`)

**数据库连接管理 (`index.ts`):**
```typescript
// 数据库连接管理，提供统一的数据库访问接口
interface DatabaseManager {
  getDB(): Promise<Client>
  closeDB(): Promise<void>
  withTransaction<T>(operation: (db: Client) => Promise<T>): Promise<T>
  checkHealth(): Promise<boolean>
}

// 核心功能
export async function getDB(): Promise<Client>
export async function closeDB(): Promise<void>
export async function initializeDatabase(): Promise<void>
```

**数据库迁移 (`migrations.ts`):**
```typescript
// 版本化数据库迁移系统
interface Migration {
  version: number
  name: string
  up: (db: Client) => Promise<void>
  down: (db: Client) => Promise<void>
}

// 核心功能
export async function runMigrations(): Promise<void>
export async function getCurrentVersion(): Promise<number>
export async function rollbackMigration(targetVersion: number): Promise<void>
```

**常用查询 (`queries.ts`):**
```typescript
// 预定义查询模板，提供类型安全的数据库操作
interface QueryTemplates {
  projects: {
    list(): Promise<Project[]>
    create(data: CreateProjectData): Promise<Project>
    update(id: number, data: UpdateProjectData): Promise<void>
    delete(id: number): Promise<void>
    getById(id: number): Promise<Project | null>
  }
  conversations: {
    listByProject(projectId: number): Promise<Conversation[]>
    create(data: CreateConversationData): Promise<Conversation>
    move(id: string, projectId: number | null): Promise<void>
  }
  messages: {
    listByConversation(conversationId: string): Promise<Message[]>
    create(data: CreateMessageData): Promise<Message>
    update(id: string, data: UpdateMessageData): Promise<void>
  }
}
```

### 3.3 AI模型模块 (`src/main/ai/`)

**基础接口 (`base.ts`):**
```typescript
// 统一的AI模型接口定义
export interface AIModel {
  name: string
  modelId: string
  
  // 核心功能
  chat(messages: Message[], options?: ChatOptions): Promise<string>
  stream(messages: Message[], onChunk: (chunk: string) => void, options?: ChatOptions): Promise<void>
  
  // 能力检测
  isSupportVision(): boolean
  isSupportToolUse(): boolean
  isSupportReasoning(): boolean
  
  // 配置管理
  updateConfig(config: Partial<AIConfig>): void
  validateConfig(): boolean
}

export interface AIConfig {
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
  timeout?: number
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  tools?: Tool[]
  systemPrompt?: string
}
```

**OpenAI实现 (`openai.ts`):**
```typescript
// OpenAI模型实现，支持多模态和工具调用
export class OpenAIModel implements AIModel {
  constructor(private config: AIConfig) {}
  
  // 核心聊天功能
  async chat(messages: Message[], options?: ChatOptions): Promise<string>
  async stream(messages: Message[], onChunk: (chunk: string) => void, options?: ChatOptions): Promise<void>
  
  // 多模态支持
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string[]>
  async analyzeImage(imageUrl: string, prompt: string): Promise<string>
  
  // 能力检测
  isSupportVision(): boolean
  isSupportToolUse(): boolean
  
  // 内部方法
  private buildRequestPayload(messages: Message[], options?: ChatOptions): any
  private handleStreamResponse(response: Response, onChunk: (chunk: string) => void): Promise<void>
  private parseError(error: any): AIError
}
```

**Claude实现 (`claude.ts`):**
```typescript
// Claude模型实现，支持推理内容和高级功能
export class ClaudeModel implements AIModel {
  constructor(private config: AIConfig) {}
  
  // 核心功能
  async chat(messages: Message[], options?: ChatOptions): Promise<string>
  async stream(messages: Message[], onChunk: (chunk: string) => void, options?: ChatOptions): Promise<void>
  
  // Claude特有功能
  isSupportReasoning(): boolean
  async extractReasoningContent(response: string): Promise<{ reasoning: string; answer: string }>
  
  // 工具调用支持
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult>
  
  // 内部方法
  private handleReasoningContent(chunk: any): { type: 'reasoning' | 'content'; text: string }
  private buildAnthropicRequest(messages: Message[], options?: ChatOptions): any
}
```

**模型管理器 (`manager.ts`):**
```typescript
// AI模型注册和管理中心
export class AIModelManager {
  private models = new Map<string, AIModel>()
  private defaultModel: string | null = null
  
  // 模型注册
  registerModel(name: string, model: AIModel): void
  unregisterModel(name: string): void
  
  // 模型获取
  getModel(name: string): AIModel | null
  getDefaultModel(): AIModel | null
  listModels(): string[]
  
  // 模型能力查询
  getModelsWithCapability(capability: 'vision' | 'tools' | 'reasoning'): string[]
  
  // 配置管理
  setDefaultModel(name: string): void
  updateModelConfig(name: string, config: Partial<AIConfig>): void
  
  // 健康检查
  async testModel(name: string): Promise<boolean>
  async testAllModels(): Promise<Record<string, boolean>>
}
```

### 3.4 Chat Service (`src/main/services/chat.ts`)

**Conversation Management:**
```typescript
class ChatService {
  async createConversation(projectId?: number): Promise<string>
  async deleteConversation(conversationId: string): Promise<void>
  async moveConversation(conversationId: string, projectId?: number): Promise<void>
  async generateTitle(conversationId: string): Promise<string>
  
  // Message operations
  async addMessage(conversationId: string, message: Message): Promise<void>
  async updateMessage(messageId: string, updates: Partial<Message>): Promise<void>
  async deleteMessage(messageId: string): Promise<void>
  async getMessages(conversationId: string): Promise<Message[]>
  
  // Streaming chat
  async streamChat(conversationId: string, payload: ChatPayload): Promise<void>
}
```

### 3.5 File Management Service (`src/main/services/file.ts`)

**Dual-Mode File Handling Architecture:**

Our file management system handles two distinct use cases with different processing strategies:

#### **Temporary File Processing (Unclassified Chat Mode)**
```typescript
class TemporaryFileProcessor {
  async processTemporaryFiles(files: File[]): Promise<TemporaryFileResult[]>
  async extractTextContent(file: File): Promise<string>
  async validateFileConstraints(files: File[]): Promise<ValidationResult>
  async cleanupTemporaryFiles(): Promise<void>
}

interface TemporaryFileResult {
  filename: string
  content: string        // Plain text content
  size: number
  mimeType: string
  error?: string
}
```

**Temporary File Constraints:**
- **File Limits**: Maximum 10 files per conversation
- **Size Limits**: 1MB per file, 10MB total
- **Format Support**: `.txt`, `.md` only in MVP
- **Processing**: Immediate text extraction, no persistence
- **Context Usage**: Direct inclusion in conversation context
- **Lifecycle**: Cleaned up after conversation ends

#### **Permanent File Processing (Project Mode)**
```typescript
class ProjectFileProcessor {
  async uploadProjectFiles(projectId: number, files: File[]): Promise<ProjectFile[]>
  async processFileForRAG(fileId: number): Promise<void>
  async deleteProjectFile(fileId: number): Promise<void>
  async getProjectFiles(projectId: number): Promise<ProjectFile[]>
  async searchProjectFiles(projectId: number, query: string): Promise<SearchResult[]>
  
  // Background processing
  async startProcessingQueue(): Promise<void>
  async processNextFile(): Promise<void>
  async updateFileStatus(fileId: number, status: FileStatus, error?: string): Promise<void>
}

interface ProjectFile {
  id: number
  projectId: number
  filename: string
  filepath: string
  mimeType: string
  fileSize: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
  chunkCount: number
  totalChunks: number
  error?: string
  createdAt: Date
  processedAt?: Date
}
```

**Project File Processing Pipeline:**
1. **Upload Phase**:
   ```typescript
   async uploadProjectFiles(projectId: number, files: File[]): Promise<ProjectFile[]> {
     // 1. Validate file types and sizes
     await this.validateProjectFiles(files)
     
     // 2. Store files in project directory
     const storedFiles = await this.storeFiles(projectId, files)
     
     // 3. Create database records with 'pending' status
     const fileRecords = await this.createFileRecords(projectId, storedFiles)
     
     // 4. Queue for background processing
     await this.queueForProcessing(fileRecords)
     
     return fileRecords
   }
   ```

2. **Background Processing**:
   ```typescript
   async processFileForRAG(fileId: number): Promise<void> {
     try {
       // Update status to 'processing'
       await this.updateFileStatus(fileId, 'processing')
       
       // Extract text content
       const content = await this.extractTextContent(fileId)
       
       // Convert to Markdown format
       const markdown = await this.convertToMarkdown(content)
       
       // Intelligent text chunking
       const chunks = await this.chunkText(markdown, {
         maxChunkSize: 500,
         overlapSize: 50,
         preserveParagraphs: true
       })
       
       // Generate embeddings
       const embeddings = await this.generateEmbeddings(chunks)
       
       // Store in vector database
       await this.storeVectors(fileId, chunks, embeddings)
       
       // Update status to 'ready'
       await this.updateFileStatus(fileId, 'ready')
       
     } catch (error) {
       await this.updateFileStatus(fileId, 'failed', error.message)
       throw error
     }
   }
   ```

3. **RAG Search Integration**:
   ```typescript
   async searchProjectFiles(projectId: number, query: string): Promise<SearchResult[]> {
     // Generate query embedding
     const queryEmbedding = await this.embeddingService.generateEmbedding(query)
     
     // Vector similarity search
     const results = await this.db.execute(`
       SELECT pv.chunk_text, pv.file_id, pf.filename,
              vector_distance(pv.embedding, ?) as similarity
       FROM project_vectors pv
       JOIN project_files pf ON pv.file_id = pf.id
       WHERE pf.project_id = ? AND pf.status = 'ready'
       ORDER BY similarity ASC
       LIMIT 10
     `, [queryEmbedding, projectId])
     
     return results.rows.map(row => ({
       content: row.chunk_text,
       filename: row.filename,
       fileId: row.file_id,
       similarity: row.similarity
     }))
   }
   ```

#### **File Storage Structure**
```
app-data/
├── database/
│   └── knowlex.db              # Main database with vector support
├── projects/
│   └── {project-id}/
│       └── files/              # Permanent project files
│           ├── original/       # Original uploaded files
│           └── processed/      # Processed Markdown files
├── temp/
│   └── chat-files/            # Temporary chat files (auto-cleanup)
└── logs/
    └── file-processing.log    # Processing logs and errors
```

#### **File Processing Queue Management**
```typescript
class FileProcessingQueue {
  private processingQueue: Queue<ProcessingTask>
  private concurrentWorkers: number = 3
  
  async addToQueue(fileId: number): Promise<void>
  async processNext(): Promise<void>
  async pauseProcessing(fileId: number): Promise<void>
  async resumeProcessing(fileId: number): Promise<void>
  async retryFailed(fileId: number): Promise<void>
  
  // Health monitoring
  async checkStuckProcessing(): Promise<void>  // 5-minute timeout
  async getQueueStatus(): Promise<QueueStatus>
}
```

#### **Error Handling and Recovery**
```typescript
interface FileProcessingError {
  fileId: number
  stage: 'upload' | 'extraction' | 'chunking' | 'embedding' | 'storage'
  error: string
  retryCount: number
  lastRetryAt?: Date
}

class FileErrorHandler {
  async handleProcessingError(fileId: number, stage: string, error: Error): Promise<void>
  async retryWithBackoff(fileId: number): Promise<void>
  async markAsPermanentFailure(fileId: number): Promise<void>
  async getErrorDetails(fileId: number): Promise<FileProcessingError | null>
}
```

**Key Design Decisions:**
- **Separation of Concerns**: Temporary and permanent files use different processing paths
- **Asynchronous Processing**: Background queue prevents UI blocking
- **Status Tracking**: Real-time status updates for user feedback
- **Error Recovery**: Automatic retry with exponential backoff
- **Resource Management**: Concurrent processing limits and cleanup mechanisms
- **Data Integrity**: Transaction-based operations for consistency

### 3.6 MCP Protocol Service (`src/main/services/mcp.ts`)

**stdio Transport**
```typescript
class MCPService {
  async createTransport(config: MCPTransportConfig): Promise<string>
  async startTransport(transportId: string): Promise<void>
  async sendMessage(transportId: string, message: JSONRPCMessage): Promise<any>
  async closeTransport(transportId: string): Promise<void>
  async listAvailableTools(transportId: string): Promise<Tool[]>
  async executeToolCall(transportId: string, toolCall: ToolCall): Promise<ToolResult>
}
```

### 3.3 上下文管理 (Context Management)

- **上下文构建**: 包含项目记忆 (System Prompt)、最近N条历史消息、历史摘要（长对话时）、附加文件内容、RAG检索结果。
- **窗口管理**: 严格限制 Token 总数（如 4000），超出时自动生成摘要并按优先级（RAG结果 > 最近消息 > 历史摘要）进行裁剪。

### 3.4 文件处理策略

**设计决策**: 区分临时聊天文件和永久项目文件，满足不同使用场景。

**临时文件处理**:
- **用途**: 聊天界面中的临时文件导入，仅作为当前对话的上下文
- **处理方式**: 读取文件内容为纯文本，直接添加到消息上下文
- **存储策略**: 不进行持久化存储，不进行向量化处理
- **限制**: 最多10个文件，单文件1MB，仅支持.txt和.md格式

**永久文件处理**:
- **用途**: 项目文件管理中的文件，构建项目知识库
- **处理方式**: 文件存储 → 文本分块 → 向量化 → RAG检索
- **存储策略**: 持久化存储，支持预览、编辑、删除
- **功能**: 支持RAG检索、引用溯源、批量管理

## 4. Frontend Architecture Design

### 4.1 状态管理架构 (Zustand)

**应用状态 (`stores/app.ts`):**
```typescript
// 全局应用状态管理
interface AppState {
  // UI状态
  theme: 'light' | 'dark' | 'system'
  language: string
  showSidebar: boolean
  sidebarWidth: number
  
  // 应用状态
  isInitialized: boolean
  isOnline: boolean
  lastSyncTime: number | null
  
  // 操作方法
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (language: string) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setInitialized: (initialized: boolean) => void
  updateSyncTime: () => void
}

// 持久化配置
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 默认状态
      theme: 'system',
      language: 'zh-CN',
      showSidebar: true,
      sidebarWidth: 280,
      isInitialized: false,
      isOnline: true,
      lastSyncTime: null,
      
      // 状态操作
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(400, width)) }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      updateSyncTime: () => set({ lastSyncTime: Date.now() })
    }),
    {
      name: 'app-settings',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        showSidebar: state.showSidebar,
        sidebarWidth: state.sidebarWidth
      })
    }
  )
)
```

**项目状态 (`stores/project.ts`):**
```typescript
// 项目管理状态
interface ProjectState {
  // 数据状态
  projects: Project[]
  currentProjectId: number | null
  isLoading: boolean
  error: string | null
  
  // 计算属性
  getCurrentProject: () => Project | null
  getProjectStats: (projectId: number) => ProjectStats | null
  
  // 异步操作
  loadProjects: () => Promise<void>
  createProject: (data: CreateProjectData) => Promise<Project>
  updateProject: (id: number, data: UpdateProjectData) => Promise<void>
  deleteProject: (id: number) => Promise<void>
  
  // 状态操作
  setCurrentProject: (id: number | null) => void
  clearError: () => void
  
  // 文件管理
  uploadFiles: (projectId: number, files: File[]) => Promise<ProjectFile[]>
  deleteFile: (fileId: number) => Promise<void>
  retryFileProcessing: (fileId: number) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  isLoading: false,
  error: null,
  
  getCurrentProject: () => {
    const { projects, currentProjectId } = get()
    return projects.find(p => p.id === currentProjectId) || null
  },
  
  getProjectStats: (projectId: number) => {
    const project = get().projects.find(p => p.id === projectId)
    if (!project) return null
    
    return {
      fileCount: project.fileCount || 0,
      conversationCount: project.conversationCount || 0,
      lastActivity: project.updatedAt
    }
  },
  
  loadProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const projects = await window.electronAPI.invoke('project:list')
      set({ projects, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  createProject: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const project = await window.electronAPI.invoke('project:create', data)
      set(state => ({ 
        projects: [project, ...state.projects], 
        currentProjectId: project.id,
        isLoading: false 
      }))
      return project
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  }
}))
```

**会话状态 (`stores/conversation.ts`):**
```typescript
// 会话和消息管理状态
interface ConversationState {
  // 会话数据
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Record<string, Message[]>
  
  // 流式状态
  isStreaming: boolean
  streamingMessageId: string | null
  
  // UI状态
  isLoading: boolean
  error: string | null
  
  // 计算属性
  getCurrentConversation: () => Conversation | null
  getCurrentMessages: () => Message[]
  getConversationsByProject: (projectId: number | null) => Conversation[]
  
  // 会话操作
  loadConversations: () => Promise<void>
  createConversation: (projectId?: number) => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  moveConversation: (id: string, projectId: number | null) => Promise<void>
  setCurrentConversation: (id: string | null) => void
  
  // 消息操作
  sendMessage: (input: string, files?: File[]) => Promise<void>
  addMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  deleteMessage: (conversationId: string, messageId: string) => void
  
  // 流式处理
  startStreaming: (messageId: string) => void
  stopStreaming: () => void
  appendToStreamingMessage: (content: string) => void
  
  // 错误处理
  clearError: () => void
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  isStreaming: false,
  streamingMessageId: null,
  isLoading: false,
  error: null,
  
  getCurrentConversation: () => {
    const { conversations, currentConversationId } = get()
    return conversations.find(c => c.id === currentConversationId) || null
  },
  
  getCurrentMessages: () => {
    const { messages, currentConversationId } = get()
    return currentConversationId ? messages[currentConversationId] || [] : []
  },
  
  getConversationsByProject: (projectId) => {
    return get().conversations.filter(c => c.projectId === projectId)
  },
  
  sendMessage: async (input, files) => {
    const { currentConversationId, addMessage, startStreaming } = get()
    if (!currentConversationId) return
    
    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      contentParts: [{ type: 'text', text: input }],
      timestamp: Date.now()
    }
    addMessage(currentConversationId, userMessage)
    
    // 创建AI回复消息
    const aiMessageId = generateId()
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      contentParts: [{ type: 'text', text: '' }],
      timestamp: Date.now(),
      generating: true
    }
    addMessage(currentConversationId, aiMessage)
    startStreaming(aiMessageId)
    
    try {
      // 调用流式API
      await window.electronAPI.invoke('chat:stream', {
        conversationId: currentConversationId,
        input,
        files
      })
    } catch (error) {
      set({ error: error.message })
    }
  }
}))
```

**设置状态 (`stores/settings.ts`):**
```typescript
// 应用设置管理状态
interface SettingsState {
  // 设置数据
  apiSettings: APISettings
  generalSettings: GeneralSettings
  shortcutSettings: ShortcutSettings
  
  // 状态
  isLoading: boolean
  error: string | null
  hasUnsavedChanges: boolean
  
  // 操作方法
  loadSettings: () => Promise<void>
  updateAPISettings: (settings: Partial<APISettings>) => Promise<void>
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>
  updateShortcutSettings: (settings: Partial<ShortcutSettings>) => Promise<void>
  
  // 测试功能
  testAPIConnection: (provider: string) => Promise<boolean>
  resetToDefaults: (section: 'api' | 'general' | 'shortcuts') => Promise<void>
  
  // 状态管理
  markAsChanged: () => void
  clearChanges: () => void
  clearError: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiSettings: {
    providers: [],
    defaultProvider: null,
    timeout: 30000
  },
  generalSettings: {
    theme: 'system',
    language: 'zh-CN',
    autoSave: true,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  },
  shortcutSettings: {
    newChat: 'Cmd+N',
    search: 'Cmd+K',
    settings: 'Cmd+,'
  },
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,
  
  loadSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const [apiSettings, generalSettings, shortcutSettings] = await Promise.all([
        window.electronAPI.invoke('settings:get', 'api'),
        window.electronAPI.invoke('settings:get', 'general'),
        window.electronAPI.invoke('settings:get', 'shortcuts')
      ])
      
      set({
        apiSettings,
        generalSettings,
        shortcutSettings,
        isLoading: false,
        hasUnsavedChanges: false
      })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  testAPIConnection: async (provider) => {
    try {
      return await window.electronAPI.invoke('settings:test-connection', provider)
    } catch (error) {
      set({ error: error.message })
      return false
    }
  }
}))
```

### 4.2 组件架构设计

**基础UI组件 (`components/ui/`):**
```typescript
// Button.tsx - 通用按钮组件
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon
}) => {
  // 支持多种样式变体、尺寸、状态
  // 集成loading状态和图标支持
  // 完整的无障碍支持
}

// Input.tsx - 输入框组件
interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'password' | 'email' | 'number'
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  autoFocus?: boolean
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  error,
  label,
  required = false,
  autoFocus = false
}) => {
  // 受控组件设计
  // 内置验证状态显示
  // 支持标签和错误提示
  // 键盘导航支持
}

// FileCard.tsx - 文件卡片组件
interface FileCardProps {
  file: ProjectFile
  onDelete?: (fileId: number) => void
  onRetry?: (fileId: number) => void
  onPause?: (fileId: number) => void
  onResume?: (fileId: number) => void
  showActions?: boolean
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onDelete,
  onRetry,
  onPause,
  onResume,
  showActions = true
}) => {
  // 文件信息展示：名称、大小、状态
  // 处理进度指示器
  // 状态相关的操作按钮
  // 错误信息显示
  // 悬浮操作菜单
}

// MessageBubble.tsx - 消息气泡组件
interface MessageBubbleProps {
  message: Message
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onCopy?: (content: string) => void
  onRegenerate?: (messageId: string) => void
  showActions?: boolean
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onEdit,
  onDelete,
  onCopy,
  onRegenerate,
  showActions = true
}) => {
  // 多部分内容渲染：文本、图片、引用、工具调用
  // Markdown内容解析和语法高亮
  // 流式内容显示支持
  // 消息操作菜单
  // 引用跳转功能
}
```

**布局组件 (`components/layout/`):**
```typescript
// MainLayout.tsx - 主布局容器
interface MainLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sidebar,
  header
}) => {
  const { showSidebar, sidebarWidth } = useAppStore()
  
  // 响应式布局管理
  // 侧边栏显示/隐藏控制
  // 可调整的侧边栏宽度
  // 键盘快捷键支持
  // 移动端适配
}

// Sidebar.tsx - 侧边栏导航
interface SidebarProps {
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { projects, currentProjectId } = useProjectStore()
  const { conversations, currentConversationId } = useConversationStore()
  
  // 项目列表展示和管理
  // 会话列表展示和导航
  // 搜索功能集成
  // 拖拽排序支持
  // 上下文菜单操作
  // 虚拟滚动优化
}

// Header.tsx - 头部栏组件
interface HeaderProps {
  title?: string
  actions?: React.ReactNode
  breadcrumb?: BreadcrumbItem[]
}

export const Header: React.FC<HeaderProps> = ({
  title,
  actions,
  breadcrumb
}) => {
  // 页面标题显示
  // 面包屑导航
  // 操作按钮区域
  // 全局搜索入口
  // 用户菜单
}
```

**功能组件 (`components/features/`):**
```typescript
// chat/ChatInterface.tsx - 聊天界面主容器
interface ChatInterfaceProps {
  conversationId?: string
  className?: string
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  className
}) => {
  const { currentConversation, isStreaming } = useConversationStore()
  
  // 会话状态检查和空状态处理
  // 消息列表和输入框布局
  // 流式响应状态管理
  // 错误状态显示
  // 快捷键操作支持
}

// chat/MessageList.tsx - 消息列表组件
interface MessageListProps {
  messages: Message[]
  conversationId: string
  onMessageAction?: (action: MessageAction, messageId: string) => void
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  conversationId,
  onMessageAction
}) => {
  // 虚拟滚动优化大量消息
  // 自动滚动到最新消息
  // 消息分组和时间戳显示
  // 消息操作菜单集成
  // 引用内容高亮显示
}

// chat/InputBox.tsx - 消息输入框
interface InputBoxProps {
  onSend: (input: string, files?: File[]) => Promise<void>
  disabled?: boolean
  placeholder?: string
  maxFiles?: number
  acceptedFileTypes?: string[]
}

export const InputBox: React.FC<InputBoxProps> = ({
  onSend,
  disabled = false,
  placeholder = "输入消息...",
  maxFiles = 10,
  acceptedFileTypes = ['.txt', '.md']
}) => {
  // 多行文本输入支持
  // 文件拖拽上传功能
  // 文件预览和删除
  // 发送按钮状态管理
  // 快捷键支持（Ctrl+Enter发送）
  // 输入历史记录
}

// project/FileManager.tsx - 文件管理界面
interface FileManagerProps {
  projectId: number
  onFileSelect?: (file: ProjectFile) => void
}

export const FileManager: React.FC<FileManagerProps> = ({
  projectId,
  onFileSelect
}) => {
  const { uploadFiles, deleteFile, retryFileProcessing } = useFiles()
  
  // 文件列表展示（网格/列表视图）
  // 批量文件上传支持
  // 文件处理状态实时更新
  // 文件操作菜单（删除、重试、暂停）
  // 文件搜索和过滤
  // 拖拽上传区域
}

// project/MemoryManager.tsx - 项目记忆管理
interface MemoryManagerProps {
  projectId: number
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({
  projectId
}) => {
  // 项目记忆列表展示（最多10条）
  // 记忆内容编辑和排序
  // 笔记卡片管理
  // Markdown编辑器集成
  // 标签系统支持
  // 从聊天内容快速添加
}
```

**自定义Hooks (`hooks/`):**
```typescript
// useIPC.ts - IPC通信Hook
export const useIPC = () => {
  // 统一的IPC调用接口
  // 自动错误处理和重试
  // 请求状态管理
  // 类型安全的通道调用
  
  const invoke = useCallback(async <T = any>(
    channel: string, 
    ...args: any[]
  ): Promise<T> => {
    // 实现统一的IPC调用逻辑
  }, [])
  
  const listen = useCallback((
    channel: string, 
    callback: (...args: any[]) => void
  ) => {
    // 实现事件监听逻辑
  }, [])
  
  return { invoke, listen }
}

// useChat.ts - 聊天功能Hook
export const useChat = (conversationId?: string) => {
  // 消息发送和接收逻辑
  // 流式响应处理
  // 文件上传集成
  // 错误处理和重试
  // 消息操作（编辑、删除、重新生成）
  
  const sendMessage = useCallback(async (
    input: string, 
    files?: File[]
  ) => {
    // 实现消息发送逻辑
  }, [conversationId])
  
  const regenerateMessage = useCallback(async (
    messageId: string
  ) => {
    // 实现消息重新生成逻辑
  }, [conversationId])
  
  return { sendMessage, regenerateMessage }
}

// useFiles.ts - 文件管理Hook
export const useFiles = (projectId?: number) => {
  // 文件上传和管理逻辑
  // 处理状态监听
  // 批量操作支持
  // 错误处理和重试
  
  const uploadFiles = useCallback(async (
    files: File[]
  ): Promise<ProjectFile[]> => {
    // 实现文件上传逻辑
  }, [projectId])
  
  const deleteFile = useCallback(async (
    fileId: number
  ) => {
    // 实现文件删除逻辑
  }, [])
  
  return { uploadFiles, deleteFile }
}

// useSearch.ts - 搜索功能Hook
export const useSearch = () => {
  // 全局搜索逻辑
  // 搜索结果管理
  // 搜索历史记录
  // 防抖处理
  
  const search = useCallback(async (
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> => {
    // 实现搜索逻辑
  }, [])
  
  const searchInProject = useCallback(async (
    projectId: number,
    query: string
  ): Promise<SearchResult[]> => {
    // 实现项目内搜索逻辑
  }, [])
  
  return { search, searchInProject }
}
```

### 4.3 UI Design System (Chakra UI)

**Theme Configuration:**
```typescript
interface KnowlexTheme {
  colors: {
    // 主色调系统
    'primary': [string, ...],           // 主要品牌色
    'secondary': [string, ...],         // 次要色调
    'accent': [string, ...],            // 强调色
    
    // 语义色彩
    'success': [string, ...],           // 成功状态
    'warning': [string, ...],           // 警告状态
    'error': [string, ...],             // 错误状态
    'info': [string, ...],              // 信息状态
    
    // 界面色彩
    'background': [string, ...],        // 背景色系
    'surface': [string, ...],           // 表面色系
    'border': [string, ...],            // 边框色系
    'text': [string, ...],              // 文本色系
  }
  
  // 响应式断点
  breakpoints: {
    xs: '480px',    // 小屏手机
    sm: '768px',    // 平板
    md: '992px',    // 小桌面
    lg: '1200px',   // 大桌面
    xl: '1400px'    // 超大屏
  }
  
  // 组件默认配置
  components: {
    Button: {
      defaultProps: { colorScheme: 'primary', size: 'md' },
      variants: {
        solid: { bg: 'primary.500', color: 'white' },
        outline: { borderColor: 'primary.500', color: 'primary.500' },
        ghost: { color: 'primary.500' }
      }
    },
    Input: {
      defaultProps: { size: 'md', focusBorderColor: 'primary.500' },
      variants: {
        outline: { borderColor: 'border.200' },
        filled: { bg: 'surface.100' }
      }
    },
    Modal: {
      defaultProps: { size: 'md', isCentered: true },
      baseStyle: { overlay: { backdropFilter: 'blur(4px)' } }
    }
  }
  
  // 间距系统
  space: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem'    // 48px
  }
  
  // 字体系统
  fonts: {
    heading: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    body: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    mono: 'JetBrains Mono, Consolas, Monaco, monospace'
  }
  
  // 阴影系统
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  }
}
```

**Desktop-First Design Strategy:**
- **Primary Target**: Desktop screens (1024px+) with full feature set
- **Minimum Resolution**: 800x600 for basic functionality
- **Responsive Elements**: Sidebar can collapse on smaller desktop screens
- **Platform-Specific**: Native macOS and Windows styling integration

**主题系统特性:**
```typescript
// 自适应主题切换
interface ThemeManager {
  // 主题检测和切换
  detectSystemTheme(): 'light' | 'dark'
  setTheme(theme: 'light' | 'dark' | 'system'): void
  getCurrentTheme(): 'light' | 'dark'
  
  // 主题监听
  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void
  
  // 自定义主题
  createCustomTheme(overrides: Partial<KnowlexTheme>): KnowlexTheme
  applyCustomTheme(theme: KnowlexTheme): void
}

// 颜色模式适配
const colorModeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
  storageType: 'localStorage',
  storageKey: 'knowlex-color-mode'
}
```

**组件设计原则:**
- **一致性**: 统一的视觉语言和交互模式
- **可访问性**: 完整的键盘导航和屏幕阅读器支持
- **响应式**: 适配不同屏幕尺寸和设备类型
- **可定制**: 支持主题定制和品牌化
- **性能**: 优化渲染性能和包体积

### 4.4 核心界面设计

#### 4.4.1 左侧边栏设计 (Sidebar)

**设计原则**: 固定260px宽度，提供清晰的导航层次和直观的交互反馈。

**布局结构**:
- **顶部区域**: 
  - Knowlex Logo（品牌标识）
  - "New Chat"按钮（森林绿主题，带+图标）
  - 全局搜索按钮（灰色主题，带🔍图标）
- **项目区域**: 
  - "Projects"标题
  - 项目列表（可展开/折叠，使用文件夹图标）
  - 项目下的会话列表（缩进显示，使用聊天气泡图标）
- **聊天区域**: 
  - "Chats (未归类聊天)"标题
  - 未归类会话列表（支持虚拟滚动优化）
- **底部区域**: 
  - 用户头像和用户名
  - 设置菜单（齿轮图标）

**交互设计**:
- **项目悬浮交互**: 
  - 文件管理图标📄（DocumentIcon）
  - 记忆知识图标📖（BookOpenIcon）
  - 操作菜单⋮（EllipsisVerticalIcon）
- **会话悬浮交互**: 
  - 默认显示时间戳
  - 悬浮时显示操作菜单⋮
  - 支持移动到项目、移出项目、重命名、删除操作
- **时间戳格式化**: 
  - 智能时间显示：刚刚/X分钟前/X小时前/今天/昨天/X天前
  - 超过7天显示YYYY-MM-DD格式
  - 支持中英文国际化
- **状态管理**:
  - 项目展开/折叠状态持久化
  - 悬浮状态管理（防止闪烁）
  - 菜单打开状态管理

**技术实现特点**:
- 使用Chakra UI组件系统，支持主题切换
- Heroicons图标库提供一致的视觉语言
- 响应式设计，支持长文本截断
- 完整的键盘导航和无障碍支持
- Mock数据驱动，便于开发和测试 
  - 默认显示时间戳
  - 悬浮时显示操作菜单⋮
  - 支持移动到项目、移出项目、重命名、删除操作
- **时间戳格式化**: 
  - 智能时间显示：刚刚/X分钟前/X小时前/今天/昨天/X天前
  - 超过7天显示YYYY-MM-DD格式
  - 支持中英文国际化
- **状态管理**:
  - 项目展开/折叠状态持久化
  - 悬浮状态管理（防止闪烁）
  - 菜单打开状态管理

**技术实现特点**:
- 使用Chakra UI组件系统，支持主题切换
- Heroicons图标库提供一致的视觉语言
- 响应式设计，支持长文本截断
- 完整的键盘导航和无障碍支持
- Mock数据驱动，便于开发和测试

#### 4.4.2 聊天界面设计 (ChatInterface)

**设计原则**: 类ChatGPT的对话体验，支持文件导入和消息编辑。

**布局结构**:
- **消息显示区**: 可滚动的消息列表，支持虚拟滚动优化
- **文件预览区**: 临时文件卡片展示（条件显示）
- **输入区域**: 文件上传按钮 + 文本输入框 + 发送按钮

**文件处理设计**:
- **临时文件导入**: 仅读取内容添加到对话上下文，不进行存储
- **文件限制**: 最多10个文件，单文件1MB，仅支持.txt和.md
- **文件预览**: 卡片形式展示，支持拖拽上传和删除

**消息交互设计**:
- **用户消息**: 右侧森林绿气泡，悬浮显示编辑按钮
- **AI回复**: 左侧浅色气泡，支持Markdown渲染和流式显示
- **消息编辑**: 替换原消息和后续回复，不保留历史版本
- **操作按钮**: 复制、重新生成、存为知识等快捷操作

#### 4.4.3 项目管理界面设计

**项目概览页面**:
- **项目信息**: 名称、描述、创建时间、统计数据
- **快速操作**: 新建聊天、文件管理、记忆知识管理入口
- **近期动态**: 最新文件和知识卡片预览

**文件管理界面**:
- **文件列表**: 网格或列表视图，显示文件状态和处理进度
- **批量操作**: 多文件上传、批量删除、状态筛选
- **文件预览**: 弹窗预览，支持高亮定位和在线编辑

**记忆知识界面**:
- **记忆管理**: 项目记忆列表（≤10条），作为system prompt使用
- **知识卡片**: 网格布局，支持Markdown编辑和标签分类
- **从聊天保存**: 选择文字后显示"存为知识"悬浮按钮

#### 4.4.4 全局搜索界面设计

**搜索模态框**:
- **触发方式**: 快捷键⌘/Ctrl+P或搜索图标点击
- **搜索体验**: 居中模态框，实时搜索（防抖1秒）
- **结果展示**: 按时间倒序，关键词高亮，上下文摘要
- **性能优化**: 虚拟列表，无限滚动（≥100条结果时）

## 5. Data Models and Storage

### 5.1 Storage Architecture Overview

Knowlex采用多层存储架构，确保数据安全性和性能：

```
存储层次结构
├── 应用配置 (electron-store)
│   ├── settings.json - 全局设置
│   ├── sessions/ - 会话数据
│   └── backups/ - 自动备份
├── SQLite 数据库 (主数据)
│   ├── projects - 项目元数据
│   ├── conversations - 会话信息
│   ├── messages - 消息内容
│   ├── project_files - 文件信息
│   └── project_vectors - 向量数据
└── 文件系统
    ├── projects/{id}/files/ - 项目文件
    ├── temp/ - 临时文件
    └── logs/ - 应用日志
```

### 5.2 Database Schema Design

**核心表结构:**

```sql
-- 项目表
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  file_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 会话表
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,  -- UUID
  project_id INTEGER,
  title TEXT NOT NULL,
  summary TEXT,
  message_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- 消息表 - 支持多部分内容
CREATE TABLE messages (
  id TEXT PRIMARY KEY,  -- UUID
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content_parts TEXT NOT NULL,  -- JSON array of MessageContentPart
  reasoning_content TEXT,       -- 推理内容 (Claude等)
  timestamp INTEGER NOT NULL,
  tokens_used INTEGER,
  generating BOOLEAN DEFAULT FALSE,
  error_code INTEGER,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 项目文件表 - 支持处理状态跟踪
CREATE TABLE project_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'paused')),
  error TEXT,
  metadata TEXT,  -- JSON格式的额外元数据
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processing_started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 向量存储 - 使用libsql原生向量支持
CREATE VIRTUAL TABLE project_vectors USING vector(
  embedding[1536],          -- 向量维度 (取决于嵌入模型)
  file_id INTEGER,          -- 关联文件ID
  chunk_index INTEGER,      -- 文档块索引
  chunk_text TEXT,          -- 原始文本内容
  chunk_metadata TEXT       -- 块级元数据 (JSON)
);

-- 项目记忆表 - 作为System Prompt使用
CREATE TABLE project_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 项目笔记表 - 用户参考资料
CREATE TABLE project_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,  -- Markdown内容
  tags TEXT,  -- JSON数组格式的标签
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 应用设置表
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,  -- JSON格式的值
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_status ON project_files(status);
CREATE INDEX idx_project_memories_project_id ON project_memories(project_id, order_index);
CREATE INDEX idx_project_notes_project_id ON project_notes(project_id);
```

### 5.3 Vector Database Design

**libsql Vector Storage优势:**
- **原生向量支持**: 内置`VECTOR`数据类型，无需额外扩展
- **高性能查询**: 支持向量相似度搜索和KNN查询
- **SQLite兼容**: 完全兼容SQLite API，迁移成本低
- **本地化部署**: 完全本地运行，符合隐私保护要求

**向量处理流程:**
```typescript
// 文本分块策略
interface ChunkingStrategy {
  maxChunkSize: number        // 最大块大小 (500字符)
  overlapSize: number         // 重叠大小 (50字符)
  preserveParagraphs: boolean // 保持段落完整性
  splitOnSentences: boolean   // 按句子分割
}

// 向量化配置
interface EmbeddingConfig {
  model: string              // 嵌入模型 (如 "text-embedding-ada-002")
  dimensions: number         // 向量维度 (1536)
  batchSize: number         // 批处理大小 (50)
  maxRetries: number        // 最大重试次数 (3)
}

// 检索配置
interface RetrievalConfig {
  topK: number              // 返回结果数量 (10)
  similarityThreshold: number // 相似度阈值 (0.7)
  rerankModel?: string      // 重排序模型
  includeMetadata: boolean  // 包含元数据
}
```

**向量查询优化:**
```sql
-- 创建向量索引
CREATE INDEX idx_project_vectors_embedding ON project_vectors USING vector(embedding);
CREATE INDEX idx_project_vectors_file_id ON project_vectors(file_id);

-- 高效的向量相似度查询
SELECT 
  pv.chunk_text,
  pv.file_id,
  pf.filename,
  pf.filepath,
  vector_distance(pv.embedding, ?) as similarity,
  pv.chunk_metadata
FROM project_vectors pv
JOIN project_files pf ON pv.file_id = pf.id
WHERE pf.project_id = ? 
  AND pf.status = 'ready'
  AND vector_distance(pv.embedding, ?) < ?
ORDER BY similarity ASC
LIMIT ?;

-- 批量向量插入优化
INSERT INTO project_vectors (embedding, file_id, chunk_index, chunk_text, chunk_metadata)
VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), ...;
```

### 5.4 Data Storage Strategy

**应用配置存储 (electron-store):**
```typescript
// 设置文件结构
interface StoreSchema {
  settings: {
    language: string
    theme: 'light' | 'dark' | 'auto'
    apiProviders: APIProviderConfig[]
    shortcuts: ShortcutConfig
    general: GeneralConfig
  }
  
  configs: {
    uuid: string
    firstRun: boolean
    lastVersion: string
  }
  
  cache: {
    recentProjects: number[]
    recentConversations: string[]
    searchHistory: string[]
  }
}

// 会话存储策略
interface SessionStorage {
  // 每个会话独立存储为JSON文件
  path: `sessions/session-${string}.json`
  
  // 懒加载和增量保存
  loadSession(id: string): Promise<Session>
  saveSession(session: Session): Promise<void>
  
  // 会话元数据缓存
  sessionMeta: SessionMeta[]
}
```

**文件存储管理:**
```typescript
// 文件存储结构
interface FileStorageStructure {
  'app-data/': {
    'database/': {
      'knowlex.db': 'SQLite数据库文件'
    }
    'projects/': {
      '{project-id}/': {
        'files/': {
          'original/': '原始上传文件'
          'processed/': '处理后的Markdown文件'
        }
      }
    }
    'temp/': {
      'chat-files/': '临时聊天文件'
      'uploads/': '上传临时文件'
    }
    'cache/': {
      'embeddings/': '嵌入向量缓存'
      'thumbnails/': '文件缩略图'
    }
    'logs/': {
      'app.log': '应用日志'
      'file-processing.log': '文件处理日志'
    }
    'backups/': {
      'settings-{timestamp}.json': '设置备份'
      'database-{timestamp}.db': '数据库备份'
    }
  }
}

// 文件生命周期管理
interface FileLifecycleManager {
  // 自动清理策略
  cleanupTempFiles(olderThan: number): Promise<void>
  cleanupCache(maxSize: number): Promise<void>
  
  // 备份管理
  createBackup(): Promise<string>
  restoreBackup(backupPath: string): Promise<void>
  cleanupOldBackups(): Promise<void>
  
  // 存储监控
  getStorageUsage(): Promise<StorageUsage>
  checkDiskSpace(): Promise<number>
}
```

**数据一致性保证:**
```typescript
// 事务管理
interface TransactionManager {
  // 数据库事务
  withTransaction<T>(operation: (db: Client) => Promise<T>): Promise<T>
  
  // 文件操作事务
  withFileTransaction<T>(operation: () => Promise<T>): Promise<T>
  
  // 跨存储事务
  withCrossStorageTransaction<T>(
    dbOperation: (db: Client) => Promise<T>,
    fileOperation: () => Promise<void>
  ): Promise<T>
}

// 数据迁移
interface DataMigration {
  version: number
  description: string
  up: (db: Client) => Promise<void>
  down: (db: Client) => Promise<void>
  
  // 数据验证
  validate: (db: Client) => Promise<boolean>
}
```

## 6. IPC Communication Design

### 6.1 Secure IPC Architecture

**通信模式:**
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

**安全特性:**
```typescript
// 安全桥接层设计
interface SecureIPCBridge {
  // 白名单通道验证
  validateChannel(channel: string): boolean
  
  // 类型安全的参数传递
  invoke<T = any>(channel: string, ...args: any[]): Promise<T>
  
  // 事件监听管理
  on(channel: string, callback: (...args: any[]) => void): () => void
  removeAllListeners(channel: string): void
  
  // 错误处理和重试
  withRetry<T>(operation: () => Promise<T>, maxRetries: number): Promise<T>
}

// 通道访问控制
const ALLOWED_CHANNELS = [
  // 系统信息
  'getVersion', 'getPlatform', 'getArch', 'getHostname',
  
  // 数据存储
  'store:get', 'store:set', 'store:delete',
  'blob:get', 'blob:set', 'blob:delete',
  
  // 项目管理
  'project:list', 'project:create', 'project:update', 'project:delete',
  
  // 会话管理
  'conversation:list', 'conversation:create', 'conversation:delete', 'conversation:move',
  
  // 消息处理
  'message:send', 'message:stream', 'message:update', 'message:delete',
  
  // 文件处理
  'file:upload', 'file:delete', 'file:process', 'file:retry',
  
  // 搜索功能
  'search:global', 'search:project', 'search:conversation',
  
  // 设置管理
  'settings:get', 'settings:set', 'settings:test-connection',
  
  // 系统集成
  'openLink', 'setFullscreen', 'ensureProxy', 'ensureShortcuts'
] as const

type AllowedChannel = typeof ALLOWED_CHANNELS[number]
```

### 6.2 IPC Channel Design

**系统信息类:**
```typescript
interface SystemAPI {
  'getVersion'(): Promise<string>
  'getPlatform'(): Promise<NodeJS.Platform>
  'getArch'(): Promise<string>
  'getHostname'(): Promise<string>
  'getLocale'(): Promise<string>
}
```

**数据存储类:**
```typescript
interface StorageAPI {
  // 配置存储
  'store:get'<T>(key: string): Promise<T>
  'store:set'<T>(key: string, value: T): Promise<void>
  'store:delete'(key: string): Promise<void>
  
  // 二进制存储
  'blob:get'(key: string): Promise<string | null>
  'blob:set'(key: string, value: string): Promise<void>
  'blob:delete'(key: string): Promise<void>
  'blob:list'(): Promise<string[]>
}
```

**项目管理类:**
```typescript
interface ProjectAPI {
  'project:list'(): Promise<Project[]>
  'project:create'(data: CreateProjectData): Promise<Project>
  'project:update'(id: number, data: UpdateProjectData): Promise<void>
  'project:delete'(id: number): Promise<void>
  'project:get-stats'(id: number): Promise<ProjectStats>
}
```

**会话管理类:**
```typescript
interface ConversationAPI {
  'conversation:list'(projectId?: number): Promise<Conversation[]>
  'conversation:create'(data: CreateConversationData): Promise<Conversation>
  'conversation:delete'(id: string): Promise<void>
  'conversation:move'(id: string, projectId: number | null): Promise<void>
  'conversation:update-title'(id: string, title: string): Promise<void>
  'conversation:generate-title'(id: string): Promise<string>
}
```

**消息处理类:**
```typescript
interface MessageAPI {
  'message:list'(conversationId: string): Promise<Message[]>
  'message:send'(data: SendMessageData): Promise<Message>
  'message:stream'(data: StreamMessageData): Promise<void>
  'message:update'(id: string, data: UpdateMessageData): Promise<void>
  'message:delete'(id: string): Promise<void>
  'message:regenerate'(id: string): Promise<Message>
}
```

**文件处理类:**
```typescript
interface FileAPI {
  // 临时文件
  'file:process-temp'(files: File[]): Promise<TemporaryFileResult[]>
  
  // 项目文件
  'file:upload'(projectId: number, files: File[]): Promise<ProjectFile[]>
  'file:list'(projectId: number): Promise<ProjectFile[]>
  'file:delete'(fileId: number): Promise<void>
  'file:retry'(fileId: number): Promise<void>
  'file:pause'(fileId: number): Promise<void>
  'file:resume'(fileId: number): Promise<void>
  'file:get-status'(fileId: number): Promise<FileProcessingStatus>
}
```

**搜索功能类:**
```typescript
interface SearchAPI {
  'search:global'(query: string, options?: SearchOptions): Promise<SearchResult[]>
  'search:project'(projectId: number, query: string): Promise<SearchResult[]>
  'search:conversation'(conversationId: string, query: string): Promise<SearchResult[]>
  'search:files'(projectId: number, query: string): Promise<FileSearchResult[]>
}
```

**系统集成类:**
```typescript
interface SystemIntegrationAPI {
  'openLink'(url: string): Promise<void>
  'setFullscreen'(fullscreen: boolean): Promise<void>
  'isFullscreen'(): Promise<boolean>
  'ensureProxy'(proxy?: string): Promise<void>
  'ensureShortcuts'(settings: ShortcutSettings): Promise<void>
  'ensureAutoLaunch'(enable: boolean): Promise<void>
  'relaunch'(): Promise<void>
}
```

### 6.3 核心数据类型定义

**项目相关类型:**
```typescript
interface Project {
  id: number
  name: string
  description?: string
  fileCount: number
  conversationCount: number
  createdAt: Date
  updatedAt: Date
}

interface CreateProjectData {
  name: string
  description?: string
}

interface UpdateProjectData {
  name?: string
  description?: string
}

interface ProjectStats {
  fileCount: number
  conversationCount: number
  totalMessages: number
  lastActivity: Date
  storageUsed: number
}
```

**会话相关类型:**
```typescript
interface Conversation {
  id: string
  projectId?: number
  title: string
  summary?: string
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

interface CreateConversationData {
  projectId?: number
  title?: string
  initialMessage?: string
}

interface Message {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  contentParts: MessageContentPart[]
  reasoningContent?: string
  timestamp: number
  tokensUsed?: number
  generating?: boolean
  errorCode?: number
  error?: string
}

type MessageContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; alt?: string }
  | { type: 'citation'; content: string; source: string; fileId?: number }
  | { type: 'tool-call'; toolName: string; args: any; result?: any }
  | { type: 'reasoning'; content: string }
```

**文件相关类型:**
```typescript
interface ProjectFile {
  id: number
  projectId: number
  filename: string
  filepath: string
  mimeType: string
  fileSize: number
  chunkCount: number
  totalChunks: number
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'paused'
  error?: string
  metadata?: Record<string, any>
  createdAt: Date
  processingStartedAt?: Date
  completedAt?: Date
}

interface TemporaryFileResult {
  filename: string
  content: string
  size: number
  mimeType: string
  error?: string
}

interface FileProcessingStatus {
  status: ProjectFile['status']
  progress: number
  currentChunk: number
  totalChunks: number
  error?: string
  estimatedTimeRemaining?: number
}
```

**搜索相关类型:**
```typescript
interface SearchOptions {
  limit?: number
  offset?: number
  includeFiles?: boolean
  includeMessages?: boolean
  projectId?: number
  dateRange?: {
    start: Date
    end: Date
  }
}

interface SearchResult {
  type: 'message' | 'file' | 'note'
  id: string
  title: string
  content: string
  snippet: string
  score: number
  metadata: {
    conversationId?: string
    projectId?: number
    fileId?: number
    timestamp: Date
  }
}

interface FileSearchResult {
  fileId: number
  filename: string
  chunkIndex: number
  content: string
  similarity: number
  metadata?: Record<string, any>
}
```

**MCP协议类型:**
```typescript
interface MCPTransportConfig {
  command: string
  args: string[]
  env?: Record<string, string>
  cwd?: string
  timeout?: number
}

interface JSONRPCMessage {
  jsonrpc: '2.0'
  id?: string | number
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

interface Tool {
  name: string
  description: string
  inputSchema: any
}

interface ToolCall {
  name: string
  arguments: any
}

interface ToolResult {
  content: string
  isError?: boolean
  metadata?: Record<string, any>
}
```

### 6.4 错误处理和监控

**统一错误处理架构:**
```typescript
// 错误类型定义
abstract class BaseError extends Error {
  public code: number = 1
  public context?: Record<string, any>
  
  constructor(message: string, context?: Record<string, any>) {
    super(message)
    this.context = context
    this.name = this.constructor.name
  }
}

class IPCError extends BaseError {
  public code = 10001
  public channel: string
  
  constructor(message: string, channel: string, context?: Record<string, any>) {
    super(message, context)
    this.channel = channel
  }
}

class FileProcessingError extends BaseError {
  public code = 20001
  public fileId: number
  public stage: string
  
  constructor(message: string, fileId: number, stage: string) {
    super(message)
    this.fileId = fileId
    this.stage = stage
  }
}

class AIModelError extends BaseError {
  public code = 30001
  public provider: string
  public modelId: string
  
  constructor(message: string, provider: string, modelId: string) {
    super(message)
    this.provider = provider
    this.modelId = modelId
  }
}

// IPC错误处理中间件
interface IPCErrorHandler {
  handleError(error: Error, channel: string, args: any[]): void
  validateInput(channel: string, args: any[]): boolean
  sanitizeOutput(result: any): any
}

class DefaultIPCErrorHandler implements IPCErrorHandler {
  handleError(error: Error, channel: string, args: any[]): void {
    // 记录错误日志
    console.error(`IPC Error in channel ${channel}:`, error)
    
    // 发送错误监控
    if (this.shouldReportError(error)) {
      this.reportError(error, { channel, args })
    }
    
    // 清理敏感信息
    this.sanitizeError(error)
  }
  
  validateInput(channel: string, args: any[]): boolean {
    // 通道白名单验证
    if (!ALLOWED_CHANNELS.includes(channel as AllowedChannel)) {
      throw new IPCError(`Unauthorized channel: ${channel}`, channel)
    }
    
    // 参数类型验证
    return this.validateChannelArgs(channel, args)
  }
  
  private shouldReportError(error: Error): boolean {
    // 过滤掉用户取消等正常错误
    return !(error instanceof UserCancelledError)
  }
  
  private reportError(error: Error, context: Record<string, any>): void {
    // 发送到错误监控服务
    errorReporter.captureException(error, {
      tags: { component: 'ipc' },
      extra: context
    })
  }
}
```

**性能监控系统:**
```typescript
// 性能指标收集
interface PerformanceMetrics {
  // IPC调用性能
  trackIPCCall(channel: string, duration: number, success: boolean): void
  
  // 文件处理性能
  trackFileProcessing(fileId: number, stage: string, duration: number): void
  
  // AI模型调用性能
  trackAIModelCall(provider: string, model: string, tokenCount: number, duration: number): void
  
  // 搜索性能
  trackSearch(type: string, resultCount: number, duration: number): void
}

class PerformanceTracker implements PerformanceMetrics {
  private metrics: Map<string, MetricData[]> = new Map()
  
  trackIPCCall(channel: string, duration: number, success: boolean): void {
    this.addMetric('ipc_call', {
      channel,
      duration,
      success,
      timestamp: Date.now()
    })
    
    // 异常性能告警
    if (duration > 5000) { // 5秒超时告警
      this.alertSlowOperation('ipc_call', channel, duration)
    }
  }
  
  trackFileProcessing(fileId: number, stage: string, duration: number): void {
    this.addMetric('file_processing', {
      fileId,
      stage,
      duration,
      timestamp: Date.now()
    })
  }
  
  // 性能报告生成
  generatePerformanceReport(): PerformanceReport {
    return {
      ipcCalls: this.getMetricSummary('ipc_call'),
      fileProcessing: this.getMetricSummary('file_processing'),
      aiModelCalls: this.getMetricSummary('ai_model_call'),
      searches: this.getMetricSummary('search'),
      generatedAt: new Date()
    }
  }
  
  private addMetric(type: string, data: MetricData): void {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, [])
    }
    
    const metrics = this.metrics.get(type)!
    metrics.push(data)
    
    // 保持最近1000条记录
    if (metrics.length > 1000) {
      metrics.shift()
    }
  }
}

// 健康检查系统
interface HealthChecker {
  checkDatabaseHealth(): Promise<HealthStatus>
  checkFileSystemHealth(): Promise<HealthStatus>
  checkAIModelsHealth(): Promise<HealthStatus>
  checkOverallHealth(): Promise<OverallHealthStatus>
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'error'
  message?: string
  details?: Record<string, any>
  checkedAt: Date
}

interface OverallHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: Record<string, HealthStatus>
  checkedAt: Date
}
```

## 7. Performance Optimization

### 7.1 Frontend Optimizations

**UI Performance:**
- **Virtualization**: React Virtuoso for large message/session lists
- **Memoization**: React.memo + useMemo to prevent unnecessary re-renders
- **Lazy Loading**: React.lazy + Suspense for code splitting
- **Debouncing**: lodash.debounce for search input and settings save

**State Management:**
- **Atomic Updates**: Jotai's fine-grained reactivity
- **Selective Subscriptions**: Only subscribe to needed state atoms
- **Derived State Caching**: Automatic memoization of computed values

### 7.2 Backend Optimizations

**Database Performance:**
- **Indexing Strategy**: Appropriate indexes for kb_id, status, created_at
- **Transaction Management**: Batch operations with proper transaction boundaries
- **Connection Pooling**: Singleton database connection management
- **Query Optimization**: Prepared statements and query timeout handling

**Vector Operations:**
- **Batch Processing**: Process 50 chunks per batch for vectorization
- **Concurrent Processing**: 8 concurrent workers for file processing
- **Vector Indexing**: Native libsql vector indexes for fast similarity search
- **Query Caching**: Cache hot vector query results

### 7.3 Memory Management

**Resource Cleanup:**
- **LRU Caching**: Intelligent cache eviction for vector queries
- **File Cleanup**: Automatic temporary file cleanup
- **Memory Monitoring**: Track and limit memory usage
- **Garbage Collection**: Proper cleanup of event listeners and subscriptions

## 8. Security Design

### 8.1 Input Validation and Sanitization

**IPC Security:**
```typescript
function validateIpcInput(channel: string, data: any): boolean {
  if (!ALLOWED_CHANNELS.includes(channel)) {
    throw new Error(`Unauthorized channel: ${channel}`)
  }
  
  if (channel.startsWith('kb:') && !isValidKnowledgeBaseRequest(data)) {
    throw new Error('Invalid knowledge base request')
  }
  
  return true
}
```

**Data Protection:**
- Parameterized queries to prevent SQL injection
- Encrypted storage for API keys
- Session data isolation between projects
- Path traversal prevention for file operations

### 8.2 Communication Security

**Secure Context Bridge:**
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: <T = any>(channel: string, ...args: any[]) => 
    ipcRenderer.invoke(channel, ...args) as Promise<T>,
  on: (channel: string, callback: (...args: any[]) => void) => 
    ipcRenderer.on(channel, callback),
  removeAllListeners: (channel: string) => 
    ipcRenderer.removeAllListeners(channel)
})
```

## 9. Error Handling Strategy

### 9.1 Error Classification

**Error Types:**
```typescript
abstract class BaseError extends Error {
  public code: number = 1
  public context?: Record<string, any>
}

class ApiError extends BaseError { public code = 10001 }
class KnowledgeBaseError extends BaseError { public code = 20001 }
class MCPError extends BaseError { public code = 30001 }
```

### 9.2 Error Recovery Mechanisms

**Network Resilience:**
```typescript
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

**UI Error Boundaries:**
- React Error Boundaries for component-level error isolation
- Graceful degradation for non-critical features
- User-friendly error messages with actionable suggestions
- Automatic error reporting with context information

## 10. Testing Strategy

### 10.1 Test Pyramid

**Unit Tests (60%)**
- Service layer business logic
- Database operations and queries
- AI model abstractions
- Utility functions and helpers

**Integration Tests (30%)**
- IPC communication flows
- File processing pipelines
- Vector database operations
- API integrations

**End-to-End Tests (10%)**
- Complete user workflows
- Cross-process communication
- UI interaction scenarios

### 10.2 Testing Tools

- **Unit Testing**: Vitest for fast, modern testing
- **Component Testing**: React Testing Library for UI components
- **E2E Testing**: Playwright for cross-platform automation
- **Mocking**: MSW for API mocking, electron-mock for IPC testing

## 11. Monitoring and Logging

### 11.1 Logging System

**Log Levels**: ERROR, WARN, INFO, DEBUG, TRACE

**Log Management:**
- Development: Console output with structured formatting
- Production: File-based logging with rotation
- Error tracking: Sentry integration for error monitoring

### 11.2 Performance Metrics

**Key Metrics:**
- IPC request latency and throughput
- File processing time and success rate
- Vector search performance
- Memory usage and garbage collection
- AI model response times

**Analytics:**
```typescript
analytics.track('ipc_request', {
  channel, duration, status, error_type
})

analytics.track('file_processing', {
  file_size, processing_time, chunk_count, status
})
```

## 12. Deployment and Distribution

### 12.1 Build Pipeline

**Build Process:**
1. **Lint**: ESLint + Prettier code quality checks
2. **Test**: Unit and integration test execution
3. **Build**: Vite production build with optimization
4. **Package**: Electron Builder packaging for target platforms
5. **Sign**: Code signing for security and trust
6. **Release**: Automated release with GitHub Actions

### 12.2 Auto-Update System

**Update Strategy:**
- `electron-updater` integration
- Incremental updates for efficiency
- Silent updates with user notification
- Rollback capability for failed updates

**Platform Support:**
- **macOS**: DMG installer with notarization and Apple Developer ID signing
- **Windows**: NSIS installer with Authenticode code signing

### 12.3 Configuration Management

**Environment Configuration:**
```typescript
interface BuildConfig {
  target: 'development' | 'production'
  platform: 'darwin' | 'win32'  // macOS and Windows only
  features: {
    autoUpdate: boolean
    analytics: boolean
    errorReporting: boolean
  }
}
```

**Platform-Specific Features:**
- **macOS**: Native menu bar integration, system tray, Touch Bar support
- **Windows**: System tray, Windows notifications, taskbar integration
- **Cross-Platform**: Consistent UI/UX across both platforms