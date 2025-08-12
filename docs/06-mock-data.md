# Mock Data System

This document describes the mock data system used in Knowlex Desktop for development and testing purposes. The mock data provides realistic sample data to facilitate UI development, component testing, and feature validation.

## Overview

The mock data system is located in `src/renderer/src/utils/mockData.ts` and provides:
- **Projects**: Sample projects with different characteristics and statistics
- **Conversations**: Mock chat sessions both within projects and unclassified
- **Realistic Timestamps**: Various time ranges to test time formatting
- **Statistics**: File counts, message counts, and project metadata

## Mock Data Structure

### Project Mock Data

**File:** `src/renderer/src/utils/mockData.ts`

#### Interface
```typescript
interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  stats?: {
    conversationCount: number
    messageCount: number
    fileCount: number
    totalFileSize: number
  }
}
```

#### Sample Projects
The system generates 5 diverse projects:

1. **React Dashboard Project**
   - Modern dashboard development with TypeScript
   - 12 conversations, 89 messages, 15 files (2.4 MB)
   - Updated 2 hours ago

2. **AI Research Paper Analysis** 
   - Transformer architecture analysis
   - 8 conversations, 156 messages, 23 files (8.9 MB)
   - Updated 45 minutes ago

3. **E-commerce Backend API**
   - RESTful API development with Node.js
   - 6 conversations, 42 messages, 8 files (1.3 MB)
   - Updated 3 days ago

4. **Machine Learning Models**
   - Image classification and NLP experiments
   - 15 conversations, 203 messages, 31 files (15.7 MB)
   - Updated 7 days ago

5. **Mobile App UI Design**
   - Cross-platform React Native development
   - 4 conversations, 28 messages, 12 files (5.2 MB)
   - Updated 20 minutes ago

### Conversation Mock Data

#### Interface
```typescript
interface Conversation {
  id: string
  projectId?: string  // undefined for unclassified chats
  title: string
  createdAt: string
  updatedAt: string
  settings?: SessionSettings
}
```

#### Sample Conversations

**Project-specific conversations** (13 total):
- React Router v6 Migration
- JWT Authentication Implementation
- Transformer Architecture Analysis  
- CNN Architecture for Image Classification
- Navigation Component Design
- And more technical discussions...

**Unclassified conversations** (5 total):
- Quick JavaScript Question
- CSS Grid Layout Help
- Python List Comprehension Examples
- Git Workflow Best Practices
- Docker Compose Configuration

## Usage

### Basic Usage

```typescript
import { getMockData, generateMockProjects, generateMockConversations } from '../utils/mockData'

// Get all mock data at once
const { projects, conversations } = getMockData()

// Generate just projects
const projects = generateMockProjects()

// Generate just conversations  
const conversations = generateMockConversations()
```

### Store Integration

The mock data is automatically integrated with Zustand stores:

```typescript
// Project store initialization
import { generateMockProjects } from '../utils/mockData'

const initialState = {
  projects: generateMockProjects(),
  // ... other state
}

// Conversation store initialization  
import { generateMockConversations } from '../utils/mockData'

const initialState = {
  conversations: generateMockConversations(),
  // ... other state
}
```

### Development vs Production

Mock data is only used in development mode:

```typescript
const initialState = {
  projects: process.env.NODE_ENV === 'development' ? generateMockProjects() : [],
  conversations: process.env.NODE_ENV === 'development' ? generateMockConversations() : [],
  // ... other state
}
```

## Advanced Features

### Additional Mock Data Generation

For testing scenarios requiring more data:

```typescript
// Generate extra projects
const additionalProjects = generateAdditionalMockProjects(10) // 10 more projects

// Generate extra conversations
const additionalConversations = generateAdditionalMockConversations(
  projectIds, 
  20 // 20 more conversations
)
```

#### generateAdditionalMockProjects()
```typescript
function generateAdditionalMockProjects(count: number): Project[]
```
- **Purpose**: Creates additional projects for testing large datasets
- **Parameters**: `count` - number of projects to generate
- **Returns**: Array of Project objects with randomized data
- **Features**: Random statistics, varied timestamps, diverse project types

#### generateAdditionalMockConversations()
```typescript
function generateAdditionalMockConversations(
  projectIds: string[], 
  count: number
): Conversation[]
```
- **Purpose**: Creates additional conversations for testing
- **Parameters**: 
  - `projectIds` - available project IDs for association
  - `count` - number of conversations to generate
- **Returns**: Array of Conversation objects
- **Distribution**: 70% project-associated, 30% unclassified

### Time Distribution Strategy

Mock data uses realistic time distributions:

```typescript
const now = new Date()

// Recent activity (minutes to hours ago)
new Date(now.getTime() - 45 * 60 * 1000).toISOString() // 45 minutes

// Medium activity (hours to days ago)  
new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days

// Older activity (weeks ago)
new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString() // 25 days
```

This creates a natural distribution for testing time formatting utilities:
- "Just now", "15m ago", "2h ago"
- "Yesterday", "3d ago"
- "12/15", "2024-11-20"

## Testing Scenarios

### Sidebar Testing

Mock data enables comprehensive sidebar testing:

```typescript
// Test expandable projects
projects.forEach(project => {
  const conversations = mockConversations.filter(c => c.projectId === project.id)
  // Test project expansion with various conversation counts
})

// Test unclassified conversations
const unclassified = mockConversations.filter(c => !c.projectId)
// Test standalone conversation display
```

### Edge Cases

The mock data includes edge cases for robust testing:

1. **Empty states**: Projects with zero conversations
2. **High volume**: Projects with 15+ conversations
3. **Recent activity**: Items updated minutes ago
4. **Stale content**: Items updated weeks ago
5. **Varied statistics**: Different file counts and sizes

### Time Formatting Validation

Test the `formatRelativeTime()` utility with realistic data:

```typescript
import { formatRelativeTime } from '../utils/time'

conversations.forEach(conv => {
  const formatted = formatRelativeTime(conv.updatedAt)
  // Verify correct formatting: "2h ago", "Yesterday", etc.
})
```

## Best Practices

### Development Guidelines

1. **Realistic Data**: Use plausible project names and descriptions
2. **Varied Timestamps**: Include recent, medium, and old activity
3. **Statistical Diversity**: Different file counts, message counts, sizes
4. **Edge Cases**: Include empty states and high-volume scenarios
5. **Consistent IDs**: Use predictable ID patterns for testing

### Performance Considerations

1. **Lazy Generation**: Generate mock data only when needed
2. **Memory Usage**: Limit mock data size for development performance
3. **Deterministic Results**: Use consistent data for reproducible testing
4. **Clean Separation**: Keep mock data separate from production logic

### Maintenance

1. **Type Safety**: Ensure mock data matches TypeScript interfaces
2. **Schema Updates**: Update mock data when types change  
3. **Realistic Content**: Maintain plausible project/conversation content
4. **Documentation**: Keep examples current with actual mock data

## Integration with Components

### Sidebar Component

The mock data integrates seamlessly with the Sidebar component:

```typescript
// File: src/renderer/src/components/layout/Sidebar.tsx
const projects = useProjectStore((state) => state.projects)
const conversations = useConversationStore((state) => state.conversations)

// Automatically displays mock projects and conversations
// Tests project expansion, conversation selection, time formatting
```

### Project Management

Mock data enables testing project-related features:

```typescript
// Project statistics display
project.stats?.conversationCount // 12 conversations
project.stats?.messageCount      // 89 messages  
project.stats?.fileCount         // 15 files
project.stats?.totalFileSize     // 2,457,600 bytes (2.4 MB)
```

### Search and Filtering

Mock data supports search functionality testing:

```typescript
// Search by project name
const searchResults = projects.filter(p => 
  p.name.toLowerCase().includes(query.toLowerCase())
)

// Filter conversations by project
const projectConversations = conversations.filter(c => 
  c.projectId === selectedProjectId
)
```

## Future Enhancements

### Planned Features

1. **Message Mock Data**: Generate sample messages for conversations
2. **File Mock Data**: Create sample project files with various types
3. **User Preferences**: Mock user settings and preferences
4. **Search History**: Sample search queries and results
5. **AI Responses**: Mock AI assistant responses for chat testing

### Extensibility

The mock data system is designed for extension:

```typescript
// Add new mock data types
export interface MockDataConfig {
  projects: Project[]
  conversations: Conversation[]
  messages: Message[]
  files: ProjectFile[]
  settings: UserSettings
}

// Generate comprehensive mock data
export function generateFullMockData(): MockDataConfig {
  // Implementation for complete mock data suite
}
```

This mock data system provides a robust foundation for development and testing, ensuring realistic user scenarios and edge cases are covered throughout the development process.