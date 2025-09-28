# Knowlex 源代码完整文档（2024 架构重构后）

本文档聚焦 `src/` 目录下的最新代码组织方式，帮助你理解主进程 (Main)、渲染进程 (Renderer) 与共享层 (Shared) 的责任划分。2024 年的重构将主进程拆分为 **Domain / Services / Infra** 三类模块，渲染层改为 **Feature-first** 结构，并引入统一的 preload API。下文按照目录逐层说明关键文件及其作用。

## 架构总览
- **Shared**：跨进程共享的类型、常量、Zod schema 与实用工具，确保类型安全与输入校验一致。
- **Main**：Electron 主进程，分为 `domain`（纯业务契约）、`services`（用例实现）与 `infra`（数据库、AI 适配器、解析器等底层依赖），外加 `ipc`、`window` 启动逻辑。
- **Preload**：`window.knowlex` 的唯一出口，集中声明所有 Renderer 可见的 IPC API。
- **Renderer**：React + Zustand 前端，以 `features/` 组织页面主功能，`stores/` 提供持久状态，`hooks/` 隔离复杂交互逻辑。

## 目录导航
- `src/shared/`：跨层常量、类型、schema、工具与 i18n。
- `src/main/`：Domain 契约、服务实现、基础设施、IPC 处理、窗口初始化。
- `src/preload/`：暴露给渲染层的安全 IPC API。
- `src/renderer/`：前端功能模块、UI 组件、状态与工具。
- `scripts/`：开发脚本与自动化工具（例如数据库维护与打包辅助）。

---

## Shared 层 (`src/shared`)

### constants
- `app.ts`：应用名称、窗口尺寸、开发模式标志。
- `ai.ts`：默认 AI 调参项（温度、token 上限等），其余模型清单迁移到 `docs/legacy/` 供参考。
- `file.ts`：附件批次约束（单文件 10MB、批次 100MB 等）。
- `file-types.ts`：扩展名与 MIME 类型映射、图片扩展列表。
- `project-files.ts`：项目文件上限、智能笔记配置等共享常量。
- `ipc-channels.ts`：所有 IPC 通道别名的唯一来源，按 `conversation / message / project / modelConfig / attachment / settings / ai` 分组。
- `notifications.ts`：Renderer 使用的通知预设键值。
- `text.ts`：`ZERO_WIDTH_SPACE` 等特殊占位符常量。

### schemas
- `conversation.ts`、`message.ts`、`file.ts`、`project.ts`、`model-config.ts`：使用 Zod 定义的请求/响应 schema，供 IPC 入参验证与类型推导。

### types
- `conversation-types.ts`：对话实体与会话设置结构。
- `message.ts`：多段消息、引用、分支信息的数据模型。
- `file.ts`：项目文件与临时附件的元数据、处理状态定义。
- `models.ts`：公共/私有模型配置、Reasoning 级别等类型。
- `notification.ts`、`project.ts`、`project-file.ts`、`ipc.ts`、`citation.ts`：通知、项目、项目文件与 IPCResult 等共享接口。

### utils
- `error-handling.ts`：统一的错误消息提取与格式化。
- `id.ts`：加密随机 ID 生成。
- `message/` → `content-builder.ts`：将文本与文件输入组合为标准 `MessageContent`。
- `message-branching.ts`：分支可用性判断、父节点查找等对话树算法。
- `message-utils.ts`、`message-view-models.ts`：常见消息查找与视图模型构建。
- `model-resolution.ts`：显式 → 会话 → 用户默认 → 系统默认的模型解析流程。
- `reasoning.ts`：推理强度的验证与解析工具。
- `text.ts`、`time.ts`、`token-count.ts`、`validation.ts`：文本占位符、时间格式化、tiktoken 计数、文件/字符串校验等通用函数。

### i18n
- `config.ts` / `init.ts` / `index.ts`：i18next 配置与初始化入口。
- `locales/en.json`、`locales/zh.json`：多语言资源。

---

## Main 进程 (`src/main`)

### domain
- `conversation.ts`：对话用例接口、仓储契约与分页结果类型。
- `project.ts`：项目 CRUD 契约与仓储抽象。
- `README.md`：解释 Domain 层只包含纯接口，不依赖实现细节。

### infra
- **database/**
  - `index.ts`：`createDB`、`executeQuery` 等数据库连接与事务入口。
  - `entity.ts`：通用 `DatabaseEntity` CRUD 辅助，包括字段映射与 JSON 序列化处理。
  - `schemas.ts`：数据库表到实体的字段映射定义。
  - `queries.ts`：项目、对话、消息、模型配置等具体 SQL 查询。
  - `migrations.ts`：迁移执行与 schema 版本管理工具。
- **ai/**
  - `openai-adapter.ts`：Vercel AI SDK 适配、消息格式转换、推理参数处理与错误增强。
- **parsers/**
  - `base.ts`：文件解析器抽象与通用管线。
  - `pdf.ts` / `office.ts` / `text.ts`：各格式的解析实现。
  - `index.ts`：根据扩展名选择解析器的工厂。
- **utils/**
  - `batched-emitter.ts`：合并流式片段以降低 IPC 压力。
  - `cancellation.ts`：基于 token 的流式任务取消管理。
  - `error.ts`：错误增强与可读化工具。
  - `ipc-events.ts`：主进程广播事件的帮助函数。
  - `project-files.ts`：项目文件目录解析与创建助手。

### services
- `conversation.ts`：实现 `ConversationUseCases`，负责标题归一化、分页、项目过滤等逻辑。
- `project-service.ts`：项目 CRUD 与关联对话查询。
- `message.ts` / `message-send.ts`：消息读取、分支创建、发送流程与历史再生成处理。
- `assistant-service.ts`：核心流式对话执行，整合 AI 适配器、batch emitter、取消机制。
- `streaming-lifecycle.ts`：流式生命周期事件、状态回调。
- `ai-params.ts`、`ai-retry.ts`：AI 请求参数组装与推理回退策略。
- `model-config-service.ts`：模型配置的增删改查、默认模型选择。
- `project-file-service.ts`、`attachment-processor.ts`：项目文件上传、解析、智能笔记生成和附件处理。
- `title-generation.ts`：对话标题的自动生成与幂等化逻辑。
- `agent-runner.ts` / `agents/smart-notes-agent.ts`：智能笔记代理执行入口。
- `smart-notes-worker.ts`：后台任务封装，负责与代理通信和状态更新。
- `settings.ts`：应用设置加载、环境变量读取、持久化。
- `__tests__/`：服务层单元测试示例与 fixtures。

### ipc
- `common.ts`：`handleIPCCall`、`parseWithSchema`、`requireValidId` 等通用 IPC 工具。
- `conversation-ipc.ts`：集中注册对话与消息通道，包括分页、标题更新、消息发送/停止/再生成等流程。
- `project.ts`、`project-file.ts`、`file.ts`、`model-config.ts`、`settings.ts`：域内 IPC handler，负责请求验证与 IPCResult 响应。
- `index.ts`（若存在，负责集中注册）。

### 其他主进程文件
- `main.ts`：应用启动入口，创建窗口并加载 IPC。
- `window.ts`：主窗口生命周期管理、菜单与系统事件绑定。

---

## Preload (`src/preload`)
- `index.ts`：通过 `contextBridge` 暴露 `window.knowlex`。
  - 包含窗口控制、主题监听、对话/消息/项目/模型配置/附件/设置/AI 相关的 IPC 方法。
  - 提供 `events.on/off`、菜单动作、文件系统访问与系统信息等封装。
  - 所有通道均引用 `IPC_CHANNELS`，避免硬编码字符串。

---

## Renderer 层 (`src/renderer`)

### features
- `app/MainApp.tsx`：应用入口，装配布局与全局提供者。
- `chat/`：会话主界面（`ConversationPage`、`MainPage`），包含助手/用户消息组件、输入框、推理展示等。
- `models/`：模型管理页面组件（选择器、编辑弹窗、推理强度选择器等）。
- `projects/`：项目列表与详情页面。
- `project-files/`：项目文件网格与管理弹窗。
- `settings/`：设置面板分区与总入口。

### components
- `layout/`：`MainLayout`、侧边栏、会话/项目分区等结构性组件。
- `ui/`：基础 UI 元件（按钮、模态框、附件列表、通知、语言/主题选择器、Token counter、会话菜单等），`index.ts` 汇总导出。

### contexts
- `MessageBranchingContext.tsx`：集中管理消息分支状态，供消息组件与输入框共享。

### hooks
- `useConversationManagement.ts`、`useProjectManagement.ts`：高层 CRUD 与导航逻辑。
- `useMessageBranching.ts`、`useMessageActions.ts`、`useMessageTokenEstimate.ts`：复杂消息交互与 Token 估算。
- `useAttachmentUpload.ts`、`useAutoScroll.ts`、`useEditableMessage.ts`、`useEditableTitle.ts`：上传、滚动与编辑体验封装。
- `useModelForm.ts`、`useModelCapabilities.ts`、`useReasoningEffort.ts`：模型配置与推理能力。
- `useNotifications.ts`、`useStreamingPhase.ts`、`useRequestTokenCount.ts`：通知系统、流式阶段、Token 统计。
- `useThemeSync.ts`、`useI18n.ts`：主题同步与国际化助手。

### stores
- `app.ts`：全局应用状态（例如初始化标志）。
- `navigation.ts`：当前页面、选中项目/会话 ID。
- `conversation/`：数据、流式状态、事件注册、派生 hooks。
- `model-config.ts`、`settings.ts`、`project.ts`、`project-file-store.ts`：域特定状态管理。
- `index.ts`：集中导出。

### utils
- `countRequestTokens.ts`：与 Shared token 计数工具协作的 Renderer 端估算。
- `markdownComponents.tsx`：聊天消息 Markdown 渲染组件。
- `store-helpers.ts`：Zustand store 工具函数。
- `validation.ts`：渲染层特定的输入校验。
- `theme/`：Chakra 主题拆分（颜色、字体、阴影、断点、自定义组件）。

### 其他前端资源
- `components/layout` 与 `features` 共同组成主界面，`styles/markdown.css` 覆盖 Markdown 展示。
- `contexts/`、`types/global.ts`：为 TypeScript 提供全局类型声明。
- `lib/test-setup.ts`：前端单测初始化（React Testing Library 与窗体 mock）。

---

## 辅助目录
- `scripts/`：自动化脚本与开发工具，配合主进程服务进行迁移、打包或诊断。
- `prd/project-files/`：项目文件管理设计文档，补充主进程文件处理背景。

---

更新日期：依据当前 `refactor` 分支最新代码整理。如若新增文件或模块，请按上述结构扩展文档，保持 Domain / Services / Infra 与 Feature-first 的分层描述。
