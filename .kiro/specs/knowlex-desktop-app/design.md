# Knowlex 桌面智能助理 - 技术设计文档 v4.0

## 1. 概述与架构原则

### 1.1 项目定位

Knowlex 是一款为知识工作者打造的桌面智能助理应用，旨在构建一个安全、私密、个性化的"第二大脑"。核心特性如下：

- **智能对话核心**: 提供流畅、支持上下文、可交互的AI对话体验，支持临时文件导入和消息编辑功能。
- **项目化知识管理**: 以项目为单位组织对话、文件和知识，提供专属的RAG检索和记忆管理。
- **本地文件处理**: MVP 阶段支持 `.txt` 和 `.md` 纯文本格式，区分临时聊天文件和永久项目文件。
- **全局信息检索**: 跨项目和会话的快速搜索定位能力。
- **完全本地化**: 所有用户数据存储在本地，确保隐私与数据所有权。

### 1.2 架构设计原则

- **分层架构 (Layered Architecture)**:
  - **展示层 (Presentation Layer)**: UI组件和状态管理 (`src`)。
  - **应用层 (Application Layer)**: 业务逻辑和服务编排 (`src-electron/services`)。
  - **领域层 (Domain Layer)**: 核心模型和业务规则 (在服务和数据库模型中体现)。
  - **基础设施层 (Infrastructure Layer)**: 数据库、文件系统、外部API封装。
- **核心设计原则**:
  - **单一职责原则 (SRP)**: 每个服务或组件只负责一个明确的功能域。
  - **依赖倒置原则 (DIP)**: 高层模块不依赖底层模块，都依赖于抽象（例如，通过 IPC 接口通信）。
  - **接口隔离原则 (ISP)**: 客户端（渲染进程）不应被迫依赖它不需要的接口。
  - **开闭原则 (OCP)**: 系统对扩展开放（如增加新的 LLM Provider），对修改关闭。

## 2. 系统架构

### 2.1 目录结构

```
knowlex/
├── src/                      # 前端 (Renderer Process - React App)
│   ├── components/           # UI 组件 (原子/分子/组织)
│   ├── hooks/                # 自定义 Hooks
│   ├── lib/                  # 工具函数, 客户端服务
│   ├── pages/                # 页面级组件
│   ├── stores/               # Zustand 状态管理
│   ├── styles/               # 全局样式与 Tailwind/Chakra 配置
│   └── main.tsx              # 前端入口
├── src-electron/             # 后端 (Main Process - Electron)
│   ├── services/             # 核心原子服务
│   ├── lib/                  # 后端工具函数 (e.g., db-helpers)
│   ├── preload/              # 预加载脚本
│   └── main.ts               # 后端入口
├── packages/
│   └── shared-types/         # 前后端共享的类型定义 (e.g., IPC, DB Schema)
├── docs/
├── electron.vite.config.ts   # Vite 配置文件
├── tsconfig.json             # 根 TypeScript 配置
└── package.json
```

### 2.2 三层进程模型

- **主进程 (Main Process)**: 应用的后端，负责应用生命周期管理、系统资源访问（文件系统、数据库）、原生 API 调用和后台任务调度。
- **渲染进程 (Renderer Process)**: 应用的前端，负责 UI 渲染与交互、状态管理、用户输入处理和所有展示逻辑。
- **预加载脚本 (Preload Script)**: 作为主进程和渲染进程之间的安全桥梁，通过 `contextBridge` 暴露经过严格定义的 API 接口。

### 2.3 技术栈

| 分类          | 技术                     | 备注                                          |
| ------------- | ------------------------ | --------------------------------------------- |
| **前端框架**  | React 18 + TypeScript    | 构建用户界面的核心。                          |
| **桌面框架**  | Electron                 | 提供跨平台能力。                              |
| **UI 组件库** | Chakra UI + Tailwind CSS | Chakra 提供组件骨架，Tailwind 提供原子化CSS。 |
| **状态管理**  | Zustand                  | 轻量级全局状态管理。                          |
| **数据库**    | better-sqlite3           | 高性能同步 SQLite 客户端。                    |
| **向量存储**  | hnswsqlite               | 本地向量检索能力，作为 better-sqlite3 扩展。  |
| **构建工具**  | Vite (electron-vite)     | 开发和打包工具。                              |

## 3. 核心服务层设计 (src-electron/services)

### 3.1 服务架构

所有服务采用单例模式，继承自统一的基类（如果需要共享生命周期方法），并通过依赖注入（或服务定位器模式）解耦。

### 3.2 主进程服务详情

- **`DatabaseService`**: 管理数据库连接和迁移。
  - `getInstance()`, `getDB()`, `runMigrations()`, `executeTransaction()`。
- **`ProjectService`**: 管理项目生命周期。
  - `createProject(name, desc)`, `updateProject(id, data)`, `deleteProject(id)`, `getProject(id)`, `listProjects()`, `getProjectStats(id)`。
- **`FileService`**: 文件上传和管理。
  - `uploadFiles(projectId, paths[])`, `deleteFile(id)`, `getFileContent(id)`, `getFilesByProject(id)`, `validateFile(file)`, `checkDuplicate(md5)`。
- **`RAGService`**: 检索增强生成处理。
  - `processFile(fileId)`, `retrieveContext(projectId, query, topK)`, `deleteVectors(fileId)`, `rebuildIndex(projectId)`。
  - **文本处理策略**: 智能分块（基于段落和滑动窗口），目标500字符，重叠50字符。
- **`LLMService`**: 大语言模型接口管理。
  - `registerProvider(provider)`, `setActiveProvider(id)`, `complete(req)`, `stream(req)`, `testConnection(config)`。
  - **Provider 适配器**: 需实现统一的请求/响应格式转换和错误处理。
- **`EmbeddingService`**: 文本向量化处理。
  - `generateEmbeddings(texts[])`, `setModel(modelId)`。
- **`ChatService`**: 会话和消息管理。
  - `createConversation(projectId?)`, `deleteConversation(id)`, `addMessage(convId, role, content)`, `getMessages(convId)`, `generateTitle(convId)`, `moveConversation(convId, projectId)`。
  - `editMessage(messageId, newContent)`, `deleteMessagesAfter(messageId)` - 支持消息编辑和重发功能。
- **`KnowledgeService`**: 知识和记忆管理。
  - `addMemory(projectId, content)`, `getMemories(projectId)`, `createKnowledgeCard(projectId, title, content)`, `getKnowledgeCards(projectId)`。
- **`SearchService`**: 全局搜索功能。
  - `searchAll(query)`, `buildIndex()`。
  - **搜索范围**: 仅搜索会话文本内容，使用SQLite FTS5全文搜索
  - **搜索优化**: 防抖处理（1秒延迟）、虚拟列表、无限滚动
- **`SettingsService`**: 应用配置管理。
  - `getSetting(key)`, `setSetting(key, value)`, `exportSettings()`, `importSettings(data)`。

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

## 4. 前端架构设计 (src)

### 4.1 状态管理 (Zustand Stores)

- **`useAppStore`**: 管理全局UI状态（`theme`, `language`, `activeView`）。
- **`useProjectStore`**: 管理项目相关数据（`projects`, `activeProjectId`, `projectFiles`等）。
- **`useChatStore`**: 管理会话相关状态（`conversations`, `activeConversationId`, `messages`, `isStreaming`等）。
- **`useSearchStore`**: 管理搜索状态（`searchQuery`, `searchResults`, `isSearching`）。

### 4.2 组件结构 (Atomic Design)

- **Atoms (原子)**: `Button`, `Input`, `Icon`, `Avatar`, `Badge`, `Spinner`。
- **Molecules (分子)**: `MessageBubble`, `FileCard`, `SearchBar`。
- **Organisms (组织)**: `Sidebar`, `ChatView`, `ProjectDashboard`, `SettingsPanel`。
- **Pages (页面)**: `ChatPage`, `ProjectPage`, `SettingsPage` 等，负责组合 Organisms。

### 4.3 UI 与样式策略

- **集成方案**: 采用团队行为约定。
  1. **Chakra UI 负责宏观布局和复杂组件**: 使用 `<Box>`, `<Stack>`, `<Grid>` 进行页面布局；使用 `Modal`, `Drawer`, `Menu` 等处理复杂交互和可访问性。
  2. **Tailwind CSS 负责微观样式和自定义**: 用于快速为简单元素（`div`, `span`）添加样式，或进行一次性的样式微调，弥补 Chakra 不足的场景。
  3. **同步设计令牌 (推荐)**: 将 Chakra 的主题配置（颜色、间距、字体）注入到 `tailwind.config.js` 中，确保二者使用同一套设计语言，实现视觉一致性。

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

## 5. 数据模型与存储

### 5.1 数据库表结构

- **`projects`**: `id`, `name`, `description`, `createdAt`, `updatedAt`。
- **`conversations`**: `id`, `projectId`, `title`, `summary`, `createdAt`, `updatedAt`。
- **`messages`**: `id`, `conversationId`, `role`, `content`, `metadata` (JSON), `createdAt`。
- **`project_files`**: `id`, `projectId`, `fileName`, `filePath`, `fileSize`, `md5`, `status`, `createdAt`。
- **`text_chunks`**: `id`, `fileId`, `content`, `position`, `embedding` (BLOB)。
- **`project_memories`**: `id`, `projectId`, `content`, `order`, `createdAt`。
- **`knowledge_cards`**: `id`, `projectId`, `title`, `content` (Markdown), `tags` (JSON), `createdAt`, `updatedAt`。
- **`app_settings`**: `key`, `value` (JSON), `updatedAt`。

### 5.2 文件存储结构

```
app-data/
├── database/
│   └── knowlex.db          # SQLite数据库 (包含hnswsqlite索引)
├── projects/
│   └── {project-id}/
│       └── files/          # 存储该项目下的原始文件
├── temp/                   # 临时文件
└── logs/                   # 应用日志
```

## 6. IPC 通信设计

### 6.1 通信模式

- **请求-响应 (Invoke/Handle)**: 用于数据获取和同步操作。
- **事件推送 (Send/On)**: 用于状态更新和进度通知。

### 6.2 API 接口定义

预加载脚本暴露的 API 将按模块划分，例如：

- `window.knowlexAPI.project.list()`
- `window.knowlexAPI.chat.sendMessage(payload)`
- `window.knowlexAPI.onFileProgress((progressInfo) => { ... })`

## 7. 性能优化策略

- **前端**: 虚拟滚动、组件懒加载、状态批量更新、事件防抖节流。
- **后端**: 数据库索引、批量操作、WAL模式、文件处理异步化和队列化。
- **内存**: 使用 LRU 缓存，及时清理不再使用的资源。

## 8. 安全性设计

- **输入验证**: 对所有用户输入进行清理和验证，防止 XSS 和路径遍历。
- **数据安全**: 使用参数化查询防 SQL 注入；加密存储 API 密钥；会话数据隔离。
- **通信安全**: 严格校验 IPC 消息来源和内容。

## 9. 错误处理策略

- **分类**: 用户错误、系统错误、网络错误、业务错误。
- **机制**: 使用 React Error Boundaries 捕获渲染层错误；为网络请求设置重试机制；关键功能失败时提供降级策略。
- **反馈**: 向用户提供清晰、友好的错误提示和操作建议。

## 10. 测试策略

- **测试金字塔**: 单元测试 (60%), 集成测试 (30%), E2E 测试 (10%)。
- **测试重点**: 后端服务逻辑、数据库操作；前端组件渲染、状态管理和用户交互流程。
- **测试工具**: Vitest, React Testing Library, Playwright。

## 11. 监控与日志

- **日志级别**: ERROR, WARN, INFO, DEBUG, TRACE。
- **日志管理**: 开发环境输出到控制台，生产环境持久化到文件并实现日志轮转。
- **监控指标**: API 调用延迟、文件处理时间、内存使用、错误频率。

## 12. 部署与发布

- **构建流程**: Lint -> Test -> Build -> Package -> Sign -> Release。
- **自动更新**: 集成 `electron-updater`，支持增量更新和静默更新。
- **平台支持**: 为 macOS (DMG) 和 Windows (NSIS) 提供独立的安装包。