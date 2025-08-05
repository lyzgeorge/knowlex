# Knowlex Desktop App

Knowlex 桌面智能助理 - 基于 Electron + React + TypeScript 的跨平台桌面应用

## 功能特性

- 🤖 智能对话助理
- 📁 项目管理
- 📄 文件处理与 RAG 检索
- 🧠 记忆与知识管理
- 🔍 全局搜索
- 🎨 主题切换
- 🌐 国际化支持

## 技术栈

- **前端**: React 18 + TypeScript + Chakra UI
- **桌面框架**: Electron
- **构建工具**: Vite
- **状态管理**: Zustand
- **AI 集成**: OpenAI Agents JS SDK
- **数据库**: SQLite + hnswsqlite

## 开发环境

### 系统要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动开发服务器
pnpm run dev

# 启动 Electron 开发模式
pnpm run electron:dev
```

### 构建

```bash
# 构建 Web 应用
pnpm run build:web

# 构建 Electron 应用
pnpm run build

# 打包 Electron 应用
pnpm run electron:pack
```

### 测试

```bash
# 运行测试
pnpm test

# 运行测试并监听变化
pnpm run test:watch

# 运行测试并生成覆盖率报告
pnpm run test:coverage
```

### 代码规范

```bash
# 检查代码规范
pnpm run lint:check

# 自动修复代码规范问题
pnpm run lint

# 检查代码格式
pnpm run format:check

# 自动格式化代码
pnpm run format

# 类型检查
pnpm run type-check
```

## 项目结构

```
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── stores/            # Zustand 状态管理
│   ├── services/          # API 服务
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   └── i18n/              # 国际化
├── src-electron/          # Electron 源码
│   ├── main/              # 主进程
│   ├── preload/           # 预加载脚本
│   ├── services/          # 后端服务
│   ├── handlers/          # IPC 处理器
│   └── workers/           # Worker 线程
├── dist/                  # Web 构建输出
├── dist-electron/         # Electron 构建输出
└── release/               # 应用打包输出
```

## 开发指南

### Git 工作流

本项目使用 Husky + lint-staged 确保代码质量：

- 提交前自动运行 ESLint 和 Prettier
- 推送前自动运行测试

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 使用 Prettier 进行代码格式化
- 组件使用函数式组件 + Hooks
- 状态管理使用 Zustand

## 许可证

MIT License
