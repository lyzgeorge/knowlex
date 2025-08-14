# Vectorization and Search Documentation

## Overview

The Knowlex vectorization and search system provides comprehensive RAG (Retrieval Augmented Generation) capabilities for project files and global search functionality. The system combines vector similarity search with traditional full-text search to deliver relevant, contextual results for AI-powered conversations.

## Architecture

### Core Components

```
┌─────────────────────────────────────┐
│        Search Interface             │
│     (search.ts service)             │
├─────────────────────────────────────┤
│      Embedding Service              │
│    (embedding.ts service)           │
├─────────────────────────────────────┤
│       Vector Database               │
│   (project_vectors table)           │
├─────────────────────────────────────┤
│      Full-Text Search               │
│    (messages_fts table)             │
└─────────────────────────────────────┘
```

### Data Flow

1. **File Processing**: Text content is chunked and vectorized
2. **Vector Storage**: Embeddings are stored in the database with metadata
3. **Query Processing**: Search queries are converted to embeddings
4. **Similarity Search**: Vector database returns similar content
5. **Result Enhancement**: Results are enriched with context and metadata
6. **Ranking**: Results are ranked by relevance and similarity

## Embedding Service (`src/main/services/embedding.ts`)

### Core Functions

#### `generateEmbedding(text: string, config: EmbeddingConfig): Promise<number[]>`

Generates a vector embedding for a single text input.

**Parameters:**
- `text`: Text content to vectorize (required, non-empty)
- `config`: Embedding model configuration

**Returns:** Vector embedding as number array

**Example:**
```typescript
const embedding = await generateEmbedding(
  "This is sample text to vectorize",
  {
    apiKey: "your-api-key",
    model: "text-embedding-ada-002",
    dimensions: 1536
  }
)
```

#### `generateEmbeddings(texts: string[], config: EmbeddingConfig): Promise<number[][]>`

Generates embeddings for multiple text inputs in batches.

**Features:**
- Batch processing to respect API rate limits
- Automatic retry with exponential backoff
- Progress logging and error handling

**Configuration:**
- `BATCH_SIZE`: 50 texts per batch
- `MAX_RETRIES`: 3 retry attempts
- `RETRY_DELAY`: 1000ms base delay

#### `batchInsertVectors(vectors: VectorData[]): Promise<number>`

Inserts multiple vectors into the database atomically.

**Parameters:**
```typescript
interface VectorData {
  fileId: string
  chunkIndex: number
  chunkText: string
  embedding: number[]
  metadata?: Record<string, unknown>
}
```

**Features:**
- Transactional insertion for data integrity
- Automatic ID generation
- Metadata support for additional context

#### `queryVectorSimilarity(queryEmbedding: number[], options): Promise<SearchResult[]>`

Performs vector similarity search against the database.

**Parameters:**
- `queryEmbedding`: Query vector to search for
- `projectId`: Optional project scope limitation
- `limit`: Maximum results (default: 10)
- `similarityThreshold`: Minimum similarity score (default: 0.7)

**Returns:** Array of search results with similarity scores

### Configuration

```typescript
interface EmbeddingConfig {
  apiKey: string
  baseURL?: string
  model: string
  dimensions?: number
  encodingFormat?: 'float' | 'base64'
  user?: string
}
```

**Default Configuration:**
- Model: `text-embedding-ada-002`
- Dimensions: 1536
- Encoding: `float`

## Search Service (`src/main/services/search.ts`)

### Core Functions

#### `searchProjectFiles(query: string, projectId: string, config: EmbeddingConfig, options?: SearchOptions): Promise<EnhancedSearchResult[]>`

Performs RAG-based search within a specific project.

**Process:**
1. Generate embedding for search query
2. Query vector database for similar content
3. Enhance results with metadata and context
4. Apply filters and sorting
5. Return ranked results

**Options:**
```typescript
interface SearchOptions {
  limit?: number
  similarityThreshold?: number
  includeContext?: boolean
  projectId?: string
  fileTypes?: string[]
  sortBy?: 'similarity' | 'relevance' | 'date'
  dateRange?: {
    start?: string
    end?: string
  }
}
```

#### `buildSearchIndex(projectId: string, config: EmbeddingConfig): Promise<IndexStats>`

Builds or rebuilds the search index for a project.

**Process:**
1. Identify files needing indexing
2. Generate embeddings for file chunks
3. Store vectors in database
4. Update index statistics

**Returns:**
```typescript
interface IndexStats {
  filesProcessed: number
  chunksIndexed: number
  timeElapsed: number
}
```

#### `searchGlobal(query: string, options?: SearchOptions): Promise<GlobalSearchResults>`

Performs global search across conversations and files.

**Returns:**
```typescript
interface GlobalSearchResults {
  conversations: ConversationResult[]
  files: EnhancedSearchResult[]
}
```

### Enhanced Search Results

```typescript
interface EnhancedSearchResult extends SearchResult {
  projectId?: string
  projectName?: string
  chunkIndex?: number
  contextBefore?: string
  contextAfter?: string
  lastModified?: string
  relevanceScore?: number
}
```

## Vector Database Schema

### `project_vectors` Table

```sql
CREATE TABLE project_vectors (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding TEXT NOT NULL, -- JSON array of vector values
  metadata TEXT, -- JSON string for additional metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (file_id) REFERENCES project_files (id) ON DELETE CASCADE
);
```

### Indexes

```sql
-- File-based queries
CREATE INDEX idx_project_vectors_file_id ON project_vectors (file_id);

-- Chunk ordering
CREATE INDEX idx_project_vectors_chunk_index ON project_vectors (file_id, chunk_index);
```

## Search Algorithms

### Vector Similarity Calculation

The system uses cosine similarity for vector comparison:

```sql
-- Cosine similarity calculation (conceptual)
SELECT 
  file_id,
  chunk_text,
  -- Cosine similarity between query and stored vectors
  vector_distance_cos(embedding, ?) as similarity
FROM project_vectors
WHERE similarity >= ?
ORDER BY similarity DESC
```

### Relevance Scoring

Results are ranked using a weighted combination of factors:

```typescript
const RANKING_WEIGHTS = {
  similarity: 0.6,    // Vector similarity score
  textMatch: 0.3,     // Full-text search score
  recency: 0.1        // Recency boost
}
```

**Relevance Score Calculation:**
1. **Similarity Score**: Cosine similarity between query and content vectors
2. **Text Match Score**: Direct text matching bonus
3. **Recency Score**: Time-based relevance decay

### Context Enhancement

Search results include surrounding context for better understanding:

- **Context Before**: Up to 200 characters from previous chunk
- **Context After**: Up to 200 characters from next chunk
- **Metadata**: File information, timestamps, and processing details

## Performance Optimization

### Batch Processing

- **Embedding Generation**: Process up to 50 texts per batch
- **Vector Insertion**: Use transactions for atomic operations
- **Rate Limiting**: Automatic delays between API calls

### Caching Strategy

- **Query Caching**: Cache frequent search queries
- **Embedding Caching**: Reuse embeddings for identical text
- **Result Caching**: Cache search results with TTL

### Database Optimization

- **Indexes**: Optimized for file-based and similarity queries
- **JSON Storage**: Efficient vector storage using JSON arrays
- **Cleanup**: Automatic removal of orphaned vectors

## Error Handling

### Retry Logic

```typescript
// Exponential backoff for failed requests
const delay = RETRY_DELAY * Math.pow(2, attempt - 1)
```

### Error Types

1. **Configuration Errors**: Invalid API keys or model settings
2. **API Errors**: Rate limits, network issues, service unavailability
3. **Database Errors**: Connection issues, constraint violations
4. **Validation Errors**: Invalid input data or parameters

### Recovery Strategies

- **Automatic Retry**: Up to 3 attempts with exponential backoff
- **Graceful Degradation**: Fall back to text search when vector search fails
- **Error Logging**: Comprehensive error tracking and reporting

## Usage Examples

### Basic Project Search

```typescript
import { searchProjectFiles } from '../services/search'
import { getDefaultEmbeddingConfig } from '../services/embedding'

const results = await searchProjectFiles(
  "machine learning algorithms",
  "project-123",
  {
    apiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-ada-002"
  },
  {
    limit: 5,
    similarityThreshold: 0.8,
    includeContext: true
  }
)
```

### Building Search Index

```typescript
import { buildSearchIndex } from '../services/search'

const stats = await buildSearchIndex(
  "project-123",
  embeddingConfig
)

console.log(`Indexed ${stats.chunksIndexed} chunks from ${stats.filesProcessed} files`)
```

### Global Search

```typescript
import { searchGlobal } from '../services/search'

const results = await searchGlobal(
  "user authentication",
  {
    limit: 10,
    sortBy: 'relevance',
    dateRange: {
      start: '2024-01-01',
      end: '2024-12-31'
    }
  }
)
```

## Integration with RAG System

### Context Construction

The search system integrates with the RAG pipeline to provide relevant context:

1. **Query Analysis**: Extract key terms and concepts
2. **Vector Search**: Find semantically similar content
3. **Context Assembly**: Combine search results with conversation history
4. **Token Management**: Ensure context fits within model limits

### Citation Generation

Search results include citation information for transparency:

```typescript
interface Citation {
  filename: string
  chunkIndex: number
  similarity: number
  content: string
  metadata: {
    fileId: string
    projectId: string
    lastModified: string
  }
}
```

## Monitoring and Analytics

### Search Statistics

```typescript
interface SearchStats {
  totalFiles: number
  indexedFiles: number
  totalChunks: number
  indexedChunks: number
  lastIndexUpdate: string | null
}
```

### Performance Metrics

- **Query Response Time**: Average time for search queries
- **Index Build Time**: Time required for full reindexing
- **Cache Hit Rate**: Percentage of cached query results
- **Error Rate**: Frequency of failed operations

## Future Enhancements

### Advanced Features

1. **Semantic Clustering**: Group similar content automatically
2. **Query Expansion**: Enhance queries with related terms
3. **Multi-modal Search**: Support for image and document search
4. **Real-time Indexing**: Immediate indexing of new content

### Performance Improvements

1. **Vector Compression**: Reduce storage requirements
2. **Approximate Search**: Faster similarity calculations
3. **Distributed Processing**: Scale across multiple workers
4. **GPU Acceleration**: Hardware-accelerated vector operations

## Troubleshooting

### Common Issues

1. **Empty Search Results**: Check similarity threshold and query quality
2. **Slow Performance**: Verify database indexes and batch sizes
3. **API Errors**: Validate configuration and check rate limits
4. **Memory Issues**: Monitor embedding cache size and cleanup

### Debug Tools

```typescript
// Enable debug logging
process.env.DEBUG = 'embedding:*,search:*'

// Check embedding statistics
const stats = await getEmbeddingStats(projectId)
console.log('Embedding stats:', stats)

// Validate configuration
const isValid = validateEmbeddingConfig(config)
console.log('Config valid:', isValid)
```

## Security Considerations

### Data Privacy

- **Local Processing**: All embeddings generated and stored locally
- **API Security**: Secure API key management and transmission
- **Access Control**: Project-based access restrictions

### Input Validation

- **Query Sanitization**: Prevent injection attacks
- **Size Limits**: Enforce maximum query and content lengths
- **Type Checking**: Validate all input parameters

This documentation provides a comprehensive guide to the vectorization and search system, covering implementation details, usage patterns, and best practices for maintaining and extending the functionality.