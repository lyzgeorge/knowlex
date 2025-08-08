# Knowlex Desktop AI Assistant - Development Guide

## Project Overview
Knowlex is a desktop AI assistant for knowledge workers, providing a secure, private, and personalized "second brain" that combines local files with powerful language models.

## Key Technologies
- **Desktop**: Electron + React 18 + TypeScript
- **UI**: Chakra UI + Tailwind CSS + Heroicons (Use Chakra UI to build main layouts, Tailwind CSS style name should always have "tw-" prefix.)
- **State**: Zustand
- **Database**: libsql (SQLite-compatible with native vector support)
- **Build**: Vite (electron-vite)

## Architecture
```
knowlex/
├── src/                      # 前端 (Renderer Process - React App)
│   ├── components/           # UI 组件 (原子/分子/组织)
│   ├── hooks/                # 自定义 Hooks
│   ├── lib/                  # 工具函数, 客户端服务
│   ├── pages/                # 页面级组件
│   ├── stores/               # Zustand 状态管理
│   ├── styles/               # 全局样式与 Tailwind/Chakra 配置
│   └── main.tsx              # 前端入口
├── src-electron/             # 后端 (Main Process - Electron)
│   ├── services/             # 核心原子服务
│   ├── lib/                  # 后端工具函数 (e.g., db-helpers)
│   ├── preload/              # 预加载脚本
│   └── main.ts               # 后端入口
├── packages/
│   └── shared-types/         # 前后端共享的类型定义 (e.g., IPC, DB Schema)
├── docs/
├── electron.vite.config.ts   # Vite 配置文件
├── tsconfig.json             # 根 TypeScript 配置
└── package.json
```

BEFORE starting any work, you MUST:
1. Read and thoroughly understand the project documentation:
   - PRD: .kiro/specs/knowlex-desktop-app/requirements.md
   - DESIGN: .kiro/specs/knowlex-desktop-app/design.md
   - TASKS: .kiro/specs/knowlex-desktop-app/tasks.md
2. Analyze the current codebase structure and existing implementations
3. Create a solid, detailed plan that aligns with the project specifications
4. Ensure your approach follows the established architecture and design patterns

## Core Services (src-electron/services/)

- **DatabaseService**: libsql connection + vector operations
- **ProjectService**: Project lifecycle management
- **FileService**: File upload/management
- **RAGService**: Vector retrieval with libsql VECTOR type
- **LLMService**: OpenAI JS SDK integration
- **EmbeddingService**: Text vectorization
- **ChatService**: Conversation management
- **KnowledgeService**: Memory & knowledge cards
- **SearchService**: FTS5 global search
- **SettingsService**: App configuration

## Development Commands
```bash
# Development
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Lint & Format
pnpm lint
pnpm format
```

## Key Features

### 1. Smart Chat Core (模块 A)
- Basic AI conversation with context
- Temporary file import (.txt, .md, max 1MB, ≤10 files)
- Message editing and regeneration
- Streaming responses with Markdown rendering

### 2. Project Workspace (模块 B)
- Project-based organization of chats, files, knowledge
- RAG retrieval using libsql vector similarity search
- File management with automated processing pipeline
- Project memories (≤10) as system prompts
- Knowledge cards with Markdown support

### 3. Global Search (模块 C)
- FTS5 full-text search across all conversations
- Debounced search (1s delay) with virtual scrolling
- Jump to specific conversation locations

### 4. Settings & System (模块 D)
- API configuration (Chat + Embedding)
- Theme switching (light/dark/system)
- Internationalization (Chinese/English)
- Local data storage with privacy protection

## Database Schema (libsql)
```sql
-- Core tables
projects, conversations, messages, project_files

-- Vector storage (native VECTOR type)
text_chunks (id, fileId, content, position, embedding VECTOR)

-- Knowledge management
project_memories, knowledge_cards

-- Configuration
app_settings
```

## File Processing Strategy
- **Temporary files**: Read content → Add to chat context (no storage)
- **Project files**: Store → Chunk → Vectorize → RAG retrieval

## UI Design Patterns
- **Fixed 260px left sidebar**: Projects, chats, settings
- **Atomic design**: Atoms → Molecules → Organisms → Pages
- **Responsive**: Mobile-first with desktop optimization
- **Accessibility**: Full keyboard navigation + screen reader support

## Testing Strategy
- **Unit tests**: 60% coverage target
- **Integration tests**: Cross-process communication
- **E2E tests**: Complete user workflows
- **Tools**: Vitest, React Testing Library, Playwright

## Security & Performance
- **Local-first**: All data stored locally
- **Encrypted API keys**: Using keytar/electron-store
- **Vector optimization**: libsql native vector indices
- **Virtual scrolling**: For long lists and search results

## Getting Help

- Check existing tests and mock services for examples
- Refer to technical design document in `.kiro/specs/`
- Follow the atomic design system for new components
- Use the established service patterns for backend logic

## Important Notes
- NEVER assume libraries exist - check package.json first
- Follow existing code conventions and patterns
- Use libsql VECTOR type for embeddings
- Implement proper error handling for all API calls
- Maintain separation between temporary and permanent file handling
- After completing any task, create clear documentation under docs/
- Document APIs with simple, clear function signatures and parameters
- Always validate your implementation against the project requirements and design specifications. 