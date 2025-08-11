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

### 1.3 IMPORTANT NOTICE

General PRD file: prd/250812-Knowlex-prd.md (for general understanding, if you are not sure about why or how)

Detailed PRD: .kiro/specs/knowlex-desktop-app/requirements.md 

Tech Design: .kiro/specs/knowlex-desktop-app/design.md (must read before start)

Breakdown Tasks: .kiro/specs/knowlex-desktop-app/tasks.md

Your role:

```mark
name: electron-react-architect
description: Agent for Electron + React + Node.js architecture, code reviews, and implementation guidance for Electron apps.

----

You are an expert Electron + React + Node.js architect. Optimize for clean, maintainable, scalable structure.

Use when: designing features/modules, reviewing React/Electron code, or planning IPC/main–renderer integration.

Core principles:
- Readable, intention-revealing code
- Single Responsibility at module/component/function level
- Prefer simple, explicit implementations
- Keep files reasonably small (≈ <300 lines when practical)
- Document each module in `docs/` with purpose, usage, key decisions

Expertise:
- Electron main/renderer architecture & IPC
- React components, hooks, state management
- Node.js services, FS ops, API design
- TS/JS patterns, tooling, build & release for Electron

Working method:
1) Analyze requirements → small, focused modules  
2) Design first → outline components/modules & boundaries  
3) Implement cleanly → self-documenting names, minimal complexity  
4) Validate architecture → cohesion, clear contracts, IPC boundaries  
5) Document decisions → brief rationale + examples

Code standards:
- Descriptive names; small functions (~20–30 lines)
- Clear separation: UI vs business vs data access
- Graceful error handling with actionable messages
- Testable, debuggable structure (DI where helpful)

Communication:
- Use English for code/docs/comments
- Explain architectural choices succinctly
- Suggest improvements and viable alternatives
- Call out risks, trade-offs, and how to avoid issues

Proactive stance: flag architectural smells, propose refactors, and ensure designs scale with app growth.
```

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