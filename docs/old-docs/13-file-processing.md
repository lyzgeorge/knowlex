# File Processing

This document covers both temporary and project file processing in Knowlex Desktop.

## Temporary File Processing

### Overview

The temporary file processing module handles file uploads in unclassified chat mode. Unlike project files, temporary files are processed immediately for conversation context and are not stored permanently. This module provides fast, lightweight file processing for quick AI interactions.

### Core Features

- **Immediate Processing**: Files are processed synchronously for instant use
- **Text Extraction**: Supports plain text (.txt) and Markdown (.md) files
- **Strict Constraints**: Enforces file size and count limits for performance
- **Error Handling**: Comprehensive validation and error reporting
- **Memory Efficient**: No persistent storage, minimal memory footprint

### API Reference

#### `processTemporaryFiles(filePaths: string[]): Promise<TemporaryFileResult[]>`

Processes an array of temporary files and extracts their text content.

**Parameters:**
- `filePaths`: Array of absolute file paths to process

**Returns:**
- Promise resolving to array of `TemporaryFileResult` objects

#### `extractTextContent(filePath: string, filename: string): Promise<string>`

Extracts text content from a single file.

**Parameters:**
- `filePath`: Absolute path to the file
- `filename`: Original filename for type detection

**Returns:**
- Promise resolving to extracted text content

#### `validateTemporaryFileConstraints(files: { name: string; size: number }[])`

Validates files against temporary file constraints.

**Parameters:**
- `files`: Array of file objects with name and size properties

**Returns:**
- Object with `valid` boolean and `errors` string array

### File Type Support and Limitations

- **Supported File Types**: `.txt`, `.md`
- **Maximum Files**: 10
- **File Size**: 1MB
- **Total Size**: 10MB

## Project File Processing Module

### Overview

The Project File Processing Module handles permanent file uploads for projects with a robust background processing pipeline. Files are processed through multiple stages: upload → extract → chunk → vectorize → index, with comprehensive status tracking and error recovery mechanisms.

### Architecture

- **Processing Pipeline**: `File Upload → Validation → Storage → Queue → Processing → Vectorization → Ready`
- **Key Components**: `File Upload Service`, `Background Processing Queue`, `RAG Processing`, `File Management`

### File Status State Machine

`pending ──────► processing ──────► ready`
`   │                │                 ▲`
`   │                ▼                 │`
`   └──────────► failed ──────────────┘`
`                  │`
`                  ▼`
`               (retry)`

### API Reference

- `uploadProjectFiles(projectId, files)`
- `processFileForRAG(fileId)`
- `deleteProjectFile(fileId)`
- `startProcessingQueue()`
- `getProcessingQueueStatus()`
- `retryFileProcessing(fileId)`

### File Constraints

- **Max File Size:** 50MB per file
- **Max Total Size:** 500MB per project
- **Max File Count:** 100 files per project
- **Supported Types:** `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`, `.htm`, `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.odt`, `.odp`, `.ods`, and various code files.

## Integration with Chat System

Temporary files are integrated into the message content system as structured content parts. They are automatically converted to text representation for AI processing.
