# Knowlex Desktop

Knowlex 桌面智能助理 - 基于 Electron + React + TypeScript 的跨平台桌面应用

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm (推荐)

### 安装和运行

```bash
# 安装依赖
pnpm install

# 构建共享类型包
pnpm --filter @knowlex/types build

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test

# 代码检查和格式化
pnpm lint
pnpm format
```

## 📁 项目结构

```
knowlex/
├── src/                      # 前端 (React)
│   ├── components/           # UI 组件
│   ├── hooks/                # 自定义 Hooks
│   ├── lib/                  # 工具函数
│   ├── pages/                # 页面组件
│   ├── stores/               # 状态管理
│   └── styles/               # 样式文件
├── src-electron/             # 后端 (Electron)
│   ├── services/             # 核心服务
│   ├── lib/                  # 工具函数
│   ├── preload/              # 预加载脚本
│   └── main.ts               # 主进程入口
├── packages/shared-types/    # 共享类型定义
└── docs/                     # 项目文档
```

## 🛠 技术栈

- **框架**: Electron 28.3.3 + React 18.3.1 + TypeScript 5.9.2
- **构建**: electron-vite 2.3.0 + Vite 5.4.19
- **UI**: Chakra UI 2.10.9 + Emotion 11.14.0
- **测试**: Vitest 1.6.1 + Testing Library
- **工具**: ESLint + Prettier + Husky

## 📚 文档

- [项目初始化文档](docs/project-setup.md) - 详细的项目配置和架构说明
- [设计文档](.kiro/specs/knowlex-desktop-app/design.md) - 系统设计和架构
- [需求文档](.kiro/specs/knowlex-desktop-app/requirements.md) - 功能需求和验收标准
- [任务列表](.kiro/specs/knowlex-desktop-app/tasks.md) - 开发任务和进度

## 🔧 开发命令

| 命令 | 描述 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm test` | 运行测试 |
| `pnpm test:ui` | 运行测试 UI |
| `pnpm lint` | 代码检查 |
| `pnpm format` | 代码格式化 |
| `pnpm dist` | 打包应用 |
| `pnpm dist:mac` | 打包 macOS 版本 |
| `pnpm dist:win` | 打包 Windows 版本 |
| `pnpm dist:linux` | 打包 Linux 版本 |

## 🏗 开发状态

### ✅ 已完成

- [x] 项目初始化和开发环境配置
- [x] 基础项目结构搭建
- [x] IPC 通信框架基础
- [x] 测试环境配置
- [x] CI/CD 配置

### 🚧 进行中

- [ ] 数据库架构实现
- [ ] 核心 AI 功能实现
- [ ] 文件处理系统
- [ ] 用户界面开发

### 📋 待开始

- [ ] 高级功能实现
- [ ] 系统优化和完善
- [ ] 测试和部署

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 项目链接: [https://github.com/knowlex/desktop](https://github.com/knowlex/desktop)
- 问题反馈: [Issues](https://github.com/knowlex/desktop/issues)

---

**Knowlex Desktop** - 让智能助理触手可及 🚀