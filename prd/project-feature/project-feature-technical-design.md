# Technical Design: Project Management Feature

**Version:** 1.0
**Date:** August 24, 2025
**Author:** Gemini

## 1. Introduction

This document outlines the technical implementation plan for the Project Management feature. It translates the product requirements from `project-feature-prd.md` and `project-feature-mockups.md` into a concrete engineering plan, covering data models, backend services, frontend components, and IPC communication.

## 2. Goals and Scope

### 2.1. Goals
- To implement a robust system for users to create, manage, and delete projects.
- To enable the association of conversations with projects.
- To build a dedicated project page for viewing and managing project-specific conversations.
- To ensure the new data model is scalable and performant.

### 2.2. Out of Scope
- Project collaboration or sharing features.
- Project-scoped search functionality.
- Advanced project properties (e.g., deadlines, statuses).

## 3. Data Model

The database schema will be updated to support projects. This will involve one new table and a modification to an existing table.

### 3.1. New Table: `projects`

A new table will be created to store project information.

**Schema:**
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

- `id`: A unique identifier for the project (e.g., UUID).
- `name`: The user-defined name of the project. Must be unique.
- `created_at`: Timestamp of when the project was created.
- `updated_at`: Timestamp of the last update.

### 3.2. Modified Table: `conversations`

The `conversations` table will be altered to include a foreign key reference to the `projects` table.

**Alteration:**
```sql
ALTER TABLE conversations
ADD COLUMN project_id TEXT NULL
REFERENCES projects(id) ON DELETE CASCADE;
```

- `project_id`: A nullable text field that stores the ID of the project the conversation belongs to. If `NULL`, the conversation is considered "uncategorized".
- `ON DELETE CASCADE`: This is a critical part of the implementation. When a project is deleted from the `projects` table, this constraint will automatically delete all conversations in the `conversations` table that have a matching `project_id`. This handles the requirement that deleting a project also deletes all its conversations.

An index will be created on `project_id` to ensure efficient querying of conversations by project.

```sql
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
```

## 4. Backend Architecture (Main Process)

### 4.1. New Project Service (`src/main/services/project-service.ts`)

A new service will be responsible for all business logic related to projects.

**Interface:**
```typescript
interface IProjectService {
  createProject(name: string): Promise<Project>;
  getProjectById(id: string): Promise<Project | null>;
  getAllProjects(): Promise<Project[]>;
  updateProject(id: string, updates: { name: string }): Promise<Project>;
  deleteProject(id: string): Promise<void>;
}
```

- **`createProject`**: Inserts a new project into the `projects` table.
- **`getAllProjects`**: Retrieves all projects, ordered by `created_at` descending.
- **`updateProject`**: Updates a project's name.
- **`deleteProject`**: Deletes a project and relies on `ON DELETE CASCADE` to remove associated conversations.

### 4.2. Updates to Conversation Service (`src/main/services/conversation.ts`)

The existing conversation service will be updated to handle project associations.

**New/Updated Methods:**
```typescript
// New method
moveConversation(conversationId: string, projectId: string | null): Promise<void>;

// Existing methods like `createConversation` will be updated
// to optionally accept a `projectId`.
createConversation(params: { ...; projectId?: string }): Promise<Conversation>;
```

- **`moveConversation`**: Updates the `project_id` for a given `conversationId`. Setting `projectId` to `null` moves it to the uncategorized list.

### 4.3. IPC Layer (`src/main/ipc/project.ts`)

New IPC channels will be created to expose project and conversation management functionality to the renderer process.

**Channels:**
- `project:create`
- `project:list`
- `project:update`
- `project:delete`
- `conversation:move`

These handlers will call the respective service methods and handle any errors. We will also use `ipcMain.emit` to notify all renderer windows of changes (e.g., `project:created`, `project:deleted`) to ensure UI consistency across the application.

## 5. Frontend Architecture (Renderer Process)

### 5.1. State Management (Zustand Stores)

#### 5.1.1. New Project Store (`src/renderer/stores/project.ts`)

A new store will manage the state of projects.

**State and Actions:**
```typescript
interface ProjectState {
  projects: Project[];
  expandedProjects: Set<string>; // Track which projects are expanded in sidebar
  
  // CRUD Actions
  fetchProjects: () => Promise<void>;
  addProject: (name: string) => Promise<void>;
  editProject: (id: string, name: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  
  // Expansion State Management
  toggleProjectExpansion: (projectId: string) => void;
  expandProject: (projectId: string) => void;
  collapseProject: (projectId: string) => void;
  isProjectExpanded: (projectId: string) => boolean;
}
```

**Expansion State Persistence:**
- `expandedProjects` state is persisted to localStorage
- Default state: all projects collapsed
- State survives app restart

This store will interact with the main process via the IPC bridge.

#### 5.1.2. Updates to Conversation Store (`src/renderer/stores/conversation.ts`)

The conversation store will be updated to handle project context with minimal state changes.

**Updated Actions:**
```typescript
interface ConversationState {
  // ... existing state (no new derived collections)
  
  // Actions
  moveConversationToProject: (conversationId: string, projectId: string | null) => Promise<void>;
  createConversationInProject: (projectId: string, title?: string) => Promise<Conversation>;
  // ... existing actions remain unchanged
}
```

**Data Access Patterns:**
Components will filter conversations by `projectId` at render time:
- `conversations.filter(c => c.projectId === projectId)` for project conversations
- `conversations.filter(c => !c.projectId)` for uncategorized conversations

### 5.2. Component Structure

#### 5.2.1. New Components

- **`src/renderer/components/features/projects/ProjectPage.tsx`**: The main view for a single project, accessible via `/projects/:id`. It will display a list of `ConversationCard` components and include a chat input box to start a new conversation within that project.
- **`src/renderer/components/features/projects/ConversationCard.tsx`**: A card-based representation of a conversation for the `ProjectPage`.
- **`src/renderer/components/ui/ConversationMenu.tsx`**: Shared component for conversation actions (Move/Rename/Delete) across Sidebar, ProjectSidebarItem and ProjectPage
- **`src/renderer/components/ui/DeleteProjectModal.tsx`**: A two-step confirmation modal for deleting a project, including the name-typing confirmation.

**Existing Components to Reuse:**
- **`Input.tsx`**: For inline project name editing with controlled state
- **`Button.tsx`**: For [+] project creation and action buttons 
- **`Modal.tsx`**: As base component for DeleteProjectModal
- **`ChatInputBox.tsx`**: Reused in ProjectPage for creating conversations within project context
- **`AutoResizeTextarea.tsx`**: For chat input if needed separately from ChatInputBox

#### 5.2.2. Updated Components

- **`src/renderer/components/layout/Sidebar.tsx`**: Will be modified to include a "Projects" section that renders project items above the existing "Conversations" list.
- **`src/renderer/pages/MainApp.tsx`**: Will be updated to include the new routes for project pages.

### 5.3. Routing

The application's routing will be updated to accommodate project pages.

- `/projects/:projectId`: Displays the `ProjectPage` for the given project.
- `/conversations/:conversationId`: The existing route for uncategorized conversations.
- `/projects/:projectId/conversations/:conversationId`: A new route for conversations within a project, ensuring the correct project context is maintained.

## 6. Key User Flow Implementation Details

### 6.1. Creating a Project (Inline Editing Implementation)
1.  User clicks `[+]` in the sidebar.
2.  **Inline Input Rendering**: `Sidebar.tsx` component sets `isCreating: true` state and renders controlled `Input` component:
    ```typescript
    {isCreating && (
      <Input
        value={newProjectName}
        onChange={(value) => setNewProjectName(value)}
        placeholder="Project name"
        autoFocus
        onKeyDown={handleKeyDown} // Enter = save, Escape = cancel
        rightIcon={
          <>
            <Button variant="ghost" onClick={handleCancel}>×</Button>
            <Button variant="ghost" onClick={handleSave} disabled={!newProjectName.trim()}>✓</Button>
          </>
        }
      />
    )}
    ```
3. **Validation**: Real-time validation for empty names and duplicate names
4. **Save Actions**: On Enter/[√], calls `project.ts` store's `addProject` action with name validation
5. **IPC & State Update**: Triggers `project:create` IPC call, broadcasts `project:created` event
6. **UI Update**: New project appears at top of list, input field disappears

### 6.2. Project Rename (Inline Editing Implementation)
1. **Trigger**: User clicks [...] menu on project and selects "Rename" 
2. **Edit Mode Activation**: Project item component sets `isEditing: true` and renders inline `Input`:
   ```typescript
   {isEditing ? (
     <Input
       value={editingName}
       onChange={(value) => setEditingName(value)}
       autoFocus
       onBlur={handleSave} // Save on blur
       onKeyDown={handleKeyDown} // Enter = save, Escape = cancel
       rightIcon={
         <>
           <Button variant="ghost" onClick={handleCancel}>×</Button>
           <Button variant="ghost" onClick={handleSave} disabled={!editingName.trim()}>✓</Button>
         </>
       }
     />
   ) : (
     <span onClick={handleClick}>{project.name}</span>
   )}
   ```
3. **Real-time Validation**: Check for empty names, duplicate names, max length
4. **Save/Cancel**: Enter/blur/[√] saves changes, Escape/[×] cancels and reverts
5. **IPC Update**: Calls `project:update` IPC with validated name
6. **State Sync**: Project name updates across all UI locations

### 6.3. Moving a Conversation  
1.  User clicks `[...]` on a conversation item and selects a new project from the "Move" submenu.
2.  The `conversation.ts` store's `moveConversationToProject` action is called.
3.  This triggers the `conversation:move` IPC call.
4.  The main process updates the conversation's `project_id`.
5.  A `conversation:updated` event is broadcast.
6.  Renderer stores update, and the conversation visually moves to its new location in the sidebar.

### 6.4. Deleting a Project
1.  User clicks `[...]` on a project and selects "Delete".
2.  The `DeleteProjectModal.tsx` component is displayed.
3.  The user must complete the two-step confirmation. The second step will have a controlled input that is validated against the project name in real-time. The "Delete" button's disabled state is tied to this validation.
4.  On final confirmation, the `project.ts` store's `removeProject` action is called.
5.  This triggers the `project:delete` IPC call.
6.  The main process deletes the project. The `ON DELETE CASCADE` constraint automatically deletes all associated conversations.
7.  The main process broadcasts `project:deleted` and `conversations:deleted` events with the IDs of all affected items.
8.  Renderer stores update, removing the project and its conversations from the UI.

### 6.5. Creating Conversations Within Project Context

**From Project Page:**
1. **Input Component**: ProjectPage renders `ChatInputBox` component with `variant="project-entrance"`
2. **Context Passing**: ChatInputBox receives `projectId` prop from ProjectPage  
3. **Message Creation**: On send, calls `conversation.createConversationInProject(projectId, message)` 
4. **Service Flow**: 
   ```typescript
   // In conversation store
   createConversationInProject: async (projectId: string, firstMessage: string) => {
     const conversation = await window.knowlex.createConversation({
       title: '', // Will be auto-generated
       projectId  // Set project context
     });
     
     const message = await window.knowlex.addMessage({
       conversationId: conversation.id,
       role: 'user',
       content: firstMessage
     });
     
     // Navigate to new conversation in project context
     navigate(`/projects/${projectId}/conversations/${conversation.id}`);
     
     // Trigger AI response
     await generateReplyForNewMessage(message.id, conversation.id);
   }
   ```

**From Sidebar (within expanded project):**
- Alternative: Add small "+" icon next to project name for quick conversation creation  
- Same flow as above but triggered from sidebar project item

## 7. Shared Types (`src/shared/types/project.ts`)

A new file will be created to define the `Project` type, ensuring consistency between the main and renderer processes.

```typescript
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
```

The `Conversation` type in `src/shared/types/conversation.ts` will be updated:
```typescript
export interface Conversation {
  // ... existing fields
  projectId: string | null;
}
```

## 8. Open Questions and Considerations

1.  **Data Migration**: A database migration script will be required to add the `project_id` column to the `conversations` table for existing users. This migration should be non-destructive. This will be handled in `src/main/database/migrations.ts`.
2.  **Performance**: With a large number of projects and conversations, rendering the sidebar could become slow. Virtualization for the lists in the sidebar might be considered in a future iteration if performance issues arise. For the initial implementation, we will proceed without it.
3.  **Error Handling**: All IPC calls will have robust `try...catch` blocks. The frontend will display user-friendly notifications (using the existing `Notification` system) for any failed operations (e.g., creating a project with a duplicate name).
