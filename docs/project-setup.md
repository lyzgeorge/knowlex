# Knowlex 桌面应用 - 项目初始化文档

## 概述

本文档描述了 Knowlex 桌面智能助理的项目初始化和开发环境配置，包括项目结构、技术栈、构建配置和开发工具链。

## 技术栈

### 核心框架
- **Electron**: 28.3.3 - 跨平台桌面应用框架
- **React**: 18.3.1 - 前端 UI 框架
- **TypeScript**: 5.9.2 - 类型安全的 JavaScript

### 构建工具
- **electron-vite**: 2.3.0 - Electron 应用的 Vite 构建工具
- **Vite**: 5.4.19 - 快速的前端构建工具
- **pnpm**: 包管理器，支持 workspace

### UI 框架
- **Chakra UI**: 2.10.9 - React 组件库
- **Emotion**: 11.14.0 - CSS-in-JS 样式库
- **Framer Motion**: 10.18.0 - 动画库

### 开发工具
- **ESLint**: 8.57.1 - 代码检查工具
- **Prettier**: 3.6.2 - 代码格式化工具
- **Husky**: 8.0.3 - Git hooks 管理
- **lint-staged**: 15.5.2 - 暂存文件检查

### 测试框架
- **Vitest**: 1.6.1 - 单元测试框架
- **@testing-library/react**: 16.3.0 - React 组件测试
- **jsdom**: 26.1.0 - DOM 环境模拟

## 项目结构

```
knowlex/
├── src/                      # 前端 (Renderer Process - React App)
│   ├── components/           # UI 组件 (原子/分子/组织)
│   ├── hooks/                # 自定义 Hooks
│   ├── lib/                  # 工具函数, 客户端服务
│   │   ├── types.ts          # 全局类型定义
│   │   ├── test-setup.ts     # 测试环境配置
│   │   └── index.ts          # 导出文件
│   ├── pages/                # 页面级组件
│   ├── stores/               # Zustand 状态管理
│   ├── styles/               # 全局样式与 Tailwind/Chakra 配置
│   │   └── index.css         # 全局样式
│   ├── App.tsx               # 主应用组件
│   ├── main.tsx              # 前端入口
│   └── index.html            # HTML 模板
├── src-electron/             # 后端 (Main Process - Electron)
│   ├── services/             # 核心原子服务
│   │   ├── database.service.ts  # 数据库服务
│   │   ├── ipc.service.ts       # IPC 服务
│   │   └── index.ts             # 服务导出
│   ├── lib/                  # 后端工具函数
│   │   ├── db-helpers.ts     # 数据库辅助函数
│   │   └── index.ts          # 工具函数导出
│   ├── preload/              # 预加载脚本
│   │   └── index.ts          # 预加载脚本入口
│   └── main.ts               # 后端入口
├── packages/                 # Monorepo 包
│   └── shared-types/         # 前后端共享的类型定义
│       ├── src/
│       │   └── index.ts      # 类型定义
│       ├── package.json      # 包配置
│       └── tsconfig.json     # TypeScript 配置
├── docs/                     # 项目文档
├── .github/workflows/        # CI/CD 配置
│   └── ci.yml                # 持续集成配置
├── electron.vite.config.ts   # Vite 配置文件
├── tsconfig.json             # 根 TypeScript 配置
├── vitest.config.ts          # 测试配置
├── .eslintrc.js              # ESLint 配置
├── .prettierrc               # Prettier 配置
├── pnpm-workspace.yaml       # pnpm workspace 配置
└── package.json              # 项目配置
```

## 核心配置文件

### package.json

主要脚本命令：
- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm test` - 运行测试
- `pnpm lint` - 代码检查
- `pnpm format` - 代码格式化
- `pnpm dist` - 打包 Electron 应用

### electron.vite.config.ts

Electron Vite 配置，包含三个构建目标：
- **main**: 主进程构建配置
- **preload**: 预加载脚本构建配置  
- **renderer**: 渲染进程构建配置

路径别名：
- `@renderer` -> `src/`
- `@shared` -> `packages/shared-types/src/`

### tsconfig.json

TypeScript 配置，支持：
- ES2020 目标
- 严格类型检查
- 路径映射
- JSX 支持

## IPC 通信架构

### 预加载脚本 (src-electron/preload/index.ts)

提供安全的 IPC 通信接口：

```typescript
const api = {
  // 通用 IPC 调用
  invoke: async <T = any>(channel: string, data?: any): Promise<T>
  
  // 流式数据监听
  onStream: (channel: string, callback: (data: any) => void) => () => void
  
  // 基础测试方法
  ping: () => Promise<string>
}
```

### 类型安全

使用 `@shared` 包中的类型定义确保前后端通信的类型安全：

```typescript
interface IPCRequest<T = any> {
  id: string
  channel: string
  data: T
  timestamp: number
}

interface IPCResponse<T = any> {
  id: string
  success: boolean
  data?: T
  error?: string
  timestamp: number
}
```

## 开发工具链

### 代码质量

1. **ESLint 配置**
   - TypeScript 支持
   - React 规则
   - 自动修复

2. **Prettier 配置**
   - 统一代码格式
   - 自动格式化

3. **Husky + lint-staged**
   - 提交前自动检查
   - 暂存文件处理

### 测试环境

1. **Vitest 配置**
   - jsdom 环境
   - React Testing Library 集成
   - 覆盖率报告

2. **测试工具**
   - 组件测试
   - Mock 支持
   - 快照测试

## 构建和部署

### 开发模式

```bash
pnpm dev
```

启动开发服务器，支持：
- 热重载
- 开发者工具
- 实时编译

### 生产构建

```bash
pnpm build
```

构建输出：
- `out/main/` - 主进程文件
- `out/preload/` - 预加载脚本
- `out/renderer/` - 渲染进程文件

### 应用打包

```bash
pnpm dist        # 当前平台
pnpm dist:mac    # macOS
pnpm dist:win    # Windows  
pnpm dist:linux  # Linux
```

## 依赖管理

### 生产依赖

- **@chakra-ui/react**: UI 组件库
- **@emotion/react**: CSS-in-JS
- **react**: 前端框架
- **better-sqlite3**: SQLite 数据库
- **openai**: OpenAI API 客户端

### 开发依赖

- **electron**: 桌面应用框架
- **electron-vite**: 构建工具
- **typescript**: 类型系统
- **vitest**: 测试框架
- **eslint**: 代码检查

## 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: 推荐包管理器
- **操作系统**: macOS, Windows, Linux

## 快速开始

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **构建共享类型**
   ```bash
   pnpm --filter @knowlex/types build
   ```

3. **启动开发服务器**
   ```bash
   pnpm dev
   ```

4. **运行测试**
   ```bash
   pnpm test
   ```

## 常见问题

### 构建问题

1. **类型错误**: 确保共享类型包已构建
2. **路径解析**: 检查 tsconfig.json 中的路径映射
3. **依赖问题**: 运行 `pnpm install` 重新安装

### 开发问题

1. **热重载不工作**: 重启开发服务器
2. **IPC 通信失败**: 检查预加载脚本配置
3. **样式问题**: 确保 Chakra UI 正确初始化

## 下一步

项目初始化完成后，可以开始：

1. **任务 2**: 数据库架构实现
2. **任务 3**: IPC 通信框架搭建
3. **任务 4**: Mock 服务实现

## 更新日志

- **2025-01-08**: 初始项目搭建完成
  - 配置 Electron + React + TypeScript 环境
  - 设置开发工具链
  - 实现基础 IPC 通信
  - 创建项目结构和文档