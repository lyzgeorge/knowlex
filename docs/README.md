# Knowlex Desktop Documentation

**Intelligent desktop workspace with AI chat, project management, and RAG capabilities.**

Built with Electron, React, TypeScript, and Vercel AI SDK.

## 🚀 Quick Start

```bash
# Setup and run
pnpm install
pnpm dev

# Test and build
pnpm test
pnpm build
```

**Requirements:** Node.js 18+, pnpm

## 📚 Documentation Structure

### Core Documentation (Start Here)

1. **[Architecture Guide](./architecture.md)** - System design, technology stack, and architectural decisions
2. **[Implementation Status](./implementation-status.md)** - ⭐ **Critical for new developers** - What's working, what's not, current state
3. **[API Reference](./api-reference.md)** - Services, functions, types, and technical details for development
4. **[Development Guide](./development-guide.md)** - Workflow, patterns, conventions, and best practices

### Quick Reference

- **Tech Stack:** Electron + React + TypeScript + Zustand + Chakra UI + libsql + Vercel AI SDK
- **AI Integration:** OpenAI GPT-4o, o1 models with streaming and reasoning support
- **Database:** SQLite with FTS5 search and vector storage capabilities
- **State Management:** Zustand with immer for immutable updates
- **IPC:** Type-safe communication between main and renderer processes

## 🏗️ Current Implementation Status

### ✅ Fully Working
- Complete chat interface with AI integration (OpenAI, reasoning models)
- Real-time streaming responses with reasoning display and expand/collapse functionality
- File upload and processing for temporary chat files
- Project and conversation management with full CRUD operations
- Database with migrations, full-text search, and vector storage infrastructure
- Type-safe IPC communication with comprehensive error handling
- Responsive UI with dark/light themes and custom markdown rendering
- Advanced auto-scrolling with reasoning box state awareness

### 🚧 Partially Implemented
- Project file management (backend ready, UI missing)
- Settings management (backend ready, UI missing)
- RAG system (infrastructure ready, services incomplete)

### ❌ Missing
- Project management UI components
- Settings configuration UI
- Vector search implementation
- File vectorization services

## 🎯 For New Developers

1. **Start with [Implementation Status](./implementation-status.md)** to understand what's currently working
2. **Read [Architecture Guide](./architecture.md)** for system overview
3. **Follow [Development Guide](./development-guide.md)** for coding patterns
4. **Reference [API Documentation](./api-reference.md)** when implementing features

## 🔧 Key Features

- **AI Chat:** Full conversation management with streaming responses
- **File Processing:** Upload and process text files for AI context
- **Project Organization:** Group conversations and files by project
- **Search:** Full-text search across conversations and files
- **Cross-Platform:** macOS, Windows, Linux support
- **Type Safety:** Comprehensive TypeScript coverage
- **Performance:** Optimized rendering and state management

## 🏭 Architecture Highlights

- **Three-Layer Design:** Main process (Node.js) + Renderer (React) + Shared types
- **Security:** Context isolation, no Node.js in renderer, secure IPC
- **Database:** libsql with migrations, FTS5 search, prepared for vector storage
- **State:** Zustand stores with selective subscriptions and persistence
- **Streaming:** Real-time AI responses with reasoning phase display
- **Error Handling:** Comprehensive error boundaries and user-friendly messages

See [Architecture Guide](./architecture.md) for detailed technical overview.