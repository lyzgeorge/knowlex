# Requirements Document

## Introduction

Knowlex is a cross-platform desktop application built with Electron that serves as an intelligent workspace for researchers, developers, technical writers, and analysts. The application integrates AI-powered conversations, project management, and knowledge accumulation into a unified work environment. It addresses core pain points including information overload, high context-switching costs, difficulty in knowledge retention and reuse, and repetitive work in AI interactions.

The solution provides a project-centric workspace with dual-mode RAG capabilities: project-internal mode with vector search and project memory, and project-external mode for lightweight conversations with temporary file uploads. All data is stored locally using libsql (SQLite) for both structured and vector data.

## Requirements

### Requirement 1: Left Sidebar Navigation

**User Story:** As a user, I want a fixed navigation sidebar that provides access to all core features, so that I can efficiently organize and access my projects and conversations.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a fixed 280px width left sidebar
2. WHEN the user views the sidebar THEN the system SHALL display the Knowlex logo at the top
3. WHEN the user clicks "+ New Chat" THEN the system SHALL create a new unclassified conversation in the main content area
4. WHEN the user types in the global search box THEN the system SHALL search across all conversation content
5. WHEN the user clicks the "+" icon next to Projects THEN the system SHALL open a project creation dialog
6. WHEN the user clicks a project name THEN the system SHALL expand/collapse the project to show/hide its conversations
7. WHEN the user hovers over a project THEN the system SHALL display file management, duplicate project, and more options icons
8. WHEN the user clicks the file management icon THEN the system SHALL load the project's file management view
9. WHEN the user clicks duplicate project THEN the system SHALL create a new project with the same configuration but no chat history
10. WHEN the user clicks the more options menu THEN the system SHALL display project settings, rename, and delete options

### Requirement 2: Multi-Part Message System

**User Story:** As a user, I want to send and receive messages with different content types, so that I can have rich conversations with text, images, and citations.

#### Acceptance Criteria

1. WHEN a user sends a message THEN the system SHALL support multiple content parts in sequence
2. WHEN rendering text content THEN the system SHALL support full Markdown rendering including code blocks, lists, tables, and quotes
3. WHEN displaying code blocks THEN the system SHALL provide syntax highlighting and one-click copy functionality
4. WHEN rendering images THEN the system SHALL display image previews for user-uploaded images
5. WHEN AI responds with citations THEN the system SHALL display citation source tags with special styling
6. WHEN AI generates a response THEN the system SHALL render the response in streaming mode token-by-token
7. WHEN a message is complete THEN the system SHALL optionally display metadata like token consumption and generation time

### Requirement 3: Message Interaction Operations

**User Story:** As a user, I want to interact with individual messages through contextual operations, so that I can edit, regenerate, fork, copy, or delete messages as needed.

#### Acceptance Criteria

1. WHEN the user hovers over any message bubble THEN the system SHALL display an operations menu
2. WHEN the user clicks "Edit & Retry" THEN the system SHALL allow editing the message content and resubmit the request
3. WHEN the user clicks "Regenerate" THEN the system SHALL generate a new AI response for the same user input
4. WHEN the user clicks "Fork from here" THEN the system SHALL create a conversation copy with history up to the current message
5. WHEN the user clicks "Copy" THEN the system SHALL copy the message's Markdown content to clipboard
6. WHEN the user clicks "Delete" THEN the system SHALL remove the message and its corresponding response if applicable

### Requirement 4: Session Context Management

**User Story:** As a user, I want to move conversations between projects and configure session-specific settings, so that I can organize conversations and customize AI behavior per session.

#### Acceptance Criteria

1. WHEN a conversation is moved into a project THEN the system SHALL preserve conversation history and apply project memory as System Prompt
2. WHEN a conversation is moved into a project THEN the system SHALL enable RAG functionality for that project's files
3. WHEN a conversation is moved out of a project THEN the system SHALL preserve history but switch to standard mode without project memory or RAG
4. WHEN the user clicks the session settings icon THEN the system SHALL open a configuration dialog for the current session
5. WHEN the user modifies session settings THEN the system SHALL allow overriding global or project System Prompt for that session only

### Requirement 5: Unclassified Chat Mode

**User Story:** As a user, I want to have quick conversations with temporary file uploads outside of projects, so that I can get immediate AI assistance without project setup.

#### Acceptance Criteria

1. WHEN the user creates a new unclassified chat THEN the system SHALL load the standard chat interface
2. WHEN the user uploads files in unclassified chat THEN the system SHALL support text and Office files (.txt, .md, .docx, .csv, .pptx, .xlsx)
3. WHEN processing files in unclassified chat THEN the system SHALL extract plain text content and attach it to the user's question context
4. WHEN the user uploads images THEN the system SHALL support image files (.png, .jpg, .webp)
5. WHEN processing images THEN the system SHALL convert images to Base64 strings and submit with text to multimodal models
6. WHEN in unclassified chat mode THEN the system SHALL NOT execute RAG functionality

### Requirement 6: Project RAG Mode

**User Story:** As a user, I want project conversations to automatically use RAG with project files and memory, so that I can have contextually-aware conversations based on my project knowledge.

#### Acceptance Criteria

1. WHEN the user opens a project conversation THEN the system SHALL automatically enter RAG mode
2. WHEN in RAG mode THEN the system SHALL construct context from user question + retrieved file segments + project memory System Prompt
3. WHEN AI responds in RAG mode THEN the system SHALL clearly display citation sources below the response
4. WHEN the user clicks a citation THEN the system SHALL navigate to the referenced Markdown content segment
5. WHEN retrieving context THEN the system SHALL search the project's vector database for relevant file segments

### Requirement 7: File Management System

**User Story:** As a user, I want to manage project files with automatic indexing and editing capabilities, so that I can maintain an up-to-date knowledge base for my projects.

#### Acceptance Criteria

1. WHEN the user accesses file management THEN the system SHALL display all imported project files in card or list format
2. WHEN displaying files THEN the system SHALL show indexing status (queued, indexing, ready, failed) for each file
3. WHEN the user imports files THEN the system SHALL support batch import of multiple text and Office files
4. WHEN files are imported THEN the system SHALL extract text content and convert to Markdown format for storage
5. WHEN files are processed THEN the system SHALL perform chunking and vectorization in the background using libsql vector database
6. WHEN the user clicks a file THEN the system SHALL open a Markdown editor in a popup or new view
7. WHEN the user saves edited content THEN the system SHALL automatically re-vectorize the modified Markdown content and update the vector database

### Requirement 8: Project Configuration System

**User Story:** As a user, I want to configure project-specific memory and notes, so that I can maintain project context and capture important information.

#### Acceptance Criteria

1. WHEN the user accesses project settings THEN the system SHALL display a project configuration view with plugin modules
2. WHEN viewing the Memory plugin THEN the system SHALL display structured key information in list format (project goals, constraints, terminology)
3. WHEN Memory plugin content exists THEN the system SHALL automatically merge it as System Prompt for all project conversations
4. WHEN the user modifies memory THEN the system SHALL support add, delete, edit, and query operations on memory entries
5. WHEN viewing the Notes plugin THEN the system SHALL display notes in card format
6. WHEN the user clicks "+" in Notes THEN the system SHALL open a minimal Markdown editor for creating new notes
7. WHEN the user selects text in project chat THEN the system SHALL show an "Add to Notes" shortcut button for one-click capture
8. WHEN notes are created THEN the system SHALL store them for user reference but NOT include them in AI conversation context

### Requirement 9: Settings and Configuration

**User Story:** As a user, I want to configure API connections, appearance, and view application information, so that I can customize the application to my preferences and requirements.

#### Acceptance Criteria

1. WHEN the user accesses API Configuration THEN the system SHALL provide separate configuration areas for Chat Model and Embedding Model
2. WHEN configuring models THEN the system SHALL require Base URL, API Key, and Model Name for each
3. WHEN the user clicks "Test Connection" THEN the system SHALL verify the API connection and display results
4. WHEN viewing Data Management THEN the system SHALL display the local data storage path (not modifiable in MVP)
5. WHEN in Data Management THEN the system SHALL NOT provide automatic cloud backup and recovery functionality
6. WHEN the user accesses Appearance settings THEN the system SHALL provide Light, Dark, and System theme options
7. WHEN viewing Plugins & Integrations THEN the system SHALL display "Coming Soon" for MCP functionality as future extension point
8. WHEN the user accesses About THEN the system SHALL display application logo, version number, official website, and open source license

### Requirement 10: File Import and Processing Workflow

**User Story:** As a system, I want to handle file imports through a robust background processing pipeline, so that users get reliable file indexing with clear status feedback.

#### Acceptance Criteria

1. WHEN the user uploads files THEN the renderer process SHALL send file paths and project ID to main process via IPC
2. WHEN the main process receives upload request THEN the system SHALL immediately create a database record with 'pending' status
3. WHEN processing files THEN the system SHALL extract readable text using file parsing libraries
4. WHEN text is extracted THEN the system SHALL convert to Markdown format and update database with file metadata
5. WHEN vectorization begins THEN the system SHALL push tasks to async processing queue and update status to 'processing'
6. WHEN worker processes vectorization THEN the system SHALL perform intelligent chunking and call Embedding Model API
7. WHEN vectorization completes THEN the system SHALL store vectors and metadata in libsql vector index table and update status to 'done'
8. WHEN vectorization fails THEN the system SHALL update status to 'failed' and record error details
9. WHEN status changes THEN the renderer process SHALL receive updates via IPC events and update file list UI

### Requirement 11: Conversation Workflow Management

**User Story:** As a system, I want to handle different conversation modes with appropriate context and RAG functionality, so that users get the right AI assistance based on their current context.

#### Acceptance Criteria

1. WHEN in project-external conversation THEN the system SHALL construct message objects with optional files/images and call Chat Model directly
2. WHEN processing files in external conversation THEN the system SHALL read plain text or convert images to Base64
3. WHEN in project-internal conversation THEN the system SHALL execute RAG by vectorizing user questions and searching project vector database
4. WHEN RAG retrieves content THEN the system SHALL construct final prompt with memory + retrieved segments + question
5. WHEN AI responds THEN the system SHALL stream responses back to renderer process with citation data for project conversations

### Requirement 12: System Performance and Reliability

**User Story:** As a user, I want the application to be responsive and reliable, so that I can work efficiently without interruptions or data loss.

#### Acceptance Criteria

1. WHEN performing time-consuming operations THEN the system SHALL execute them asynchronously in main process or worker processes
2. WHEN making external API requests THEN the system SHALL implement exponential backoff retry mechanisms
3. WHEN API requests fail after retries THEN the system SHALL display clear, actionable error messages with retry options
4. WHEN the application closes THEN the system SHALL persist all settings, session lists, conversation history, and unsent drafts
5. WHEN the application reopens THEN the system SHALL restore all previous state perfectly

### Requirement 13: Automatic Title Generation

**User Story:** As a user, I want conversations to automatically get meaningful titles, so that I can easily identify and organize my conversations.

#### Acceptance Criteria

1. WHEN any conversation completes its first valid exchange THEN the system SHALL trigger title generation
2. WHEN generating titles THEN the system SHALL send user's first question and AI's first response to main process via IPC
3. WHEN main process receives title request THEN the system SHALL call Chat Model to generate a concise conversation title
4. WHEN title generation succeeds THEN the system SHALL send new title back to renderer process via IPC
5. WHEN title is received THEN the system SHALL update the temporary title (like "Untitled Chat") in the sidebar