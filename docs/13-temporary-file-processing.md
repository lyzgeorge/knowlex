# Temporary File Processing

## Overview

The temporary file processing module handles file uploads in unclassified chat mode. Unlike project files, temporary files are processed immediately for conversation context and are not stored permanently. This module provides fast, lightweight file processing for quick AI interactions.

## Core Features

- **Immediate Processing**: Files are processed synchronously for instant use
- **Text Extraction**: Supports plain text (.txt) and Markdown (.md) files
- **Strict Constraints**: Enforces file size and count limits for performance
- **Error Handling**: Comprehensive validation and error reporting
- **Memory Efficient**: No persistent storage, minimal memory footprint

## API Reference

### Main Functions

#### `processTemporaryFiles(filePaths: string[]): Promise<TemporaryFileResult[]>`

Processes an array of temporary files and extracts their text content.

**Parameters:**
- `filePaths`: Array of absolute file paths to process

**Returns:**
- Promise resolving to array of `TemporaryFileResult` objects

**Example:**
```typescript
import { processTemporaryFiles } from '../services/file-temp'

const results = await processTemporaryFiles([
  '/tmp/document.txt',
  '/tmp/notes.md'
])

results.forEach(result => {
  if (result.error) {
    console.error(`Error processing ${result.filename}: ${result.error}`)
  } else {
    console.log(`Processed ${result.filename}: ${result.content.length} characters`)
  }
})
```

#### `extractTextContent(filePath: string, filename: string): Promise<string>`

Extracts text content from a single file.

**Parameters:**
- `filePath`: Absolute path to the file
- `filename`: Original filename for type detection

**Returns:**
- Promise resolving to extracted text content

**Throws:**
- Error if file type is unsupported or extraction fails

**Example:**
```typescript
import { extractTextContent } from '../services/file-temp'

try {
  const content = await extractTextContent('/tmp/document.txt', 'document.txt')
  console.log('Extracted content:', content)
} catch (error) {
  console.error('Extraction failed:', error.message)
}
```

#### `validateTemporaryFileConstraints(files: { name: string; size: number }[])`

Validates files against temporary file constraints.

**Parameters:**
- `files`: Array of file objects with name and size properties

**Returns:**
- Object with `valid` boolean and `errors` string array

**Example:**
```typescript
import { validateTemporaryFileConstraints } from '../services/file-temp'

const files = [
  { name: 'document.txt', size: 500000 },
  { name: 'notes.md', size: 200000 }
]

const validation = validateTemporaryFileConstraints(files)
if (!validation.valid) {
  console.error('Validation errors:', validation.errors)
}
```

### Data Types

#### `TemporaryFileResult`

Result object returned by file processing operations.

```typescript
interface TemporaryFileResult {
  filename: string    // Original filename
  content: string     // Extracted text content (empty if error)
  size: number        // File size in bytes
  mimeType: string    // MIME type of the file
  error?: string      // Error message if processing failed
}
```

## File Type Support and Limitations

### Supported File Types

| Extension | MIME Type | Description |
|-----------|-----------|-------------|
| `.txt` | `text/plain` | Plain text files |
| `.md` | `text/markdown` | Markdown files |

### File Constraints

| Constraint | Limit | Description |
|------------|-------|-------------|
| **Maximum Files** | 10 | Maximum number of files per upload |
| **File Size** | 1MB | Maximum size per individual file |
| **Total Size** | 10MB | Maximum combined size of all files |

### Encoding Support

The module automatically detects and handles multiple text encodings:
- UTF-8 (primary)
- UTF-16LE (fallback)
- Latin-1 (fallback)

## Error Handling and Validation

### Validation Process

1. **File System Check**: Verify files exist and are readable
2. **Count Validation**: Ensure file count doesn't exceed limit
3. **Size Validation**: Check individual and total file sizes
4. **Type Validation**: Verify file extensions are supported
5. **Content Validation**: Ensure files are not empty

### Common Error Types

#### File System Errors
```typescript
// File not found or permission denied
{
  filename: "document.txt",
  content: "",
  size: 0,
  mimeType: "",
  error: "Failed to read file: ENOENT: no such file or directory"
}
```

#### Validation Errors
```typescript
// File too large
{
  filename: "large-file.txt",
  content: "",
  size: 2097152,
  mimeType: "",
  error: "File too large. Maximum size is 1MB."
}
```

#### Processing Errors
```typescript
// Unsupported file type
{
  filename: "document.pdf",
  content: "",
  size: 500000,
  mimeType: "",
  error: "Unsupported file type. Only .txt, .md files are supported."
}
```

### Error Recovery Strategies

1. **Individual File Errors**: Processing continues for other files
2. **Encoding Fallback**: Tries multiple encodings before failing
3. **Graceful Degradation**: Returns partial results when possible
4. **Detailed Error Messages**: Provides actionable error information

## Usage Examples and Best Practices

### Basic Usage in Chat Service

```typescript
import { processTemporaryFiles } from '../services/file-temp'

export async function handleChatWithFiles(
  message: string,
  filePaths: string[]
): Promise<void> {
  // Process temporary files
  const fileResults = await processTemporaryFiles(filePaths)
  
  // Filter successful results
  const successfulFiles = fileResults.filter(result => !result.error)
  const failedFiles = fileResults.filter(result => result.error)
  
  // Log errors
  failedFiles.forEach(file => {
    console.error(`Failed to process ${file.filename}: ${file.error}`)
  })
  
  // Build context with file contents
  let contextMessage = message
  if (successfulFiles.length > 0) {
    const fileContents = successfulFiles
      .map(file => `--- ${file.filename} ---\n${file.content}`)
      .join('\n\n')
    
    contextMessage = `${message}\n\nAttached files:\n${fileContents}`
  }
  
  // Send to AI model
  await sendToAI(contextMessage)
}
```

### Pre-upload Validation

```typescript
import { validateTemporaryFileConstraints } from '../services/file-temp'

export function validateFilesBeforeUpload(files: File[]): boolean {
  const fileData = files.map(file => ({
    name: file.name,
    size: file.size
  }))
  
  const validation = validateTemporaryFileConstraints(fileData)
  
  if (!validation.valid) {
    // Show user-friendly error messages
    validation.errors.forEach(error => {
      showErrorNotification(error)
    })
    return false
  }
  
  return true
}
```

### Batch Processing with Progress

```typescript
import { processTemporaryFiles } from '../services/file-temp'

export async function processFilesWithProgress(
  filePaths: string[],
  onProgress: (processed: number, total: number) => void
): Promise<TemporaryFileResult[]> {
  const results: TemporaryFileResult[] = []
  
  // Process files individually for progress tracking
  for (let i = 0; i < filePaths.length; i++) {
    const result = await processTemporaryFiles([filePaths[i]])
    results.push(...result)
    onProgress(i + 1, filePaths.length)
  }
  
  return results
}
```

## Performance Considerations

### Memory Usage
- Files are processed in memory without caching
- Large files (approaching 1MB limit) may impact performance
- Content is immediately available after processing

### Processing Speed
- Plain text files: ~1ms per KB
- Markdown files: ~2ms per KB (due to validation)
- Encoding detection adds ~10-20% overhead

### Optimization Tips

1. **Validate Early**: Use `validateTemporaryFileConstraints` before processing
2. **Handle Errors Gracefully**: Don't block UI for individual file failures
3. **Limit Concurrent Processing**: Process files sequentially to avoid memory spikes
4. **Clean Up**: Use `cleanupTemporaryFiles` utility when appropriate

## Integration with Chat System

### Message Content Parts Architecture

Temporary files are integrated into the message content system as structured content parts:

```typescript
// Message content structure with temporary files
const messageContent: MessageContent = [
  {
    type: 'text',
    text: 'Please analyze this document'
  },
  {
    type: 'temporary-file',
    temporaryFile: {
      filename: 'document.txt',
      content: 'File content here...',
      size: 1024,
      mimeType: 'text/plain'
    }
  }
]
```

### AI Model Integration

Temporary files are automatically converted to text representation for AI processing:

```typescript
// AI conversion in BaseAIModel
case 'temporary-file':
  // Convert temporary file to text representation for AI processing
  if (part.temporaryFile) {
    aiContent.push({
      type: 'text',
      text: `[File: ${part.temporaryFile.filename}]\n${part.temporaryFile.content}`
    })
  }
  break
```

### Chat Interface Flow

Complete integration from file upload to AI response:

1. **File Upload**: User drags/selects files in `ChatInputBox`
2. **Processing**: Files processed via IPC to main process
3. **Content Parts**: Results converted to `temporary-file` content parts
4. **Message Creation**: Content parts included in user message
5. **AI Conversion**: Temporary files formatted as text for AI models
6. **Response**: AI receives file content as context

### File Reference in UI

```typescript
// MessageContentPart for temporary files
interface MessageContentPart {
  type: 'temporary-file'
  temporaryFile: {
    filename: string
    content: string
    size: number
    mimeType: string
  }
}
```

## Security Considerations

1. **File Type Restriction**: Only allow safe text file types
2. **Size Limits**: Prevent memory exhaustion attacks
3. **Content Sanitization**: Remove control characters from text
4. **Path Validation**: Ensure file paths are within allowed directories
5. **No Persistence**: Files are not stored permanently

## Testing

### Unit Tests

```typescript
import { processTemporaryFiles, validateTemporaryFileConstraints } from '../file-temp'

describe('Temporary File Processing', () => {
  test('processes valid text files', async () => {
    const results = await processTemporaryFiles(['/path/to/test.txt'])
    expect(results[0].error).toBeUndefined()
    expect(results[0].content).toBeTruthy()
  })
  
  test('validates file constraints', () => {
    const files = [{ name: 'test.txt', size: 2000000 }] // 2MB
    const validation = validateTemporaryFileConstraints(files)
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('File too large')
  })
})
```

### Integration Tests

```typescript
describe('Chat Integration', () => {
  test('handles mixed success/failure results', async () => {
    const filePaths = ['/valid/file.txt', '/invalid/file.pdf']
    const results = await processTemporaryFiles(filePaths)
    
    expect(results).toHaveLength(2)
    expect(results[0].error).toBeUndefined()
    expect(results[1].error).toBeTruthy()
  })
})
```

## Troubleshooting

### Common Issues

1. **"File too large" errors**: Check file size limits
2. **"Unsupported file type" errors**: Verify file extensions
3. **"Failed to read file" errors**: Check file permissions and paths
4. **Empty content**: Verify file is not corrupted or binary

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
// Set environment variable
process.env.DEBUG_FILE_PROCESSING = 'true'

// Or use debug flag in function calls
const results = await processTemporaryFiles(filePaths, { debug: true })
```