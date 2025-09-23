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
| REASONING_RESOLUTIONS | 常量对象 | 无 | 推理级别到具体值的映射 |

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

### src/shared/constants/file-types.ts
文件类型和 MIME 类型映射的集中定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| IMAGE_EXTENSIONS | 常量数组 | 无 | 支持的图片文件扩展名列表 |
| EXTENSION_TO_MIME | 常量对象 | 无 | 文件扩展名到 MIME 类型的映射 |
| DEFAULT_MIME | 常量 | 无 | 默认 MIME 类型 |

### src/shared/message/content-builder.ts
提供用于构建和操作消息内容的实用函数。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| buildUserMessageContent | 函数 | text, attachments | 从文本和附件构建用户消息内容 |
| getMessageText | 函数 | message | 从消息中提取纯文本内容 |
| isContentEmpty | 函数 | content | 检查消息内容是否为空 |

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

### src/shared/types/conversation-types.ts
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
| Attachment | 接口 | 文件属性 | 附件结构，包含内容和元数据 |
| ProcessingResult | 接口 | success, error | 文件处理结果 |
| FileStatus | 联合类型 | 无 | 文件状态 ('pending' | 'processing' | 'ready' | 'failed') |

### src/shared/types/ipc.ts
Electron 主进程和渲染进程间通信的结构定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| IPCResult<T> | 接口 | success, data, error | 通用 IPC 响应包装器 |
| ConversationCreateRequest | 接口 | 请求参数 | 创建对话的请求结构 |
| AttachmentProcessRequest | 接口 | 请求参数 | 附件上传的请求结构 |

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
| NotificationType | 联合类型 | 无 | 通知严重程度级别 ('success' | 'error' | 'warning' | 'info') |
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

### src/shared/utils/error-handling.ts
错误处理工具，提供一致的错误消息格式化和操作失败处理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| getErrorMessage | 函数 | error, fallback | 安全地从未知错误值中提取人类可读的错误消息 |
| formatOperationError | 函数 | operation, error | 一致地格式化操作失败消息 |
| createErrorHandler | 函数 | operation | 为特定操作创建绑定错误处理器的工厂函数 |

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

### src/shared/utils/message-utils.ts
提供用于处理消息的各种实用函数。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| getLastAssistantMessage | 函数 | messages | 从消息列表中获取最后一条助手消息 |
| getMessageById | 函数 | messages, id | 按 ID 从消息列表中查找消息 |

### src/shared/utils/message-view-models.ts
提供用于创建和管理消息视图模型的函数。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createMessageViewModel | 函数 | message | 从消息对象创建视图模型 |
| updateMessageViewModel | 函数 | viewModel, updates | 更新消息视图模型 |

### src/shared/utils/model-resolution.ts
集中化模型解析服务，实现 3 层优先级系统。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| resolveModelContext | 函数 | context | 核心解析逻辑，优先级：显式 → 对话 → 用户默认 → 系统默认 |
| getModelCapabilities | 函数 | modelId | 缓存的功能提取，1 分钟 TTL |
| getActiveModelId | 函数 | context | 基于优先级的活动模型 ID 提取 |
| validateModelResolution | 函数 | result | 详细错误报告的验证 |

### src/shared/utils/text.ts
文本相关常量的集中定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| TEXT_CONSTANTS | 常量对象 | 无 | 提供 `ZERO_WIDTH_SPACE` 等文本占位符常量 |

### src/shared/utils/time.ts
统一的时间管理，支持 SQLite 时间戳和国际化。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| formatTime | 函数 | timestamp, options | 使用 Intl.DateTimeFormat 的灵活时间格式化 |
| formatRelativeTime | 函数 | timestamp | 人类可读的相对时间 ("刚刚", "5分钟前") |

### src/shared/utils/token-count.ts
Token 计数和估算工具，使用 tiktoken 进行准确的 token 计算。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| getEncodingForModel | 函数 | modelId | 获取给定模型的 tiktoken 编码（缓存以提高性能） |
| countTextTokens | 函数 | text, encoding | 使用 tiktoken 编码计算文本中的 token 数量 |
| estimateImageTokensByTiles | 函数 | width, height, tokensPerTile | 基于瓦片计算估算图像 token 数量 |
| countRequestTokensNormalized | 函数 | items | 计算标准化请求数据的 token 总数 |
| clearEncodingCache | 函数 | 无 | 清理缓存的编码（用于应用程序关闭时） |

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
| isImageFile | 函数 | filename | 检查文件是否为图片文件 |
| getMimeTypeFromExtension | 函数 | filename | 从文件扩展名获取 MIME 类型 |

### src/shared/reasoning/policy.ts
推理级别解析和验证策略。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| resolveReasoningEffort | 函数 | userSelection, modelCaps | 根据用户选择和模型能力解析推理级别 |
| validateReasoningEffort | 函数 | value | 验证和解析推理级别值 |

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

### src/shared/i18n/locales/en.json
英文翻译资源文件，提供界面文本的默认英文文案。

### src/shared/i18n/locales/zh.json
中文翻译资源文件，覆盖应用的简体中文文案。

### src/shared/i18n/types.ts
国际化的类型定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| Language | 联合类型 | 无 | 支持的语言代码 ('en' | 'zh-CN') |
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
| DatabaseEntity<T> | 类 | tableName, schema | 通用实体类，提供完整的 CRUD 操作 |
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

说明：迁移方案已更新为简化的"整合"单向升级，支持多版本顺序升级。移除了早期的 FTS/Search、文件分块/向量等未实现特性所需的表与索引，采用流线化方案。增加了对 `max_input_tokens` 的支持。

### src/main/database/queries.ts
使用通用 CRUD 工具的优化数据库查询。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createConversation | 函数 | data | 创建对话 |
| listConversations | 函数 | options | 列出对话，支持分页 |
| createMessage | 函数 | data | 创建消息 |
| createProject | 函数 | data | 创建项目 |
| createProjectFile | 函数 | data | 创建项目文件记录 |
| getProjectFile | 函数 | id | 按 ID 获取项目文件 |
| listProjectFiles | 函数 | projectId | 列出项目的所有文件 |
| updateProjectFile | 函数 | id, updates | 更新项目文件信息 |
| deleteProjectFile | 函数 | id | 删除项目文件记录 |

说明：全文搜索（FTS）相关查询与触发器已移除（简化迁移方案）。

### src/main/database/schemas.ts
实体到表的映射定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| conversationSchema | 对象 | 无 | 对话表映射 |
| messageSchema | 对象 | 无 | 消息表，包含 JSON 内容 |
| projectSchema | 对象 | 无 | 项目表映射 |
| projectFileSchema | 对象 | 无 | 项目文件表映射，支持 Smart Notes 字段 |
| modelConfigSchema | 对象 | 无 | 模型配置映射，包含 `max_input_tokens` 字段 |

### src/main/services/ai-streaming.ts
处理 AI 响应的流式传输逻辑，包括文本块的应用和流式状态的管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| streamAIResponse | 函数 | conversationMessages, options, cancellationToken | 主要流式传输函数，支持模型解析、推理参数和流式回调，并包含失败重试机制。 |

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

### src/main/services/conversation-service.ts
具有综合业务逻辑的对话管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createConversation | 函数 | data | 创建对话，包含验证 |
| listConversationsPaginated | 函数 | limit, offset | 分页列表，包含 hasMore 标志 |
<!-- 手动生成标题已移除，仅保留自动生成与手动输入改名 -->
| moveConversation | 函数 | conversationId, projectId | 在项目间移动对话 |

### src/main/services/message.ts
支持多部分内容的消息管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| addMessage | 函数 | data | 创建消息，包含内容验证 |
| convertAttachmentsToMessageParts | 函数 | files | 文件集成 |
| extractTextContent | 函数 | message | 内容提取工具 |

### src/main/services/assistant-service.ts
支持流式传输的 AI 响应生成服务。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| AssistantGenConfig | 接口 | messageId, conversationId, contextMessages, modelConfigId?, reasoningEffort?, userDefaultModelId?, onSuccess?, onError? | 助手消息生成配置接口 |
| streamAssistantReply | 函数 | config: AssistantGenConfig | 主要流式传输函数，处理完整的 AI 响应生命周期，包括事件广播、分片合并和最终持久化 |
| generateReplyForNewMessage | 函数 | messageId, conversationId, reasoningEffort? | 为新用户消息生成回复的便捷函数，自动处理对话上下文和标题生成 |
| regenerateReply | 函数 | messageId | 重新生成助手消息的便捷函数，自动处理上下文提取 |
| buildBranchContext | 函数 | assistantMessageId, options | 构建分支作用域上下文的辅助函数，支持令牌限制和消息计数回退 |

实现要点：
- 由 `openai-adapter` 统一处理模型解析；此服务只传递可选 `modelConfigId/conversationModelId/userDefaultModelId`。
- 通过 `StreamingLifecycleManager` 统一管理流式生命周期（开始/结束/分片事件、数据库写入、取消与错误处理），内部使用 `batched-emitter` 降低 IPC 压力。
- 使用 `buildBranchContext` 构建消息上下文，支持令牌估算和回退机制。
- 支持 3 层模型解析优先级：显式 → 对话 → 用户默认 → 系统默认。

### src/main/services/attachment-processor.ts
附件处理服务，专门处理未分类聊天模式的附件上传。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| processAttachmentContents | 函数 | files: Array<{name, content, size}> | 处理基于内容的附件数据（来自浏览器 File API） |
| processAttachments | 函数 | filePaths: string[] | 处理基于文件路径的附件，支持批量处理 |
| extractFileTextContent | 函数 | filePath, filename | 从文件提取文本内容 |
| cleanupAttachments | 函数 | filePaths | 清理附件文件（未来使用） |

说明：
- 支持统一的文件处理流程：验证 → 解析 → 内容提取
- 自动文件类型检测和 MIME 类型推断
- 图片文件转换为 base64 data URL
- 二进制文件使用文件解析器系统处理
- 包含完整的错误处理和约束验证

### src/main/services/message-send.ts
消息发送工作流服务，统一处理消息创建和AI回复生成。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| SendMessageInput | 接口 | content, reasoningEffort?, conversationId?, parentMessageId?, projectId?, modelConfigId? | 消息发送输入接口 |
| SendMessageResult | 接口 | conversation, userMessage, assistantMessage, newlyCreatedConversation | 消息发送结果接口 |
| sendMessageAndGenerateReply | 函数 | input: SendMessageInput | 主要工作流函数，处理完整消息发送和回复生成 |

说明：
- 统一的消息发送流程：确保对话存在 → 创建用户消息 → 创建助手占位消息 → 触发异步流式回复
- 支持分支消息创建（parentMessageId）
- 自动处理新对话创建
- 事件广播集成，确保UI实时更新

### src/main/services/streaming-lifecycle.ts
流式生命周期管理器，集中处理事件广播、分片合并与最终落库。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| StreamingLifecycleManager | 类 | messageId | 负责 STREAMING_START/TEXT_START/TEXT_END/REASONING_* 事件、分片合并、取消/错误/完成时的持久化与事件发送 |

### src/main/utils/batched-emitter.ts
通用的批量分片发射器，按时间窗口聚合分片以减少 IPC 压力。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createBatchedEmitter | 函数 | messageId, eventType, chunkProperty, flushInterval | 返回具有 addChunk/flush 的发射器实例 |

### src/main/utils/error.ts
错误处理和格式化工具。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| formatUnknownError | 函数 | err, fallback | 安全地将未知错误格式化为字符串 |
| processingErrorMessage | 函数 | err | 为处理错误创建标准错误消息 |
| criticalErrorMessage | 函数 | err | 为严重错误创建标准错误消息 |

### src/main/utils/ipc-events.ts
IPC 事件广播和消息传递工具。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| broadcast | 函数 | prefix, eventType, data | 向所有渲染器窗口广播事件 |
| sendConversationEvent | 函数 | eventType, data | 发送对话相关事件 |
| sendMessageEvent | 函数 | eventType, data | 发送消息相关事件 |
| CONVERSATION_EVENTS | 常量对象 | 无 | 对话事件类型常量 |
| MESSAGE_EVENTS | 常量对象 | 无 | 消息事件类型常量 |

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


### src/main/services/file-parser.ts
多格式文件内容提取。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| FileParser | 抽象类 | 无 | 抽象基础解析器类 |
| PlainTextParser | 类 | 无 | 文本文件处理，包含编码检测 |
| PDFParser | 类 | 无 | 使用 pdfjs-dist 的 PDF 处理 |
| OfficeParser | 类 | 无 | 使用 officeparser 的 Office 文档处理 |
| FileParserFactory | 类 | 无 | 解析器创建和格式检测 |
| parseFile | 函数 | filePath, filename | 主要解析函数 |

### src/main/services/openai-adapter.ts
AI SDK 集成，支持流式传输和模型解析。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| OpenAIConfig | 接口 | apiKey, baseURL, model, temperature?, maxTokens?, topP?, frequencyPenalty?, presencePenalty?, reasoningEffort?, smooth? | OpenAI 兼容模型配置接口 |
| getOpenAIConfigFromEnv | 函数 | 无 | 从环境变量获取 OpenAI 配置 |
| validateOpenAIConfig | 函数 | config? | 验证 OpenAI 配置 |
| streamAIResponse | 函数 | conversationMessages, options, cancellationToken? | 主要流式传输函数，内部使用参数构建器与重试策略 |
| testOpenAIConfig | 函数 | config? | 配置测试 |

说明：
- 模型解析（显式/对话/默认）由适配器内部完成，调用方无需重复解析。
- 统一使用 `createOpenAICompatible` 适配官方和 OpenAI 兼容提供商。
- 参数与消息格式转换委托给 `ai-params.ts`（`buildModelParams`、`convertMessagesToAIFormat`）。
- 重试逻辑委托给 `ai-retry.ts`，当带推理参数失败时自动回退至不带推理参数。
- 保留 `smooth` 流式选项与错误增强。

### src/main/services/ai-params.ts
AI 参数与消息格式构建工具。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| buildProviderOptions | 函数 | config, includeReasoningOptions | 构建 providerOptions（例如 openai.reasoningEffort） |
| buildModelParams | 函数 | model, messages, config, options | 统一构建 AI SDK 调用参数（可选 smooth/推理） |
| convertMessagesToAIFormat | 函数 | messages | 将应用内部 Message 转换为 AI SDK 期望的格式 |

### src/main/services/ai-retry.ts
流式重试策略工具。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| retryWithReasoningFallback | 函数 | attempt, hasReasoning, isParamError, log | 优先带推理，失败且为参数错误时回退到不带推理参数 |

### src/main/services/title-generation.ts
自动化对话标题生成。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| generateTitleForConversation | 函数 | conversationId | AI 驱动的标题生成 |
| attemptInitialTitleGeneration | 函数 | conversationId | 一次性、幂等的首轮自动标题尝试 |
| isPlaceholderTitle | 函数 | title | 判断标题是否为占位（如 'New Chat'）|

说明：
- 标题生成采用“一次性首轮尝试”策略：当首个“用户+助手”消息完成且对话标题仍为占位时触发；幂等，取消逻辑已移除。
- 实际生成调用统一走 `streamAIResponse`，并遵循“显式 > 对话模型 > 用户默认 > 系统默认”的模型解析顺序，不再依赖环境变量直连。

### src/main/services/settings.ts
应用程序配置管理，支持持久化存储到磁盘。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| SettingsService | 类 | 无 | 设置服务类，包含完整的配置管理和磁盘持久化 |
| getSettings | 函数 | 无 | 获取所有设置，从环境变量和持久化文件合并 |
| updateSettings | 函数 | updates | 运行时更新设置并自动持久化到磁盘 |
| settingsService | 实例 | 无 | 单例实例 |

说明：设置服务现支持将用户设置持久化到磁盘。设置从环境变量默认值和用户持久化文件合并，更新时自动保存到 `userData/settings.json`。支持文件处理模型配置和最大输入 token 限制等设置项。与 OpenAI 相关的环境读取与模型参数现由 `openai-adapter` 统一处理；`apiProviders` 简化为占位容器，`getProviderConfig` 等提供商接口已移除。

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

### src/main/services/SmartNotesWorker.ts
简化的单次处理 Smart Notes 处理器，已从队列系统重构为直接调用模式。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| processSmartNotes | 函数 | id: string | 直接处理单个项目文件的 Smart Notes 生成，支持并发调用但不保证顺序 |

说明：此服务已从原有的队列系统重构为单次处理模式。移除了分块处理逻辑，改为一次性读取所有文件内容并进行 token 限制检查。如果文件 token 数超过限制则标记为失败。支持并发处理，调用方负责协调。移除了重试机制和队列恢复功能，采用更简单的 fire-and-forget 模式。

### src/main/ipc/common.ts
共享的 IPC 工具和验证模式。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| handleIPCCall | 函数 | operation | 一致错误处理包装器 |
| validateId | 函数 | id | ID 验证类型守卫 |
| requireValidId | 函数 | id, type | ID 验证，抛出错误 |
| ValidationPatterns | 对象 | 无 | 实体的通用验证模式 |
| ErrorMessages | 对象 | 无 | 标准化错误消息常量 |

### src/main/ipc/conversation-ipc.ts
统一的对话与消息 IPC 处理器（已合并原 handlers 目录的实现，移除重复）。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| registerConversationIPCHandlers | 函数 | 无 | 注册所有对话与消息相关 IPC，包括：创建/获取/更新/删除/分页列出对话、移动，以及消息的获取/列表/更新/删除/停止流/发送/重新生成和 AI 连接测试。 |
| unregisterConversationIPCHandlers | 函数 | 无 | 注销所有相关 IPC 通道 |

说明（去重更新）：
- 旧路径 `src/main/ipc/handlers/conversation.ts` 已删除，避免双实现。
- 保留 `conversation:list-paginated` 作为唯一列表接口（`conversation:list` 已废弃）。
- 统一使用 `message:send` 处理所有新增消息与流式回复（取代 `message:add*` 族）。
- `message:update` 取代旧的 `message:edit`。
- 推理与流式阶段通过事件广播（`sendMessageEvent` 内部使用）更新前端。
- 新增的 `message:stop` / `message:regenerate` / `conversation:move` / `ai:test-connection` 均在此集中维护。
- 手动“生成标题”的 IPC 通道已移除（`conversation:generate-title` 不再存在）；仅保留自动生成与手动输入改名两种路径。

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

### src/main/ipc/project-file.ts
项目文件 IPC 处理器。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| 无导出函数 | 无 | 无 | 直接注册 IPC 处理器，无导出函数 |

说明：处理项目文件相关的所有 IPC 通信，包括上传、列表、获取、更新、删除和打开文件操作。使用 `handleIPCCall` 包装器确保一致的错误处理。
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
| Application | 类 | 无 | 主控制器：初始化数据库、注册/注销 IPC 处理器（现统一从 `ipc/conversation` 等单一文件导入）、设置菜单、管理窗口生命周期。 |
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

### src/renderer/index.html
渲染进程的静态入口 HTML，加载打包后的脚本并注入根节点。

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
| getDefaultModel (store method) | 函数 | 无 | 通过内部缓存策略获取默认模型（非 Hook，5 分钟 TTL 缓存） |

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
| useUserDefaultModelPreference | Hook | 无 | 用户首选默认模型偏好钩子（读取/更新 defaultModelId） |

### src/renderer/contexts/MessageBranchingContext.tsx
为消息分支提供 React 上下文。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| MessageBranchingProvider | 组件 | conversationId | 提供消息分支上下文的提供者 |
| useMessageBranchingContext | Hook | 无 | 使用消息分支上下文的钩子 (原 `useBranching`, alias kept for compatibility) |

### src/renderer/hooks/useAutoScroll.ts
聊天界面的智能自动滚动。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useAutoScroll | Hook | options | 自动滚动钩子，支持粘性底部行为和用户覆盖检测。现在使用 `useStreamingPhase`。 |

### src/renderer/hooks/useConversationManagement.ts
支持无限滚动的对话列表管理。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useConversationManagement | Hook | 无 | 对话管理钩子，基于 IntersectionObserver 的无限加载 |

### src/renderer/hooks/useAttachmentUpload.ts
文件附件上传管理钩子。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useAttachmentUpload | Hook | options | 处理文件上传、验证和附件管理的钩子 |

### src/renderer/hooks/useEditableMessage.ts
支持文件附件的复杂消息编辑。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useEditableMessage | Hook | messageId | 消息编辑钩子，统一处理附件和内容验证 |

### src/renderer/hooks/useEditableTitle.ts
标题内联编辑管理钩子。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useEditableTitle | Hook | title, onSave | 标题编辑钩子，支持内联编辑和保存 |


### src/renderer/hooks/useMessageActions.ts
提供用于消息操作的函数。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useMessageActions | Hook | 无 | 返回一组用于处理消息操作的函数，例如发送、停止和重新生成。 |

### src/renderer/hooks/useMessageBranching.ts
高级对话分支系统，提供消息分支的逻辑和数据，支持对话树的遍历和管理。UI 层的分支导航（例如在 `UserMessage.tsx` 中）会利用此 Hook 提供的数据。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useMessageBranching | Hook | conversationId | 消息分支钩子，支持树遍历和分支数据管理 |

### src/renderer/hooks/useMessageTokenEstimate.ts
估算消息的 token 数量。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useMessageTokenEstimate | Hook | text, attachments, model | 估算给定文本、附件和模型的 token 数量。 |

### src/renderer/hooks/useModelCapabilities.ts
集中化模型能力检测。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useModelCapabilities | Hook | modelId | 模型能力钩子，缓存能力解析。 |
| useActiveModelCapabilities | Hook | conversationModelId, explicitModelId | 获取当前活动模型的能力，遵循显式、对话、用户默认的优先级。 |
| useMultipleModelCapabilities | Hook | modelIds | 批量获取多个模型的能力。 |
| useModelsByCapability | Hook | requiredCapabilities, matchAll | 根据一个或多个能力过滤模型。 |
| useReasoningCapableModels | Hook | 无 | 获取所有支持推理的模型。 |
| useVisionCapableModels | Hook | 无 | 获取所有支持视觉的模型。 |
| useHasCapabilitySupport | Hook | capability | 检查是否有任何模型支持特定能力。 |
| useCapabilityStatus | Hook | 无 | 获取常用能力的总体支持状态。 |

### src/renderer/hooks/useI18n.ts
国际化，支持语言切换。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useI18n | Hook | 无 | 国际化钩子，动态翻译加载 |


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

### src/renderer/hooks/useReasoningEffort.ts
管理 AI 推理级别。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useReasoningEffort | Hook | capabilities | 管理推理级别，并检查模型是否支持推理。 |

### src/renderer/hooks/useRequestTokenCount.ts
请求 token 计数管理钩子。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useRequestTokenCount | Hook | messages, model | 计算和管理请求的 token 数量 |

### src/renderer/hooks/useStreamingPhase.ts
管理 AI 响应的流式传输阶段。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useStreamingPhase | Hook | messageId | 跟踪给定消息的流式传输阶段（例如，推理、文本）。 |

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

### src/renderer/components/features/chat/AssistantMessage.tsx
显示 AI 助手消息的组件，处理流式文本与推理片段、loading 状态、重新生成入口，并集成 `useMessageActions`、`useStreamingPhase`。

### src/renderer/components/features/chat/ChatInputBox.tsx
统一的聊天输入框容器，管理文本、附件上传、token 计数、推理设置与发送操作。复用 `FileAttachmentList`、`SendButton`、`TokenCounter` 等 UI 组件。

### src/renderer/components/features/chat/ConversationHeader.tsx
对话顶部栏，展示标题、项目归属与常用操作（重命名、删除、切换项目）。

### src/renderer/components/features/chat/ConversationPage.tsx
完整的聊天页面布局，组合对话头、消息时间线、推理展示与输入框，并连接到对话 store。

### src/renderer/components/features/chat/MainPage.tsx
当未选择具体对话时显示的默认页面，提供新建对话入口和快速提示。

### src/renderer/components/features/chat/ReasoningBox.tsx
以折叠面板展示模型推理内容，支持实时流式更新与手动隐藏/显示。

### src/renderer/components/features/chat/UserMessage.tsx
用户消息气泡组件，支持内联编辑、附件展示、分支导航与操作菜单。

### src/renderer/components/features/models/
与 AI 模型配置和管理相关的组件。

### src/renderer/components/features/models/EditModelModal.tsx
模型配置的创建/编辑模态框，封装表单、验证、模板应用以及 API Key 填写提示。

### src/renderer/components/features/models/ModelCard.tsx
以卡片形式展示单个模型配置，包含使用统计、能力标签和编辑/删除操作。

### src/renderer/components/features/models/ModelSelector.tsx
下拉选择器组件，允许用户从存储中选择活动模型并展示能力状态。

### src/renderer/components/features/models/ModelSettingsPanel.tsx
设置面板中的模型管理区域，组合模型列表、默认模型选择和文件处理参数。

### src/renderer/components/features/models/ReasoningEffortSelector.tsx
推理强度的单独选择控件，提供级别说明和能力兼容性提示。

### src/renderer/components/features/projects/
与项目创建、管理和显示相关的组件。

### src/renderer/components/features/projects/ProjectPage.tsx
项目视图页面，聚合项目详情、对话列表、文件概览及在项目上下文下创建对话的入口。

### src/renderer/components/features/settings/
与应用程序设置和用户偏好相关的组件。

### src/renderer/components/features/settings/GeneralSettingsSection.tsx
设置模态中的通用部分，提供语言、主题和界面偏好的控制项。

### src/renderer/components/features/settings/index.ts
导出设置模块的主要组件，方便按需引入。

### src/renderer/components/features/settings/ModelSettingsSection.tsx
设置模态中的模型部分，允许选择默认模型、配置推理与文件处理选项。

### src/renderer/components/features/settings/SettingsModal.tsx
集中呈现所有设置区域的模态框，负责选项卡切换、保存和关闭逻辑。

### src/renderer/components/layout/
包含应用程序的整体布局结构和导航组件。

### src/renderer/components/layout/ConversationsSection.tsx
侧边栏的对话列表区域，支持搜索、分页和上下文菜单操作。

### src/renderer/components/layout/MainLayout.tsx
渲染层的根布局组件，将侧边栏与主内容区域组合，并处理响应式布局。

### src/renderer/components/layout/ProjectsSection.tsx
侧边栏的项目管理区域，展示项目列表及展开状态。

### src/renderer/components/layout/Sidebar.tsx
应用整体侧边栏结构，组织标题、项目、对话、底部操作区。

### src/renderer/components/layout/SidebarFooter.tsx
侧边栏底部的操作面板，包含设置、主题和其他快捷入口。

### src/renderer/components/layout/SidebarHeader.tsx
侧边栏顶部区域，展示应用 Logo、标题以及项目创建入口。

### src/renderer/components/ui/
包含可重用的、原子级的 UI 组件，这些组件不依赖于特定的业务逻辑，可以在整个应用程序中复用。

### src/renderer/components/ui/AttachmentCard.tsx
附件卡片组件，展示文件名、大小、处理状态和错误信息，内置删除操作。

### src/renderer/components/ui/AutoResizeTextarea.tsx
自动根据内容调整高度的文本域，封装对 `textarea` 的尺寸计算和性能优化。

### src/renderer/components/ui/Button.tsx
通用按钮封装，应用统一的 Chakra 样式变体并支持加载/图标状态。

### src/renderer/components/ui/ConversationMenu.tsx
对话操作菜单，提供重命名、复制链接、删除等操作入口。

### src/renderer/components/ui/DeleteProjectModal.tsx
确认删除项目的模态组件，提示影响范围并要求用户确认。

### src/renderer/components/ui/FileAttachmentList.tsx
附件列表容器，将统一的附件数据映射为 `AttachmentCard` 并提供删除回调。

### src/renderer/components/ui/index.ts
集中导出 UI 目录中的所有基础组件。

### src/renderer/components/ui/InlineEdit.tsx
内联编辑器，封装只读/编辑态切换、提交、取消和验证逻辑。

### src/renderer/components/ui/Input.tsx
应用统一样式的输入框组件，支持前后缀和错误状态。

### src/renderer/components/ui/LanguageSelector.tsx
语言切换下拉框，调用 `useI18n` 更新应用语言。

### src/renderer/components/ui/Modal.tsx
基础模态框封装，抽象标题、内容、页脚布局与关闭行为。

### src/renderer/components/ui/Notification.tsx
通知展示组件，与通知 store 集成展示提示消息。

### src/renderer/components/ui/SendButton.tsx
发送按钮，带有发送/停止双态、动画和可访问性标签。

### src/renderer/components/ui/ThemeSelector.tsx
主题模式选择器，提供亮暗模式切换并同步到设置 store。

### src/renderer/components/ui/TokenCounter.tsx
Token 计数显示组件，带 Tooltip 展示详细用量信息。

### src/renderer/styles/markdown.css
自定义 Markdown 渲染样式，覆盖标题、代码块、列表等排版细节以匹配应用主题。

### src/renderer/hooks/useModelForm.ts
模型表单逻辑 Hook。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useModelForm | Hook | model, options | 封装模型表单状态、Zod 验证（`CreateModelConfigInputSchema`）、提交（创建/更新）、快速模板应用与编辑时的全量模型拉取（含 API Key）。返回 `formData, setField, errors, isSubmitting, isLoadingModel, submit, applyTemplate, templates`。

说明：`EditModelModal.tsx` 现在作为纯展示层，所有表单与提交逻辑都内聚在此 Hook 内，减少组件复杂度并遵循 DRY。

### src/renderer/utils/countRequestTokens.ts
请求 token 计数工具。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| countRequestTokens | 函数 | messages, model | 计算请求的 token 数量 |

### src/renderer/utils/markdownComponents.tsx
自定义 React Markdown 组件。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| markdownComponents | 对象 | 无 | 主题集成的 markdown 渲染组件 |

### src/renderer/utils/store-helpers.ts
Zustand 存储辅助工具。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| createStoreHelpers | 函数 | storeApi | 创建存储辅助函数集合 |

### src/renderer/utils/validation.ts
前端验证工具函数。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| validateInput | 函数 | value, rules | 输入验证函数 |
| isValidEmail | 函数 | email | 邮箱格式验证 |

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
配置 Chakra UI 的颜色模式（亮色/暗色）相关设置。包含一个 `ThemeManager` 类，用于跨窗口同步主题变更。

### src/renderer/utils/theme/colors.ts
定义应用程序使用的所有颜色变量和调色板。

### src/renderer/utils/theme/components.ts
包含 Chakra UI 组件的自定义样式和变体配置。

### src/renderer/utils/theme/fonts.ts
定义应用程序使用的字体配置。

### src/renderer/utils/theme/shadows.ts
定义应用程序使用的阴影效果配置。


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

## 项目文件系统 (Project Files System)

Knowlex 的项目文件功能允许用户上传和管理项目相关的文档文件，支持智能摘要生成和文件内容解析。

### src/shared/constants/project-files.ts
项目文件系统的常量定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| PROJECT_FILE_EVENTS | 常量对象 | 无 | 项目文件相关的事件类型定义 |
| PROJECT_FILE_SMART_NOTES | 常量对象 | 无 | Smart Notes 处理的默认配置参数 |

### src/shared/types/project-file.ts
项目文件相关的数据类型定义。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| ProjectFileRow | 接口 | 文件属性 | 数据库中的项目文件记录结构 |
| SmartNotesV1_1 | 接口 | 摘要属性 | Smart Notes 生成结果的数据结构 |
| ProjectFileStatus | 联合类型 | 无 | 文件处理状态枚举 |

### src/main/services/agent-runner.ts
AI Agent 运行器，负责执行智能摘要生成任务。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| AgentRunInput<T> | 接口 | system, messages, schema, modelId? | Agent 运行输入接口 |
| AgentRunResult<T> | 接口 | object | Agent 运行结果接口 |
| resolveModel | 函数 | modelId? | 解析模型配置，支持多层优先级 |
| runAgent | 函数 | input | 执行 AI Agent 任务，支持结构化输出 |
| extractAndParseJson | 函数 | s | 从模型响应中提取和解析 JSON |

说明：提供统一的 AI Agent 执行框架，支持模型解析、结构化输出验证和错误处理。使用 AI SDK 进行模型调用，支持 OpenAI 兼容接口。

### src/main/services/agents/smart-notes-agent.ts
Smart Notes AI Agent 实现，使用 AI SDK 生成文件摘要。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| generateSmartNotes | 函数 | content, prev? | 生成文件的结构化摘要信息 |

### src/main/services/project-file-service.ts
项目文件的核心业务逻辑服务。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| uploadProjectFiles | 函数 | input | 上传和处理项目文件，支持批量上传 |
| regenerateSmartNotes | 函数 | id | 重新生成指定文件的 Smart Notes |
| deleteProjectFileDeep | 函数 | id | 深度删除项目文件，包括物理文件和数据库记录 |

### src/main/ipc/project-file.ts
项目文件 IPC 处理器。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| registerProjectFileIPCHandlers | 函数 | 无 | 注册所有项目文件相关的 IPC 处理器 |

### src/renderer/stores/project-file-store.ts
项目文件状态管理 Zustand store。

| 导出项 | 类型 | 参数 | 描述 |
|--------|------|------|------|
| useProjectFileStore | Hook | 无 | 项目文件状态管理的 Zustand Hook |

说明：管理项目文件的客户端状态，包括文件列表、上传、更新和删除操作。通过事件监听器实现实时状态同步。

### src/renderer/components/features/project-files/ProjectFileModal.tsx
项目文件详情和编辑模态框组件。

| 文件 | 描述 |
|---|---|
| ProjectFileModal | 显示项目文件内容、Smart Notes 和编辑功能的模态框组件 |

### src/renderer/components/features/project-files/ProjectFilesGrid.tsx
项目文件网格显示组件。

| 文件 | 描述 |
|---|---|
| ProjectFilesGrid | 以网格形式显示项目文件的组件，支持状态指示和操作 |

## 架构要点

1. **三层架构**: 主进程、渲染进程和共享代码的严格分离。
2. **类型安全的 IPC**: 所有通信使用强类型接口和 `handleIPCCall` 包装器。
3. **简化数据库架构**: 移除早期 FTS/Search 和文件向量化功能，采用流线化方案。
4. **智能模型解析**: 3 层优先级系统（显式 → 对话 → 用户默认 → 系统默认）。
5. **批量流式传输**: 内部批量发射器减少 IPC 压力，合并文本和推理分片。
6. **幂等标题生成**: 一次性、自动的对话标题生成策略。
7. **统一 AI 适配器**: 支持官方和 OpenAI 兼容提供商，包含重试机制。
8. **取消令牌系统**: 基于 ID 的取消管理，支持长时间运行操作。
9. **通知预设系统**: 15 个预定义通知配置，覆盖常见使用场景。
10. **主题同步**: OS 主题自动同步，支持暗色/亮色模式切换。
11. **模块化状态管理**: 对话存储拆分为多个职责单一的文件。
12. **综合文件处理**: 多格式解析器工厂，包含编码检测和验证管道。

此文档涵盖了 Knowlex 应用程序的完整源代码架构，展示了现代 Electron + React 应用程序的流线化设计、智能模型集成和用户体验优化模式。
