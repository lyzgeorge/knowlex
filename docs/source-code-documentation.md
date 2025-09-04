# Knowlex 源代码完整文档

本文档详细介绍了 Knowlex 应用程序中 `src/` 目录下的每个文件的功能、导出和逻辑。

## 共享层 (Shared Layer)

### src/shared/constants/app.ts
应用程序全局配置常量定义，包含应用元数据、窗口配置、数据库配置和开发环境设置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| APP_NAME | 常量 | 无 | 应用程序名称 'Knowlex Desktop' |
| APP_VERSION | 常量 | 无 | 应用程序版本 '0.1.0' |
| APP_DESCRIPTION | 常量 | 无 | 应用程序描述 |
| WINDOW_CONFIG | 常量对象 | 无 | 主窗口和调试窗口的尺寸配置 |
| DATABASE_CONFIG | 常量对象 | 无 | SQLite 数据库配置 (文件名、连接数、超时) |
| DEVELOPMENT | 常量对象 | 无 | 开发环境标志 |

### src/shared/constants/ai.ts
AI 模型定义和配置常量，支持 OpenAI 和 Claude 等多个提供商的模型配置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| AI_MODELS | 常量对象 | 无 | 完整的 AI 模型目录，包含 7 个预定义模型 |
| DEFAULT_AI_CONFIG | 常量对象 | 无 | 标准 AI 参数配置 (温度: 0.7, 最大令牌: 4000) |
| EMBEDDING_CONFIG | 常量对象 | 无 | 嵌入模型配置 |
| RAG_CONFIG | 常量对象 | 无 | 检索增强生成设置 |

### src/shared/constants/file.ts
文件处理约束和支持格式定义，包含临时文件和项目文件的不同限制。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| FILE_CONSTRAINTS | 常量对象 | 无 | 文件大小和数量限制 (临时文件: 10MB/100MB/10个, 项目文件: 50MB/500MB/100个) |
| SUPPORTED_FILE_TYPES | 常量对象 | 无 | 支持的文件扩展名列表 |
| MIME_TYPES | 常量对象 | 无 | MIME 类型到扩展名映射 |
| CHUNK_SIZE | 常量 | 无 | 向量化的每块字符数 (1000) |
| CHUNK_OVERLAP | 常量 | 无 | 块间重叠字符数 (200) |

### src/shared/types/ai.ts
AI 模型集成的 TypeScript 接口定义，支持多模态内容和流式响应。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| AIModel | 接口 | 无 | 核心 AI 模型接口，定义 chat()、stream() 和 getCapabilities() 方法 |
| AIMessage | 接口 | role, content | 消息格式，支持角色和多模态内容 |
| AIResponse | 接口 | content, reasoning, toolCalls, tokenUsage | AI 响应结构 |
| AIStreamChunk | 接口 | content, reasoning, toolCalls, done | 流式响应块格式 |
| ModelCapabilities | 接口 | 各种能力标志 | 模型功能标志 (视觉、推理、工具等) |
| OpenAIConfig | 接口 | 配置参数 | OpenAI 特定配置扩展 |
| ClaudeConfig | 接口 | 配置参数 | Claude 特定配置扩展 |

### src/shared/types/conversation.ts
对话数据结构定义，包含项目关联和会话设置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| Conversation | 接口 | id, title, timestamps, projectId, modelConfigId, settings | 核心对话结构 |
| SessionSettings | 接口 | systemPrompt, temperature | 对话特定设置 |

### src/shared/types/file.ts
文件处理类型定义，支持临时文件和项目文件的元数据管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| ProjectFile | 接口 | 文件属性 | 永久文件结构，包含项目关联和处理状态 |
| TemporaryFile | 接口 | 文件属性 | 临时文件结构，包含内容和元数据 |
| ProcessingResult | 接口 | success, error | 文件处理结果 |
| FileStatus | 联合类型 | 无 | 文件状态 ('pending' \| 'processing' \| 'ready' \| 'failed') |

### src/shared/types/ipc.ts
Electron 主进程和渲染进程间通信的结构定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| IPCResult\<T\> | 接口 | success, data, error | 通用 IPC 响应包装器 |
| ConversationCreateRequest | 接口 | 请求参数 | 创建对话的请求结构 |
| TemporaryFileRequest | 接口 | 请求参数 | 临时文件上传的请求结构 |

### src/shared/types/message.ts
复杂消息结构定义，支持多部分内容和分支功能。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| Message | 接口 | 消息属性 | 核心消息结构，支持多部分内容、推理和父子关系 |
| MessageContent | 类型 | 无 | MessageContentPart 对象数组 |
| MessageContentPart | 接口 | type, 内容 | 多部分内容结构，支持不同内容类型 |
| ContentType | 联合类型 | 无 | 内容类型枚举 |
| CitationContent | 接口 | 引用属性 | 文件引用，包含相似度分数和页面引用 |

### src/shared/types/models.ts
模型配置类型定义，区分公共和私有配置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| ModelConfig | 接口 | 配置属性 | 完整模型配置，包含 API 凭据和功能 |
| ModelConfigPublic | 接口 | 配置属性 | 公共模型配置，不包含 API 密钥 |
| isPrivateModelConfig | 函数 | config | 检查是否为私有配置的类型守卫 |
| toPublicModelConfig | 函数 | privateConfig | 将私有配置转换为公共配置 |

### src/shared/types/notification.ts
完整的通知系统，包含预定义模式和类型安全配置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| NotificationType | 联合类型 | 无 | 通知严重程度级别 |
| NotificationOptions | 接口 | 选项属性 | 通知配置选项 |
| NOTIFICATION_PRESETS | 常量 | 无 | 30+ 个预定义通知配置 |

### src/shared/types/project.ts
简单的项目数据结构定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| Project | 接口 | id, name, timestamps | 基本项目结构 |
| CreateProjectData | 接口 | name | 项目创建输入结构 |

### src/shared/utils/id.ts
使用加密随机性的集中式 ID 生成工具。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| generateId | 函数 | 无 | 生成 32 字符十六进制 ID |
| generateShortId | 函数 | 无 | 生成 12 字符十六进制 ID |
| generateUUID | 函数 | 无 | 生成 RFC 4122 兼容的 UUID v4 |

注意: 此文件在近期重构中已从代码库中删除（原内容仅在文档中保留）。运行时不再依赖集中式 AI 常量配置，而是通过模型配置表/服务动态解析模型与能力。
### src/shared/utils/message-branching.ts
实现对话树分支逻辑，用于替代对话路径。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| BranchSendOptions | 接口 | 分支选项 | 创建消息分支的选项 |
| buildUserMessageBranchSendOptions | 函数 | messages, messageId | 确定分支逻辑的适当父消息 ID |
| canCreateBranch | 函数 | message | 验证消息是否可用于分支创建 |
### src/shared/utils/model-resolution.ts
集中化模型解析服务，实现 3 层优先级系统。
注: `MIME_TYPES` 映射已在重构中移除（未在运行时被引用）。文档中保留了受支持文件类型与约束。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| resolveModelContext | 函数 | context | 核心解析逻辑，优先级：显式 → 对话 → 用户默认 → 系统默认 |
| getModelCapabilities | 函数 | modelId | 缓存的功能提取，1 分钟 TTL |
| getActiveModelId | 函数 | context | 基于优先级的活动模型 ID 提取 |
| validateModelResolution | 函数 | result | 详细错误报告的验证 |
注意: 为了减少未使用的工具函数，近期重构移除了 `generateShortId` 和 `generateUUID`，仅保留通用且被使用的 `generateId`。
统一的时间管理，支持 SQLite 时间戳和国际化。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| formatTime | 函数 | timestamp, options | 使用 Intl.DateTimeFormat 的灵活时间格式化 |
| formatRelativeTime | 函数 | timestamp | 人类可读的相对时间 ("刚刚", "5分钟前") |

### src/shared/utils/validation.ts
文件、约束和数据格式的综合验证工具。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| isValidFileType | 函数 | filename, context | 文件类型验证 |
| isValidFileSize | 函数 | size, context | 大小验证 |
| validateFileConstraints | 函数 | files, context | 综合文件验证 |
| formatBytes | 函数 | bytes | 人类可读的字节格式化 |
| isValidEmail | 函数 | email | 使用正则表达式的电子邮件验证 |
| sanitizeFilename | 函数 | filename | 文件名清理 |

### src/shared/i18n/config.ts
i18next 配置，包含 React 集成和资源加载。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| i18n | 实例 | 无 | 配置的 i18next 实例，支持 React |

### src/shared/i18n/types.ts
国际化的类型定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| Language | 联合类型 | 无 | 支持的语言代码 ('en' \| 'zh-CN') |
| SUPPORTED_LANGUAGES | 常量 | 无 | 语言代码到显示名称的映射 |

### src/shared/schemas/model-config.ts
基于 Zod 的模型配置验证模式。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| BooleanishSchema | Schema | 无 | 高级布尔值强制转换 |
| ModelConfigSchema | Schema | 无 | 完整模型配置验证 |
| validateModelConfig | 函数 | config | 模型配置验证 |
| formatValidationError | 函数 | error | 用户友好的错误消息格式化 |

## 主进程 (Main Process)

### src/main/database/index.ts
使用 libsql 客户端的 SQLite 数据库连接管理器。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| getDB | 函数 | 无 | 创建/返回数据库客户端实例 |
| closeDB | 函数 | 无 | 优雅关闭数据库连接 |
| executeQuery | 函数 | sql, params | 执行单个查询，包含错误处理 |
| executeTransaction | 函数 | queries | 原子多查询事务 |
| isDatabaseReady | 函数 | 无 | 连接状态检查 |
| getCurrentDatabasePath | 函数 | 无 | 返回当前数据库路径 |

### src/main/database/entity.ts
具有类型安全的通用 ORM 式 CRUD 操作。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| DatabaseEntity\<T\> | 类 | tableName, schema | 通用实体类，提供完整的 CRUD 操作 |
| create | 方法 | data | 插入新记录，自动时间戳 |
| get | 方法 | id | 按 ID 检索单个实体 |
| list | 方法 | options | 查询多个实体，支持过滤和分页 |
| update | 方法 | id, updates | 更新现有实体 |
| delete | 方法 | id | 删除实体 |
| createFieldMapping | 函数 | mapping | 属性到列映射的辅助器 |

### src/main/database/migrations.ts
数据库模式版本控制和迁移系统。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| runMigrations | 函数 | 无 | 应用待处理的迁移 |
| getCurrentVersion | 函数 | 无 | 获取当前模式版本 |
| rollbackToVersion | 函数 | targetVersion | 回滚功能 |
| getMigrationHistory | 函数 | 无 | 列出已应用的迁移 |

### src/main/database/queries.ts
使用通用 CRUD 工具的优化数据库查询。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createConversation | 函数 | data | 创建对话 |
| listConversations | 函数 | options | 列出对话，支持分页 |
| searchMessages | 函数 | query, limit | 全文搜索实现 |
| createMessage | 函数 | data | 创建消息 |
| createProject | 函数 | data | 创建项目 |

### src/main/database/schemas.ts
实体到表的映射定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| conversationSchema | 对象 | 无 | 对话表映射 |
| messageSchema | 对象 | 无 | 消息表，包含 JSON 内容 |
| projectSchema | 对象 | 无 | 项目表映射 |
| modelConfigSchema | 对象 | 无 | 模型配置映射 |

### src/main/services/project-service.ts
具有业务逻辑的项目 CRUD 操作。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createProject | 函数 | data | 创建项目，包含名称唯一性验证 |
| getProjectById | 函数 | id | 检索单个项目 |
| getAllProjects | 函数 | 无 | 列出所有项目 |
| updateProjectById | 函数 | id, updates | 更新项目，包含验证 |
| deleteProjectById | 函数 | id | 删除项目，级联删除对话 |
| getProjectConversations | 函数 | projectId | 获取项目的对话 |

### src/main/services/conversation.ts
具有综合业务逻辑的对话管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createConversation | 函数 | data | 创建对话，包含验证 |
| listConversationsPaginated | 函数 | limit, offset | 分页列表，包含 hasMore 标志 |
| generateConversationTitle | 函数 | id | AI 驱动的标题生成 |
| moveConversation | 函数 | conversationId, projectId | 在项目间移动对话 |

### src/main/services/message.ts
支持多部分内容的消息管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| addMessage | 函数 | data | 创建消息，包含内容验证 |
| addTextMessage | 函数 | data | 文本消息便利创建器 |
| addMultiPartMessage | 函数 | data | 多部分消息创建器 |
| convertTemporaryFilesToMessageParts | 函数 | files | 文件集成 |
| extractTextContent | 函数 | message | 内容提取工具 |

### src/main/services/assistant-service.ts
支持流式传输的 AI 响应生成。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| streamAssistantReply | 函数 | config | 主要流式传输函数 |
| generateReplyForNewMessage | 函数 | messageId, conversationId, reasoningEffort | 新消息生成 |
| regenerateReply | 函数 | messageId | 消息重新生成 |

### src/main/services/file-temp.ts
聊天上下文的临时文件处理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| processTemporaryFiles | 函数 | filePaths | 文件路径处理 |
| processTemporaryFileContents | 函数 | files | 基于内容的处理 |
| validateTemporaryFileConstraints | 函数 | files | 详细错误报告的验证 |
| extractTextContent | 函数 | filePath, filename | 文本提取 |
| cleanupTemporaryFiles | 函数 | filePaths | 清理工具 |

### src/main/services/file-parser.ts
多格式文件内容提取。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| FileParser | 抽象类 | 无 | 抽象基础解析器类 |
| PlainTextParser | 类 | 无 | 文本文件处理，包含编码检测 |
| PDFParser | 类 | 无 | 使用 pdf-parse 的 PDF 处理 |
| OfficeParser | 类 | 无 | 使用 officeparser 的 Office 文档处理 |
| FileParserFactory | 类 | 无 | 解析器创建和格式检测 |
| parseFile | 函数 | filePath, filename | 主要解析函数 |

### src/main/services/openai-adapter.ts
AI SDK 集成，支持流式传输和模型解析。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| streamAIResponse | 函数 | messages, options, cancellationToken | 主要流式传输函数 |
| generateAIResponseOnce | 函数 | messages | 单次生成 |
| testOpenAIConfig | 函数 | config | 配置测试 |
| getOpenAIConfigFromEnv | 函数 | 无 | 环境配置 |
| validateOpenAIConfig | 函数 | config | 配置验证 |

### src/main/services/title-generation.ts
自动化对话标题生成。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| generateTitleForConversation | 函数 | conversationId | AI 驱动的标题生成 |
| shouldTriggerAutoGeneration | 函数 | messages | 触发条件逻辑 |
| tryTriggerAutoTitleGeneration | 函数 | conversationId | 自动触发 |
| cancelTitleGeneration | 函数 | conversationId | 取消支持 |

### src/main/services/settings.ts
应用程序配置管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| SettingsService | 类 | 无 | 设置服务类，包含完整的配置管理 |
| getSettings | 函数 | 无 | 获取所有设置 |
| getProviderConfig | 函数 | provider | 提供商特定配置 |
| updateSettings | 函数 | updates | 运行时更新 |
| settingsService | 实例 | 无 | 单例实例 |

### src/main/services/model-config-service.ts
具有综合验证的模型配置管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| ModelConfigService | 类 | 无 | 模型配置服务实现 |
| list | 方法 | 无 | 获取所有模型配置 |
| create | 方法 | input | 使用 Zod 验证创建 |
| update | 方法 | id, updates | 使用验证更新 |
| delete | 方法 | id | 删除，处理默认模型 |
| testConnection | 方法 | id | 连接测试 |
| resolveDefaultModel | 方法 | 无 | 默认模型解析 |

### src/main/ipc/common.ts
共享的 IPC 工具和验证模式。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| handleIPCCall | 函数 | operation | 一致错误处理包装器 |
| validateId | 函数 | id | ID 验证类型守卫 |
| requireValidId | 函数 | id, type | ID 验证，抛出错误 |
| ValidationPatterns | 对象 | 无 | 实体的通用验证模式 |
| ErrorMessages | 对象 | 无 | 标准化错误消息常量 |

### src/main/ipc/conversation.ts
支持事件广播的对话和消息 IPC 处理器。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| registerConversationIPCHandlers | 函数 | 无 | 注册所有处理器 |
| sendConversationEvent | 函数 | eventType, data | 事件广播 |
| sendMessageEvent | 函数 | eventType, data | 消息事件广播 |

### src/main/ipc/project.ts
项目管理 IPC 处理器。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| registerProjectIPCHandlers | 函数 | 无 | 注册处理器 |
| unregisterProjectIPCHandlers | 函数 | 无 | 清理处理器 |

### src/main/ipc/file.ts
文件处理 IPC 处理器。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| registerFileIPCHandlers | 函数 | 无 | 注册处理器 |
| unregisterFileIPCHandlers | 函数 | 无 | 清理处理器 |

### src/main/ipc/settings.ts
设置管理 IPC 处理器。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| registerSettingsIPCHandlers | 函数 | 无 | 注册处理器 |
| unregisterSettingsIPCHandlers | 函数 | 无 | 清理处理器 |

### src/main/ipc/model-config.ts
模型配置 IPC，支持变更广播。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| registerModelConfigIPCHandlers | 函数 | 无 | 注册处理器，包含变更广播 |
| unregisterModelConfigIPCHandlers | 函数 | 无 | 清理处理器 |

### src/main/utils/cancellation.ts
长时间运行操作的取消令牌系统。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| CancellationToken | 类 | 无 | 取消令牌类，支持取消状态和回调 |
| CancellationManager | 类 | 无 | 取消管理器，支持基于 ID 的令牌管理 |
| isCancelled | 属性 | 无 | 取消状态 |
| cancel | 方法 | 无 | 信号取消 |
| onCancel | 方法 | callback | 注册取消回调 |
| createToken | 方法 | id | 创建/替换令牌 |

### src/main/main.ts
主应用程序入口点和生命周期管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| Application | 类 | 无 | 主应用程序控制器 |
| application | 实例 | 无 | 全局应用程序实例 |

### src/main/window.ts
窗口创建和管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createMainWindow | 函数 | 无 | 主应用程序窗口 |
| createDebugWindow | 函数 | 无 | 开发调试窗口 |
| WindowManager | 类 | 无 | 窗口工具操作 |

### src/main/menu.ts
原生应用程序菜单系统。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| setupApplicationMenu | 函数 | 无 | 初始化应用程序菜单 |
| createMessageContextMenu | 函数 | messageId | 消息的上下文菜单 |
| createFileContextMenu | 函数 | fileId | 文件的上下文菜单 |

### src/main/preload.ts
主进程和渲染进程间的安全 API 桥接。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| KnowlexAPI | 接口 | 无 | 完整的 API 定义 |
| knowlexAPI | 实现 | 无 | 安全的 API 实现 |

## 渲染进程 (Renderer Process)

### src/renderer/main.tsx
应用程序入口点和初始化。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| ErrorFallback | 组件 | error, resetErrorBoundary | 错误回退组件，包含重试功能 |
| renderApp | 函数 | 无 | 应用程序初始化函数 |

### src/renderer/App.tsx
主应用程序组件，包含初始化逻辑。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useAppInitialization | Hook | 无 | 应用程序初始化钩子 |
| LoadingFallback | 组件 | 无 | 加载回退组件 |
| InitializationError | 组件 | error, retry | 初始化错误组件 |
| App | 组件 | 无 | 默认应用程序组件 |

### src/renderer/pages/MainApp.tsx
主要工作区界面，包含导航路由。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| MainApp | 组件 | 无 | 主应用程序页面组件 |

### src/renderer/stores/index.ts
中央存储协调和初始化。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| initializeStores | 函数 | 无 | 统一存储初始化，包含错误处理 |
| resetAllStores | 函数 | 无 | 重置所有存储状态 |

### src/renderer/stores/app.ts
全局 UI 状态和应用程序偏好设置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useAppStore | Hook | 无 | 主应用存储 |
| useTheme | Hook | 无 | 主题管理选择器 |
| useLanguage | Hook | 无 | 语言设置选择器 |
| useSidebarState | Hook | 无 | 侧边栏状态选择器 |

### src/renderer/stores/conversation.ts
高级对话和消息管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useConversationStore | Hook | 无 | 主对话存储 |
| useCurrentConversation | Hook | 无 | 当前对话选择器 |
| useIsStreaming | Hook | 无 | 流式传输状态选择器 |
| useMessages | Hook | conversationId | 消息列表选择器 |

### src/renderer/stores/model-config.ts
AI 模型配置管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useModelConfigStore | Hook | 无 | 主模型配置存储 |
| useModelConfigs | Hook | 无 | 模型配置列表选择器 |
| useDefaultModel | Hook | 无 | 默认模型选择器 |

### src/renderer/stores/navigation.ts
应用程序导航和路由状态。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useNavigationStore | Hook | 无 | 主导航存储 |
| useCurrentView | Hook | 无 | 当前视图选择器 |
| useCanGoBack | Hook | 无 | 后退功能选择器 |

### src/renderer/stores/project.ts
项目管理，包含持久化 UI 状态。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useProjectStore | Hook | 无 | 主项目存储 |
| useProjects | Hook | 无 | 项目列表选择器 |
| useProjectExpansion | Hook | 无 | 展开状态选择器 |

### src/renderer/stores/settings.ts
用户设置和偏好设置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useSettingsStore | Hook | 无 | 主设置存储 |
| useDefaultModel | Hook | 无 | 默认模型偏好钩子 |

### src/renderer/hooks/useAutoScroll.ts
聊天界面的智能自动滚动。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useAutoScroll | Hook | options | 自动滚动钩子，支持粘性底部行为和用户覆盖检测 |

### src/renderer/hooks/useConversationManagement.ts
支持无限滚动的对话列表管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useConversationManagement | Hook | 无 | 对话管理钩子，基于 IntersectionObserver 的无限加载 |

### src/renderer/hooks/useEditableMessage.ts
支持文件附件的复杂消息编辑。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useEditableMessage | Hook | messageId | 消息编辑钩子，统一处理附件和内容验证 |

### src/renderer/hooks/useFileUpload.ts
综合文件上传管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useFileUpload | Hook | options | 文件上传钩子，支持客户端验证和拖放 |

### src/renderer/hooks/useMessageBranching.ts
高级对话分支系统。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useMessageBranching | Hook | conversationId | 消息分支钩子，支持树遍历和分支导航 |

### src/renderer/hooks/useMessageBranch.ts
简化的分支导航 API。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useMessageBranch | Hook | messageId | 消息分支钩子，自动状态同步 |

### src/renderer/hooks/useModelCapabilities.ts
集中化模型能力检测。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useModelCapabilities | Hook | modelId | 模型能力钩子，缓存能力解析 |

### src/renderer/hooks/useI18n.ts
国际化，支持语言切换。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useI18n | Hook | 无 | 国际化钩子，动态翻译加载 |

### src/renderer/hooks/useInlineEdit.ts
内联编辑工作流管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useInlineEdit | Hook | value, onSave | 内联编辑钩子，开始/取消/确认工作流 |

### src/renderer/hooks/useMessageContentDiff.ts
高效的内容比较。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useMessageContentDiff | Hook | oldContent, newContent | 内容差异钩子，性能优化的记忆化 |

### src/renderer/hooks/useNotifications.ts
综合通知系统。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useNotifications | Hook | 无 | 通知钩子，通知队列管理和自动解除 |

### src/renderer/hooks/useProjectManagement.ts
项目 CRUD，包含 UI 状态管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useProjectManagement | Hook | 无 | 项目管理钩子，表单状态管理和验证 |

### src/renderer/utils/markdownComponents.tsx
自定义 React Markdown 组件。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| markdownComponents | 对象 | 无 | 主题集成的 markdown 渲染组件 |

### src/renderer/utils/theme/index.ts
Chakra UI 主题配置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| theme | 对象 | 无 | 完整的 Chakra UI 主题配置 |

### src/renderer/types/global.d.ts
TypeScript 全局类型声明。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| Window | 接口扩展 | 无 | 全局窗口接口，ElectronAPI 和 KnowlexAPI 类型集成 |

### src/renderer/lib/test-setup.ts
Vitest 的测试配置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| 测试配置 | 配置 | 无 | Electron API 模拟和测试环境设置 |

## 关键架构模式

1. **三层架构**: 主进程、渲染进程和共享代码的严格分离
2. **类型安全的 IPC**: 所有通信使用强类型接口
3. **性能优化**: 基于 Map 的缓存、块缓冲和记忆化
4. **实时同步**: 通过 IPC 事件的事件驱动更新
5. **错误边界**: 各级别的综合错误处理
6. **可访问性**: ARIA 合规性和键盘导航支持
7. **国际化**: 完整的 i18n 支持，包含 React Suspense
8. **主题系统**: 综合设计令牌，包含语义颜色管理
9. **状态管理**: 原子更新、选择性持久化、事件协调
10. **文件处理**: 多格式支持、验证管道、安全措施

此文档涵盖了 Knowlex 应用程序的完整源代码架构，展示了企业级 Electron + React 应用程序的高级状态管理、实时能力和综合用户体验模式。

## 最近重构与迁移说明

此部分记录了近期对共享层与 IPC 层的精简与迁移决策，便于团队后续完成迁移并清理兼容性代码。

- 目标：精简共享常量/工具、统一 IPC 请求签名、并最小化主进程/渲染进程之间的重复验证逻辑。
- 主要变更：
	- 删除不再被运行时代码使用的共享常量（例如 `src/shared/constants/ai.ts`），以及不必要的映射（`MIME_TYPES`）。
	- 精简 `src/shared/utils/id.ts`，移除未使用的 `generateShortId` 和 `generateUUID`。保留 `generateId`。
	- 在 `src/main/ipc/common.ts` 中新增 `expectObject`、`expectString` 等集中验证辅助函数，替代重复的本地验证代码。
	- 在 `src/main/ipc/conversation.ts` 中合并并规范了会话与消息相关的 IPC 处理：
		- 引入统一的 `conversation:update` 输入对象形式（{ id, ... }）。
		- 移除旧的 `conversation:update-title` 与 `message:edit` 主进程处理器（迁移期间保留了 preload 层的兼容映射）。
		- 简化 `message:send` 的流程：将会话创建逻辑从消息发送中抽离为 `ensureConversationExists` 辅助函数，并使用事件广播更新渲染端状态。
	- 在 `src/main/preload.ts` 中添加了兼容性映射（例如 `conversation.updateTitle` → `conversation.update({ id, title })`，`message.edit` → `message.update(id, content)`）以保证迁移为逐步零中断。

- 渲染端迁移（当前要做的工作）：
	1. 将渲染端调用改为新的统一 IPC 形态，例如：
		 - `window.knowlex.conversation.updateTitle(conversationId, title)` → `window.knowlex.conversation.update({ id: conversationId, title })`。
		 - `window.knowlex.message.edit(messageId, content)` → `window.knowlex.message.update(messageId, content)`（或直接使用 `message.update({ id, content })` 取决于预期的 API 形态）。
	2. 更新 `src/renderer/stores/conversation/api.ts`（已开始），并修复所有调用方（如 `src/renderer/stores/conversation.ts`）。

- 清理步骤（迁移完成后）：
	- 在确认渲染端所有调用已更新并通过类型检查后，删除 `src/main/preload.ts` 中的兼容性映射。
	- 从主进程中移除对应的遗留 IPC 处理器注册（已在一次迭代中移除，但在最终清理前请再次确认）。
	- 更新文档并移除与已删除常量/函数相关的说明。

- 验证建议：
	- 运行 `pnpm -w exec -- tsc --noEmit` 进行全量类型检查。
	- 运行 `pnpm test`（或 `pnpm -w test`）以验证关键路径（文件处理、IPC handlers）没有回归。
	- 在 UI 层进行手动冒烟：新建会话、发送消息、编辑消息、生成标题，确保事件广播与流式更新正常。

如需我继续，我可以：
	- 继续在渲染端完成剩余的 API 替换（自动化 grep 替换并运行类型检查与测试）；
	- 移除 preload 中的兼容 API（在你确认渲染端完全迁移后）。