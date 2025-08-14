# Knowlex Desktop Documentation

Welcome to the documentation for the Knowlex Desktop application. This collection of documents provides a comprehensive overview of the project's architecture, APIs, and features.

## Table of Contents

1.  **[Getting Started](./01-getting-started.md)**
    *   Learn how to set up your development environment, run the application, and build it for production.

2.  **[Architecture](./02-architecture.md)**
    *   An in-depth look at the application's architecture, including the three-layer design, directory structure with file paths, and communication patterns.

3.  **[API Reference](./03-api-reference.md)**
    *   Comprehensive reference for all services and APIs, including project management, conversation handling, message processing, AI integration, and database operations with detailed function signatures and usage examples.

4.  **[AI Integration System](./04-ai-integration.md)**
    *   Complete documentation of the production-ready AI framework with OpenAI and Claude providers, intelligent caching, streaming support, multimodal capabilities, and extensible architecture.

5.  **[UI Components](./05-ui-components.md)**
    *   Comprehensive guide to all UI components including basic components, layout system, feature components, and the advanced chat interface with detailed implementation examples.

6.  **[Mock Data System](./06-mock-data.md)**
    *   Documentation for the mock data system used in development and testing, including realistic sample projects and conversations.

7.  **[Chat Components](./07-chat-components.md)**
    *   Complete documentation for the chat interface components, including ChatInterface, MessageList, ChatInputBox, and message operations, with implementation details and usage examples. **Status: Updated to reflect actual filenames.**

8.  **[Main Process Architecture](./08-main-process.md)**
    *   Detailed documentation of the main process including application lifecycle, database layer, service architecture, IPC handlers, AI integration, and performance optimizations. **Status: Reflects actual implementation with noted gaps.**

9.  **[Renderer Process Architecture](./09-renderer-process.md)**
    *   Comprehensive documentation of the renderer process covering React application structure, Zustand state management, component architecture, theming system, and performance considerations. **Status: Updated to reflect actual file structure.**

10. **[Shared Code Architecture](./10-shared-code.md)**
    *   Complete documentation of the shared code layer including type definitions, constants, utilities, and their usage patterns across main and renderer processes. **Status: Identifies critical duplicate type issues.**

11. **[IPC Communication System](./11-ipc-communication.md)**
    *   Detailed documentation of the Inter-Process Communication system including security model, preload bridge, IPC handlers, event system, streaming support, and performance optimizations. **Status: Documents implemented and missing handlers.**

12. **[Database and Storage System](./12-database-storage.md)**
    *   Comprehensive documentation of the database system including libsql implementation, migration system, schema design, full-text search, vector storage, and performance optimization strategies. **Status: Comprehensive and accurate.**

13. **[Temporary File Processing](./13-temporary-file-processing.md)**
    *   Documentation for handling file uploads in unclassified chat mode with immediate processing and strict constraints. **Status: ✅ FULLY IMPLEMENTED AND FUNCTIONAL - Complete integration with chat system and AI models.**

14. **[Implementation Status & Developer Guide](./14-implementation-status.md)** 🆕
    *   **CRITICAL READ FOR NEW DEVELOPERS** - Comprehensive overview of what's actually implemented vs. documented, current development focus, missing components, and next development phases. **Status: Verified against actual codebase.**