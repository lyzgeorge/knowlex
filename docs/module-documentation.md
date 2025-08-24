# 模块文档（概要）

说明：对 src/ 下业务模块进行一行总结 + 表格列出函数/参数 + 最简逻辑描述。下面按文件分组。

---

## src/main/services/file-temp.ts
路径：src/main/services/file-temp.ts

一句话：临时文件处理服务，验证、解析上传的临时文件并返回可用于会话的文本结果。


| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| processTemporaryFileContents | files: Array<{name, content, size}> | TemporaryFileResult[]；验证并处理基于内容的文件（浏览器 File API），支持 base64 二进制与文本数据 |
| processTemporaryFiles | filePaths: string[] | TemporaryFileResult[]；基于文件路径处理临时文件，包含图片直接转 data URL 的快速路径 |
| extractTextContent | filePath: string, filename: string | Promise<string>；从文件中提取文本内容，使用 file-parser 工厂 |
| validateTemporaryFileConstraints | files: {name:string,size:number}[] | {valid:boolean, errors:string[]}；校验临时文件约束（数量/单文件/总大小/扩展名） |
| cleanupTemporaryFiles | filePaths: string[] | Promise<void>；尝试删除临时文件 |

模块逻辑：先做统一校验（数量/总大小/每文件大小/扩展名），对图片返回 base64 data URL（无需文本解析），对二进制文档（PDF/Office）将上传的 base64 写入临时文件并用 parser 提取文本；文本文件直接返回清理后的文本；错误会以 result.error 字段逐文件返回，整体验证失败（如超出总大小）会为全部文件返回错误。

---

## src/main/services/file-parser.ts
路径：src/main/services/file-parser.ts

一句话：通用文件解析器，实现多种类型（纯文本、PDF、Office）解析并提供工厂函数。

| 类型 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| class FileParser (22) | constructor(filePath, filename) | 抽象基类，定义 parse() / canParse() / getFileStats() |
| class PlainTextParser (62) | 继承 FileParser | 解析多种文本/代码文件，尝试多种编码，清理控制字符 |
| class PDFParser (148) | 继承 FileParser | 使用 pdf-parse 解析 PDF，返回 text 和 metadata |
| class OfficeParser (208) | 继承 FileParser | 使用 officeparser 解析 Office/ODF 文档 |
| FileParserFactory.createParser (267) | filePath, filename | 返回合适的 parser 实例或 null |
| FileParserFactory.getSupportedExtensions (281) | - | string[]；返回支持的扩展名列表 |
| FileParserFactory.isSupported (299) | filename | boolean；是否支持该文件 |
| FileParserFactory.isBinary (309) | filename | boolean；判断是否为需用 buffer 解析的二进制类型 |
| parseFile (325) | filePath, filename | Promise<FileParserResult>；高层封装，选择解析器并执行 parse()

模块逻辑：按扩展名选择解析器；PlainText 直接读文件并清理；PDF/Office 用对应库解析并返回内容+metadata；工厂集中管理支持列表。

---

## src/main/services/conversation.ts
路径：src/main/services/conversation.ts

一句话：会话管理服务，提供会话的 CRUD、分页和基于内容的标题生成入口。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| createConversation (31) | data: {title?, settings?} | Promise<Conversation>；创建并写入 DB |
| getConversation (67) | id: string | Promise<Conversation|null>；按 id 获取 |
| listConversations (87) | - | Promise<Conversation[]>；列出所有 |
| listConversationsPaginated (103) | limit:number, offset:number | Promise<{conversations, hasMore}>；分页列表 |
| updateConversation (130) | id:string, data:{title?,settings?} | Promise<Conversation>；校验并更新 |
| deleteConversation (192) | id:string | Promise<void>；删除会话及其消息（DB 级联） |
| generateConversationTitle (220) | id:string | Promise<string>；调用 title-generation 生成标题 |

模块逻辑：封装对数据库 queries 的业务校验层（长度、存在性等），并在适当时机触发标题生成服务。

---

## src/main/services/message.ts
路径：src/main/services/message.ts

一句话：消息管理服务，支持多部分内容、临时文件转消息、引用添加与工具型内容校验。


| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| addMessage | data: CreateMessageData | Promise<Message>；校验并写入消息（支持多种 content part 类型，包括 text/image/temporary-file/citation/tool-call） |
| getMessage | id:string | Promise<Message|null>；按 id 获取 |
| getMessages | conversationId:string | Promise<Message[]>；获取会话所有消息 |
| updateMessage | id:string, data:UpdateMessageData | Promise<Message>；校验并更新消息（content 与 reasoning） |
| deleteMessage | id:string | Promise<void>；删除消息 |
| addTextMessage | conversationId, role, text, parentMessageId? | Promise<Message>；便捷创建文本消息 |
| addMultiPartMessage | conversationId, role, parts[], parentMessageId? | Promise<Message>；便捷创建多段消息 |
| addCitationToMessage | messageId, filename, fileId, content, similarity, pageNumber? | Promise<Message>；在消息尾追加引用部分 |
| extractTextContent | message:Message | string；合并所有文本段落 |
| extractCitations | message:Message | any[]；提取所有引用部分 |
| getContentStats | message:Message | object；统计各类型段落数量 |
| convertTemporaryFilesToMessageParts | TemporaryFileResult[] | MessageContentPart[]；把临时文件结果转换为消息段（错误文件会转换为 text 部分） |
| addMessageWithTemporaryFiles | conversationId, role, textContent, temporaryFileResults[], parentMessageId? | Promise<Message>；合成文本+临时文件创建消息，支持将图片作为 image part 插入 |

模块逻辑：严格校验消息内容结构与各类型字段（text/citation/tool-call/temporary-file/image），要求至少有一个有意义的 content part；提供 CRUD 与便捷构造函数，并把临时文件结果统一转换为 message content（有错误的文件会作为文本错误片段插入）。

---

## src/main/services/title-generation.ts
路径：src/main/services/title-generation.ts

一句话：会话标题生成逻辑，判断触发条件并调用 AI 服务生成简短标题。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| shouldTriggerAutoGeneration (15) | messages: Message[] | boolean；是否为仅一轮问答（1 user + 1 assistant） |
| generateTitleForConversation (43) | conversationId: string | Promise<string>；收集首轮问答并调用 AI 生成标题 |

模块逻辑：检测是否仅有首轮问答，若满足并且 AI 配置有效则拼装 prompt 调用 openai-adapter 获取简短标题，失败则返回`New Chat`。

---

## src/main/services/assistant-service.ts
路径：src/main/services/assistant-service.ts

一句话：AI 辅助消息生成与流式处理核心，管理流式事件、取消、持久化与自动标题触发。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| streamAssistantReply (52) | config: AssistantGenConfig (messageId, conversationId, contextMessages, onSuccess?, onError?) | Promise<void>；启动后台流式生成并通过 IPC 发送事件 |
| generateReplyForNewMessage (317) | messageId:string, conversationId:string | Promise<void>；为新用户消息生成回复并尝试触发标题生成 |
| regenerateReply (343) | messageId:string | Promise<void>；重生某条 assistant 消息的回复（仅 assistant 类型） |

模块逻辑：为流式 AI 响应建立取消 token，实时发送 TEXT/REASONING chunk 事件，按取消或完成写入 DB 并触发相应 IPC 事件，出错时保证安全回退并调用回调。

（注意：IPC 层已添加对 message:send / message:stop / message:regenerate 的支持，assistant-service 协作以在流开始时创建用户/assistant 占位消息并使用 CancellationManager 注册 token。）

---

（已处理模块：main/services 下 6 个服务模块；下面继续追加 main/database、main/ipc、main/utils、renderer/store、shared/utils 等模块。）

---

## src/main/database/index.ts
路径：src/main/database/index.ts

一句话：数据库连接与事务管理，基于 libsql 的文件存储 client 管理与辅助抽象。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| getDB (48) | - | Promise<Client>；初始化并返回 libsql client，确保数据库文件路径存在 |
| closeDB (79) | - | Promise<void>；关闭连接并清理全局状态 |
| executeQuery (97) | sql: string, params?: InArgs | Promise<{rows, rowsAffected}>；统一查询封装与错误处理 |
| executeTransaction (125) | queries: Array<{sql, params?}> | Promise<void>；在事务中顺序执行多条 SQL，失败则回滚 |
| isDatabaseReady (162) | - | boolean；检查连接是否已建立 |
| getCurrentDatabasePath (169) | - | string|null；返回当前数据库文件路径 |

模块逻辑：按环境选择数据库文件路径，懒初始化 libsql client，提供查询与事务抽象并通过错误包装提供一致接口。

---

## src/main/database/queries.ts
路径：src/main/database/queries.ts

一句话：数据库 CRUD 查询集合，使用通用 Entity 工具简化 conversations/messages 的数据库操作并提供全文检索 API。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| createConversation (32) | conversation | Promise<void>；写入 conversationEntity |
| getConversation (38) | id:string | Promise<Conversation|null> |
| listConversations (42) | limit?:number, offset?:number | Promise<Conversation[]> |
| updateConversation (64) | id:string, updates:Partial | Promise<void> |
| deleteConversation (71) | id:string | Promise<void> |
| createMessage (80) | message | Promise<void> |
| getMessage (86) | id:string | Promise<Message|null> |
| listMessages (90) | conversationId:string | Promise<Message[]> |
| updateMessage (98) | id:string, content:MessageContent, reasoning?:string | Promise<void> |
| deleteMessage (110) | id:string | Promise<void> |
| searchMessages (125) | query:string, limit?:number | Promise<SearchResultRow[]>；使用 messages_fts 进行 FTS 查询 |

模块逻辑：使用 conversationEntity/messageEntity 的通用 CRUD；为 FTS 提供自定义 SQL 查询并映射结果。

---

## src/main/database/schemas.ts
路径：src/main/database/schemas.ts

一句话：定义 conversation/message 的数据库模式映射与预配置实体实例。

| 导出 | 说明 |
|---|---|
| conversationSchema (13) | Conversation 到表字段映射，含 JSON 字段配置 |
| messageSchema (36) | Message 到表字段映射，content/reasoning 为 JSON 可更新字段 |
| conversationEntity / messageEntity (67) | DatabaseEntity 实例，用于 CRUD 操作 |

模块逻辑：以 schema 描述表结构和字段映射，创建 DatabaseEntity 实例供上层 queries 使用。

---

## src/main/database/entity.ts
路径：src/main/database/entity.ts

一句话：通用实体层，提供 create/get/list/update/delete 和行到实体映射逻辑。

| 类 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| DatabaseEntity.create (52) | data (omit timestamps) | Promise<void>；构建 INSERT SQL 并序列化 JSON 字段 |
| DatabaseEntity.get (86) | id:string | Promise<T|null>；SELECT 并映射行到实体 |
| DatabaseEntity.list (102) | options? | Promise<T[]>；支持 where/order/limit/offset |
| DatabaseEntity.update (142) | id:string, updates:Partial | Promise<void>；动态构建 SET 子句并更新 updated_at |
| DatabaseEntity.delete (184) | id:string | Promise<void>；DELETE 语句 |
| DatabaseEntity.executeCustomQuery (214) | sql, params? | Promise<T[]>；执行自定义查询并映射结果 |
| createFieldMapping (225) | property, column?, options? | FieldMapping；创建字段映射元数据 |
| toSnakeCase (246) | camelCase:string | string；驼峰转蛇形工具 |

模块逻辑：对 EntitySchema 做泛型 CRUD，自动处理 JSON 序列化、时间戳和字段可更新性，减小重复 SQL 代码。

---

## src/main/migrations.ts
路径：src/main/database/migrations.ts

一句话：数据库迁移管理，定义版本化迁移语句并按需应用或回滚。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| getCurrentVersion (317) | - | Promise<number>；读取 schema_version 最大版本 |
| runMigrations (362) | - | Promise<void>；应用所有待处理迁移至最新版本 |
| rollbackToVersion (404) | targetVersion:number | Promise<void>；按版本回滚（开发用） |
| getMigrationHistory (449) | - | Promise<Array<{version, appliedAt}>> |

模块逻辑：维护 migrations 列表（包含 SQL up/down），通过 executeTransaction 原子应用并记录版本，支持回滚与历史查询。

---

## src/main/main.ts
路径：src/main/main.ts

一句话：应用入口，初始化数据库、注册 IPC、创建窗口并管理生命周期与清理。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| Application class (17) | - | 管理窗口、初始化流程、IPC 注册 |
| application export (129) | - | 全局 Application 实例 |

模块逻辑：在 app ready 时运行 initialize（migrations、IPC 注册、菜单、窗口），响应 before-quit 做清理（取消 IPC，关闭 DB）。

---

## src/main/ipc/conversation.ts
路径：src/main/ipc/conversation.ts

一句话：会话/消息相关 IPC 层，验证请求并调用 services，提供事件广播给 renderer。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| registerConversationIPCHandlers (96) | - | 注册多个 ipcMain.handle 处理会话与消息操作 |
| unregisterConversationIPCHandlers (743) | - | 移除相关频道监听器 |
| sendConversationEvent (786) | eventType:string, data:unknown | void；向所有窗口广播 conversation:* 事件 |
| sendMessageEvent (801) | eventType:string, data:unknown | void；向所有窗口广播 message:* 事件 |
| CONVERSATION_EVENTS / MESSAGE_EVENTS (815/826) | - | 常量枚举事件键名 |

模块逻辑：对外提供受保护的 IPC 通道，使用 common.js 的校验与 handleIPCCall 统一响应，事件通过 BrowserWindow 广播。

---

## src/main/ipc/file.ts
路径：src/main/ipc/file.ts

一句话：文件相关 IPC，仅处理临时文件（路径或内容），委派给 file-temp 服务。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| registerFileIPCHandlers (60) | - | 注册 'file:process-temp' 和 'file:process-temp-content' 处理器 |
| unregisterFileIPCHandlers (141) | - | 移除关联频道监听器 |

模块逻辑：对传入参数进行结构校验，然后调用相应的 service（processTemporaryFiles / processTemporaryFileContents）并返回结果。

---

## src/main/ipc/settings.ts
路径：src/main/ipc/settings.ts

一句话：设置 IPC，读取 settingsService 并返回给 renderer（目前只读）。

| 导出 | 说明 |
|---|---|
| registerSettingsIPCHandlers (10) | 注册 'settings:get' 和 'settings:update'（只回显） |
| unregisterSettingsIPCHandlers (52) | 注销 handlers |

模块逻辑：暴露设置读取接口，update 当前为占位打印并返回当前设置。

---

## src/main/services/settings.ts
路径：src/main/services/settings.ts

一句话：应用配置服务，加载 app.env，构建并缓存运行时设置（API 提供者配置等）。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| settingsService (181) | - | 单例 SettingsService，用于获取/更新/重载设置 |
| SettingsService.getSettings (82) | - | AppSettings；从环境变量构建配置并缓存 |
| getProviderConfig (119) | provider:string | APIProviderConfig|null |
| isProviderConfigured (136) | provider:string | boolean |
| updateProviderConfig (154) | provider:string, config:Partial<APIProviderConfig> | void |
| reload (173) | - | void；从环境重载设置

模块逻辑：读取 app.env（若存在）设置 process.env，提供读取与轻量更新运行时配置的 API。

---

## src/main/database/migrations.ts
路径：src/main/database/migrations.ts

（已在上文合并）

---

## src/main/window.ts
路径：src/main/window.ts

一句话：窗口管理，创建主/调试窗口，设置安全 webPreferences，并管理窗口事件与主题适配。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| createMainWindow (37) | - | Promise<BrowserWindow>；构建并加载主窗口 |
| createDebugWindow (92) | - | Promise<BrowserWindow>；构建并加载调试窗口（dev only） |
| WindowManager class (193) | - | 窗口工具方法：minimize/maximize/toggleFullscreen 等 |

模块逻辑：集中窗口创建与行为（防止外部打开新窗口、外链安全处理、主题同步）。

---

## src/main/ipc/common.ts
路径：src/main/ipc/common.ts

一句话：IPC 公共工具：请求验证、统一错误响应与常用校验模式。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| handleIPCCall (12) | operation:()=>Promise<T> | Promise<IPCResult<T>>；统一 try/catch 返回 success/error |
| validateId / requireValidId (31/38) | id:unknown | boolean / string；ID 校验辅助 |
| validateRequest (48) | data, validator, errorMessage? | T；应用类型守卫并在失败时抛错 |
| validateObject / validateStringProperty / validateArrayProperty | - | 基本结构校验工具 |
| ValidationPatterns (99) | - | 预定义校验模式（conversationId,messageId,messageRole,messageContent） |

模块逻辑：为所有 IPC 提供一致的入参校验和错误封装，减少重复代码。

---

## src/main/services/openai-adapter.ts
路径：src/main/services/openai-adapter.ts

一句话：AI 适配层，封装生成与流式生成逻辑，处理配置、消息转换与错误增强。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| getOpenAIConfigFromEnv (35) | - | OpenAIConfig；从 env 构建配置 |
| validateOpenAIConfig (70) | config? | {isValid, error?} |
| generateAIResponseOnce (171) | conversationMessages:Message[] | Promise<{content, reasoning?}> |
| streamAIResponse (240) | conversationMessages, callbacks, cancellationToken? | Promise<{content, reasoning?}> |
| testOpenAIConfig (430) | config? | Promise<{success, error?, model?}> |

模块逻辑：将应用消息转换为 AI SDK 格式，创建模型实例（兼容自定义 baseURL），并支持流式 fullStream 处理及 cancellation。错误消息被增强以便用户理解。

---

## src/main/utils/cancellation.ts
路径：src/main/utils/cancellation.ts

一句话：取消令牌与管理器，支持创建/注册/取消/完成长跑任务的 token。

| 导出 / 类 | 方法 | 说明 |
|---|---|---|
| CancellationToken | isCancelled, cancel(), onCancel(), throwIfCancelled() | 基本 token 功能 |
| CancellationManager | createToken(), cancel(), registerToken(), complete(), getToken(), cancelAll(), activeCount | 管理多个 token 的生命周期 |

模块逻辑：为流式 AI 与异步任务提供集中取消管理，确保在替换 token 时自动取消旧任务。

---

## src/renderer/src/stores/conversation.ts
路径：src/renderer/src/stores/conversation.ts

一句话：前端会话状态管理（Zustand），包含消息索引、事件处理、网络调用封装及流式更新逻辑。

| 导出 / 钩子 | 说明 |
|---|---|
| useConversationStore (default) | 完整 store，含创建/删除/发送/加载消息等方法 |
| useCurrentConversation / useConversations / useSendMessage / useStopStreaming ... | 常用选择器与钩子，供 UI 使用 |

模块逻辑：维护 conversations 与 messages 的本地副本，使用 _msgIndex 提供 O(1) 查找，订阅 main 通过 window.knowlex 发送的事件以保持同步，并封装对 IPC 的调用与状态处理。

---

## src/shared/utils/id.ts
路径：src/shared/utils/id.ts

一句话：随机 ID/UUID 生成工具。

| 导出函数 | 返回 |
|---|---|
| generateId | 32 hex 字节随机 ID |
| generateShortId | 12 hex 字节随机 ID |
| generateUUID | 随机 UUID v4 样式字符串 |

模块逻辑：封装随机 ID 生成，用于 DB 主键与临时标识。

---

继续处理 renderer 与 shared 文件，以下为追加内容：

---

## src/shared/constants/app.ts
路径：src/shared/constants/app.ts

一句话：应用级常量（名称、版本、窗口与数据库配置、开发标志）。

| 导出 | 说明 |
|---|---|
| APP_NAME / APP_VERSION / APP_DESCRIPTION | 应用基本信息 |
| WINDOW_CONFIG | 主/调试窗口尺寸常量 |
| DATABASE_CONFIG | DB 文件名与连接配置 |
| DEVELOPMENT | 环境判断标志 |

模块逻辑：集中定义全局常量，供主/渲染进程引用。

---

## src/renderer/src/App.tsx
路径：src/renderer/src/App.tsx

一句话：React 顶层组件，负责应用初始化、加载/错误显示与主界面挂载。

| 组件 / 函数 | 说明 |
|---|---|
| App | 顶层组件：初始化 store 并渲染 MainApp |
| useAppInitialization | 初始化 hook：调用 initializeStores 并管理加载/错误状态 |
| LoadingFallback / InitializationError | 加载与错误 UI 备用组件 |

模块逻辑：在挂载时初始化前端 stores（包括与主进程的 IPC 检查），呈现加载/错误或主界面。

---

## src/renderer/src/stores/index.ts
路径：src/renderer/src/stores/index.ts

一句话：前端 stores 集中导出与初始化入口，协调 settings/conversation/app stores 的初始化顺序。

| 导出 | 说明 |
|---|---|
| initializeStores | 初始化 theme、settings 与 conversation store 并设置应用已就绪 |
| resetAllStores | 重置本地 stores（不包含 settings） |

模块逻辑：封装 stores 的初始化流程以防 React.StrictMode 重复执行；负责按需预加载消息与设置。

---

## src/renderer/src/pages/ConversationPage.tsx
路径：src/renderer/src/pages/ConversationPage.tsx

一句话：会话级页面，负责显示单个会话的消息流、分支视图与消息输入区域。

| 组件 / 导出 | 说明 |
|---|---|
| ConversationPage | 页面组件：展示会话头部、消息流（含分支/树状视图）并在底部挂载 `ChatInputBox` 或其变体 |

模块逻辑：从 conversation store 加载当前会话消息，支持分支（branching）视图由 `useMessageBranching` 管理；消息列表使用自动滚动策略并在流式生成时允许用户选择是否跟随流；提供分支切换与快捷操作（新建分支、合并、删除分支）。

---

## src/renderer/src/pages/MainPage.tsx
路径：src/renderer/src/pages/MainPage.tsx

一句话：应用主界面入口页，组织侧栏、会话汇总与活动页面（ConversationPage / other pages）。

| 组件 / 导出 | 说明 |
|---|---|
| MainPage | 顶级页面容器：组合侧栏（会话列表）、主内容区（会话/概览页面）与全局工具栏 |

模块逻辑：负责路由到正确的页面（比如 `ConversationPage`）、管理全局快捷操作（新会话、搜索）并协调 stores 的初始化与加载状态。

已追加 renderer 的核心聊天页面：ConversationPage、MainPage、以及 AssistantMessage 组件仍用于消息渲染。

<!-- MessageList was refactored into page-level rendering inside ConversationPage; per recent commits the dedicated MessageList component was removed. Message rendering is handled by AssistantMessage/UserMessage and ConversationPage. -->

---

---

## src/renderer/src/components/ui/AssistantMessage.tsx
路径：src/renderer/src/components/ui/AssistantMessage.tsx

一句话：Assistant 消息 UI，显示 avatar、reasoning 区块、流式指示与操作图标。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| AssistantMessage | props: {message:Message, isStreaming?:boolean, showAvatar?:boolean, showTimestamp?:boolean} | 渲染助理消息包含推理区块与内容渲染器 |

模块逻辑：结合 store 的流式标志（文本/推理）显示实时指示，使用 MessageContentRenderer 渲染多类型内容并在 hover 时显示 MessageActionIcons。

---

已追加 MessageContentRenderer 与 ChatInputBox。

---

## src/renderer/src/components/ui/MessageContentRenderer.tsx
路径：src/renderer/src/components/ui/MessageContentRenderer.tsx

一句话：统一消息内容渲染器，支持 text / temporary-file / image 等类型，使用 ReactMarkdown 渲染 Markdown 并显示流式光标。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| MessageContentRenderer | props: {content:MessageContent, variant:'user'|'assistant', isStreaming?:boolean, showCursor?:boolean, isReasoningStreaming?:boolean} | 渲染各类型内容：text/image/temporary-file/citation 等。对于 `user` variant，文件/图片优先渲染为 `TempFileCard`（compact）；对于 `assistant` variant，文件内容以内联摘录方式展示；支持在流式文本末尾显示光标并在推理流时隐藏该光标。 |

模块逻辑：根据 content part 的类型渲染不同 UI：文本使用 `ReactMarkdown`（含语法高亮），图片在用户消息显示为 `TempFileCard`（估算大小），临时文件在用户端显示为卡片，在助理端以内联块展示文件摘录（只显示前 N 字符）。流式场景下最后一个文本片段会显示闪烁光标，若 `isReasoningStreaming` 为 true 则隐藏文本光标以突出推理流。

---

## src/renderer/src/components/features/chat/ChatInputBox.tsx
路径：src/renderer/src/components/features/chat/ChatInputBox.tsx

一句话：聊天输入组件，支持文本输入、文件上传（拖拽/选择）、自动扩展与发送/停止流式操作。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| ChatInputBox | props: ChatInputBoxProps (variant, disabled, placeholder, showFileAttachment, onSendMessage) | 处理本地输入/文件，支持两种变体（main-entrance / conversation），使用 `useFileUpload` 自动处理临时文件并调用 store 的 sendMessage 或自定义 handler |

模块逻辑：管理输入状态、自动高度、节流/去重的文件上传（防止 100ms 重复触发）、文件预览与批量处理。发送流程时先把文件交给 `useFileUpload` 处理（二进制文件会被 base64 编码并由主进程解析），将处理结果映射为 message content parts：图片作为 `image` part，其他文件作为 `temporary-file` part；支持在发送中通过 Stop 按钮取消流式生成（调用 `message:stop`），并在失败时恢复原始输入与文件队列以便重试。

---

继续：将遍历并追加 renderer 的其他 UI（UserMessage、TempFileCard、MessageActionIcons 等）、hooks、stores（app/settings）以及 shared 的剩余工具与类型文件。

---

## src/shared/utils/time.ts
路径：src/shared/utils/time.ts

一句话：时间相关辅助函数（格式化、相对时间、时间戳转换）。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| formatTimestamp | timestamp: number, options? | string；友好格式化时间戳 |
| relativeTime | timestamp: number | string；返回相对时间（如 "2分钟前"） |
| now | - | number；当前 unix ms |

模块逻辑：封装常用时间/日期转换与展示逻辑，供界面和后端日志统一使用，处理本地化与零值。

---

## src/shared/utils/validation.ts
路径：src/shared/utils/validation.ts

一句话：通用输入/数据校验与文件相关工具（类型守卫、文件扩展名与大小校验）。

| 函数 / 导出 | 参数 | 返回 / 说明 |
|---|---:|---|
| isNonEmptyString | v: unknown | boolean；判断非空字符串 |
| isArrayOf | (v: unknown, predicate: (x:any)=>boolean) | boolean；判断数组且元素满足 predicate |
| validateEmail | v: string | boolean；简单 email 模式校验 |
| getFileExtension | filename:string | string；提取扩展名 |
| isImageFile | filenameOrMime:string | boolean；基于扩展名或 mime 判断是否为图片 |
| formatBytes | bytes:number | string；友好字节单位格式化 |

模块逻辑：除了通用的守卫与校验函数外，新增文件工具用于客户端/服务端一致的文件类型判断与大小显示（被 useFileUpload、file-temp 与文件解析流程复用）。

---

## src/shared/constants/ai.ts
路径：src/shared/constants/ai.ts

一句话：AI 相关常量（默认模型、系统 prompt 片段、超时/重试策略）。

| 导出 | 说明 |
|---|---|
| DEFAULT_MODEL | 默认模型标识 |
| SYSTEM_PROMPTS | object；预置系统级提示模板 |
| AI_TIMEOUT_MS | number；AI 请求默认超时 |

模块逻辑：集中配置 AI 层的默认值，方便 openai-adapter 与 title-generation 等模块引用。

---

## src/shared/constants/file.ts
路径：src/shared/constants/file.ts

一句话：文件处理相关常量（客户端/服务端约束、支持的扩展与 MIME 映射、分片常量）。

| 导出 | 说明 |
|---|---|
| FILE_CONSTRAINTS | object；包含 maxFiles, maxFileBytes, maxTotalBytes 等约束 |
| SUPPORTED_FILE_TYPES | Record<string,string[]>；按类别列出允许的扩展名 |
| MIME_TYPES | Record<string,string>；扩展名到 mime-type 的映射 |
| CHUNK_SIZE / CHUNK_OVERLAP | number；用于向量化时的分片大小/重叠设置 |

模块逻辑：集中定义客户端与主进程共享的文件策略（例如大小限制、允许的扩展名与 MIME 推断），并为解析/向量化流程提供分片常量。

---

## src/shared/types/ai.ts
路径：src/shared/types/ai.ts

一句话：定义与 AI 交互有关的 TypeScript 类型（请求/响应/配置）。

| 导出 / 类型 | 说明 |
|---|---|
| OpenAIConfig | 包含 apiKey, baseURL, model 等字段 |
| AIResponseChunk | 流式响应的分片类型（text, reason, done） |
| AssistantGenConfig | 生成配置（messageId, conversationId, callbacks） |

模块逻辑：集中声明 AI 层输入/输出数据结构，供 adapter 与服务层共享编译时契约。

---

## src/shared/types/message.ts
路径：src/shared/types/message.ts

一句话：消息与消息内容段落的类型定义（便于前后端一致）。

| 导出 / 类型 | 说明 |
|---|---|
| Message | 核心消息实体类型（id, conversationId, role, content[], createdAt） |
| MessageContentPart | 单条内容段落类型（支持 text / temporary-file / citation / tool-call / image） |
| CreateMessageData / UpdateMessageData | 用于创建/更新 API 使用的窄类型 |

模块逻辑：为数据库层、IPC 与渲染层提供一致的消息数据结构定义。注意新增的 `image` 内容类型用来表示内联图片或 data-url（字段形如 {type:'image', image:string, mediaType?:string}），并在前端渲染与发送流程中被优先处理为图片显示。

---

## src/shared/types/file.ts
路径：src/shared/types/file.ts

一句话：文件相关的数据类型（临时文件结果、解析结果、元数据）。

| 导出 / 类型 | 说明 |
|---|---|
| TemporaryFileResult | {fileId, filename, content, size, mime, pages?} |
| FileParserResult | {text, metadata?}；解析器返回结构 |

模块逻辑：描述文件从上传到解析的生命周期数据结构，统一 service 与 IPC 的契约。

---

## src/shared/types/notification.ts
路径：src/shared/types/notification.ts

一句话：前端通知/警告消息类型定义（level、message、id）。

| 导出 / 类型 | 说明 |
|---|---|
| Notification | {id, level:'info'|'error'|'success', title?, message} |
| NotificationOptions | 展示时长、可否关闭等选项 |

模块逻辑：统一通知系统的数据结构，供 renderer 的 notifications hook 与组件使用。

---

## src/renderer/src/hooks/useAutoScroll.ts
路径：src/renderer/src/hooks/useAutoScroll.ts

一句话：自动滚动与锚点管理的 React Hook，用于消息列表，支持在流式生成时选择是否跟随。

| 导出 | 参数 | 返回 |
|---|---:|---|
| useAutoScroll | options?: {threshold?:number,smooth?:boolean,follow?:boolean} | {scrollRef, anchorRef, forceScrollToBottom, isAtBottom}；管理滚动容器 ref、锚点与强制滚动 |

模块逻辑：监控消息列表变化并在合适时刻平滑滚动到底部。Hook 提供 `follow` 控制（当流式生成时组件会传入 follow:false 以避免自动跟随），并暴露 `forceScrollToBottom()` 以便在用户主动发送消息时强制滚动。还提供 `isAtBottom` 帮助决定是否显示“回到底部”按钮。

---

## src/renderer/src/hooks/useFileUpload.ts
路径：src/renderer/src/hooks/useFileUpload.ts

一句话：处理前端文件选择/拖拽、客户端校验并调用主进程临时文件处理 IPC 的 hook。

| 导出 | 参数 | 返回 |
|---|---:|---|
| useFileUpload | options?: {maxFiles?:number, maxTotalBytes?:number} | {addFiles(files), isUploading, progress, queuedFiles} |

模块逻辑：在客户端先执行去重与本地约束验证（最大文件数、单文件与总大小限制），对二进制文件将其 base64 编码后通过 IPC `file.processTempContent` 发送给主进程进行解析。Hook 返回 `TemporaryFileResult[]`（每项包含 filename, content/text, size, mime, isImage?）并在结果里标注 `isImage` 以便上层将图片转换为 `image` 内容片段，其他文件转换为 `temporary-file` 片段。为避免重复触发，上传入口有短时 (100ms) 去重/节流保护。

---

## src/renderer/src/hooks/useNotifications.ts
路径：src/renderer/src/hooks/useNotifications.ts

一句话：应用内通知管理 hook（队列、显示/移除）。

| 导出 | 参数 | 返回 |
|---|---:|---|
| useNotifications | - | {pushNotification, removeNotification, notifications[]} |

模块逻辑：管理通知队列并触发 UI 组件展示，支持不同级别与超时自动清理。

---

## src/renderer/src/components/ui/UserMessage.tsx
路径：src/renderer/src/components/ui/UserMessage.tsx

一句话：渲染用户消息的 UI 组件（气泡、时间、文件附件预览）。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| UserMessage | props: {message, showTimestamp?, className?} | 渲染用户角色的消息及其内容段落 |

模块逻辑：渲染用户消息气泡，优先展示文本并附带 TempFileCard 预览，支持简短动作（编辑/删除）。

---

## src/renderer/src/components/ui/ReasoningBox.tsx
路径：src/renderer/src/components/ui/ReasoningBox.tsx

一句话：显示 AI 推理/中间思路的可折叠 UI 区块。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| ReasoningBox | props: {reasoning, isStreaming?} | 显示推理文本，支持折叠与流式高亮 |

模块逻辑：用于展示 assistant 消息的 reasoning 段，独立于主文本，流式时给予视觉提示并可复制。

---

## src/renderer/src/components/ui/Input.tsx
路径：src/renderer/src/components/ui/Input.tsx

一句话：通用受控输入组件（文本域/单行）带样式与状态钩子。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| Input | props: {value,onChange,placeholder,multiline?,disabled?} | 可复用的输入控件 |

模块逻辑：封装样式、自动高度、键盘行为和无障碍属性，被 ChatInputBox 等复用。

---

## src/renderer/src/components/ui/Modal.tsx
路径：src/renderer/src/components/ui/Modal.tsx

一句话：通用模态对话框组件（标题、内容、底部按钮）。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| Modal | props: {open,onClose,title,footer,children} | 管理对话框可见性与焦点环回 |

模块逻辑：提供可访问的模态行为（ESC 关闭、焦点管理），用于消息编辑、确认删除等场景。

---

## src/renderer/src/components/ui/Button.tsx
路径：src/renderer/src/components/ui/Button.tsx

一句话：样式化按钮组件，支持不同变体与图标。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| Button | props: {variant:'primary'|'ghost',onClick,disabled,icon?} | 标准按钮样式与交互 |

模块逻辑：封装统一按钮样式与可访问行为，供全局 UI 复用。

---

## src/renderer/src/components/ui/Notification.tsx
路径：src/renderer/src/components/ui/Notification.tsx

一句话：单个通知展示组件（可自动消失、关闭按钮）。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| Notification | props: {notification, onClose} | 渲染通知内容并处理关闭/计时 |

模块逻辑：与 useNotifications 协作渲染通知队列，支持动作按钮与不同等级的视觉样式。

---

## src/renderer/src/components/ui/index.ts
路径：src/renderer/src/components/ui/index.ts

一句话：UI 组件的集中导出文件，便于按需导入。

| 导出 | 说明 |
|---|---|
| Button, Input, Modal, Notification, ... | 汇总并重导出 UI 组件 |

模块逻辑：为渲染层提供单一入口，简化 import 路径并便于未来替换实现。

---

## src/renderer/src/components/ui/TempFileCard.tsx
路径：src/renderer/src/components/ui/TempFileCard.tsx

一句话：在消息或 UI 中展示临时文件的卡片（文件名 / 大小 / 操作），图片使用简洁预览或 data-url 显示。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| TempFileCard | props: {file, variant?:'compact'|'default', onOpen?, onRemove?} | 显示文件基本信息与操作 |

模块逻辑：显示文件名、估算大小和简短元信息。对于图片类型会提供简洁预览（或 data-url 的小图），但不会在卡片中渲染大型缩略以节省布局预算；支持打开文件（在独立窗口/浏览器中）或从消息中移除。Compact 变体用于消息气泡内的紧凑显示。该组件已移动到 `components/ui` 以便更广泛复用。

---

<!-- MessageActionIcons component removed in recent refactor; message actions are handled inline or via other UI components. -->

## src/renderer/src/components/ui/AutoResizeTextarea.tsx
路径：src/renderer/src/components/ui/AutoResizeTextarea.tsx

一句话：自动高度调整的文本域组件，替代部分聊天输入中的自实现逻辑。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| AutoResizeTextarea | props: {value,onChange,placeholder,rows?,maxRows?} | 文本域组件，自动根据内容调整高度并暴露主要回调 |

模块逻辑：提供一个可复用的自动高度文本域，供 `ChatInputBox` 和消息编辑流程复用，以减少重复实现并保证一致的键盘行为与粘贴处理。

## src/renderer/src/hooks/useMessageBranching.ts
路径：src/renderer/src/hooks/useMessageBranching.ts

一句话：管理会话内消息分支/树状结构的 Hook，用于实现非线性对话（branching）。

| 导出 | 参数 | 返回 |
|---|---:|---|
| useMessageBranching | options? | {branches, activeBranchId, createBranch, switchBranch, mergeBranch, deleteBranch} |

模块逻辑：封装分支的创建/切换/合并/删除逻辑，与后端的会话实体（如果有）同步分支元信息，提供本地选择与 UI 友好的操作接口。

---

## src/renderer/src/stores/settings.ts
路径：src/renderer/src/stores/settings.ts

一句话：前端设置 store，缓存用户配置并提供更新接口。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| useSettingsStore / initializeSettings | - | settings state & actions |
| loadSettings | - | Promise<void>；拉取主进程设置 |

模块逻辑：与主进程 IPC 协作加载/更新设置，并把设置缓存在前端以供组件读取。

---

## src/renderer/src/stores/app.ts
路径：src/renderer/src/stores/app.ts

一句话：应用级 store（就绪状态、全局错误/启动流程）。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| useAppStore | - | {isReady, isLoading, initApp(), setError()} |

模块逻辑：管理全局初始化流程状态，用于 App 顶层显示加载或错误视图。

---

## src/renderer/src/stores/navigation.ts
路径：src/renderer/src/stores/navigation.ts

一句话：前端导航与当前视图状态管理（活动会话 id 等）。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| useNavigationStore | - | {activeConversationId, setActiveConversation} |

模块逻辑：提供导航状态与动作，使 UI 各部分可以响应选中会话或切换视图。

---

## src/renderer/src/pages/MainApp.tsx
路径：src/renderer/src/pages/MainApp.tsx

一句话：主应用页面布局，组合侧栏、消息列表与输入区域。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| MainApp | - | 页面级组件，组织主界面各个子组件 |

模块逻辑：协调 stores 初始化完成后的主界面渲染，监听全局事件并传递回调到子组件。

---

## src/main/menu.ts
路径：src/main/menu.ts

一句话：Electron 菜单定义与注册（应用菜单、开发菜单项）。

| 导出 / 函数 | 参数 | 返回 / 说明 |
|---|---:|---|
| buildAppMenu | options? | Menu；构建主菜单模板 |
| registerAppMenu | - | void；应用到 app 或 window |

模块逻辑：根据开发/生产环境启用不同菜单项（如切换开发工具、重载、关于），并绑定命令回调。

---

## src/main/preload.ts
路径：src/main/preload.ts

一句话：preload 脚本，桥接主进程 IPC 到渲染进程的受限 API（window.knowlex）。

| 导出 / 行为 | 说明 |
|---|---|
| expose API | 将受限的 IPC 方法与事件暴露给 renderer（安全白名单） |

模块逻辑：定义可调用的 IPC 接口与事件订阅方法，做最低权限的参数/结果序列化以加强安全。

---

## src/renderer/src/main.tsx
路径：src/renderer/src/main.tsx

一句话：渲染进程入口，挂载 React 应用到 DOM 并注入全局样式与 provider。

| 责任 | 说明 |
|---|---|
| 启动 App | 初始化 i18n/theme/providers 并渲染 `App` 组件 |

模块逻辑：包含 dev-only 的 HMR 支持与错误边界包装，作为 React 应用的单一入口。

---

## src/renderer/src/lib/test-setup.ts
路径：src/renderer/src/lib/test-setup.ts

一句话：测试环境初始化（jest/vitest 的 global mocks 与 DOM 配置）。

| 作用 | 说明 |
|---|---|
| setup tests | 注册全局 mock（window.knowlex）、polyfills 与常用 test helpers |

模块逻辑：让组件测试在 CI/开发机器上有一致的全局上下文，减少重复测试引导代码。

---

## src/renderer/src/utils/markdownComponents.tsx
路径：src/renderer/src/utils/markdownComponents.tsx

一句话：为 ReactMarkdown 提供自定义渲染器（code blocks、links、images）。

| 导出 / 函数 | 参数 | 返回 |
|---|---:|---|
| markdownComponents | - | React components mapping；覆写默认渲染行为 |

模块逻辑：处理代码高亮、安全外链、图片懒加载与自定义 Markdown 扩展，统一渲染样式。

---

（文档已覆盖 src/ 下主要业务模块，若需要我可以继续把 theme、测试用例、或更细粒度的私有辅助模块逐个列出。）

---

## src/main/ipc/__tests__/file.test.ts
路径：src/main/ipc/__tests__/file.test.ts

一句话：测试 file IPC 处理器（端到端风格，使用模拟的 IPC 环境）。

| 测试 / 用例 | 说明 |
|---|---|
| should process temp files via ipc | 模拟 IPC 调用并断言返回的 TemporaryFileResult 数组 |
| should validate bad requests | 测试校验失败时的错误路径 |

模块逻辑：在受控的测试上下文中初始化 IPC handlers，模拟请求并断言结果或错误以保证 IPC 层契约。

---

## src/main/services/__tests__/file-temp.test.ts
路径：src/main/services/__tests__/file-temp.test.ts

一句话：单元测试 file-temp 服务的各种解析/校验/清理行为。

| 测试 / 用例 | 说明 |
|---|---|
| validate temporary file constraints | 校验数量/大小/扩展名边界情况 |
| parse text/pdf/office files | 使用样例文件断言 parse 返回的文本/元数据 |

模块逻辑：通过注入临时文件样本与 mock file-parser 验证 service 在成功与失败路径的行为。

---

## src/renderer/index.html
路径：src/renderer/index.html

一句话：渲染进程的 HTML 模板，React 应用挂载点与基本 meta。

| 内容 | 说明 |
|---|---|
| <div id="root"> | React 挂载容器 |
| meta / link | 引入字体、图标与基础样式 |

模块逻辑：最小 HTML 外壳，供构建工具注入脚本与样式并在运行时挂载 React 应用。

---

## src/renderer/src/components/features/chat/MessageEditModal.tsx
路径：src/renderer/src/components/features/chat/MessageEditModal.tsx

一句话：用于编辑已发送消息的模态对话框，提供保存/取消操作。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| MessageEditModal | props: {message, open, onSave, onClose} | 编辑消息文本并触发更新回调 |

模块逻辑：呈现可编辑的文本域，执行本地验证后通过回调将更新提交到 store 或 IPC，并在完成后关闭模态。

---

## src/renderer/src/components/layout/MainLayout.tsx
路径：src/renderer/src/components/layout/MainLayout.tsx

一句话：应用的主布局组件，组合侧栏与内容区域并处理响应式布局。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| MainLayout | props: {children} | 页面级布局，包含 header/sidebar/content 区域 |

模块逻辑：管理布局栅格、主题外观与可折叠侧栏，给子组件提供统一的间距与容器。

---

## src/renderer/src/components/layout/Sidebar.tsx
路径：src/renderer/src/components/layout/Sidebar.tsx

一句话：侧栏组件，列出会话、导航与全局操作（新建/搜索/设置）。

| 组件 / 导出 | 参数 | 说明 |
|---|---:|---|
| Sidebar | props: {conversations, activeId, onSelect} | 渲染会话列表与操作按钮 |

模块逻辑：展示会话摘要并处理创建/删除/切换动作，调用 navigation store 更新活动会话。

---

## src/renderer/src/styles/markdown.css
路径：src/renderer/src/styles/markdown.css

一句话：Markdown 渲染的样式规则（代码块、高亮、表格、图片）。

| 规则 | 说明 |
|---|---|
| code, pre | 代码块样式、滚动、字体设置 |
| img | 响应式图片与最大宽度限制 |

模块逻辑：为 Markdown 渲染输出提供一致的视觉样式，避免默认浏览器样式导致的排版问题。

---

## src/renderer/src/types/global.d.ts
路径：src/renderer/src/types/global.d.ts

一句话：全局 TypeScript 声明（window.knowlex、环境变量等）。

| 声明 | 说明 |
|---|---|
| interface Window { knowlex: KnowlexAPI } | 声明渲染进程可用的受限主进程接口 |

模块逻辑：提供编译时类型信息以避免在渲染代码中对 `window.knowlex` 的类型不确定性。

---

## src/renderer/src/utils/theme/breakpoints.ts
路径：src/renderer/src/utils/theme/breakpoints.ts

一句话：响应式断点定义（xs/sm/md/lg/xl），供样式系统使用。

| 导出 | 说明 |
|---|---|
| BREAKPOINTS | object；断点像素值 |

模块逻辑：集中定义断点以便组件和 CSS-in-JS 使用统一的响应式断点。

---

## src/renderer/src/utils/theme/colorMode.ts
路径：src/renderer/src/utils/theme/colorMode.ts

一句话：处理亮/暗色模式切换的工具（localStorage 缓存、系统偏好检测）。

| 导出 | 说明 |
|---|---|
| getColorMode / setColorMode | 获取/设置当前主题模式 |

模块逻辑：封装主题模式的读取与持久化，向 UI 提供一致的主题开关行为。

---

## src/renderer/src/utils/theme/colors.ts
路径：src/renderer/src/utils/theme/colors.ts

一句话：主题色调表（primary/secondary/背景/文本 等）。

| 导出 | 说明 |
|---|---|
| lightColors / darkColors | 对象；分别列出亮暗主题的颜色值 |

模块逻辑：集中颜色常量，供组件样式与主题系统引用以保证一致性。

---

## src/renderer/src/utils/theme/components.ts
路径：src/renderer/src/utils/theme/components.ts

一句话：为 UI 组件提供主题化样式映射（Button/Input/Modal 等）。

| 导出 | 说明 |
|---|---|
| componentStyles | 对象；按组件提供样式覆盖 |

模块逻辑：把设计系统 token 映射到组件的默认样式，便于全局主题调整。

---

## src/renderer/src/utils/theme/fonts.ts
路径：src/renderer/src/utils/theme/fonts.ts

一句话：定义用于应用的字体族、大小与字重 token。

| 导出 | 说明 |
|---|---|
| FONT_FAMILY, FONT_SIZES, FONT_WEIGHTS | 字体相关 token |

模块逻辑：集中字体设置，便于跨组件一致渲染与未来替换系统字体。

---

## src/renderer/src/utils/theme/index.ts
路径：src/renderer/src/utils/theme/index.ts

一句话：导出整合的主题对象（colors/breakpoints/components 等）供 Provider 使用。

| 导出 | 说明 |
|---|---|
| theme | 聚合 theme 对象，传给 ThemeProvider |

模块逻辑：把散落的 theme token 聚合成单一对象，便于在应用顶层注入。

---

## src/renderer/src/utils/theme/shadows.ts
路径：src/renderer/src/utils/theme/shadows.ts

一句话：预定义阴影样式 token（低/中/高 强度）。

| 导出 | 说明 |
|---|---|
| SHADOWS | 对象；不同强度的 box-shadow 字符串 |

模块逻辑：集中阴影 token，保证组件在不同深度的一致视觉效果。

---

## src/shared/types/conversation.ts
路径：src/shared/types/conversation.ts

一句话：会话相关的 TypeScript 类型定义（Conversation 实体与分页结果）。

| 导出 / 类型 | 说明 |
|---|---|
| Conversation | 会话实体（id, title, createdAt, updatedAt, settings?） |
| PaginatedConversations | {conversations: Conversation[], hasMore: boolean} |

模块逻辑：声明会话层的核心数据契约，供数据库、服务与渲染层共享类型。

---

## src/shared/types/ipc.ts
路径：src/shared/types/ipc.ts

一句话：IPC 通信相关类型（请求/响应/事件 payload）。

| 导出 / 类型 | 说明 |
|---|---|
| IPCResult<T> | {success:boolean, data?:T, error?:string} |
| IPCEventName | 字符串字面量联合，列出可广播的事件名 |

模块逻辑：为主渲染进程之间的消息传递定义统一的序列化格式与事件名类型，减少运行时错误。


