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

### ✅ What Works Now (Ready for Production)
- **AI Chat**: Full conversation system with streaming responses
- **Reasoning Display**: AI thought process shown in expandable boxes
- **File Upload**: Drag & drop files into chat conversations  
- **Data Storage**: Complete database with search capabilities
- **User Interface**: Dark/light themes, responsive design, smooth animations
- **Code Rendering**: Syntax highlighting for code blocks in chat

### 🚧 What's Half Done (Backend Ready, Need UI)
- **Project Management**: Can create/delete projects, need management interface
- **Settings**: AI model configuration works, need settings screen
- **File Organization**: Can store project files, need file manager UI

### ❌ What's Not Started Yet
- **Smart Search**: Vector search across project files
- **File Processing**: Turn project files into searchable knowledge base
- **Advanced Features**: Project templates, export, advanced AI tools

## 🎯 Recent Major Updates (August 2025)

### ✨ New: AI Reasoning Display
- See how AI models like o1 "think" before responding
- Reasoning text streams in real-time, then auto-collapses
- Click to expand/collapse reasoning at any time

### 🔄 Improved: Better AI Integration  
- Switched to Vercel AI SDK (more reliable, faster)
- Support for multiple AI providers (OpenAI, compatible APIs)
- Better error messages when AI calls fail

### 🎨 Enhanced: User Experience
- Smoother scrolling during conversations
- Better file upload feedback
- Improved markdown rendering with syntax highlighting
- More responsive interface overall

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