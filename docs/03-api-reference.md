# API Reference

This document provides a reference for the core services and APIs in the Knowlex Desktop application.

## Project Management Service

**File:** `src/main/services/project.ts`

Handles all CRUD (Create, Read, Update, Delete) operations for projects.

-   `createProject(data: ProjectCreate)`: Creates a new project.
-   `getProject(id: string)`: Retrieves a project by its ID.
-   `listProjects()`: Returns a list of all projects.
-   `updateProject(id: string, data: Partial<Project>)`: Updates a project's details.
-   `deleteProject(id: string)`: Deletes a project and its associated data.
-   `getProjectStatistics(id: string)`: Fetches usage statistics for a project.

## Conversation and Message Service

**File:** `src/main/services/conversation.ts` and `src/main/services/message.ts`

Manages conversations and the messages within them.

### Conversation Functions

-   `createConversation(data: ConversationCreate)`: Creates a new conversation, optionally linked to a project.
-   `getConversation(id: string)`: Retrieves a single conversation.
-   `listConversations(projectId?: string)`: Lists all conversations, optionally filtered by project.
-   `updateConversation(id: string, data: Partial<Conversation>)`: Updates a conversation's properties.
-   `deleteConversation(id: string)`: Deletes a conversation and all its messages.

### Message Functions

-   `addMessage(data: MessageCreate)`: Adds a new message to a conversation. Supports multi-part content, including text, images, and citations.
-   `getMessage(id: string)`: Retrieves a single message.
-   `getMessages(conversationId: string)`: Lists all messages in a conversation.
-   `updateMessage(id: string, data: Partial<Message>)`: Updates a message's content.
-   `deleteMessage(id: string)`: Deletes a single message.

## Database Module

**File:** `src/main/database/queries.ts`

The database module, powered by `libsql`, provides a persistence layer for the application. It handles database connections, schema migrations, and data queries.

### Query Interface

The `queries.ts` file offers a type-safe API for all database operations, abstracting away the raw SQL. Key query categories include:

-   **Project Queries**: Functions for managing projects.
-   **Conversation Queries**: Functions for managing conversations.
-   **Message Queries**: Functions for managing messages.
-   **File Queries**: Functions for managing project files.
-   **Vector Queries**: Functions for storing and retrieving text embeddings for RAG.
-   **Settings Queries**: Functions for managing application settings.