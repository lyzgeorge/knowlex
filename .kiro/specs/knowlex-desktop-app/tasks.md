# Implementation Plan

**开发原则和要求:**
- 专注于代码可读性和可维护性
- 模块化设计，单一职责原则
- 简单函数实现，职责清晰，避免过度抽象
- 保持代码整洁，单个文件通常不超过300行（CSS或页面文件可例外）
- 每完成一个功能模块后，在 docs/ 目录下编写简洁的文档说明
- 可参考 chatbox-src/ 目录下的数据结构和逻辑实现，但不得在代码或文档中提及
- ALWAYS WRITE CODES, DOCS, REMARKS IN ENGLISH

## 项目设置和基础架构

- [ ] 1. 项目初始化和开发环境搭建
  - 创建Electron + Vite + React + TypeScript项目结构
  - 配置ESLint、Prettier代码规范，设置严格的代码质量标准
  - 设置开发和构建脚本，配置热重载和调试环境
  - 配置electron-vite构建工具，优化开发体验
  - _Requirements: 系统架构基础_

- [ ] 1.1 编写项目设置文档
  - 记录项目结构说明
  - 开发环境配置步骤
  - 构建和部署流程
  - 代码规范和最佳实践

- [ ] 2. 基础目录结构和配置文件
  - 创建src/main、src/renderer、src/shared目录结构
  - 配置electron.vite.config.ts构建配置，优化性能和开发体验
  - 设置tsconfig.json TypeScript配置，启用严格模式
  - 创建基础的类型定义文件，确保类型安全
  - _Requirements: 2.1项目结构_

- [ ] 2.1 编写架构文档
  - 三层架构说明（主进程、渲染进程、共享代码）
  - 目录结构和文件职责
  - 模块依赖关系图
  - 开发规范和约定

## 主进程核心功能

- [ ] 3. Electron主进程基础框架
  - 实现main.ts应用入口：`createWindow()`, `app.whenReady()`, 生命周期管理
  - 实现preload.ts安全IPC桥接：`contextBridge.exposeInMainWorld()`, API暴露
  - 实现window.ts窗口管理：窗口创建、最小化、全屏、主题适配
  - 实现menu.ts菜单管理：应用菜单、上下文菜单、快捷键绑定
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3.1 编写主进程架构文档
  - 应用生命周期管理说明
  - 窗口管理API文档
  - IPC安全桥接机制
  - 菜单和快捷键配置

- [ ] 4. 数据库模块实现
  - 实现database/index.ts：`getDB()`, `closeDB()`, 连接管理
  - 实现database/migrations.ts：`runMigrations()`, `getCurrentVersion()`, 版本控制
  - 实现database/queries.ts：预定义查询函数，类型安全的数据库操作
  - 创建libsql数据库表结构，支持向量存储
  - _Requirements: 10.1, 10.2_

- [ ] 4.1 编写数据库模块文档
  - 数据库连接管理API
  - 迁移系统使用说明
  - 查询模板和类型定义
  - 表结构和索引设计

- [ ] 5. 项目管理服务
  - 实现services/project.ts：`createProject()`, `updateProject()`, `deleteProject()`, `listProjects()`
  - 实现ipc/project.ts：IPC处理器 'project:create', 'project:list', 'project:update', 'project:delete'
  - 定义Project数据结构：id, name, description, createdAt, updatedAt
  - 创建项目数据库表和索引
  - _Requirements: 1.1, 1.6, 1.10_

- [ ] 5.1 编写项目管理服务文档
  - 项目CRUD操作API
  - 数据结构定义
  - IPC通道说明
  - 错误处理机制

- [ ] 6. 会话和消息管理服务
  - 实现services/conversation.ts：`createConversation()`, `deleteConversation()`, `moveConversation()`
  - 实现services/message.ts：`addMessage()`, `updateMessage()`, `deleteMessage()`, `getMessages()`
  - 实现ipc/conversation.ts：'conversation:create', 'conversation:delete', 'message:add'等IPC处理
  - 支持多部分内容的消息结构：text, image, citation, tool-call等
  - _Requirements: 2.1, 2.2, 2.3, 13.1_

- [ ] 6.1 编写会话消息管理文档
  - 会话管理API说明
  - 消息数据结构定义
  - 多部分内容支持
  - IPC通信协议

## 文件处理系统

- [ ] 7. 临时文件处理模块
  - 实现services/file-temp.ts：`processTemporaryFiles()`, `extractTextContent()`, `validateFileConstraints()`
  - 支持文件类型：.txt, .md，文本提取和内容返回
  - 实现限制：最多10个文件，单文件1MB，总计10MB
  - 定义TemporaryFileResult接口：filename, content, size, mimeType, error
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [ ] 7.1 编写临时文件处理文档
  - 临时文件处理API说明
  - 文件类型支持和限制
  - 错误处理和验证机制
  - 使用示例和最佳实践

- [ ] 8. 项目文件处理模块
  - 实现services/file-project.ts：`uploadProjectFiles()`, `processFileForRAG()`, `deleteProjectFile()`
  - 实现后台处理队列：`startProcessingQueue()`, `processNextFile()`, `updateFileStatus()`
  - 定义ProjectFile接口：id, projectId, filename, filepath, status, chunkCount等
  - 实现文件处理状态机：pending -> processing -> ready/failed
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

- [ ] 8.1 编写项目文件处理文档
  - 文件上传和处理流程
  - 后台队列管理机制
  - 状态机转换说明
  - 错误恢复和重试策略

- [ ] 9. 向量化和RAG搜索
  - 实现services/embedding.ts：`generateEmbeddings()`, `batchInsertVectors()`, `queryVectorSimilarity()`
  - 实现services/search.ts：`searchProjectFiles()`, `buildSearchIndex()`, `searchGlobal()`
  - 集成libsql向量数据库：创建向量表，向量相似度查询
  - 定义SearchResult接口：content, filename, fileId, similarity, metadata
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 9.1 编写向量化和搜索文档
  - 向量化处理流程
  - 搜索算法和相似度计算
  - RAG检索机制说明
  - 性能优化策略

## AI模型集成

- [ ] 10. AI模型基础框架
  - 实现ai/base.ts：AIModel接口定义，包含chat(), stream()方法
  - 实现ai/manager.ts：`registerModel()`, `getModel()`, `listModels()`
  - 定义AIConfig接口：apiKey, baseURL, model等配置项
  - 定义统一的Message格式，支持多部分内容：text, image, tool-call等
  - _Requirements: 2.1, 2.2, 2.6_

- [ ] 10.1 编写AI模型框架文档
  - AI模型接口规范
  - 模型管理器使用说明
  - 配置结构和验证
  - 扩展新模型的指南

- [ ] 11. OpenAI模型实现
  - 实现ai/openai.ts：OpenAIModel类，实现chat()和stream()方法
  - 支持流式响应：Server-Sent Events处理，实时token返回
  - 支持多模态：文本、图片输入，Base64图片处理
  - 实现错误处理：网络重试、API错误解析和恢复机制
  - _Requirements: 2.6, 12.2, 12.3_

- [ ] 11.1 编写OpenAI模型文档
  - OpenAI API集成说明
  - 流式响应处理机制
  - 多模态输入支持
  - 错误处理和重试策略

- [ ] 12. Claude模型实现
  - 实现ai/claude.ts：ClaudeModel类，支持Anthropic API
  - 支持推理内容：reasoning content解析和显示
  - 支持工具调用：tool use检测和执行
  - 实现模型能力检测：`isSupportVision()`, `isSupportReasoning()`
  - _Requirements: 2.6, 12.2_

- [ ] 12.1 编写Claude模型文档
  - Claude API集成说明
  - 推理内容处理机制
  - 工具调用实现方式
  - 能力检测和适配

## 前端基础框架

- [ ] 13. React应用基础设置
  - 实现main.tsx：React应用入口，StrictMode包装，错误边界
  - 实现App.tsx：主应用组件，路由配置，全局状态提供者
  - 配置Chakra UI：主题系统，颜色模式，响应式断点
  - 设置自定义主题配置和颜色系统
  - _Requirements: UI基础架构_

- [ ] 13.1 编写前端架构文档
  - React应用结构说明
  - 状态管理架构
  - 主题系统配置
  - 组件设计原则

- [ ] 14. 状态管理实现
  - 实现stores/app.ts：AppState接口，theme, language, showSidebar状态和操作
  - 实现stores/project.ts：ProjectState接口，projects数组，currentProjectId，CRUD操作
  - 实现stores/conversation.ts：ConversationState接口，conversations数组，消息管理
  - 实现stores/settings.ts：SettingsState接口，API配置，通用设置
  - 实现状态持久化和同步机制
  - _Requirements: 4.1, 4.2, 4.3, 9.1_

- [ ] 14.1 编写状态管理文档
  - 状态结构设计说明
  - 状态操作API文档
  - 持久化机制说明
  - 状态同步策略

- [ ] 15. 基础UI组件
  - 实现components/ui/Button.tsx：ButtonProps接口，variant支持，点击处理
  - 实现components/ui/Input.tsx：InputProps接口，受控组件，验证支持
  - 实现components/ui/Modal.tsx：ModalProps接口，打开/关闭状态，遮罩层
  - 实现components/ui/FileCard.tsx：FileCardProps接口，文件信息显示，操作按钮
  - 实现components/ui/MessageBubble.tsx：多部分内容渲染，Markdown支持
  - _Requirements: UI组件系统_

- [ ] 15.1 编写UI组件文档
  - 组件接口规范
  - 使用示例和最佳实践
  - 样式变体说明
  - 无障碍支持说明

## 核心界面实现

- [ ] 16. 侧边栏导航
  - 实现components/layout/Sidebar.tsx：固定280px宽度，Logo显示，"+ New Chat"按钮
  - 实现项目列表：可展开/折叠，文件夹图标，项目名称显示
  - 实现会话列表：对话气泡图标，会话标题，时间戳显示
  - 实现悬浮操作：项目操作图标（文件管理、复制、更多），会话操作菜单
  - 实现虚拟滚动优化和键盘导航支持
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 1.9, 1.10_

- [ ] 17. 聊天界面核心
  - 实现components/features/chat/ChatInterface.tsx：聊天容器，当前会话检查，空状态处理
  - 实现components/features/chat/MessageList.tsx：虚拟滚动，消息渲染，自动滚动
  - 实现components/ui/MessageBubble.tsx：多部分内容渲染，Markdown支持，流式显示
  - 支持MessageContentParts结构：text, image, citation, tool-call等
  - _Requirements: 2.1, 2.2, 2.6, 2.7_

- [ ] 18. 消息输入框
  - 实现components/features/chat/ChatInputBox.tsx：文本输入，文件上传按钮，发送按钮
  - 实现文件上传：拖拽支持，文件预览卡片，删除功能
  - 实现临时文件处理：格式验证，大小限制，内容提取
  - 定义InputBoxPayload接口：input, files, attachments等
  - 实现快捷键支持和输入历史记录
  - _Requirements: 2.1, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 19. 消息操作功能
  - 实现消息悬浮菜单：Edit & Retry, Regenerate, Fork, Copy, Delete
  - 实现消息编辑：内容修改，重新提交，历史替换
  - 实现消息分叉：会话复制，历史截断，新分支创建
  - 实现消息复制：Markdown内容复制到剪贴板
  - 实现消息引用和跳转功能
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## 项目管理界面

- [ ] 20. 项目管理界面
  - 实现components/features/project/ProjectList.tsx：项目卡片显示，创建按钮，搜索过滤
  - 实现components/features/project/ProjectDetail.tsx：项目信息展示，统计数据，快速操作入口
  - 实现项目CRUD：创建对话框，编辑表单，删除确认，重命名功能
  - 定义Project接口：id, name, description, createdAt, updatedAt, stats
  - _Requirements: 1.5, 1.6, 1.9, 1.10_

- [ ] 21. 文件管理界面
  - 实现components/features/project/FileManager.tsx：文件列表，上传区域，批量操作
  - 实现文件状态显示：处理状态指示器，进度条，错误信息
  - 实现文件操作：上传，删除，重试，暂停/恢复处理
  - 定义ProjectFile接口：id, filename, status, chunkCount, error等
  - 复用文件处理状态和UI反馈机制
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 22. 项目记忆和笔记管理
  - 实现components/features/project/MemoryManager.tsx：记忆列表，添加/编辑表单，排序功能
  - 实现项目记忆：最多10条限制，作为System Prompt使用，优先级排序
  - 实现笔记管理：卡片布局，Markdown编辑器，标签系统
  - 实现"添加到笔记"：文本选择，快捷按钮，一键保存
  - 定义ProjectMemory和ProjectNote接口
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

## 会话上下文管理

- [ ] 23. 会话移动功能
  - 实现会话移动：`moveConversation(conversationId, projectId)`, 历史保留
  - 实现项目记忆集成：自动应用项目记忆作为System Prompt
  - 实现RAG模式切换：移入项目启用RAG，移出项目禁用RAG
  - 实现会话操作菜单：移动到项目，移出项目，项目选择器
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 24. 会话设置功能
  - 实现会话设置界面：齿轮图标，设置对话框，配置表单
  - 实现System Prompt覆盖：会话级别的提示词配置，优先级高于全局/项目设置
  - 实现模型选择：会话特定的AI模型和参数配置
  - 定义SessionSettings接口：systemPrompt, modelConfig, temperature等
  - _Requirements: 4.4, 4.5_

## RAG检索功能

- [ ] 25. 项目RAG模式
  - 实现RAG检索：`searchProjectFiles()`, 向量相似度查询，上下文构建
  - 实现引用显示：citation标签，来源文件名，相似度分数
  - 实现引用跳转：点击引用，定位到Markdown内容，高亮显示
  - 实现上下文构建：用户问题 + 检索片段 + 项目记忆，Token限制管理
  - 复用RAG检索逻辑和引用展示机制
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 26. 全局搜索功能
  - 实现全局搜索界面：搜索模态框，快捷键⌘/Ctrl+P触发
  - 实现搜索逻辑：跨会话内容搜索，FTS5全文搜索，防抖处理
  - 实现搜索结果：关键词高亮，上下文摘要，时间排序
  - 实现结果跳转：点击结果，跳转到具体会话和消息位置
  - 参考搜索界面和交互设计
  - _Requirements: 全局搜索需求_

## 设置和配置

- [ ] 27. 设置界面实现
  - 实现components/features/settings/SettingsPanel.tsx
  - 实现components/features/settings/APISettings.tsx
  - 实现components/features/settings/GeneralSettings.tsx
  - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7, 9.8_

- [ ] 27.1 编写设置界面文档
  - 设置界面组件结构
  - 配置项说明和验证规则
  - 用户交互流程
  - 数据持久化机制

- [ ] 28. API配置和测试
  - 实现AI模型API配置界面
  - 实现连接测试功能
  - 实现API密钥安全存储
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 28.1 编写API配置文档
  - API配置参数说明
  - 连接测试机制
  - 安全存储实现
  - 错误处理和用户反馈

## 自动化功能

- [ ] 29. 自动标题生成
  - 实现会话标题自动生成
  - 实现IPC通信和状态更新
  - 实现标题生成失败处理
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 30. 文件处理状态同步
  - 实现文件处理进度的实时更新
  - 实现IPC事件推送和UI响应
  - 实现错误状态的用户反馈
  - _Requirements: 10.9, 12.4_

## 性能优化和错误处理

- [ ] 31. 性能优化实现
  - 实现消息列表虚拟滚动
  - 实现防抖搜索和状态更新
  - 实现组件懒加载和代码分割
  - _Requirements: 12.1, 12.4_

- [ ] 32. 错误处理和重试
  - 实现统一的错误处理机制
  - 实现网络请求重试逻辑
  - 实现用户友好的错误提示
  - _Requirements: 12.2, 12.3, 12.5_

## 测试和部署

- [ ] 33. 单元测试实现
  - 为核心服务编写单元测试
  - 为UI组件编写测试用例
  - 为IPC通信编写集成测试
  - _Requirements: 测试策略_

- [ ] 34. 构建和打包配置
  - 配置生产环境构建流程
  - 实现macOS和Windows打包
  - 配置代码签名和公证
  - _Requirements: 12.1, 12.2_

- [ ] 35. 应用发布准备
  - 实现自动更新机制
  - 配置错误监控和日志
  - 准备应用图标和安装包
  - _Requirements: 12.2_