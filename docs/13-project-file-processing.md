# Project File Processing Module

## Overview

The Project File Processing Module handles permanent file uploads for projects with a robust background processing pipeline. Files are processed through multiple stages: upload → extract → chunk → vectorize → index, with comprehensive status tracking and error recovery mechanisms.

## Architecture

### Processing Pipeline

```
File Upload → Validation → Storage → Queue → Processing → Vectorization → Ready
     ↓            ↓          ↓        ↓         ↓            ↓           ↓
   Pending    Validation   File     Queue    Processing   Chunking    Ready
   Status     Errors      Storage   Task     Status      & Vectors   Status
```

### Key Components

1. **File Upload Service** (`uploadProjectFiles`)
   - Validates file constraints (size, type, count)
   - Stores files in project-specific directories
   - Creates database records with 'pending' status
   - Adds files to processing queue

2. **Background Processing Queue** (`FileProcessingQueue`)
   - Manages concurrent file processing (max 2 concurrent)
   - Implements priority-based task scheduling
   - Provides automatic retry with exponential backoff
   - Emits events for real-time status updates

3. **RAG Processing** (`processFileForRAG`)
   - Uses dedicated file-parser service for robust content extraction
   - Supports multiple formats: PDF, Office documents, plain text, code files
   - Chunks content for optimal vectorization with metadata preservation
   - Stores chunks in database for similarity search
   - Updates file status and chunk count

4. **File Management** (`deleteProjectFile`, `retryFileProcessing`)
   - Complete file lifecycle management
   - Error recovery and retry mechanisms
   - Queue management operations

## File Processing Workflow

### 1. File Upload Process

```typescript
// Upload files to a project
const files = [
  { name: 'document.pdf', content: '...', size: 1024000 },
  { name: 'notes.md', content: '...', size: 2048 }
]

const uploadedFiles = await uploadProjectFiles(projectId, files)
// Returns: ProjectFile[] with 'pending' status
```

**Steps:**
1. Validate file constraints (type, size, count)
2. Create project files directory if needed
3. Generate unique file IDs and sanitized filenames
4. Write file content to disk
5. Create database records with 'pending' status
6. Add processing tasks to queue

### 2. Background Processing

The processing queue automatically handles files in the background:

```typescript
// Queue automatically processes files
// Status transitions: pending → processing → ready/failed
```

**Processing Steps:**
1. Parse file content using file-parser service (supports PDF, Office docs, text, code)
2. Validate extracted content is not empty
3. Chunk content for vectorization (1000 chars with 200 char overlap)
4. Store chunks in database with enhanced metadata (parser info, MIME type)
5. Update file status to 'ready' or 'failed'

### 3. Error Handling and Retry

```typescript
// Automatic retry with exponential backoff
// Max 3 attempts per file
// Failed files can be manually retried
await retryFileProcessing(fileId)
```

## File Status State Machine

```
pending ──────► processing ──────► ready
   │                │                 ▲
   │                ▼                 │
   └──────────► failed ──────────────┘
                  │
                  ▼
               (retry)
```

### Status Descriptions

- **pending**: File uploaded, waiting for processing
- **processing**: Currently being processed (text extraction, chunking)
- **ready**: Successfully processed and available for RAG
- **failed**: Processing failed after max retries

## API Reference

### Core Functions

#### `uploadProjectFiles(projectId, files)`
Upload files to a project and start background processing.

**Parameters:**
- `projectId` (string): Target project ID
- `files` (Array): File data with name, content, and size

**Returns:** `Promise<ProjectFile[]>` - Array of created file records

**Example:**
```typescript
const files = await uploadProjectFiles('proj-123', [
  { name: 'doc.pdf', content: pdfContent, size: 1024000 }
])
```

#### `processFileForRAG(fileId)`
Process a single file for RAG (called automatically by queue).

**Parameters:**
- `fileId` (string): File ID to process

**Returns:** `Promise<void>`

**Throws:** Processing errors with detailed messages

#### `deleteProjectFile(fileId)`
Delete a project file and all associated data.

**Parameters:**
- `fileId` (string): File ID to delete

**Returns:** `Promise<void>`

**Actions:**
- Removes from processing queue
- Deletes file chunks from database
- Deletes physical file from disk
- Removes file record from database

### Queue Management

#### `startProcessingQueue()`
Initialize and start the background processing queue.

**Called:** During application startup

**Features:**
- Concurrent processing (max 2 files)
- Priority-based scheduling
- Event emission for status updates

#### `getProcessingQueueStatus()`
Get current queue status information.

**Returns:**
```typescript
{
  pending: number,    // Files waiting to be processed
  processing: number, // Files currently being processed
  total: number      // Total files in queue
}
```

#### `retryFileProcessing(fileId)`
Retry processing a failed file.

**Parameters:**
- `fileId` (string): Failed file ID to retry

**Requirements:**
- File must be in 'failed' status
- Resets status to 'pending'
- Adds to queue with high priority

#### `pauseFileProcessing(fileId)` / `resumeFileProcessing(fileId)`
Pause or resume file processing.

**Use Cases:**
- Temporary pause during system maintenance
- User-initiated pause/resume
- Resource management

## File Constraints

### Project Files
- **Max File Size:** 50MB per file
- **Max Total Size:** 500MB per project
- **Max File Count:** 100 files per project
- **Supported Types:** 
  - **Plain Text:** .txt, .md, .csv, .json, .xml, .html, .htm
  - **PDF Documents:** .pdf (using pdf-parse library)
  - **Office Documents:** .docx, .pptx, .xlsx, .odt, .odp, .ods (using officeparser)
  - **Code Files:** .js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .h, .cs, .php, .rb, .go, .rs, .swift, .kt

### Processing Limits
- **Max Concurrent:** 2 files processed simultaneously
- **Max Retries:** 3 attempts per file
- **Chunk Size:** 1000 characters with 200 character overlap

## Error Recovery Strategies

### 1. Automatic Retry
- Exponential backoff: 2^attempt seconds
- Max 3 attempts per file
- Lower priority for retry attempts
- Detailed error logging

### 2. Manual Recovery
```typescript
// Check failed files
const files = await listProjectFiles(projectId)
const failedFiles = files.filter(f => f.status === 'failed')

// Retry specific file
await retryFileProcessing(failedFileId)

// Or delete and re-upload
await deleteProjectFile(failedFileId)
```

### 3. Queue Recovery
- Queue state persists across app restarts
- Pending files automatically resume processing
- Processing files reset to pending on startup

## Performance Considerations

### Chunking Strategy
- **Optimal Size:** 1000 characters balances context and granularity
- **Overlap:** 200 characters prevents information loss at boundaries
- **Word Boundaries:** Chunks break at natural language boundaries
- **Enhanced Metadata:** Each chunk includes:
  - Position information (start/end offsets)
  - Parser metadata (extraction method, document properties)
  - MIME type and file extension
  - Original filename and chunk size

### Concurrent Processing
- **Limit:** 2 concurrent files prevents resource exhaustion
- **Priority:** User-initiated retries get higher priority
- **Resource Management:** Memory and CPU usage monitored

### Storage Optimization
- **File Deduplication:** Unique filenames prevent conflicts
- **Directory Structure:** Project-based organization
- **Cleanup:** Automatic cleanup on file deletion

## File Parser Integration

The project file processing module leverages the dedicated file-parser service for robust content extraction:

### Parser Capabilities
- **PlainTextParser:** Handles text files, code files, CSV, JSON, XML, HTML
- **PDFParser:** Uses pdf-parse library for comprehensive PDF text extraction
- **OfficeParser:** Uses officeparser for Microsoft Office and OpenDocument formats

### Parser Benefits
- **Format-Specific Optimization:** Each parser is optimized for its file types
- **Rich Metadata:** Parsers provide detailed metadata about document structure
- **Error Handling:** Robust error handling with fallback encoding support
- **Extensibility:** Easy to add new file format support

### Enhanced Chunk Metadata
Each processed chunk now includes:
```typescript
{
  filename: string,
  chunkSize: number,
  startOffset: number,
  endOffset: number,
  parserMetadata: {
    extension: string,
    parser: string,
    pages?: number,        // For PDFs
    version?: string,      // For PDFs
    encoding?: string      // For text files
  },
  mimeType: string
}
```

## Integration Points

### Database Schema
```sql
-- Project files table
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  chunk_count INTEGER DEFAULT 0,
  size INTEGER DEFAULT 0,
  mime_type TEXT NOT NULL,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- File chunks for RAG
CREATE TABLE file_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding TEXT, -- JSON array of vector embeddings
  metadata TEXT,  -- JSON metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### IPC Channels
- `file:upload-project` - Upload files to project
- `file:list-project` - List project files
- `file:delete-project` - Delete project file
- `file:retry-processing` - Retry failed file
- `file:pause-processing` - Pause file processing
- `file:resume-processing` - Resume file processing
- `file:queue-status` - Get queue status

### Event System
- `project_file_status_changed` - File status updates
- `processing_queue_updated` - Queue status changes
- Real-time UI updates for processing progress

## Best Practices

### File Upload
1. **Validate Early:** Check constraints before upload
2. **Batch Operations:** Upload multiple files together
3. **User Feedback:** Show upload progress and status
4. **Error Handling:** Provide clear error messages

### Processing Management
1. **Monitor Queue:** Display processing status to users
2. **Handle Failures:** Provide retry options for failed files
3. **Resource Limits:** Respect system resource constraints
4. **Progress Updates:** Real-time status updates via events

### Error Recovery
1. **Graceful Degradation:** Continue processing other files on individual failures
2. **User Control:** Allow manual retry and deletion of failed files
3. **Logging:** Comprehensive error logging for debugging
4. **Cleanup:** Automatic cleanup of orphaned files and data

## Troubleshooting

### Common Issues

#### Files Stuck in Processing
**Symptoms:** Files remain in 'processing' status indefinitely
**Causes:** Application crash during processing, resource exhaustion
**Solutions:**
- Restart application (files reset to 'pending')
- Check system resources (memory, disk space)
- Review error logs for specific failures

#### Processing Failures
**Symptoms:** Files consistently fail processing
**Causes:** Unsupported file formats, corrupted files, insufficient permissions
**Solutions:**
- Verify file format support
- Check file integrity
- Ensure write permissions to project directories

#### Queue Not Processing
**Symptoms:** Files remain in 'pending' status
**Causes:** Queue not started, processing errors, resource limits
**Solutions:**
- Verify queue initialization in logs
- Check concurrent processing limits
- Review system resource availability

### Debugging Tools

#### Queue Status Monitoring
```typescript
// Get current queue status
const status = await window.electronAPI.invoke('file:queue-status')
console.log('Queue status:', status)
```

#### File Status Inspection
```typescript
// List all project files with status
const files = await window.electronAPI.invoke('file:list-project', projectId)
const statusCounts = files.reduce((acc, file) => {
  acc[file.status] = (acc[file.status] || 0) + 1
  return acc
}, {})
console.log('File status distribution:', statusCounts)
```

#### Error Analysis
```typescript
// Find files with errors
const failedFiles = files.filter(f => f.status === 'failed' && f.error)
failedFiles.forEach(file => {
  console.log(`Failed file ${file.filename}: ${file.error}`)
})
```