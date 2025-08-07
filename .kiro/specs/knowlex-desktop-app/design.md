# Knowlex 桌面智能助理 - 技术设计文档

## 概述

Knowlex 是一款基于 Electron + React 的跨平台桌面智能助理应用，集成了对话式 AI、项目管理、文件处理和个性化知识记忆功能。本文档详细描述了应用的技术架构、组件设计和实现方案。

## 技术栈

### 核心技术

- **前端框架**: React 18 + TypeScript
- **桌面框架**: Electron (最新稳定版)
- **AI SDK**: OpenAI Agents JS SDK
- **数据库**: SQLite (元数据) + hnswsqlite (向量存储)
- **UI 组件库**: Chakra UI
- **状态管理**: Zustand
- **样式方案**: Tailwind CSS + Chakra UI

### 开发工具

- **构建工具**: Vite
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript
- **测试框架**: Jest + React Testing Library
- **打包工具**: Electron Builder
- **Monorepo 管理**: pnpm workspace
- **共享类型包**: @knowlex/types (内部包)

### 契约版本化

- **IPC 通道版本**: 采用 semver 标签 (v1.0.0, v1.1.0)
- **数据库 Schema 版本**: 版本字段 + 迁移脚本
- **API 接口版本**: 版本化的类型定义和 changelog
- **变更管理**: 自动生成 changelog，接口演进可追溯

## 系统架构

### 整体架构图

```mermaid
graph TB
    subgraph "Electron Main Process"
        A[Main Process] --> B[Window Manager]
        A --> C[Database Manager]
        A --> D[File System Manager]
        A --> E[IPC Handler]
    end

    subgraph "Electron Renderer Process"
        F[React App] --> G[UI Components]
        F --> H[State Management]
        F --> I[API Services]
        F --> J[IPC Client]
    end

    subgraph "Data Layer"
        K[SQLite Database] --> L[Metadata Tables]
        M[hnswsqlite] --> N[Vector Storage]
        O[File System] --> P[Source Files]
        O --> Q[PDF/A Files]
        R[Worker Threads] --> S[File Processing]
        R --> T[Vector Embedding]
    end

    subgraph "External Services"
        R[OpenAI Compatible API]
        S[Embedding API]
    end

    E <--> J
    C --> K
    C --> M
    D --> O
    I --> R
    I --> S
```

### 进程架构

#### Main Process (Node.js)

- **职责**: 窗口管理、数据库操作、文件系统访问、系统级功能、Worker 进程管理
- **核心模块**:
  - `WindowManager`: 管理应用窗口
  - `DatabaseManager`: SQLite 和 hnswsqlite 操作
  - `FileManager`: 文件上传、转换、存储（轻量级操作）
  - `WorkerManager`: 管理 Worker 线程（重型文件处理和向量化）
  - `IPCHandler`: 进程间通信处理

#### Worker Threads (Node.js)

- **职责**: 重型文件处理、PDF 转换、向量化计算
- **核心模块**:
  - `FileProcessor`: 大文件处理和 PDF/A 转换
  - `EmbeddingProcessor`: 文本向量化处理
  - `TaskQueue`: 任务队列管理

#### Renderer Process (React)

- **职责**: 用户界面、用户交互、状态管理
- **核心模块**:
  - `UIComponents`: React 组件
  - `StateStore`: Zustand 状态管理
  - `APIService`: OpenAI Agents JS 集成
  - `IPCClient`: 与主进程通信

## 数据模型设计

### SQLite 数据库结构

```sql
-- 项目表
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 会话表
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled Chat',
    project_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- 消息表
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    file_references TEXT, -- JSON 数组存储文件引用 ID
    tool_calls TEXT, -- JSON 格式存储工具调用信息
    metadata TEXT, -- JSON 格式存储其他元数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 文件表
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    pdf_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    md5_original TEXT NOT NULL,
    md5_pdf TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 项目记忆表
CREATE TABLE project_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'memory' CHECK (type IN ('memory', 'description')),
    is_system BOOLEAN DEFAULT FALSE, -- 系统生成的记忆（如项目描述）不可删除
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 项目知识表
CREATE TABLE project_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 应用设置表
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 向量存储表（使用 hnswsqlite）
CREATE VIRTUAL TABLE IF NOT EXISTS vector_documents USING hnsw(
    id TEXT PRIMARY KEY,
    file_id INTEGER,
    project_id INTEGER,
    chunk_index INTEGER,
    content TEXT,
    filename TEXT,
    chunk_start INTEGER,
    chunk_end INTEGER,
    created_at TEXT,
    embedding(768) -- 向量维度，根据实际 embedding 模型调整
);

-- 重排模型配置
CREATE TABLE rerank_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL,
    api_key TEXT,
    base_url TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_project_memories_project_id ON project_memories(project_id);
CREATE INDEX idx_project_knowledge_project_id ON project_knowledge(project_id);
```

### hnswsqlite 向量存储结构

```typescript
interface VectorDocument {
  id: string // 唯一标识符
  file_id: number // 关联的文件 ID
  project_id: number // 关联的项目 ID
  chunk_index: number // 文本块索引
  content: string // 原始文本内容
  filename: string // 文件名
  chunk_start: number // 文本块开始位置
  chunk_end: number // 文本块结束位置
  created_at: string // 创建时间
  embedding: number[] // 向量表示（由 hnswsqlite 处理）
}

interface RerankResult {
  document: VectorDocument
  score: number
  relevance_score: number // 重排后的相关性分数
}
```

## 组件架构设计

### 左侧边栏详细设计

#### 边栏整体结构

```typescript
// src/components/layout/Sidebar.tsx
interface SidebarProps {
  width: number // 固定260px
  isCollapsed?: boolean
}

interface SidebarState {
  expandedProjects: Set<number>
  selectedItem: { type: 'project' | 'chat', id: number } | null
  hoveredItem: { type: 'project' | 'chat', id: number } | null
}
```

#### 边栏头部组件

```typescript
// src/components/layout/SidebarHeader.tsx
interface SidebarHeaderProps {
  onNewChat: () => void
  onGlobalSearch: () => void
}

// 组件结构：
// - Knowlex Logo (固定顶部)
// - New Chat 按钮 (黑色背景，白色文字，+ 图标)
// - Global Search 图标 (搜索图标，灰色背景)
```

#### 项目区域组件

```typescript
// src/components/layout/ProjectSection.tsx
interface ProjectSectionProps {
  projects: Project[]
  expandedProjects: Set<number>
  onToggleProject: (projectId: number) => void
  onCreateProject: () => void
  onProjectAction: (projectId: number, action: ProjectAction) => void
}

interface ProjectAction {
  type: 'rename' | 'delete' | 'file-manager' | 'memory-knowledge'
  payload?: any
}
```

#### 单个项目组件

```typescript
// src/components/layout/ProjectItem.tsx
interface ProjectItemProps {
  project: Project
  isExpanded: boolean
  isHovered: boolean
  conversations: Conversation[]
  onToggle: () => void
  onHover: (hovered: boolean) => void
  onAction: (action: ProjectAction) => void
  onConversationAction: (conversationId: number, action: ConversationAction) => void
}

interface ConversationAction {
  type: 'move-to' | 'move-out' | 'rename' | 'delete'
  targetProjectId?: number
}

// 悬浮状态显示的图标：
// - 文件图标 (file icon) -> 触发文件管理页面
// - 书本图标 (book icon) -> 触发记忆与知识管理页面  
// - 菜单图标 (menu icon) -> 显示重命名/删除菜单
```

#### 聊天区域组件

```typescript
// src/components/layout/ChatSection.tsx
interface ChatSectionProps {
  conversations: Conversation[]
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  onConversationAction: (conversationId: number, action: ConversationAction) => void
}

// 实现无限滚动：
// - 使用 react-window 或 react-virtualized 优化长列表性能
// - 每次加载10个会话
// - 按最后修改时间倒序排列
```

#### 单个聊天会话组件

```typescript
// src/components/layout/ChatItem.tsx
interface ChatItemProps {
  conversation: Conversation
  showTimestamp: boolean
  isHovered: boolean
  onHover: (hovered: boolean) => void
  onAction: (action: ConversationAction) => void
  onSelect: () => void
}

// 时间显示逻辑：
// - 刚刚 (< 1分钟)
// - X分钟前 (< 1小时)
// - X小时前 (< 24小时)
// - 今天 (当天)
// - 昨天 (前一天)
// - X天前 (< 7天)
// - YYYY-MM-DD (> 7天)
```

#### 边栏底部组件

```typescript
// src/components/layout/SidebarFooter.tsx
interface SidebarFooterProps {
  user: User
  onSettingsAction: (action: SettingsAction) => void
}

interface SettingsAction {
  type: 'configuration' | 'theme' | 'language' | 'logout'
  payload?: any
}

interface ThemeOption {
  value: 'light' | 'dark' | 'system'
  label: string
}

interface LanguageOption {
  value: 'en' | 'zh'
  label: string
}
```

### 前端组件层次结构

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # 左侧边栏主组件
│   │   ├── SidebarHeader.tsx     # 边栏头部（Logo、New Chat、搜索）
│   │   ├── ProjectSection.tsx    # 项目区域组件
│   │   ├── ProjectItem.tsx       # 单个项目组件
│   │   ├── ChatSection.tsx       # 未归类聊天区域组件
│   │   ├── ChatItem.tsx          # 单个聊天会话组件
│   │   ├── SidebarFooter.tsx     # 边栏底部（用户信息、设置）
│   │   ├── MainContent.tsx       # 右侧主内容区
│   │   └── Layout.tsx            # 整体布局
│   ├── chat/
│   │   ├── ChatInterface.tsx     # 聊天界面
│   │   ├── MessageList.tsx       # 消息列表
│   │   ├── MessageInput.tsx      # 消息输入框
│   │   └── FileUpload.tsx        # 文件上传组件
│   ├── project/
│   │   ├── ProjectList.tsx       # 项目列表
│   │   ├── ProjectOverview.tsx   # 项目概览
│   │   ├── FileManager.tsx       # 文件管理
│   │   └── MemoryKnowledge.tsx   # 记忆与知识管理
│   ├── search/
│   │   ├── GlobalSearch.tsx      # 全局搜索
│   │   └── SearchResults.tsx     # 搜索结果
│   ├── settings/
│   │   ├── SettingsPanel.tsx     # 设置面板
│   │   ├── APIConfig.tsx         # API 配置
│   │   └── ThemeSelector.tsx     # 主题选择器
│   └── common/
│       ├── Modal.tsx             # 通用模态框
│       ├── Button.tsx            # 通用按钮
│       └── Loading.tsx           # 加载组件
├── services/
│   ├── api/
│   │   ├── openai.service.ts     # OpenAI API 服务
│   │   ├── embedding.service.ts  # 向量化服务
│   │   └── ipc.service.ts        # IPC 通信服务
│   ├── database/
│   │   ├── sqlite.service.ts     # SQLite 操作
│   │   └── vector.service.ts     # 向量数据库操作
│   ├── file/
│   │   └── file.service.ts       # 文件处理服务
│   └── mock/
│       ├── ipc.mock.ts           # IPC Mock 服务
│       ├── openai.mock.ts        # OpenAI Mock 服务
│       └── database.mock.ts      # 数据库 Mock 服务
├── stores/
│   ├── app.store.ts              # 应用全局状态
│   ├── chat.store.ts             # 聊天状态
│   ├── project.store.ts          # 项目状态
│   └── settings.store.ts         # 设置状态
├── types/
│   ├── api.types.ts              # API 类型定义 (引用 @knowlex/types)
│   ├── database.types.ts         # 数据库类型定义 (引用 @knowlex/types)
│   └── app.types.ts              # 应用类型定义
├── utils/
│   ├── constants.ts              # 常量定义
│   ├── helpers.ts                # 工具函数
│   └── validation.ts             # 数据验证
└── i18n/
    ├── index.ts                  # 国际化配置
    ├── locales/
    │   ├── en.json              # 英文语言包
    │   └── zh.json              # 中文语言包
    └── hooks/
        └── useTranslation.ts     # 翻译 Hook
```

### 共享类型包结构

```
packages/
└── types/
    ├── package.json              # @knowlex/types 包配置
    ├── src/
    │   ├── ipc.types.ts          # IPC 通道类型定义
    │   ├── database.types.ts     # 数据库 Schema 类型
    │   ├── api.types.ts          # API 接口类型
    │   ├── common.types.ts       # 通用类型定义
    │   └── index.ts              # 类型导出入口
    ├── CHANGELOG.md              # 类型变更日志
    └── README.md                 # 类型包文档
```

### 后端服务层次结构

```
src-electron/
├── main/
│   ├── index.ts                  # 主进程入口
│   ├── window.ts                 # 窗口管理
│   └── menu.ts                   # 菜单配置
├── services/
│   ├── database/
│   │   ├── sqlite.manager.ts     # SQLite 管理器
│   │   ├── vector.manager.ts     # hnswsqlite 管理器
│   │   ├── migration.ts          # 数据库迁移
│   │   └── schema.version.ts     # Schema 版本管理
│   ├── file/
│   │   ├── file.manager.ts       # 文件管理器
│   │   ├── pdf.converter.ts      # PDF 转换器
│   │   └── storage.manager.ts    # 存储管理器
│   ├── ai/
│   │   ├── openai.client.ts      # OpenAI 客户端
│   │   ├── embedding.client.ts   # 向量化客户端
│   │   ├── rerank.client.ts      # 重排模型客户端
│   │   └── rag.service.ts        # RAG 服务
│   └── search/
│       └── fulltext.service.ts   # 全文搜索服务
├── handlers/
│   ├── base.handler.ts           # 基础处理器 (版本化支持)
│   ├── chat.handler.ts           # 聊天处理器
│   ├── project.handler.ts        # 项目处理器
│   ├── file.handler.ts           # 文件处理器
│   └── settings.handler.ts       # 设置处理器
├── workers/
│   ├── file-processor.worker.ts  # 文件处理 Worker Thread
│   ├── embedding.worker.ts       # 向量化 Worker Thread
│   └── task-queue.worker.ts      # 任务队列 Worker Thread
├── types/
│   ├── ipc.types.ts              # IPC 类型定义 (引用 @knowlex/types)
│   ├── database.types.ts         # 数据库类型定义 (引用 @knowlex/types)
│   └── worker.types.ts           # Worker 线程类型定义
└── utils/
    ├── logger.ts                 # 日志工具
    ├── crypto.ts                 # 加密工具
    ├── path.helper.ts            # 路径工具
    └── version.helper.ts         # 版本管理工具
```


## Mock 服务设计

为了支持前端独立开发和测试，系统提供 Mock 服务：

- **IPC Mock**: 模拟主进程 IPC 通信，支持所有定义的通道
- **OpenAI Mock**: 模拟 AI API 响应，包括流式和非流式模式
- **数据 Mock**: 提供预定义的测试场景数据
- **自动生成**: 基于 TypeScript 接口自动生成 Mock 数据

## 开发与部署

### 代码质量标准
- TypeScript 类型检查
- ESLint + Prettier 代码规范
- 单元测试覆盖率 ≥ 80%
- 集成测试和 E2E 测试
- 跨平台构建验证

### 分支策略
- `main`: 生产分支，需要 PR + 2人审核
- `develop`: 开发分支，需要 PR + 1人审核  
- `feature/*`: 功能分支
- `release/*`: 发布分支
- `hotfix/*`: 热修复分支

### 自动化流程
- 代码提交触发质量检查
- 标签推送触发自动构建和发布
- 支持 macOS、Windows 跨平台打包
- 集成代码签名和公证

## 关键业务流程

### 核心用户场景

1. **项目创建与聊天**
   - 用户创建项目 → 系统生成项目记录 → 自动创建首个会话 → 开始对话

2. **文件上传与 RAG**
   - 文件上传 → PDF/A 转换 → 文本分块 → 向量化 → 存储 → RAG 检索

3. **全局搜索**
   - 用户输入关键词 → FTS5 全文搜索 → 返回匹配结果 → 跳转到对应会话

4. **知识管理**
   - 聊天内容选择 → 保存为知识卡片 → Markdown 编辑 → 持久化存储

### 数据流转模式

- **前端 → IPC → 主进程 → 数据库**：标准的数据操作流程
- **主进程 → Worker 线程**：重型任务（文件处理、向量化）异步执行
- **流式响应**：AI 对话采用流式传输，实时显示响应内容

## 核心功能实现

### 1. OpenAI Agents JS 集成

```typescript
// src/services/api/openai.service.ts
import { Agent, run, tool } from '@openai/agents'
import { setDefaultOpenAIClient } from '@openai/agents'
import OpenAI from 'openai'

export class OpenAIService {
  private client: OpenAI
  private agent: Agent

  constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL,
    })

    setDefaultOpenAIClient(this.client)

    this.agent = new Agent({
      name: 'Knowlex Assistant',
      instructions: 'You are a helpful desktop assistant.',
      model,
    })
  }

  async sendMessage(
    message: string,
    context?: string,
    systemPrompt?: string,
    stream: boolean = true
  ) {
    const instructions = systemPrompt || this.agent.instructions
    const fullMessage = context ? `${context}\n\n${message}` : message

    if (stream) {
      const streamResult = await run(this.agent, fullMessage, {
        stream: true,
        instructions,
      })

      return streamResult
    } else {
      const result = await run(this.agent, fullMessage, { instructions })
      return result
    }
  }

  async generateTitle(conversation: string): Promise<string> {
    const titleAgent = new Agent({
      name: 'Title Generator',
      instructions: 'Generate a concise title (max 10 words) for the conversation.',
    })

    const result = await run(titleAgent, `Generate a title for this conversation: ${conversation}`)

    return result.finalOutput || 'Untitled Chat'
  }

  async generateSummary(conversation: string): Promise<string> {
    const summaryAgent = new Agent({
      name: 'Summary Generator',
      instructions: 'Create a concise summary of the conversation (max 1000 tokens).',
    })

    const result = await run(summaryAgent, `Summarize this conversation: ${conversation}`)

    return result.finalOutput || ''
  }
}
```

### 2. 向量化与 RAG 实现

```typescript
// src/services/api/embedding.service.ts
export class EmbeddingService {
  private client: OpenAI

  constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL,
    })
  }

  async embedText(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small', // 或配置的模型
      input: text,
    })

    return response.data[0].embedding
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    })

    return response.data.map(item => item.embedding)
  }
}

// src-electron/services/ai/rag.service.ts
export class RAGService {
  constructor(
    private vectorManager: VectorManager,
    private embeddingService: EmbeddingService,
    private rerankService?: RerankService
  ) {}

  async retrieveRelevantContext(
    query: string,
    projectId: number,
    topK: number = 20, // 增加初始召回数量
    finalK: number = 5
  ): Promise<{ context: string; sources: string[] }> {
    // 1. 向量化查询
    const queryVector = await this.embeddingService.embedText(query)

    // 2. 在向量数据库中搜索（扩大召回范围）
    const vectorResults = await this.vectorManager.search(queryVector, projectId, topK)

    // 3. 阈值过滤（score > 0.2）
    const filteredResults = vectorResults.filter(result => result.score > 0.2)

    // 4. 重排优化（如果启用）
    let finalResults = filteredResults
    if (this.rerankService && (await this.rerankService.isEnabled())) {
      finalResults = await this.rerankService.rerank(query, filteredResults, finalK)
    } else {
      // 使用 MMR (Max Marginal Relevance) 提升多样性
      finalResults = this.applyMMR(filteredResults, finalK, 0.7)
    }

    // 5. 构建上下文和来源
    const context = finalResults
      .map(result => `[${result.filename}]\n${result.content}`)
      .join('\n\n---\n\n')

    const sources = [...new Set(finalResults.map(result => result.filename))]

    return { context, sources }
  }

  private applyMMR(results: VectorDocument[], k: number, lambda: number = 0.7): VectorDocument[] {
    if (results.length <= k) return results

    const selected: VectorDocument[] = []
    const remaining = [...results]

    // 选择第一个最相关的
    selected.push(remaining.shift()!)

    while (selected.length < k && remaining.length > 0) {
      let bestIndex = 0
      let bestScore = -Infinity

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]

        // 计算与查询的相关性（已有的向量相似度）
        const relevanceScore = candidate.score || 0

        // 计算与已选择文档的最大相似度（多样性惩罚）
        const maxSimilarity = Math.max(
          ...selected.map(doc => this.calculateTextSimilarity(candidate.content, doc.content))
        )

        // MMR 分数：平衡相关性和多样性
        const mmrScore = lambda * relevanceScore - (1 - lambda) * maxSimilarity

        if (mmrScore > bestScore) {
          bestScore = mmrScore
          bestIndex = i
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0])
    }

    return selected
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // 简单的文本相似度计算（可以用更复杂的算法替换）
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  async processFileForRAG(
    fileId: number,
    projectId: number,
    content: string,
    filename: string
  ): Promise<void> {
    // 1. 智能文本分块（支持中英文）
    const chunks = await this.smartChunkText(content, 500, 50)

    // 2. 批量向量化
    const vectors = await this.embeddingService.embedTexts(chunks.map(c => c.text))

    // 3. 存储到向量数据库
    const documents: VectorDocument[] = chunks.map((chunk, index) => ({
      id: `${fileId}_${index}`,
      file_id: fileId,
      project_id: projectId,
      chunk_index: index,
      content: chunk.text,
      filename,
      chunk_start: chunk.start,
      chunk_end: chunk.end,
      created_at: new Date().toISOString(),
      embedding: vectors[index],
    }))

    await this.vectorManager.insertDocuments(documents)
  }

  private async smartChunkText(
    text: string,
    maxTokens: number,
    overlapTokens: number
  ): Promise<Array<{ text: string; start: number; end: number }>> {
    const chunks: Array<{ text: string; start: number; end: number }> = []

    // 按段落分割，优先保持语义完整性
    const paragraphs = text.split(/\n\s*\n/)
    let currentChunk = ''
    let currentStart = 0
    let currentPos = 0

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph)
      const currentTokens = this.estimateTokens(currentChunk)

      if (currentTokens + paragraphTokens <= maxTokens) {
        // 当前段落可以加入当前块
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      } else {
        // 当前块已满，保存并开始新块
        if (currentChunk) {
          chunks.push({
            text: currentChunk,
            start: currentStart,
            end: currentPos + currentChunk.length,
          })

          // 处理重叠
          const overlapText = this.getOverlapText(currentChunk, overlapTokens)
          currentChunk = overlapText + (overlapText ? '\n\n' : '') + paragraph
          currentStart = currentPos + currentChunk.length - overlapText.length
        } else {
          currentChunk = paragraph
        }
      }

      currentPos += paragraph.length + 2 // +2 for \n\n
    }

    // 添加最后一个块
    if (currentChunk) {
      chunks.push({
        text: currentChunk,
        start: currentStart,
        end: currentPos,
      })
    }

    return chunks
  }

  private estimateTokens(text: string): number {
    // 简单的 token 估算：中文字符按1个token，英文单词按0.75个token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    return Math.ceil(chineseChars + englishWords * 0.75)
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const sentences = text.split(/[.!?。！？]/)
    let overlapText = ''
    let tokenCount = 0

    // 从末尾开始，选择完整的句子作为重叠
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i].trim()
      const sentenceTokens = this.estimateTokens(sentence)

      if (tokenCount + sentenceTokens <= overlapTokens) {
        overlapText = sentence + (overlapText ? '. ' : '') + overlapText
        tokenCount += sentenceTokens
      } else {
        break
      }
    }

    return overlapText
  }
}

// src-electron/services/ai/rerank.client.ts
export class RerankService {
  private client: OpenAI
  private modelName: string
  private enabled: boolean = false

  constructor() {
    this.loadSettings()
  }

  async isEnabled(): Promise<boolean> {
    return this.enabled
  }

  async rerank(
    query: string,
    documents: VectorDocument[],
    topK: number
  ): Promise<VectorDocument[]> {
    if (!this.enabled || !this.client) {
      return documents.slice(0, topK)
    }

    try {
      // 构建重排请求
      const rerankTexts = documents.map(doc => doc.content)

      // 调用重排模型 API（假设使用兼容的重排接口）
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content: `You are a document reranker. Given a query and a list of documents, return the relevance scores (0-1) for each document. Return only a JSON array of scores.`,
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nDocuments:\n${rerankTexts.map((text, i) => `${i}: ${text}`).join('\n\n')}`,
          },
        ],
        temperature: 0,
      })

      const scoresText = response.choices[0]?.message?.content || '[]'
      const scores = JSON.parse(scoresText) as number[]

      // 结合原始分数和重排分数
      const rankedDocs = documents
        .map((doc, index) => ({
          ...doc,
          relevance_score: scores[index] || 0,
        }))
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, topK)

      return rankedDocs
    } catch (error) {
      console.warn('Rerank failed, falling back to original ranking:', error)
      return documents.slice(0, topK)
    }
  }

  private async loadSettings(): Promise<void> {
    // 从数据库加载重排设置
    // 实现省略...
  }
}

// src-electron/services/database/vector.manager.ts (hnswsqlite)
export class VectorManager {
  private db: Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.initializeVectorDB()
  }

  private initializeVectorDB(): void {
    // 启用 hnswsqlite 扩展
    this.db.loadExtension('hnswsqlite')

    // 创建向量表
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vector_documents USING hnsw(
        id TEXT PRIMARY KEY,
        file_id INTEGER,
        project_id INTEGER,
        chunk_index INTEGER,
        content TEXT,
        filename TEXT,
        chunk_start INTEGER,
        chunk_end INTEGER,
        created_at TEXT,
        embedding(768) -- 根据实际模型调整维度
      );
      
      CREATE INDEX IF NOT EXISTS idx_vector_project_id ON vector_documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_vector_file_id ON vector_documents(file_id);
    `)
  }

  async insertDocuments(documents: VectorDocument[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO vector_documents (
        id, file_id, project_id, chunk_index, content, 
        filename, chunk_start, chunk_end, created_at, embedding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction((docs: VectorDocument[]) => {
      for (const doc of docs) {
        stmt.run(
          doc.id,
          doc.file_id,
          doc.project_id,
          doc.chunk_index,
          doc.content,
          doc.filename,
          doc.chunk_start,
          doc.chunk_end,
          doc.created_at,
          JSON.stringify(doc.embedding) // hnswsqlite 处理向量格式
        )
      }
    })

    transaction(documents)
  }

  async search(queryVector: number[], projectId: number, topK: number): Promise<VectorDocument[]> {
    const stmt = this.db.prepare(`
      SELECT 
        id, file_id, project_id, chunk_index, content,
        filename, chunk_start, chunk_end, created_at,
        distance(embedding, ?) as score
      FROM vector_documents
      WHERE project_id = ?
      ORDER BY score ASC
      LIMIT ?
    `)

    const results = stmt.all(JSON.stringify(queryVector), projectId, topK)

    return results.map(row => ({
      id: row.id,
      file_id: row.file_id,
      project_id: row.project_id,
      chunk_index: row.chunk_index,
      content: row.content,
      filename: row.filename,
      chunk_start: row.chunk_start,
      chunk_end: row.chunk_end,
      created_at: row.created_at,
      embedding: [], // 不返回向量数据以节省内存
      score: 1 - row.score, // 转换为相似度分数
    }))
  }

  async deleteByFileId(fileId: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM vector_documents WHERE file_id = ?')
    stmt.run(fileId)

    // 执行 VACUUM 回收空间
    this.db.exec('VACUUM')
  }

  async deleteByProjectId(projectId: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM vector_documents WHERE project_id = ?')
    stmt.run(projectId)

    this.db.exec('VACUUM')
  }
}
```

### 3. 文件处理与转换

```typescript
// src-electron/services/file/file.manager.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import { PDFConverter } from './pdf.converter'

export class FileManager {
  constructor(
    private dataDir: string,
    private pdfConverter: PDFConverter
  ) {}

  async processUploadedFile(
    filePath: string,
    projectId: number,
    filename: string
  ): Promise<{
    fileId: number
    originalPath: string
    pdfPath: string
    md5Original: string
    md5Pdf: string
  }> {
    // 1. 读取原始文件
    const originalContent = await fs.readFile(filePath)
    const md5Original = crypto.createHash('md5').update(originalContent).digest('hex')

    // 2. 检查是否已存在相同文件
    const existingFile = await this.checkDuplicateFile(md5Original)
    if (existingFile) {
      return existingFile
    }

    // 3. 保存原始文件
    const originalPath = path.join(
      this.dataDir,
      'files',
      `${projectId}`,
      'original',
      `${Date.now()}_${filename}`
    )
    await fs.mkdir(path.dirname(originalPath), { recursive: true })
    await fs.copyFile(filePath, originalPath)

    // 4. 转换为 PDF/A
    const pdfPath = path.join(
      this.dataDir,
      'files',
      `${projectId}`,
      'pdf',
      `${Date.now()}_${filename}.pdf`
    )
    await fs.mkdir(path.dirname(pdfPath), { recursive: true })

    try {
      await this.pdfConverter.convertToPDFA(originalPath, pdfPath)
      const pdfContent = await fs.readFile(pdfPath)
      const md5Pdf = crypto.createHash('md5').update(pdfContent).digest('hex')

      // 5. 保存到数据库
      const fileId = await this.saveFileMetadata({
        projectId,
        filename,
        originalPath,
        pdfPath,
        fileSize: originalContent.length,
        md5Original,
        md5Pdf,
        status: 'completed',
      })

      return {
        fileId,
        originalPath,
        pdfPath,
        md5Original,
        md5Pdf,
      }
    } catch (error) {
      // PDF 转换失败，标记状态
      const fileId = await this.saveFileMetadata({
        projectId,
        filename,
        originalPath,
        pdfPath: '',
        fileSize: originalContent.length,
        md5Original,
        md5Pdf: '',
        status: 'failed',
      })

      throw new Error(`PDF conversion failed: ${error.message}`)
    }
  }

  private async checkDuplicateFile(md5: string): Promise<any> {
    // 检查数据库中是否存在相同 MD5 的文件
    // 实现省略...
  }

  private async saveFileMetadata(metadata: any): Promise<number> {
    // 保存文件元数据到 SQLite
    // 实现省略...
  }
}
```

### 4. 全文搜索实现

```typescript
// src-electron/services/search/fulltext.service.ts
export class FullTextSearchService {
  constructor(private dbManager: SQLiteManager) {}

  async searchConversations(
    query: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<SearchResult[]> {
    const sql = `
      SELECT 
        c.id as conversation_id,
        c.title,
        c.project_id,
        p.name as project_name,
        m.content,
        m.created_at,
        snippet(messages_fts, 2, '<mark>', '</mark>', '...', 32) as snippet
      FROM messages_fts
      JOIN messages m ON messages_fts.rowid = m.id
      JOIN conversations c ON m.conversation_id = c.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE messages_fts MATCH ?
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `

    const results = await this.dbManager.query(sql, [query, limit, offset])

    return results.map(row => ({
      conversationId: row.conversation_id,
      title: row.title,
      projectId: row.project_id,
      projectName: row.project_name || 'Uncategorized',
      snippet: row.snippet,
      createdAt: row.created_at,
    }))
  }

  async initializeFTS(): Promise<void> {
    // 设置 SQLite 配置以优化中英文搜索
    await this.dbManager.exec(`
      PRAGMA page_size = 8192;
      PRAGMA journal_mode = WAL;
    `)

    // 创建全文搜索虚拟表，支持中英文分词
    const sql = `
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts 
      USING fts5(
        content, 
        content='messages', 
        content_rowid='id',
        tokenize='unicode61 remove_diacritics 2'
      );
      
      -- 创建触发器保持 FTS 表同步
      CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
      END;
      
      CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
      END;
      
      CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
        INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
      END;
    `

    await this.dbManager.exec(sql)

    // 定期优化 FTS 索引
    setInterval(
      async () => {
        try {
          await this.dbManager.exec("INSERT INTO messages_fts(messages_fts) VALUES('optimize')")
        } catch (error) {
          console.warn('FTS optimization failed:', error)
        }
      },
      24 * 60 * 60 * 1000
    ) // 每24小时优化一次
  }
}
```

## 状态管理设计

### Zustand Store 结构

```typescript
// src/stores/app.store.ts
interface AppState {
  // UI 状态
  sidebarWidth: number
  currentView: 'chat' | 'project' | 'settings'
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'zh'

  // 边栏状态
  expandedProjects: Set<number>
  selectedItem: { type: 'project' | 'chat', id: number } | null
  hoveredItem: { type: 'project' | 'chat', id: number } | null

  // 加载状态
  isLoading: boolean
  loadingMessage: string

  // 错误状态
  error: string | null

  // 操作
  setSidebarWidth: (width: number) => void
  setCurrentView: (view: string) => void
  setTheme: (theme: string) => void
  setLanguage: (language: string) => void
  toggleProjectExpansion: (projectId: number) => void
  setSelectedItem: (item: { type: 'project' | 'chat', id: number } | null) => void
  setHoveredItem: (item: { type: 'project' | 'chat', id: number } | null) => void
  setLoading: (loading: boolean, message?: string) => void
  setError: (error: string | null) => void
}

// src/stores/chat.store.ts
interface ChatState {
  // 当前会话
  currentConversation: Conversation | null
  messages: Message[]

  // 输入状态
  inputText: string
  uploadedFiles: File[]
  isStreaming: boolean

  // RAG 状态
  ragEnabled: boolean
  ragContext: string[]

  // 操作
  setCurrentConversation: (conversation: Conversation | null) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  setInputText: (text: string) => void
  addUploadedFile: (file: File) => void
  removeUploadedFile: (index: number) => void
  setStreaming: (streaming: boolean) => void
  toggleRAG: () => void
  setRAGContext: (context: string[]) => void
}

// src/stores/project.store.ts
interface ProjectState {
  // 项目数据
  projects: Project[]
  currentProject: Project | null

  // 文件数据
  projectFiles: ProjectFile[]
  fileUploadProgress: Record<string, number>

  // 记忆与知识
  projectMemories: ProjectMemory[]
  projectKnowledge: ProjectKnowledge[]

  // 操作
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: number, updates: Partial<Project>) => void
  deleteProject: (id: number) => void

  setProjectFiles: (files: ProjectFile[]) => void
  addProjectFile: (file: ProjectFile) => void
  updateFileProgress: (fileId: string, progress: number) => void

  setProjectMemories: (memories: ProjectMemory[]) => void
  addProjectMemory: (memory: ProjectMemory) => void
  updateProjectMemory: (id: number, updates: Partial<ProjectMemory>) => void
  deleteProjectMemory: (id: number) => void

  setProjectKnowledge: (knowledge: ProjectKnowledge[]) => void
  addProjectKnowledge: (knowledge: ProjectKnowledge) => void
  updateProjectKnowledge: (id: number, updates: Partial<ProjectKnowledge>) => void
  deleteProjectKnowledge: (id: number) => void
}
```

## IPC 通信设计

### IPC 通道定义

```typescript
// src/types/ipc.types.ts
export interface IPCChannels {
  // 聊天相关
  'chat:send-message': {
    request: {
      message: string
      conversationId?: number
      projectId?: number
      files?: string[]
      ragEnabled?: boolean
    }
    response: {
      messageId: string
      stream?: AsyncIterable<string>
    }
  }

  'chat:generate-title': {
    request: { conversationId: number }
    response: { title: string }
  }

  // 项目相关
  'project:create': {
    request: { name: string; description?: string }
    response: { project: Project }
  }

  'project:list': {
    request: {}
    response: { projects: Project[] }
  }

  'project:delete': {
    request: { projectId: number }
    response: { success: boolean }
  }

  // 文件相关
  'file:upload': {
    request: {
      filePaths: string[]
      projectId: number
    }
    response: {
      files: ProjectFile[]
      progress?: Record<string, number>
    }
  }

  'file:delete': {
    request: { fileId: number }
    response: { success: boolean }
  }

  // 搜索相关
  'search:global': {
    request: {
      query: string
      limit?: number
      offset?: number
    }
    response: { results: SearchResult[] }
  }

  // 设置相关
  'settings:get': {
    request: { key?: string }
    response: { settings: Record<string, any> }
  }

  'settings:set': {
    request: { key: string; value: any }
    response: { success: boolean }
  }

  'settings:test-api': {
    request: {
      type: 'chat' | 'embedding' | 'rerank'
      config: APIConfig
    }
    response: {
      success: boolean
      error?: string
    }
  }

  'settings:rerank-config': {
    request: {
      modelName: string
      apiKey?: string
      baseUrl?: string
      enabled: boolean
    }
    response: { success: boolean }
  }
}
```

## 错误处理与日志

### 错误处理策略

```typescript
// src/utils/error-handler.ts
export class ErrorHandler {
  static handleAPIError(error: any): string {
    if (error.code === 'ENOTFOUND') {
      return '网络连接失败，请检查网络设置'
    }

    if (error.status === 401) {
      return 'API 密钥无效，请检查配置'
    }

    if (error.status === 429) {
      return 'API 请求频率过高，请稍后重试'
    }

    if (error.status === 500) {
      return 'API 服务器错误，请稍后重试'
    }

    return error.message || '未知错误'
  }

  static handleFileError(error: any): string {
    if (error.code === 'ENOENT') {
      return '文件不存在'
    }

    if (error.code === 'EACCES') {
      return '文件访问权限不足'
    }

    if (error.code === 'EMFILE') {
      return '打开文件数量过多'
    }

    return error.message || '文件操作失败'
  }
}

// src-electron/utils/logger.ts
import * as winston from 'winston'
import * as path from 'path'
import { app } from 'electron'

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(app.getPath('userData'), 'logs', 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(app.getPath('userData'), 'logs', 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 30, // 保留30天
      tailable: true,
    }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  )
}

// 定期清理旧日志
setInterval(
  () => {
    // Winston 的 maxFiles 会自动处理日志轮转
  },
  24 * 60 * 60 * 1000
)
```

## 性能优化策略

### 1. 前端优化

- **虚拟滚动**: 长消息列表和搜索结果使用虚拟滚动
- **懒加载**: 组件和路由懒加载
- **防抖节流**: 搜索输入和 API 调用防抖
- **缓存策略**: 使用 React Query 缓存 API 响应

### 2. 后端优化

- **数据库连接池**: SQLite 连接复用
- **批量操作**: 向量化和数据库写入批量处理
- **异步处理**: 文件处理和向量化异步执行
- **内存管理**: 及时释放大文件内存

### 3. 存储优化

- **索引优化**: 关键查询字段建立索引
- **数据压缩**: 向量数据压缩存储
- **清理策略**: 定期清理临时文件和过期数据

## 安全考虑

### 1. 数据安全

- **本地存储**: 所有数据存储在本地，不上传到云端
- **API 密钥**: 加密存储 API 密钥
- **文件权限**: 限制文件访问权限

### 2. 输入验证

- **文件类型**: 严格验证上传文件类型
- **文件大小**: 限制单文件和总文件大小
- **SQL 注入**: 使用参数化查询防止 SQL 注入

### 3. 进程隔离

- **沙箱**: Renderer 进程运行在沙箱环境
- **权限控制**: 最小权限原则
- **IPC 验证**: IPC 消息验证和过滤

## 测试策略

### 1. 单元测试

- **组件测试**: React 组件单元测试
- **服务测试**: API 服务和数据库操作测试
- **工具函数**: 纯函数单元测试

### 2. 集成测试

- **IPC 通信**: 主进程和渲染进程通信测试
- **数据库**: 数据库操作集成测试
- **文件处理**: 文件上传和转换集成测试

### 3. E2E 测试

- **用户流程**: 关键用户操作流程测试
- **跨平台**: macOS 和 Windows 平台测试

## 部署与分发

### 1. 构建配置

```json
{
  "build": {
    "appId": "com.knowlex.desktop",
    "productName": "Knowlex",
    "directories": {
      "output": "dist"
    },
    "files": ["dist-electron/**/*", "dist/**/*", "node_modules/**/*"],
    "mac": {
      "category": "public.app-category.productivity",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ]
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ]
    },
    "publish": {
      "provider": "github",
      "owner": "knowlex",
      "repo": "knowlex-desktop"
    }
  }
}
```

### 2. 自动更新

- **Electron Updater**: 集成自动更新功能
- **增量更新**: 支持增量更新减少下载量
- **更新策略**: 用户可选择自动或手动更新

## 关键数据流程

### 消息处理流程
1. 用户发送消息 → IPC 通信 → 主进程处理
2. 如启用 RAG：查询项目记忆 → 向量检索 → 构建上下文
3. 调用 AI API（流式） → 实时返回响应 → 保存到数据库
4. 新会话自动生成标题并更新

### 文件处理流程
1. 文件上传 → 保存原始文件 → 转换为 PDF/A
2. Worker 线程异步处理：文本分块 → 向量化 → 存储
3. 实时更新处理状态 → 完成后通知前端

### 安全与性能要点
- **进程隔离**: Renderer 进程沙箱化，主进程控制数据访问
- **Worker 线程**: 重型任务异步处理，避免阻塞主进程
- **批量操作**: 向量化和数据库写入采用批量处理
- **内存管理**: 及时释放大文件内存，使用流式处理

## 国际化支持

### i18n 架构
- **框架**: react-i18next + i18next
- **语言检测**: 本地存储优先，回退到浏览器语言
- **动态切换**: 支持运行时语言切换
- **资源管理**: 分模块的语言包结构
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "loading": "加载中..."
  },
  "sidebar": {
    "newChat": "新建聊天",
    "globalSearch": "全局搜索",
    "projects": "项目",
    "chats": "聊天记录"
  },
  "chat": {
    "inputPlaceholder": "你好，有什么可以帮你的吗？",
    "uploadFile": "上传文件",
    "ragEnabled": "RAG 检索已启用",
    "ragDisabled": "RAG 检索已禁用"
  },
  "project": {
    "createProject": "创建项目",
    "projectName": "项目名称",
    "projectDescription": "项目描述",
    "fileManager": "文件管理",
    "memoryKnowledge": "记忆与知识"
  }
}
```

### 3. 翻译 Hook

```typescript
// src/i18n/hooks/useTranslation.ts
import { useTranslation as useI18nTranslation } from 'react-i18next'

export const useTranslation = (namespace?: string) => {
  const { t, i18n } = useI18nTranslation(namespace)

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    // 保存到本地存储
    localStorage.setItem('language', lng)
  }

  return {
    t,
    currentLanguage: i18n.language,
    changeLanguage,
    languages: ['en', 'zh'],
  }
}
```

## 文档系统设计

### 1. 技术文档结构

```
docs/
├── api/
│   ├── README.md                 # API 概览
│   ├── ipc-channels.md          # IPC 通道文档
│   ├── database-schema.md       # 数据库结构
│   └── services/
│       ├── openai-service.md    # OpenAI 服务 API
│       ├── rag-service.md       # RAG 服务 API
│       └── file-service.md      # 文件服务 API
├── architecture/
│   ├── overview.md              # 架构概览
│   ├── data-flow.md             # 数据流程
│   ├── security.md              # 安全机制
│   └── performance.md           # 性能优化
├── development/
│   ├── setup.md                 # 开发环境搭建
│   ├── coding-standards.md      # 代码规范
│   ├── testing.md               # 测试指南
│   └── deployment.md            # 部署指南
└── user/
    ├── quick-start.md           # 快速开始
    ├── features/
    │   ├── chat.md              # 聊天功能
    │   ├── projects.md          # 项目管理
    │   ├── files.md             # 文件管理
    │   └── settings.md          # 设置配置
    ├── troubleshooting.md       # 故障排除
    └── faq.md                   # 常见问题
```

### 2. 文档生成工具

```typescript
// scripts/generate-docs.ts
import * as fs from 'fs'
import * as path from 'path'
import { generateApiDocs } from './api-doc-generator'
import { generateUserDocs } from './user-doc-generator'

async function generateDocs() {
  console.log('Generating documentation...')

  // 生成 API 文档
  await generateApiDocs()

  // 生成用户文档
  await generateUserDocs()

  // 生成目录索引
  await generateIndex()

  console.log('Documentation generated successfully!')
}

generateDocs().catch(console.error)
```

这个技术设计文档涵盖了 Knowlex 桌面应用的完整技术架构，为开发团队提供了清晰的实现指导。设计考虑了性能、安全性、可维护性和用户体验等多个方面，并根据反馈意见进行了重要优化：

- 采用 hnswsqlite 替代 LanceDB，简化部署和维护
- 引入 Worker 线程处理重型任务，提升响应性
- 加入重排模型支持，提升 RAG 检索质量
- 优化文本分块策略，更好支持中英文混合内容
- 完善安全机制和性能优化策略
- 集成国际化支持，提供中英文界面
- 建立完整的文档系统，支持技术和用户文档

## 左侧边栏界面原型设计

### 边栏整体布局

基于用户提供的原型描述，左侧边栏的详细界面设计如下：

```
+--------------------------------+
| [Knowlex Logo]                 |
|                                |
| + New Chat (黑色按钮，置顶)    |
|                                |
| [🔍 Global Search Icon]         |
| ----                           |
| Projects         (+) |
| 📁 Project A         | hover show [📄📖⋮]
| [toggle file icon on]      |
| 💬 Chat 1          今天     | hover show [⋮]
| 💬 Chat 2          昨天     | hover show [⋮]
| 📁 Project B         | hover show [📄📖⋮] 
| [toggle file icon off to collapse]    |
| ----                           |
| Chats (未归类聊天)           |
| 💬 Untitled Chat    刚刚|hover show [⋮]
| 💬 Chat 历史 1      2天前|hover show [⋮]
| 💬 Chat 历史 2      3天前|hover show [⋮]
|   ... (无限滚动加载)           |
|                                |
| [👤 用户头像] [用户名]  [⚙️]   |
+--------------------------------+
```

### 交互行为详细说明

#### 1. 项目区域交互

**项目悬浮状态**：
- 当用户悬浮在项目名称上时，右侧显示三个图标：
  - 📄 文件图标：点击进入项目文件管理页面
  - 📖 书本图标：点击进入记忆与知识管理页面
  - ⋮ 菜单图标：点击显示"重命名"和"删除"选项

**项目展开/折叠**：
- 📁 文件夹图标可点击展开/折叠项目下的聊天会话
- 展开时显示项目内所有聊天会话，每个会话右侧显示时间戳

**项目内聊天会话**：
- 悬浮时在时间戳位置显示 ⋮ 菜单图标
- 菜单选项包括：
  - "移动到" → 展开其他项目名称列表
  - "移出" → 移动到未归类聊天区域
  - "重命名"
  - "删除"

#### 2. 未归类聊天区域交互

**聊天会话列表**：
- 按最后修改时间倒序排列
- 实现无限滚动，每次加载10个会话
- 每个会话右侧显示时间戳

**聊天会话悬浮状态**：
- 悬浮时在时间戳位置显示 ⋮ 菜单图标
- 菜单选项包括：
  - "移动到" → 展开项目名称列表
  - "重命名"
  - "删除"

#### 3. 时间戳显示规则

```typescript
function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
```

#### 4. 底部设置菜单

**设置图标点击后显示菜单**：
- 配置：进入设置页面
- 主题：深色/浅色/系统主题切换
- 语言：中文/英文切换
- 登出：退出应用

**主题切换实现**：
```typescript
interface ThemeState {
  current: 'light' | 'dark' | 'system'
  systemPreference: 'light' | 'dark'
}

function applyTheme(theme: ThemeState) {
  const effectiveTheme = theme.current === 'system' 
    ? theme.systemPreference 
    : theme.current
    
  document.documentElement.setAttribute('data-theme', effectiveTheme)
  // 立即应用到所有UI组件
}
```

**语言切换实现**：
```typescript
function changeLanguage(lang: 'en' | 'zh') {
  i18n.changeLanguage(lang)
  localStorage.setItem('language', lang)
  // 通过i18n立即更新所有界面文本
}
```

### 响应式设计考虑

- 边栏固定宽度260px，不随窗口大小变化
- 长文本（项目名、聊天标题）使用省略号截断
- 图标使用统一的16x16px尺寸
- 悬浮状态使用微妙的背景色变化和阴影效果
- 支持键盘导航和无障碍访问

### 性能优化策略

- 未归类聊天列表使用虚拟滚动优化长列表性能
- 项目展开状态使用本地存储持久化
- 悬浮状态使用防抖避免频繁重渲染
- 时间戳使用定时器定期更新（每分钟）
