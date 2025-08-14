import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import { EventEmitter } from 'events'
import { generateId } from '../../shared/utils/id'
import { parseFile } from './file-parser'
import {
  createProjectFile,
  getProjectFile,
  updateProjectFileStatus,
  updateProjectFileChunks,
  deleteProjectFile as dbDeleteProjectFile,
  createFileChunk,
  deleteFileChunks
} from '../database/queries'
import { getFileExtension, getMimeTypeFromExtension } from '../../shared/utils/validation'
import { FILE_CONSTRAINTS, CHUNK_SIZE, CHUNK_OVERLAP } from '../../shared/constants/file'
import { FileParserFactory } from './file-parser'
import type { ProjectFile, FileStatus } from '../../shared/types/project'

/**
 * Project File Processing Service
 *
 * Handles permanent file uploads for projects with background processing pipeline.
 * Files are processed through: upload -> extract -> chunk -> vectorize -> index
 * Supports background queue processing with status tracking and error recovery.
 */

// Processing queue and status tracking
interface ProcessingTask {
  fileId: string
  projectId: string
  filePath: string
  priority: number
  retryCount: number
  createdAt: Date
}

class FileProcessingQueue extends EventEmitter {
  private queue: ProcessingTask[] = []
  private processing = false
  private maxConcurrent = 2
  private currentlyProcessing = new Set<string>()
  private maxRetries = 3

  addTask(task: Omit<ProcessingTask, 'createdAt' | 'retryCount'>): void {
    const processingTask: ProcessingTask = {
      ...task,
      retryCount: 0,
      createdAt: new Date()
    }

    this.queue.push(processingTask)
    this.queue.sort((a, b) => b.priority - a.priority) // Higher priority first

    console.log(`[FILE-QUEUE] Added task for file ${task.fileId}, queue size: ${this.queue.length}`)
    this.emit('taskAdded', processingTask)

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing()
    }
  }

  removeTask(fileId: string): void {
    const initialLength = this.queue.length
    this.queue = this.queue.filter((task) => task.fileId !== fileId)
    this.currentlyProcessing.delete(fileId)

    if (this.queue.length !== initialLength) {
      console.log(`[FILE-QUEUE] Removed task for file ${fileId}, queue size: ${this.queue.length}`)
      this.emit('taskRemoved', fileId)
    }
  }

  getQueueStatus(): { pending: number; processing: number; total: number } {
    return {
      pending: this.queue.length,
      processing: this.currentlyProcessing.size,
      total: this.queue.length + this.currentlyProcessing.size
    }
  }

  private async startProcessing(): Promise<void> {
    if (this.processing) return

    this.processing = true
    console.log('[FILE-QUEUE] Started processing queue')

    while (this.queue.length > 0 || this.currentlyProcessing.size > 0) {
      // Process tasks up to maxConcurrent limit
      while (this.queue.length > 0 && this.currentlyProcessing.size < this.maxConcurrent) {
        const task = this.queue.shift()!
        this.currentlyProcessing.add(task.fileId)

        // Process task asynchronously
        this.processTask(task)
          .catch((error) => {
            console.error(`[FILE-QUEUE] Task processing failed for file ${task.fileId}:`, error)
          })
          .finally(() => {
            this.currentlyProcessing.delete(task.fileId)
          })
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    this.processing = false
    console.log('[FILE-QUEUE] Finished processing queue')
    this.emit('queueEmpty')
  }

  private async processTask(task: ProcessingTask): Promise<void> {
    console.log(`[FILE-QUEUE] Processing file ${task.fileId} (attempt ${task.retryCount + 1})`)

    try {
      await processFileForRAG(task.fileId)
      console.log(`[FILE-QUEUE] Successfully processed file ${task.fileId}`)
      this.emit('taskCompleted', task.fileId)
    } catch (error) {
      console.error(`[FILE-QUEUE] Failed to process file ${task.fileId}:`, error)

      // Retry logic
      if (task.retryCount < this.maxRetries) {
        task.retryCount++
        task.priority = Math.max(0, task.priority - 1) // Lower priority for retries

        // Add back to queue with delay
        setTimeout(
          () => {
            this.queue.push(task)
            this.queue.sort((a, b) => b.priority - a.priority)
            console.log(
              `[FILE-QUEUE] Retrying file ${task.fileId} (attempt ${task.retryCount + 1})`
            )
          },
          Math.pow(2, task.retryCount) * 1000
        ) // Exponential backoff
      } else {
        // Mark as failed after max retries
        await updateProjectFileStatus(
          task.fileId,
          'failed',
          `Processing failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        this.emit('taskFailed', task.fileId, error)
      }
    }
  }
}

// Global processing queue instance
const processingQueue = new FileProcessingQueue()

/**
 * Get the project files directory path
 * @param projectId Project ID
 * @returns Directory path for project files
 */
function getProjectFilesDir(projectId: string): string {
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // Development: use project root /data/projects directory
    const projectRoot = process.cwd()
    return path.join(projectRoot, 'data', 'projects', projectId, 'files')
  } else {
    // Production: use user data directory
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'projects', projectId, 'files')
  }
}

/**
 * Upload project files and start background processing
 * @param projectId Project ID to upload files to
 * @param files Array of file data with content
 * @returns Array of created ProjectFile records
 */
export async function uploadProjectFiles(
  projectId: string,
  files: Array<{ name: string; content: string; size: number }>
): Promise<ProjectFile[]> {
  console.log(
    `[FILE-PROJECT] uploadProjectFiles called for project ${projectId} with ${files.length} files`
  )

  // Validate project file constraints
  validateProjectFileConstraints(files)

  const projectFilesDir = getProjectFilesDir(projectId)

  // Ensure project files directory exists
  await fs.mkdir(projectFilesDir, { recursive: true })

  const uploadedFiles: ProjectFile[] = []

  for (const file of files) {
    try {
      // Generate unique file ID and path
      const fileId = generateId()
      const sanitizedFilename = sanitizeFilename(file.name)
      const filePath = path.join(projectFilesDir, `${fileId}_${sanitizedFilename}`)

      // Write file content to disk
      await fs.writeFile(filePath, file.content, 'utf8')

      // Create database record
      const projectFile: ProjectFile = {
        id: fileId,
        projectId,
        filename: file.name,
        filepath: filePath,
        status: 'pending',
        chunkCount: 0,
        size: file.size,
        mimeType: getMimeTypeFromExtension(file.name),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await createProjectFile(projectFile)
      uploadedFiles.push(projectFile)

      // Add to processing queue
      processingQueue.addTask({
        fileId,
        projectId,
        filePath,
        priority: 10 // Default priority
      })

      console.log(`[FILE-PROJECT] Uploaded file ${file.name} with ID ${fileId}`)
    } catch (error) {
      console.error(`[FILE-PROJECT] Failed to upload file ${file.name}:`, error)
      throw new Error(
        `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return uploadedFiles
} /**
 * P
rocess a file for RAG (Retrieval Augmented Generation)
 * Extracts text, chunks content, and prepares for vectorization
 * @param fileId File ID to process
 */
export async function processFileForRAG(fileId: string): Promise<void> {
  console.log(`[FILE-PROJECT] Processing file ${fileId} for RAG`)

  // Get file record
  const file = await getProjectFile(fileId)
  if (!file) {
    throw new Error(`File not found: ${fileId}`)
  }

  if (file.status !== 'pending') {
    console.log(`[FILE-PROJECT] File ${fileId} is not in pending status (${file.status}), skipping`)
    return
  }

  try {
    // Update status to processing
    await updateProjectFileStatus(fileId, 'processing')

    // Parse file content using the file-parser service
    console.log(`[FILE-PROJECT] Parsing file content from ${file.filename}`)
    const parseResult = await parseFile(file.filepath, file.filename)
    const textContent = parseResult.content

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No text content extracted from file')
    }

    // Chunk the content for vectorization
    console.log(`[FILE-PROJECT] Chunking content for ${file.filename}`)
    const chunks = chunkTextContent(textContent, file.filename)

    if (chunks.length === 0) {
      throw new Error('No chunks generated from file content')
    }

    // Store chunks in database
    console.log(`[FILE-PROJECT] Storing ${chunks.length} chunks for ${file.filename}`)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      await createFileChunk({
        id: generateId(),
        fileId,
        content: chunk.content,
        chunkIndex: i,
        metadata: {
          filename: file.filename,
          chunkSize: chunk.content.length,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          // Include parser metadata
          parserMetadata: parseResult.metadata,
          mimeType: parseResult.mimeType
        }
      })
    }

    // Update file status and chunk count
    await updateProjectFileChunks(fileId, chunks.length)
    await updateProjectFileStatus(fileId, 'ready')

    console.log(`[FILE-PROJECT] Successfully processed file ${fileId} with ${chunks.length} chunks`)
  } catch (error) {
    console.error(`[FILE-PROJECT] Failed to process file ${fileId}:`, error)
    await updateProjectFileStatus(
      fileId,
      'failed',
      error instanceof Error ? error.message : 'Unknown processing error'
    )
    throw error
  }
}

/**
 * Delete a project file and all its associated data
 * @param fileId File ID to delete
 */
export async function deleteProjectFile(fileId: string): Promise<void> {
  console.log(`[FILE-PROJECT] Deleting project file ${fileId}`)

  // Get file record
  const file = await getProjectFile(fileId)
  if (!file) {
    throw new Error(`File not found: ${fileId}`)
  }

  try {
    // Remove from processing queue if present
    processingQueue.removeTask(fileId)

    // Delete file chunks from database
    await deleteFileChunks(fileId)

    // Delete physical file
    try {
      await fs.unlink(file.filepath)
      console.log(`[FILE-PROJECT] Deleted physical file: ${file.filepath}`)
    } catch (error) {
      console.warn(`[FILE-PROJECT] Failed to delete physical file ${file.filepath}:`, error)
      // Continue with database cleanup even if physical file deletion fails
    }

    // Delete file record from database
    await dbDeleteProjectFile(fileId)

    console.log(`[FILE-PROJECT] Successfully deleted file ${fileId}`)
  } catch (error) {
    console.error(`[FILE-PROJECT] Failed to delete file ${fileId}:`, error)
    throw new Error(
      `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Start the background processing queue
 * Should be called during application startup
 */
export function startProcessingQueue(): void {
  console.log('[FILE-PROJECT] Starting background processing queue')

  // Set up event listeners for queue monitoring
  processingQueue.on('taskAdded', (task: ProcessingTask) => {
    console.log(`[FILE-QUEUE] Task added: ${task.fileId}`)
  })

  processingQueue.on('taskCompleted', (fileId: string) => {
    console.log(`[FILE-QUEUE] Task completed: ${fileId}`)
  })

  processingQueue.on('taskFailed', (fileId: string, error: Error) => {
    console.error(`[FILE-QUEUE] Task failed: ${fileId}`, error)
  })

  processingQueue.on('queueEmpty', () => {
    console.log('[FILE-QUEUE] Queue is empty')
  })

  // TODO: Resume any pending files from database on startup
  // This would involve querying for files with 'pending' or 'processing' status
  // and adding them back to the queue
}

/**
 * Process the next file in the queue
 * This is handled automatically by the queue, but exposed for manual control
 */
export function processNextFile(): void {
  const status = processingQueue.getQueueStatus()
  console.log(
    `[FILE-PROJECT] Queue status: ${status.pending} pending, ${status.processing} processing`
  )

  // The queue processes automatically, this is mainly for monitoring
}

/**
 * Update file processing status
 * @param fileId File ID
 * @param status New status
 * @param error Optional error message
 */
export async function updateFileStatus(
  fileId: string,
  status: FileStatus,
  error?: string
): Promise<void> {
  console.log(`[FILE-PROJECT] Updating file ${fileId} status to ${status}`)

  await updateProjectFileStatus(fileId, status, error)

  // Remove from queue if failed or ready
  if (status === 'failed' || status === 'ready') {
    processingQueue.removeTask(fileId)
  }
}

/**
 * Get processing queue status
 * @returns Queue status information
 */
export function getProcessingQueueStatus(): { pending: number; processing: number; total: number } {
  return processingQueue.getQueueStatus()
}

/**
 * Retry processing a failed file
 * @param fileId File ID to retry
 */
export async function retryFileProcessing(fileId: string): Promise<void> {
  console.log(`[FILE-PROJECT] Retrying file processing for ${fileId}`)

  const file = await getProjectFile(fileId)
  if (!file) {
    throw new Error(`File not found: ${fileId}`)
  }

  if (file.status !== 'failed') {
    throw new Error(`File ${fileId} is not in failed status (${file.status})`)
  }

  // Reset status to pending
  await updateProjectFileStatus(fileId, 'pending')

  // Add back to processing queue with high priority
  processingQueue.addTask({
    fileId,
    projectId: file.projectId,
    filePath: file.filepath,
    priority: 15 // Higher priority for retries
  })
}

/**
 * Pause file processing (remove from queue)
 * @param fileId File ID to pause
 */
export async function pauseFileProcessing(fileId: string): Promise<void> {
  console.log(`[FILE-PROJECT] Pausing file processing for ${fileId}`)

  processingQueue.removeTask(fileId)
  // Note: We don't change the database status here, just remove from queue
  // The file will remain in 'pending' status and can be resumed later
}

/**
 * Resume file processing (add back to queue)
 * @param fileId File ID to resume
 */
export async function resumeFileProcessing(fileId: string): Promise<void> {
  console.log(`[FILE-PROJECT] Resuming file processing for ${fileId}`)

  const file = await getProjectFile(fileId)
  if (!file) {
    throw new Error(`File not found: ${fileId}`)
  }

  if (file.status !== 'pending') {
    throw new Error(`File ${fileId} is not in pending status (${file.status})`)
  }

  // Add back to processing queue
  processingQueue.addTask({
    fileId,
    projectId: file.projectId,
    filePath: file.filepath,
    priority: 10 // Normal priority
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate project file constraints
 * @param files Array of files to validate
 */
function validateProjectFileConstraints(files: Array<{ name: string; size: number }>): void {
  const constraints = FILE_CONSTRAINTS.PROJECT

  // Check file count
  if (files.length > constraints.maxFileCount) {
    throw new Error(`Too many files. Maximum ${constraints.maxFileCount} files allowed.`)
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > constraints.maxTotalSize) {
    throw new Error(
      `Total file size too large. Maximum ${Math.round(constraints.maxTotalSize / (1024 * 1024))}MB allowed.`
    )
  }

  // Check individual files
  files.forEach((file, index) => {
    if (!FileParserFactory.isSupported(file.name)) {
      const extension = getFileExtension(file.name)
      const supportedTypes = FileParserFactory.getSupportedExtensions()
      throw new Error(
        `File ${index + 1} (${file.name}): Unsupported file type ${extension}. Only ${supportedTypes.join(', ')} files are supported.`
      )
    }

    if (file.size > constraints.maxFileSize) {
      throw new Error(
        `File ${index + 1} (${file.name}): File too large. Maximum ${Math.round(constraints.maxFileSize / (1024 * 1024))}MB allowed.`
      )
    }

    if (file.size === 0) {
      throw new Error(`File ${index + 1} (${file.name}): File is empty.`)
    }
  })
}

/**
 * Sanitize filename for safe storage
 * @param filename Original filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace unsafe characters with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255) // Limit length
}

/**
 * Chunk text content for vectorization
 * @param content Text content to chunk
 * @param filename Original filename for metadata
 * @returns Array of text chunks with metadata
 */
function chunkTextContent(
  content: string,
  filename: string
): Array<{
  content: string
  startOffset: number
  endOffset: number
}> {
  const chunks: Array<{ content: string; startOffset: number; endOffset: number }> = []

  if (!content || content.trim().length === 0) {
    return chunks
  }

  const text = content.trim()
  const chunkSize = CHUNK_SIZE
  const overlap = CHUNK_OVERLAP

  let startOffset = 0

  while (startOffset < text.length) {
    let endOffset = Math.min(startOffset + chunkSize, text.length)

    // Try to break at word boundaries if not at the end
    if (endOffset < text.length) {
      const lastSpace = text.lastIndexOf(' ', endOffset)
      const lastNewline = text.lastIndexOf('\n', endOffset)
      const lastPunctuation = Math.max(
        text.lastIndexOf('.', endOffset),
        text.lastIndexOf('!', endOffset),
        text.lastIndexOf('?', endOffset)
      )

      // Use the best break point
      const breakPoint = Math.max(lastNewline, lastSpace, lastPunctuation)
      if (breakPoint > startOffset + chunkSize * 0.5) {
        endOffset = breakPoint + 1
      }
    }

    const chunkContent = text.substring(startOffset, endOffset).trim()

    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        startOffset,
        endOffset
      })
    }

    // Move start position with overlap
    startOffset = Math.max(startOffset + 1, endOffset - overlap)

    // Prevent infinite loop
    if (startOffset >= endOffset) {
      startOffset = endOffset
    }
  }

  console.log(`[FILE-PROJECT] Created ${chunks.length} chunks for ${filename}`)
  return chunks
}

// Export the processing queue for external monitoring
export { processingQueue }
