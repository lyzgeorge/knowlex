# Project Management Service Documentation

## Overview

The Project Management Service provides comprehensive CRUD (Create, Read, Update, Delete) operations for managing projects within the Knowlex desktop application. It serves as the core business logic layer for project-related operations, sitting between the database layer and the IPC communication layer.

## Architecture

The project management system follows a three-layer architecture:

```
┌─────────────────────────────┐
│     IPC Layer              │
│   (project.ts - IPC)       │ ← Secure communication with renderer
├─────────────────────────────┤
│   Service Layer            │
│  (project.ts - Service)    │ ← Business logic and validation
├─────────────────────────────┤
│   Database Layer           │
│    (queries.ts)            │ ← Data persistence and retrieval
└─────────────────────────────┘
```

## Service Layer API

### Core Functions

#### `createProject(data: CreateProjectData): Promise<Project>`

Creates a new project with validation and duplicate name checking.

**Parameters:**
- `data.name: string` - Project name (required, 1-100 characters)
- `data.description?: string` - Project description (optional)

**Validation Rules:**
- Name is required and non-empty after trimming
- Name must be 100 characters or less
- Name must be unique (case-insensitive)

**Returns:** Newly created `Project` object with generated ID and timestamps

**Example:**
```typescript
const project = await createProject({
  name: "My Research Project",
  description: "A project for analyzing market data"
})
```

#### `getProject(id: string, includeStats = false): Promise<Project | null>`

Retrieves a project by ID with optional statistics.

**Parameters:**
- `id: string` - Project ID (required)
- `includeStats: boolean` - Include project statistics (optional, default: false)

**Returns:** `Project` object with optional stats, or `null` if not found

**Example:**
```typescript
const project = await getProject("abc123", true)
if (project) {
  console.log(`Files: ${project.stats?.fileCount}`)
}
```

#### `listProjects(includeStats = false): Promise<Project[]>`

Lists all projects ordered by last updated date (newest first).

**Parameters:**
- `includeStats: boolean` - Include statistics for each project (optional, default: false)

**Returns:** Array of `Project` objects

**Performance Notes:**
- When `includeStats` is true, statistics are fetched concurrently using `Promise.allSettled()`
- Failed stat queries don't affect the overall result

#### `updateProject(id: string, data: UpdateProjectData): Promise<Project>`

Updates an existing project with validation.

**Parameters:**
- `id: string` - Project ID (required)
- `data.name?: string` - New project name (optional)
- `data.description?: string` - New project description (optional)

**Validation Rules:**
- Project must exist
- If name provided, must follow same rules as create
- Name uniqueness checked excluding current project
- No-op if no changes provided

**Returns:** Updated `Project` object

#### `deleteProject(id: string): Promise<void>`

Safely deletes a project and logs statistics.

**Parameters:**
- `id: string` - Project ID (required)

**Cascade Behavior:**
- Related `project_files` are deleted
- Related `project_memories` are deleted  
- Related `project_notes` are deleted
- Related `conversations` have `project_id` set to null (preserved as unclassified)

**Logging:** Logs deletion with project statistics before removal

#### `getProjectStatistics(id: string): Promise<ProjectStats>`

Gets detailed statistics for a project.

**Parameters:**
- `id: string` - Project ID (required)

**Returns:** `ProjectStats` object containing:
- `conversationCount: number` - Number of conversations in project
- `messageCount: number` - Total messages across all project conversations
- `fileCount: number` - Number of files in project
- `totalFileSize: number` - Combined size of all project files in bytes

#### `duplicateProject(id: string): Promise<Project>`

Creates a copy of a project with same configuration but no conversation history.

**Parameters:**
- `id: string` - Source project ID (required)

**Behavior:**
- Copies name (with " Copy" suffix), description
- Generates new ID and timestamps
- Does NOT copy: conversations, files, memories, notes

**Returns:** New `Project` object

## IPC Communication Layer

### Channel Registration

The IPC layer registers secure handlers for all project operations:

```typescript
// Registered channels
'project:create'    // Create new project
'project:list'      // List all projects
'project:get'       // Get single project
'project:update'    // Update project
'project:delete'    // Delete project  
'project:stats'     // Get project statistics
'project:duplicate' // Duplicate project
```

### Request/Response Format

All IPC operations follow the `IPCResult<T>` pattern:

```typescript
interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
```

**Success Response:**
```typescript
{
  success: true,
  data: { /* project data */ }
}
```

**Error Response:**
```typescript
{
  success: false,
  error: "Project name is required"
}
```

### Input Validation

The IPC layer provides comprehensive input validation:

- **Channel Security:** Only whitelisted channels accepted
- **Type Validation:** Request data structure validation
- **Parameter Sanitization:** Input trimming and type coercion
- **Error Handling:** Consistent error format and logging

### Real-time Events

The system supports real-time notifications via event broadcasting:

```typescript
// Event types
PROJECT_EVENTS.CREATED      // 'created'
PROJECT_EVENTS.UPDATED      // 'updated'
PROJECT_EVENTS.DELETED      // 'deleted'
PROJECT_EVENTS.STATS_UPDATED // 'stats_updated'
```

Events are sent to all active renderer windows using the pattern:
```typescript
window.webContents.send(`project:${eventType}`, data)
```

## Database Schema

### Projects Table

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

### Related Tables

- `project_files` - Files belonging to projects (CASCADE DELETE)
- `project_memories` - Project memory/system prompts (CASCADE DELETE)  
- `project_notes` - User notes for projects (CASCADE DELETE)
- `conversations` - Conversations linked to projects (SET NULL on delete)

### Indexes

Optimized indexes for common query patterns:
- `idx_conversations_project_id` - Fast conversation lookup by project
- `idx_project_files_project_id` - Fast file lookup by project
- `idx_project_memories_project_id` - Fast memory lookup by project
- `idx_project_notes_project_id` - Fast notes lookup by project

## Error Handling

### Service Layer Errors

- **Input Validation:** Clear messages for invalid data
- **Business Rules:** Descriptive errors for constraint violations
- **Database Errors:** Wrapped with context information
- **Logging:** All errors logged with operation context

### IPC Layer Errors

- **Request Validation:** Validates request structure and types
- **Service Errors:** Wraps service layer errors in IPCResult format
- **Unknown Errors:** Handles unexpected errors gracefully
- **Security:** Prevents error information leakage

## Usage Examples

### Frontend Integration

```typescript
// Create a new project
const result = await window.knowlex.project.create({
  name: "Research Project",
  description: "Market analysis project"
})

if (result.success) {
  console.log('Created:', result.data)
} else {
  console.error('Error:', result.error)
}

// List all projects with stats
const projects = await window.knowlex.project.list()
if (projects.success) {
  projects.data.forEach(project => {
    console.log(`${project.name}: ${project.stats?.fileCount} files`)
  })
}

// Update project
const updated = await window.knowlex.project.update({
  id: "abc123",
  name: "Updated Project Name"
})

// Delete project
const deleted = await window.knowlex.project.delete("abc123")
```

### Event Listening

```typescript
// Listen for project events
window.knowlex.events.on('project:created', (project) => {
  console.log('New project created:', project)
  // Update UI
})

window.knowlex.events.on('project:deleted', (projectId) => {
  console.log('Project deleted:', projectId)
  // Remove from UI
})
```

## Performance Considerations

### Service Layer Optimizations

- **Concurrent Statistics:** Uses `Promise.allSettled()` for parallel stat queries
- **Early Validation:** Input validation before database operations
- **No-op Detection:** Skips database calls when no changes are made
- **Efficient Queries:** Leverages database indexes for fast lookups

### Database Optimizations

- **Indexed Queries:** All lookups use appropriate indexes
- **Transaction Management:** Atomic operations with proper rollback
- **Cascade Efficiency:** Database-level cascading for consistent deletes

### Memory Management

- **Connection Reuse:** Single database connection across operations
- **Error Cleanup:** Proper resource cleanup on failures
- **Event Cleanup:** IPC handler registration/unregistration

## Security Considerations

### Input Sanitization

- **SQL Injection Prevention:** Parameterized queries throughout
- **XSS Prevention:** Input trimming and validation
- **Type Safety:** Strong TypeScript typing prevents type confusion

### IPC Security

- **Channel Whitelisting:** Only approved channels accepted
- **Request Validation:** All inputs validated before processing
- **Error Filtering:** No sensitive information leaked in error messages

### Data Access Control

- **ID Validation:** Project ID validation prevents unauthorized access
- **Existence Checks:** Operations verify project exists before proceeding
- **Atomic Operations:** Database transactions ensure data consistency

## Testing Strategy

### Unit Testing Approach

- **Service Functions:** Test each CRUD operation independently
- **Validation Logic:** Test all input validation rules
- **Error Scenarios:** Test error handling and edge cases
- **Database Operations:** Test with in-memory database

### Integration Testing

- **IPC Communication:** Test end-to-end IPC call flow
- **Database Transactions:** Test transaction rollback scenarios
- **Event Broadcasting:** Test real-time event delivery

### Test Data Management

- **Cleanup:** Ensure tests clean up created data
- **Isolation:** Each test uses unique data to avoid conflicts
- **Mock Services:** Mock external dependencies where appropriate

## Maintenance and Monitoring

### Logging

All operations are logged with appropriate levels:
- **INFO:** Successful operations with key details
- **WARN:** Recoverable errors (e.g., stat query failures)
- **ERROR:** Operation failures with full context

### Monitoring Points

Key metrics to monitor:
- Project creation/deletion rates
- Query performance (especially with stats)
- Error rates by operation type
- IPC communication latency

### Common Issues

1. **Database Lock:** Ensure proper transaction management
2. **Memory Leaks:** Verify IPC handler cleanup
3. **Validation Errors:** Check for proper input sanitization
4. **Performance:** Monitor stat query performance with large projects

## Future Enhancements

### Potential Improvements

- **Batch Operations:** Support for bulk project operations
- **Search:** Full-text search across project names and descriptions
- **Versioning:** Project configuration versioning and rollback
- **Templates:** Project template system for common configurations
- **Export/Import:** Project backup and restore functionality

### Scalability Considerations

- **Pagination:** Add pagination support for large project lists
- **Caching:** Implement query result caching for frequently accessed data
- **Background Tasks:** Move heavy operations to background workers
- **Database Optimization:** Consider database-specific optimizations for large datasets