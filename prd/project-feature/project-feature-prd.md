# Project Management Feature - Product Requirements Document

**Version:** 1.0  
**Date:** August 24, 2025  
**Author:** Development Team  

## 1. Executive Summary

### 1.1 Feature Overview
The Project Management feature introduces a hierarchical organization system for conversations in Knowlex. Users can create projects as virtual folders to categorize and organize their conversations, enabling better workspace management and conversation discovery.

### 1.2 Core Value Proposition
- **Organization**: Group related conversations into logical projects
- **Navigation**: Improved conversation discovery through structured hierarchy  
- **Workflow**: Project-centric workspace for focused discussions
- **Scalability**: Foundation for future features like project-scoped RAG and collaboration

## 2. User Requirements

### 2.1 Primary User Stories

**As a user, I want to:**
- Create projects to organize my conversations by topic/theme
- Move conversations between projects to maintain organization  
- View all conversations within a specific project
- Access a project overview page showing project details and conversations
- Rename and delete projects when no longer needed
- **Have conversations default to "Conversations" section (no project assignment)**
- **Understand that deleting a project will permanently delete all its conversations**

### 2.2 User Journey

```
1. User creates a new project (e.g., "AI Research")
2. User moves existing conversations into the project
3. User creates new conversations directly within the project
4. User navigates to project page to see all related conversations
5. User can move conversations between projects as topics evolve
```

## 3. Functional Requirements

### 3.1 Project Management (CRUD)

**Create Project:**
- Click "+" icon in sidebar Projects section
- **Inline input field appears below Projects header**
- Project name input (max 100 characters) with [×] cancel and [√] confirm buttons
- Auto-save on Enter/blur or [√] click, cancel on Escape or [×] click
- Unique project names required
- **New project appears at top of projects list (newest first)**

**Read/View Projects:**
- Projects displayed in sidebar above Conversations section
- Format: `[FolderIcon] Project Name [...options]`
- Collapsible/expandable to show project conversations via FolderIcon
- Default state: collapsed
- **Projects ordered by creation time (newest first)**

**Update Project:**
- Inline editing on project name click
- Same interaction pattern as conversation renaming
- Real-time validation and auto-save

**Delete Project:**
- "..." menu option to delete
- **Two-step confirmation dialog required:**
  - **Step 1**: Warning dialog explaining permanent deletion with counts (projects, conversations, messages)
  - **Step 2**: Type project name exactly to confirm deletion with real-time name matching validation
- **ALL project conversations are permanently deleted with the project**
- Cannot delete if user cancels confirmation or enters incorrect project name
- **Delete button disabled until names match exactly**
- **Visual feedback**: ✓ Names match / Names don't match indicators

### 3.2 Conversation-Project Association

**Move Conversations:**
- **From Uncategorized**: "Move to" option in conversation [...] menu with submenu showing all available projects
- **Between Projects**: "Move" option with submenu showing:
  - "Remove from project" (moves to uncategorized)
  - Separator line
  - All other available projects (excluding current project)
- **Immediate action**: Click project name directly moves conversation (no confirmation dialog)
- **Hover/click interaction**: Hover "Move ▶" shows submenu, click project executes move
- Conversations can only belong to ONE project (exclusive relationship)
- Real-time UI updates across all views

**Project Conversations Display:**
- Expandable list under each project in sidebar
- Same conversation item format as current implementation
- Conversation actions (rename, delete) available within project context

### 3.3 Project Page

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│                   Project Name                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│              [Chat Input Box]                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Conversation Cards (Vertical Stack)               │
│  ┌─────────────────────────────────────────────┐   │
│  │ Conversation Name                      2h   │   │
│  │ Last message preview...               [...] │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ Another Conversation                   1d   │   │
│  │ Another message preview...            [...] │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Project Page Features:**
- Dedicated URL/route for each project
- Project name as page header with [...] menu for project actions
- **"Start a New Conversation"** section with chat input box for creating conversations in this project
- **"Project Conversations (N)"** section showing conversation count
- Vertical list of conversation cards showing:
  - **Icon + conversation title** (💬)
  - Last message preview (truncated, single line)
  - Last activity timestamp (2h, 1d, 3d format)
  - Options menu [...] for Move/Rename/Delete

**Conversation Card Actions:**
- **Click card**: Navigate to conversation
- **[...] Menu**: Move to other project | Rename | Delete
- **Move submenu**: "Remove from Project" + separator + list of other projects
- **Empty state**: Shows "Start Your First Conversation" when project has no conversations

### 3.4 Navigation & Routing

**Sidebar Navigation:**
```
Projects                    [+]
├─ 📁 AI Research          [...] 
│   ├─ GPT-4 Analysis
│   └─ Model Comparison  
├─ 📁 Work Tasks           [...]
│   └─ Sprint Planning
└─ 📁 Personal             [...]

Conversations
├─ Random Chat
└─ Quick Question
```

**URL Structure:**
- Project page: `/projects/{projectId}`  
- Conversation in project: `/projects/{projectId}/conversations/{conversationId}`
- Uncategorized conversation: `/conversations/{conversationId}`

## 4. Technical Requirements

### 4.1 Database Schema Changes

**New Table: `projects`**
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

**Modified Table: `conversations`**
```sql
ALTER TABLE conversations ADD COLUMN project_id TEXT;
-- Add foreign key constraint
-- Add index on project_id for performance
```

### 4.2 API Layer (Main Process Services)

**New Service: `src/main/services/project.ts`**

- `createProject(data: CreateProjectData): Promise<Project>`
- `getProject(id: string): Promise<Project | null>`
- `listProjects(): Promise<Project[]>`
- `updateProject(id: string, data: UpdateProjectData): Promise<Project>`
- `deleteProject(id: string): Promise<void>`
- `getProjectConversations(projectId: string): Promise<Conversation[]>`

**Updated Service: `src/main/services/conversation.ts`**
- `moveConversationToProject(conversationId: string, projectId: string | null): Promise<void>`
- Modify existing methods to handle project context

**New IPC Handlers: `src/main/ipc/project.ts`**

- Register handlers for all project operations
- Event broadcasting for project changes
- Validation and error handling

### 4.3 Frontend Architecture

**New Store: `src/renderer/stores/project.ts`**
```typescript
interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  
  // Actions
  loadProjects(): Promise<void>
  createProject(name: string): Promise<Project>
  updateProject(id: string, data: Partial<Project>): Promise<void>
  deleteProject(id: string): Promise<void>
  setCurrentProject(project: Project | null): void
}
```

**New Components:**
- `src/renderer/components/features/projects/ProjectPage.tsx`
- `src/renderer/components/features/projects/ProjectSidebar.tsx` 
- `src/renderer/components/features/projects/ConversationCard.tsx`
- `src/renderer/components/ui/ConversationMenu.tsx` abstract a common component for Sidebar and ProjectSidebar and ProjectPage for conversation card

**Updated Components:**

- `Sidebar.tsx`: Add Projects section above Conversations
- `MainApp.tsx`: Add routing for project pages
- Conversation components: Add project context awareness

### 4.4 Shared Types

**New Types: `src/shared/types/project.ts`**
```typescript
interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

interface CreateProjectData {
  name: string
}

interface UpdateProjectData {
  name?: string
}
```

## 5. User Interface Design

MUST READ, Refer to  `prd/project-feature/project-feature-mockups.md` 

### 5.5 Project Creation/Rename Flow

**Project Creation Steps:**

1. **Click [+] button** → Inline input field appears below "Projects" header
2. **Type project name** → Shows [×] cancel and [√] confirm buttons
3. **Save on Enter/[√]** → Project created and added to top of list
4. **Cancel on Escape/[×]** → Input field disappears, no project created

**Project Rename Steps:**

1. **Click [...] menu → Rename** → Inline edit mode activated
2. **Edit project name** → Shows [×] cancel and [√] confirm buttons
3. **Save on Enter/blur/[√]** → Project name updated in place
4. **Cancel on Escape/[×]** → Reverts to original name

## 6. Questions for Clarification

### 6.1 Business Logic 
1. **Project Deletion**: ✅ **ALL project conversations are permanently deleted with the project**
   - ✅ **Requires typing project name to confirm deletion**
2. **Default Project**: ✅ **No default project - conversations start in "Conversations" section (uncategorized)**

### 6.2 User Experience 
4. **Project Ordering**: ✅ **Projects ordered by creation time (newest first)**

5. **Search Scope**: ✅ **No search functionality in initial implementation**

6. **Empty Projects**: ✅ **Empty projects are preserved (not auto-deleted)**

## 7. Success Criteria

### 7.1 Functional Success
- Users can create, read, update, delete projects
- Conversations can be moved between projects seamlessly  
- Project page displays correctly with conversation cards
- Sidebar navigation reflects project structure accurately

### 7.2 Technical Success  
- Database migrations complete without data loss
- IPC communication handles all project operations reliably
- Frontend state management keeps project/conversation data synchronized
- Performance remains responsive with 50+ projects and 500+ conversations

### 7.3 User Experience Success
- Project operations feel intuitive and consistent with existing patterns
- No breaking changes to current conversation workflows
- Visual hierarchy clearly communicates project/conversation relationships
- All interactions provide appropriate feedback and error handling
