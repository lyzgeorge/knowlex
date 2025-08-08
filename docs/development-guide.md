# Knowlex Desktop 开发指南

## 开发环境设置

### 1. 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0 (推荐包管理器)
- **Git**: 最新版本
- **VS Code**: 推荐 IDE

### 2. 推荐的 VS Code 扩展

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "vitest.explorer",
    "ms-playwright.playwright"
  ]
}
```

### 3. 初始化项目

```bash
# 克隆项目
git clone <repository-url>
cd knowlex-desktop

# 安装依赖
pnpm install

# 构建共享类型包
pnpm --filter @knowlex/types build

# 启动开发服务器
pnpm dev
```

## 开发工作流

### 1. 分支管理

- `main` - 主分支，稳定版本
- `develop` - 开发分支，最新功能
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支
- `hotfix/*` - 紧急修复分支

### 2. 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型说明：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(chat): add message streaming support

- Implement real-time message streaming
- Add typing indicators
- Update UI components for streaming

Closes #123
```

### 3. 代码审查

每个 Pull Request 需要：
- [ ] 通过所有自动化测试
- [ ] 代码覆盖率不低于 80%
- [ ] 至少一个团队成员的审查
- [ ] 更新相关文档

## 代码规范

### 1. TypeScript 规范

```typescript
// ✅ 好的实践
interface UserData {
  id: string
  name: string
  email: string
  createdAt: Date
}

const fetchUser = async (id: string): Promise<UserData> => {
  // 实现
}

// ❌ 避免的实践
const fetchUser = async (id: any): Promise<any> => {
  // 实现
}
```

### 2. React 组件规范

```typescript
// ✅ 好的实践
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
  disabled = false
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
```

### 3. 文件命名规范

- **组件文件**: PascalCase (e.g., `UserProfile.tsx`)
- **Hook 文件**: camelCase with use prefix (e.g., `useUserData.ts`)
- **工具函数**: camelCase (e.g., `formatDate.ts`)
- **常量文件**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **类型文件**: camelCase with .types suffix (e.g., `user.types.ts`)

## 测试指南

### 1. 测试结构

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── ...
├── hooks/
│   ├── useUserData.ts
│   ├── useUserData.test.ts
│   └── ...
└── ...
```

### 2. 组件测试示例

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDisabled()
  })
})
```

### 3. Hook 测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUserData } from './useUserData'

describe('useUserData', () => {
  it('fetches user data successfully', async () => {
    const { result } = renderHook(() => useUserData('user-123'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeDefined()
    expect(result.current.error).toBeNull()
  })
})
```

## 调试指南

### 1. 主进程调试

在 VS Code 中创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": [".", "--remote-debugging-port=9222"],
      "outputCapture": "std",
      "console": "integratedTerminal",
      "protocol": "inspector"
    }
  ]
}
```

### 2. 渲染进程调试

1. 启动开发服务器：`pnpm dev`
2. 在 Electron 应用中按 `F12` 打开开发者工具
3. 使用 Chrome DevTools 进行调试

### 3. 日志记录

```typescript
// 主进程日志
import { app } from 'electron'

const log = {
  info: (message: string, ...args: any[]) => {
    console.log(`[${new Date().toISOString()}] INFO:`, message, ...args)
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[${new Date().toISOString()}] ERROR:`, message, ...args)
  }
}

// 渲染进程日志
const log = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] INFO:`, message, ...args)
    }
  }
}
```

## 性能优化

### 1. React 性能优化

```typescript
// 使用 React.memo 优化组件
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  return <div>{/* 复杂渲染逻辑 */}</div>
})

// 使用 useMemo 优化计算
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

// 使用 useCallback 优化函数
const handleClick = useCallback(() => {
  // 处理点击
}, [dependency])
```

### 2. Electron 性能优化

```typescript
// 预加载脚本优化
const api = {
  // 批量操作
  batchOperations: (operations: Operation[]) => 
    ipcRenderer.invoke('batch-operations', operations),
  
  // 缓存频繁访问的数据
  getCachedData: (key: string) => 
    ipcRenderer.invoke('get-cached-data', key)
}
```

## 常见问题解决

### 1. 构建问题

**问题**: `Cannot resolve module '@shared'`
**解决**: 确保共享类型包已构建
```bash
pnpm --filter @knowlex/types build
```

**问题**: `Electron app failed to start`
**解决**: 检查主进程文件路径和权限
```bash
# 重新构建
pnpm build
# 检查输出文件
ls -la out/main/
```

### 2. 开发问题

**问题**: 热重载不工作
**解决**: 重启开发服务器并清除缓存
```bash
pnpm dev --force
```

**问题**: IPC 通信失败
**解决**: 检查预加载脚本是否正确加载
```typescript
// 在渲染进程中检查
console.log('API available:', !!window.api)
```

### 3. 测试问题

**问题**: 测试中 `window.api` 未定义
**解决**: 在测试中 mock API
```typescript
Object.defineProperty(window, 'api', {
  value: {
    ping: () => Promise.resolve('pong'),
    // 其他 API mock
  }
})
```

## 部署指南

### 1. 构建检查清单

- [ ] 所有测试通过
- [ ] 代码检查通过
- [ ] 类型检查通过
- [ ] 构建成功
- [ ] 功能测试完成

### 2. 版本发布

```bash
# 更新版本号
npm version patch|minor|major

# 构建所有平台
pnpm dist

# 发布到 GitHub Releases
# (通过 CI/CD 自动化)
```

### 3. CI/CD 配置

参考 `.github/workflows/ci.yml` 文件，包含：
- 代码检查
- 测试运行
- 跨平台构建
- 自动发布

## 贡献指南

1. **Fork 项目**并创建功能分支
2. **遵循代码规范**和提交规范
3. **编写测试**确保代码质量
4. **更新文档**说明变更
5. **提交 Pull Request**并等待审查

## 资源链接

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Chakra UI 文档](https://chakra-ui.com/)
- [Vitest 文档](https://vitest.dev/)

---

如有问题，请在 [Issues](https://github.com/knowlex/desktop/issues) 中提出。