# Module Dependency Diagram

## Process Communication Flow

```
┌─────────────────────────────────┐
│       Renderer Process          │
│   (React + TypeScript + UI)     │
└─────────────────┬───────────────┘
                  │ IPC
                  │ contextBridge
                  │ electron
                  ▼
┌─────────────────────────────────┐
│         Main Process            │
│   (Node.js + Electron + Data)   │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│        Shared Code              │
│    (Types + Constants + Utils)  │
└─────────────────────────────────┘
```

## Renderer Process Internal Dependencies

```
Pages
  │
  ├─── components/features/
  │     ├─── chat/
  │     ├─── project/
  │     └─── settings/
  │
  ├─── components/layout/
  │     ├─── Sidebar
  │     ├─── Header
  │     └─── MainLayout
  │
  └─── components/ui/
        ├─── Button
        ├─── Input
        ├─── Modal
        ├─── FileCard
        └─── MessageBubble

Stores (Zustand)
  ├─── app (theme, UI state)
  ├─── project (projects, files)
  ├─── conversation (chats, messages)
  └─── settings (preferences)

Hooks
  ├─── useIPC (communication)
  ├─── useChat (messaging)
  ├─── useFiles (file operations)
  └─── useSearch (search functionality)
```

## Main Process Internal Dependencies

```
IPC Handlers
  ├─── project.ts
  ├─── conversation.ts
  ├─── file.ts
  ├─── search.ts
  └─── settings.ts
           │
           ▼
Services Layer
  ├─── project.ts
  ├─── conversation.ts
  ├─── message.ts
  ├─── file-temp.ts
  ├─── file-project.ts
  ├─── embedding.ts
  ├─── search.ts
  └─── settings.ts
           │
           ▼
Data Layer
  ├─── database/
  │    ├─── index.ts (connection)
  │    ├─── migrations.ts
  │    └─── queries.ts
  │
  ├─── ai/
  │    ├─── base.ts
  │    ├─── openai.ts
  │    ├─── claude.ts
  │    └─── manager.ts
  │
  └─── utils/
       ├─── file.ts
       ├─── text.ts
       └─── validation.ts
```

## Shared Code Dependencies

```
Types
  ├─── project.ts
  ├─── conversation.ts
  ├─── message.ts
  ├─── file.ts
  ├─── ipc.ts
  └─── ai.ts

Constants
  ├─── app.ts
  ├─── file.ts
  └─── ai.ts

Utils
  ├─── id.ts
  ├─── time.ts
  └─── validation.ts
```

## Data Flow Patterns

### User Action to Database
```
User Interaction
      │
      ▼
React Component
      │
      ▼
Custom Hook (useIPC)
      │
      ▼
IPC Channel
      │
      ▼
IPC Handler (main)
      │
      ▼
Service Function
      │
      ▼
Database Query
      │
      ▼
Response ← ← ← (reverse flow)
```

### AI Chat Flow
```
User Message Input
      │
      ▼
Chat Component
      │
      ▼
useChat Hook
      │
      ▼
IPC: 'message:send'
      │
      ▼
Message Service
      │
      ├─── Save to DB
      │
      ├─── RAG Search (if project)
      │     │
      │     ▼
      │   Search Service
      │     │
      │     ▼
      │   Vector Database
      │
      └─── AI Model
           │
           ▼
         Stream Response
           │
           ▼
      Update UI (real-time)
```

### File Processing Flow
```
File Upload
      │
      ▼
File Upload Component
      │
      ▼
useFiles Hook
      │
      ▼
IPC: 'file:upload'
      │
      ▼
File Service
      │
      ├─── Validate File
      ├─── Save to Disk
      ├─── Extract Text
      ├─── Generate Chunks
      ├─── Create Embeddings
      └─── Save to Vector DB
           │
           ▼
      Status Updates (via IPC events)
           │
           ▼
      UI Feedback (progress, success/error)
```

## Circular Dependency Prevention

- **Shared Code**: Never imports from main or renderer
- **Main Process**: Can import from shared, never from renderer
- **Renderer Process**: Can import from shared, communicates with main via IPC
- **Services**: Import from lower layers (database, utils) but not from IPC handlers
- **Components**: Import from hooks and stores, not directly from services

## Import Path Conventions

```typescript
// Absolute imports (configured in tsconfig.json)
import { Project } from '@shared/types'
import { validateFileConstraints } from '@shared/utils'
import { FILE_CONSTRAINTS } from '@shared/constants'

// Relative imports within same module
import { Button } from './Button'
import { Modal } from '../ui/Modal'

// Main process imports
import { getDB } from '@main/database'
import { projectService } from '@main/services'

// Renderer imports
import { useIPC } from '@renderer/hooks'
import { projectStore } from '@renderer/stores'
```