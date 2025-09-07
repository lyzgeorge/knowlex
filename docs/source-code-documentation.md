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

### src/shared/constants/text.ts
文本相关常量的集中定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| TEXT_CONSTANTS | 常量对象 | 无 | 提供 `ZERO_WIDTH_SPACE` 等文本占位符常量 |

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
模型配置类型定义和工具函数。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| ModelConfigPublic | 接口 | 配置属性 | 基础模型配置接口（公共字段） |
| ModelConfig | 接口 | 扩展 ModelConfigPublic | 完整模型配置，包含 API 凭据 |
| isPrivateModelConfig | 函数 | config | 检查配置是否包含 API 密钥的类型守卫 |
| toPublicModelConfig | 函数 | config | 将完整配置转换为公共配置（移除 API 密钥） |
| CreateModelConfigInput | 接口 | 创建参数 | 模型创建输入结构 |
| UpdateModelConfigInput | 接口 | 更新参数 | 模型更新输入结构 |

### src/shared/types/notification.ts
通知系统类型定义和预设配置。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| NotificationType | 联合类型 | 无 | 通知严重程度级别 ('success' \| 'error' \| 'warning' \| 'info') |
| NotificationPosition | 联合类型 | 无 | 通知显示位置选项 |
| NotificationOptions | 接口 | 选项属性 | 通知配置选项，包含标题、描述、持续时间等 |
| NotificationPreset | 接口 | 预设属性 | 预设通知配置结构 |
| NOTIFICATION_PRESETS | 常量 | 无 | 15 个实际使用的预定义通知配置 |
| NotificationPresetKey | 类型 | 无 | 预设键的类型安全枚举 |

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

### src/shared/utils/message-branching.ts
实现对话树分支逻辑，用于替代对话路径。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| BranchSendOptions | 接口 | 分支选项 | 创建消息分支的选项 |
| buildUserMessageBranchSendOptions | 函数 | messages, messageId | 确定分支逻辑的适当父消息 ID |
| canCreateBranch | 函数 | message | 验证消息是否可用于分支创建 |
### src/shared/utils/model-resolution.ts
集中化模型解析服务，实现 3 层优先级系统。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| resolveModelContext | 函数 | context | 核心解析逻辑，优先级：显式 → 对话 → 用户默认 → 系统默认 |
| getModelCapabilities | 函数 | modelId | 缓存的功能提取，1 分钟 TTL |
| getActiveModelId | 函数 | context | 基于优先级的活动模型 ID 提取 |
| validateModelResolution | 函数 | result | 详细错误报告的验证 |
### src/shared/utils/time.ts
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

### src/shared/i18n/
国际化 (i18n) 模块，负责应用程序的语言管理和文本翻译。

### src/shared/i18n/config.ts
i18next 配置，包含 React 集成和资源加载。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| i18n | 实例 | 无 | 配置的 i18next 实例，支持 React |

### src/shared/i18n/index.ts
i18n 模块的入口文件，负责聚合和导出 `config.ts`、`types.ts` 和 `init.ts` 中的内容。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| i18n | 实例 | 无 | 从 `config.ts` 重新导出的 i18next 实例 |
| Language | 联合类型 | 无 | 从 `types.ts` 重新导出的语言代码联合类型 |
| SUPPORTED_LANGUAGES | 常量 | 无 | 从 `types.ts` 重新导出的支持语言映射 |
| initializeI18n | 函数 | initialLanguage?: Language | 从 `init.ts` 重新导出的初始化函数 |

### src/shared/i18n/init.ts
i18n 初始化逻辑，负责异步加载和设置应用程序的初始语言。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| initializeI18n | 函数 | initialLanguage?: Language | 初始化 i18n 实例并设置语言 |

### src/shared/i18n/locales/
包含应用程序所有支持语言的翻译文件（JSON 格式）。

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
| runMigrations | 函数 | 无 | 应用待处理的迁移，升级到整合后的最新模式 |
| getCurrentVersion | 函数 | 无 | 获取当前模式版本（无表时返回 0）|
| rollbackToVersion | 函数 | targetVersion | 简化模式下不再支持（调用将抛错）|
| getMigrationHistory | 函数 | 无 | 列出已应用的迁移（无表返回空）|

说明：迁移方案已更新为简化的"整合"单向升级，支持多版本顺序升级。移除了早期的 FTS/Search、文件分块/向量等未实现特性所需的表与索引，采用流线化方案。

### src/main/database/queries.ts
使用通用 CRUD 工具的优化数据库查询。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createConversation | 函数 | data | 创建对话 |
| listConversations | 函数 | options | 列出对话，支持分页 |
| createMessage | 函数 | data | 创建消息 |
| createProject | 函数 | data | 创建项目 |

说明：全文搜索（FTS）相关查询与触发器已移除（简化迁移方案）。

### src/main/database/schemas.ts
实体到表的映射定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| conversationSchema | 对象 | 无 | 对话表映射 |
| messageSchema | 对象 | 无 | 消息表，包含 JSON 内容 |
| projectSchema | 对象 | 无 | 项目表映射 |
| modelConfigSchema | 对象 | 无 | 模型配置映射，包含 `max_input_tokens` 字段 |

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
| streamAssistantReply | 函数 | config: AssistantGenConfig | 主要流式传输函数，配置对象包含 messageId, conversationId, contextMessages, modelConfigId, reasoningEffort, userDefaultModelId, onSuccess, onError。 |
| generateReplyForNewMessage | 函数 | messageId, conversationId, reasoningEffort | 新消息生成 |
| regenerateReply | 函数 | messageId | 消息重新生成 |
| buildBranchContext | 函数 | assistantMessageId, options | 构建消息分支上下文，用于获取相关消息链。 |

实现要点：
- 由 `openai-adapter` 统一处理模型解析；此服务只传递可选 `modelConfigId/conversationModelId/userDefaultModelId`。
- 使用内部的 `createBatchedEmitter` 批量发射器合并文本和推理分片，降低 IPC 压力。
- 使用 `buildBranchContext` 构建消息上下文。
- 使用集中常量 `TEXT_CONSTANTS.ZERO_WIDTH_SPACE` 作为占位符。
- 支持 3 层模型解析优先级：显式 → 对话 → 用户默认 → 系统默认。

### src/main/services/file-temp.ts
聊天上下文的临时文件处理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| processTemporaryFiles | 函数 | filePaths | 处理文件路径数组，进行验证和内容提取。 |
| processTemporaryFileContents | 函数 | files | 处理文件内容数据数组（例如来自浏览器 File API），进行验证和内容提取。 |
| extractFileTextContent | 函数 | filePath, filename | 文本提取（避免与消息文本提取重名）|
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
| streamAIResponse | 函数 | conversationMessages, options, cancellationToken | 主要流式传输函数，支持模型解析（显式/对话/用户默认/系统默认优先级）、推理参数和流式回调，并包含失败重试机制。 |
| generateAIResponseOnce | 函数 | messages | 单次生成 |
| testOpenAIConfig | 函数 | config | 配置测试 |
| getOpenAIConfigFromEnv | 函数 | 无 | 环境配置 |
| validateOpenAIConfig | 函数 | config | 配置验证 |

说明：
- 模型解析（显式/对话/默认）由适配器内部完成，调用方无需重复解析。
- 统一使用 `createOpenAICompatible` 适配官方和 OpenAI 兼容提供商。
- 内部使用统一的参数构建器，支持可选推理与流畅流式配置。
- 包含重试机制，当带推理参数的流式传输失败时，会尝试不带推理参数再次传输。
- 支持 `smooth` 流式传输选项和错误增强功能。
- 实现 3 层优先级系统的内部模型解析。

### src/main/services/title-generation.ts
自动化对话标题生成。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| generateTitleForConversation | 函数 | conversationId | AI 驱动的标题生成 |
| attemptInitialTitleGeneration | 函数 | conversationId | 一次性、幂等的首轮自动标题尝试 |
| isPlaceholderTitle | 函数 | title | 判断标题是否为占位（如 'New Chat'）|

说明：标题生成采用"一次性首轮尝试"策略，满足"首个用户+助手消息完成且对话标题仍为占位"时触发。采用幂等设计，取消逻辑已移除。

### src/main/services/settings.ts
应用程序配置管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| SettingsService | 类 | 无 | 设置服务类，包含完整的配置管理 |
| getSettings | 函数 | 无 | 获取所有设置 |
| updateSettings | 函数 | updates | 运行时更新 |
| settingsService | 实例 | 无 | 单例实例 |

说明：与 OpenAI 相关的环境读取与模型参数现由 `openai-adapter` 统一处理；`apiProviders` 简化为占位容器，`getProviderConfig` 等提供商接口已移除。

### src/main/services/model-config-service.ts
具有综合验证的模型配置管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| ModelConfigService | 类 | 无 | 模型配置服务实现 |
| list | 方法 | 无 | 获取所有模型配置 |
| create | 方法 | input | 使用 Zod 验证创建，包含 `max_input_tokens` 字段 |
| update | 方法 | id, updates | 使用验证更新，支持更新 `max_input_tokens` 字段 |
| delete | 方法 | id | 删除，处理默认模型 |
| testConnection | 方法 | id | 连接测试 |
| resolveDefaultModel | 方法 | 无 | 默认模型解析 |
| setDefaultModel | 方法 | id | 设置用户默认模型 |
| getDefaultModelId | 方法 | 无 | 获取用户默认模型 ID |
| handleDefaultModelDeletion | 方法 | deletedModelId | 处理默认模型删除时的逻辑，包括重新分配默认模型和受影响的对话。 |

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
| registerConversationIPCHandlers | 函数 | 无 | 注册所有对话和消息相关的 IPC 处理器，包括对话的创建、获取、更新、删除、分页列表、标题生成、移动，以及消息的获取、列表、更新、删除、停止流式传输、发送和重新生成。还包括 AI 连接测试。 |
| sendConversationEvent | 函数 | eventType, data | 事件广播 |
| sendMessageEvent | 函数 | eventType, data | 消息事件广播 |

说明：
- 移除了 `conversation:list`，请使用 `conversation:list-paginated`。
- 移除了 `message:add`、`message:add-text`、`message:add-multipart`，请使用 `message:send`。
- 移除了 `message:edit`，请使用 `message:update`。
- 新增了 `message:stop` 和 `message:send` IPC 处理器。
- 新增了 `conversation:move` IPC 处理器。
- 新增了 `ai:test-connection` IPC 处理器。

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
| Application | 类 | 无 | 主应用程序控制器，负责初始化数据库、注册/注销 IPC 处理器、设置应用程序菜单和管理窗口生命周期。 |
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

### src/renderer/stores/conversation/
对话状态管理模块，采用 Zustand 实现，并将核心逻辑拆分为多个职责单一的文件，以提高可维护性和可扩展性。

### src/renderer/stores/conversation/index.ts
对话存储模块的公共入口文件，负责聚合和导出 `store.ts`、`data.ts`、`streaming.ts`、`events.ts`、`utils.ts`、`hooks.ts` 和 `types.ts` 中的所有内容。

### src/renderer/stores/conversation/store.ts
核心对话 Zustand 存储实现，包含所有对话和消息相关的状态、动作 (actions) 和选择器 (selectors)。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useConversationStore | Hook | 无 | 主对话 Zustand 存储 Hook，提供对对话状态和操作的访问 |

### src/renderer/stores/conversation/data.ts
处理对话和消息数据的持久化和 API 交互，包括数据的获取、存储和索引。

### src/renderer/stores/conversation/events.ts
管理对话相关的事件监听和触发，用于实现主进程与渲染进程之间的实时同步。

### src/renderer/stores/conversation/hooks.ts
提供用于从对话存储中选择特定状态或派生数据的自定义 React Hook。

### src/renderer/stores/conversation/streaming.ts
处理 AI 响应的流式传输逻辑，包括文本块的应用和流式状态的管理。

### src/renderer/stores/conversation/types.ts
定义对话存储模块中使用的所有 TypeScript 类型和接口，包括状态结构和辅助类型。

### src/renderer/stores/conversation/utils.ts
包含对话存储模块内部使用的各种实用函数和常量，例如数据处理、错误处理和加载状态管理。

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

### src/renderer/stores/model-config.ts
AI 模型配置管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useModelConfigStore | Hook | 无 | 主模型配置存储 |
| useModelConfigs | Hook | 无 | 模型配置列表选择器 |
| useDefaultModel | Hook | 无 | 默认模型选择器 |

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
高级对话分支系统，提供消息分支的逻辑和数据，支持对话树的遍历和管理。UI 层的分支导航（例如在 `UserMessage.tsx` 中）会利用此 Hook 提供的数据。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useMessageBranching | Hook | conversationId | 消息分支钩子，支持树遍历和分支数据管理 |

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
综合通知系统钩子。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useNotifications | Hook | 无 | 通知钩子，返回核心通知函数和实际使用的便利函数 |
| notify | 函数 | type, options | 通用通知函数 |
| success/error/warning/info | 函数 | options | 特定类型的通知函数 |
| preset | 函数 | presetKey, overrides | 使用预设配置的通知函数 |
| messageCopied/messageRegenerated/messageError | 函数 | 参数 | 消息操作相关通知 |
| aiGenerating/aiError/networkError | 函数 | 参数 | AI 操作相关通知 |
| fileValidationError/filesProcessed/fileProcessingFailed | 函数 | 参数 | 文件操作相关通知 |
| conversationRenamed/conversationDeleted 等 | 函数 | 参数 | 对话操作相关通知 |

### src/renderer/hooks/useProjectManagement.ts
项目 CRUD，包含 UI 状态管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useProjectManagement | Hook | 无 | 项目管理钩子，表单状态管理和验证 |

### src/renderer/hooks/useModelCapabilities.ts
集中化模型能力检测。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useModelCapabilities | Hook | modelId | 模型能力钩子，缓存能力解析 |

### src/renderer/hooks/useThemeSync.ts
负责将应用程序主题与操作系统主题同步，并处理主题相关的持久化和更新。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useThemeSync | Hook | 无 | 主题同步钩子，监听系统主题变化并更新应用主题 |

### src/renderer/components/
包含应用程序的用户界面组件，根据功能和职责进行组织。

### src/renderer/components/features/
包含与特定应用程序功能（如聊天、模型管理、项目管理和设置）相关的组件。这些组件通常是复杂视图或交互的容器。

### src/renderer/components/features/chat/
与聊天功能相关的组件，例如消息显示、输入区域和聊天历史。

| 文件 | 描述 |
|---|---|
| `AssistantMessage.tsx` | 显示 AI 助手消息的组件，支持流式传输指示器、推理显示和消息重新生成。 |

### src/renderer/components/features/models/
与 AI 模型配置和管理相关的组件。

### src/renderer/components/features/projects/
与项目创建、管理和显示相关的组件。

### src/renderer/components/features/settings/
与应用程序设置和用户偏好相关的组件。

### src/renderer/components/layout/
包含应用程序的整体布局结构和导航组件。

| 文件 | 描述 |
|---|---|
| `ConversationsSection.tsx` | 显示和管理对话列表的组件。 |
| `MainLayout.tsx` | 应用程序的主布局容器，包含侧边栏和主内容区域。 |
| `ProjectsSection.tsx` | 显示和管理项目列表的组件。 |
| `Sidebar.tsx` | 应用程序的侧边导航栏。 |
| `SidebarFooter.tsx` | 侧边栏底部的组件，通常包含设置或用户信息。 |
| `SidebarHeader.tsx` | 侧边栏顶部的组件，通常包含应用程序标志或标题。 |

### src/renderer/components/ui/
包含可重用的、原子级的 UI 组件，这些组件不依赖于特定的业务逻辑，可以在整个应用程序中复用。

| 文件 | 描述 |
|---|---|
| `AutoResizeTextarea.tsx` | 自动调整高度的文本输入框。 |
| `Button.tsx` | 通用按钮组件。 |
| `ConversationMenu.tsx` | 对话相关的操作菜单组件。 |
| `DeleteProjectModal.tsx` | 用于确认删除项目的模态框。 |
| `index.ts` | UI 组件的聚合导出文件。 |
| `Input.tsx` | 通用输入框组件。 |
| `LanguageSelector.tsx` | 语言选择器组件。 |
| `Modal.tsx` | 通用模态框组件。 |
| `Notification.tsx` | 应用程序通知显示组件。 |
| `TempFileCard.tsx` | 显示临时文件信息和状态的卡片组件。 |
| `ThemeSelector.tsx` | 主题选择器组件，用于切换亮色/暗色模式。 |

### src/renderer/utils/markdownComponents.tsx
自定义 React Markdown 组件。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| markdownComponents | 对象 | 无 | 主题集成的 markdown 渲染组件 |

### src/renderer/utils/theme/
Chakra UI 主题配置模块，将主题的不同方面（如断点、颜色模式、颜色和组件样式）分离到单独的文件中，以实现模块化和可维护性。

### src/renderer/utils/theme/index.ts
Chakra UI 主题的入口文件，负责聚合所有主题配置并导出完整的 `theme` 对象。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| theme | 对象 | 无 | 完整的 Chakra UI 主题配置对象 |

### src/renderer/utils/theme/breakpoints.ts
定义应用程序响应式布局的断点配置。

### src/renderer/utils/theme/colorMode.ts
配置 Chakra UI 的颜色模式（亮色/暗色）相关设置。

### src/renderer/utils/theme/colors.ts
定义应用程序使用的所有颜色变量和调色板。

### src/renderer/utils/theme/components.ts
包含 Chakra UI 组件的自定义样式和变体配置。

### src/renderer/styles/markdown.css
包含用于渲染 Markdown 内容的自定义 CSS 样式。

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
2. **类型安全的 IPC**: 所有通信使用强类型接口和 `handleIPCCall` 包装器
3. **简化数据库架构**: 移除早期 FTS/Search 和文件向量化功能，采用流线化方案
4. **智能模型解析**: 3 层优先级系统（显式 → 对话 → 用户默认 → 系统默认）
5. **批量流式传输**: 内部批量发射器减少 IPC 压力，合并文本和推理分片
6. **幂等标题生成**: 一次性、自动的对话标题生成策略
7. **统一 AI 适配器**: 支持官方和 OpenAI 兼容提供商，包含重试机制
8. **取消令牌系统**: 基于 ID 的取消管理，支持长时间运行操作
9. **通知预设系统**: 15 个预定义通知配置，覆盖常见使用场景
10. **主题同步**: OS 主题自动同步，支持暗色/亮色模式切换
11. **模块化状态管理**: 对话存储拆分为多个职责单一的文件
12. **综合文件处理**: 多格式解析器工厂，包含编码检测和验证管道

此文档涵盖了 Knowlex 应用程序的完整源代码架构，展示了现代 Electron + React 应用程序的流线化设计、智能模型集成和用户体验优化模式。
