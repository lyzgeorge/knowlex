# Development Guide

This document outlines development workflow, patterns, conventions, and best practices for Knowlex Desktop.

## Project Setup

### Environment Requirements
```bash
Node.js >= 18.0.0
pnpm (recommended package manager)
```

### Development Setup
```bash
# Install dependencies
pnpm install

# Start development (dual-window mode infrastructure)
pnpm dev

# Run tests
pnpm test

# Type checking
npx tsc --noEmit

# Linting and formatting
pnpm lint
pnpm format
```

## Architecture Patterns

### Three-Layer Architecture
Follow the established pattern for all new features:

```
Main Process (Node.js/Electron)
├── Services (src/main/services/)
│   ├── assistant-message-generator.ts  # NEW: Unified AI response generation
│   ├── title-generation.ts             # NEW: Auto conversation titles
│   ├── ai-chat-vercel.ts              # Core AI integration
│   ├── conversation.ts                # Conversation management
│   └── message.ts                     # Message operations
├── IPC Handlers (src/main/ipc/) 
├── Database (src/main/database/)
└── Utils (src/main/utils/)

Renderer Process (React/TypeScript)
├── Components (src/renderer/src/components/)
├── Stores (src/renderer/src/stores/)
├── Hooks (src/renderer/src/hooks/)
├── Pages (src/renderer/src/pages/)
└── Utils (src/renderer/src/utils/)

Shared Code (src/shared/)
├── Types (src/shared/types/)
├── Constants (src/shared/constants/)
└── Utils (src/shared/utils/)
```

## Feature Development Workflow

### 1. Backend Implementation (Main Process)

#### Service Layer
Create services in `src/main/services/`:

```typescript
// Example: src/main/services/feature.ts
interface FeatureService {
  create(data: FeatureCreate): Promise<Feature>
  get(id: string): Promise<Feature | null>
  update(id: string, data: Partial<Feature>): Promise<Feature>
  delete(id: string): Promise<void>
}

export const featureService: FeatureService = {
  // Implementation with proper error handling
  async create(data: FeatureCreate): Promise<Feature> {
    try {
      // Validation
      // Database operations
      // Return result
    } catch (error) {
      throw enhanceError(error, 'create feature')
    }
  }
}
```

#### IPC Layer
Add handlers in `src/main/ipc/`:

```typescript
// Example: src/main/ipc/feature.ts
import { ipcMain } from 'electron'
import { featureService } from '../services/feature'

export function setupFeatureIPC() {
  ipcMain.handle('feature:create', async (_, data) => {
    try {
      const result = await featureService.create(data)
      return { success: true, data: result }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // Add other handlers...
}
```

#### Database Integration
Add queries in `src/main/database/queries.ts`:

```typescript
// Type-safe database operations
export async function createFeature(data: FeatureCreate): Promise<Feature> {
  const db = await getDB()
  const query = `
    INSERT INTO features (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    RETURNING *
  `
  
  const result = await db.execute(query, [
    generateId('feat'),
    data.name,
    data.description,
    now(),
    now()
  ])
  
  return mapRowToFeature(result.rows[0])
}
```

### 2. Frontend Implementation (Renderer Process)

#### State Management
Create or update Zustand stores in `src/renderer/src/stores/`:

```typescript
// Example: Update existing store or create new one
interface FeatureState {
  features: Feature[]
  currentFeature: Feature | null
  isLoading: boolean
  error: string | null
  
  // Actions
  loadFeatures: () => Promise<void>
  createFeature: (data: FeatureCreate) => Promise<Feature>
  updateFeature: (id: string, data: Partial<Feature>) => Promise<void>
  deleteFeature: (id: string) => Promise<void>
  setCurrentFeature: (feature: Feature | null) => void
}

export const useFeatureStore = create<FeatureState>()(
  immer((set, get) => ({
    // Initial state
    features: [],
    currentFeature: null,
    isLoading: false,
    error: null,

    // Actions with error handling
    loadFeatures: async () => {
      set(state => { state.isLoading = true; state.error = null })
      
      try {
        const result = await window.electronAPI.feature.list()
        if (result.success) {
          set(state => { 
            state.features = result.data
            state.isLoading = false
          })
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        set(state => {
          state.error = error instanceof Error ? error.message : 'Unknown error'
          state.isLoading = false
        })
      }
    }
  }))
)
```

#### Component Development
Create components following the established patterns:

```typescript
// Example: src/renderer/src/components/features/feature/FeatureList.tsx
import React from 'react'
import { Box, VStack, Text, Button } from '@chakra-ui/react'
import { useFeatureStore } from '../../../stores/feature'

export const FeatureList: React.FC = () => {
  const { features, isLoading, error, loadFeatures, createFeature } = useFeatureStore()

  React.useEffect(() => {
    loadFeatures()
  }, [loadFeatures])

  if (isLoading) return <Text>Loading...</Text>
  if (error) return <Text color="red.500">Error: {error}</Text>

  return (
    <VStack spacing={4} align="stretch">
      <Button onClick={() => createFeature({ name: 'New Feature' })}>
        Add Feature
      </Button>
      
      {features.map(feature => (
        <Box key={feature.id} p={4} borderWidth={1} borderRadius="md">
          <Text fontWeight="bold">{feature.name}</Text>
          <Text color="gray.600">{feature.description}</Text>
        </Box>
      ))}
    </VStack>
  )
}
```

#### Custom Hooks
Create reusable hooks in `src/renderer/src/hooks/`:

```typescript
// Example: src/renderer/src/hooks/useFeature.ts
import React from 'react'
import { useFeatureStore } from '../stores/feature'

export const useFeature = (featureId?: string) => {
  const { features, currentFeature, setCurrentFeature } = useFeatureStore()
  
  const feature = React.useMemo(() => {
    if (featureId) {
      return features.find(f => f.id === featureId) || null
    }
    return currentFeature
  }, [featureId, features, currentFeature])

  return {
    feature,
    setCurrentFeature
  }
}
```

### 3. Type Definitions
Add types in `src/shared/types/`:

```typescript
// Example: src/shared/types/feature.ts
export interface Feature {
  id: string
  name: string
  description?: string
  enabled: boolean
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface FeatureCreate {
  name: string
  description?: string
  enabled?: boolean
  settings?: Record<string, unknown>
}

export type FeatureUpdate = Partial<Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>>
```

## Code Conventions

### File Organization
```
src/renderer/src/components/
├── ui/              # Basic UI components
├── layout/          # Layout components  
├── features/        # Feature-specific components
│   ├── chat/        # Chat-related components
│   ├── project/     # Project management
│   └── settings/    # Settings components
└── index.ts         # Export all components
```

### Naming Conventions
- **Components**: PascalCase (`FeatureList.tsx`)
- **Hooks**: camelCase with `use` prefix (`useFeature.ts`)
- **Services**: camelCase with `Service` suffix (`featureService`)
- **Types**: PascalCase (`Feature`, `FeatureCreate`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)

### Import Organization
```typescript
// 1. React and external libraries
import React from 'react'
import { Box, VStack } from '@chakra-ui/react'

// 2. Internal utilities and types
import type { Feature } from '../../../shared/types'

// 3. Local components and hooks
import { useFeature } from '../hooks/useFeature'
```

## Error Handling Patterns

### Service Layer
```typescript
export class ServiceError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message)
    this.name = 'ServiceError'
  }
}

function enhanceError(error: unknown, operation: string): ServiceError {
  if (error instanceof ServiceError) return error
  
  const message = error instanceof Error ? error.message : 'Unknown error'
  return new ServiceError(
    `Failed to ${operation}: ${message}`,
    'SERVICE_ERROR',
    error instanceof Error ? error : undefined
  )
}
```

### IPC Layer
```typescript
ipcMain.handle('feature:create', async (_, data) => {
  try {
    const result = await featureService.create(data)
    return { success: true, data: result }
  } catch (error) {
    console.error('IPC feature:create error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
```

### Frontend Layer
```typescript
// Store actions
createFeature: async (data: FeatureCreate) => {
  set(state => { state.isLoading = true; state.error = null })
  
  try {
    const result = await window.electronAPI.feature.create(data)
    if (!result.success) {
      throw new Error(result.error || 'Failed to create feature')
    }
    
    set(state => {
      state.features.push(result.data)
      state.isLoading = false
    })
    
    return result.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    set(state => {
      state.error = errorMessage
      state.isLoading = false
    })
    throw error
  }
}
```

## Component Patterns

### Base Component Template
```typescript
import React from 'react'
import { Box, BoxProps } from '@chakra-ui/react'

interface ComponentProps extends Omit<BoxProps, 'children'> {
  // Specific props
  title: string
  description?: string
  // Event handlers
  onAction?: () => void
  // Children
  children?: React.ReactNode
}

export const Component: React.FC<ComponentProps> = ({
  title,
  description,
  onAction,
  children,
  ...boxProps
}) => {
  return (
    <Box {...boxProps}>
      {/* Implementation */}
    </Box>
  )
}
```

### Hook Patterns
```typescript
// Data fetching hook
export const useData = (id?: string) => {
  const [data, setData] = React.useState<Data | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getData(id)
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
```

## State Management Patterns

### Zustand Store Template
```typescript
interface StoreState {
  // Data
  items: Item[]
  currentItem: Item | null
  
  // UI state
  isLoading: boolean
  error: string | null
  
  // Actions
  loadItems: () => Promise<void>
  createItem: (data: CreateData) => Promise<Item>
  updateItem: (id: string, data: UpdateData) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  setCurrentItem: (item: Item | null) => void
  clearError: () => void
}

export const useStore = create<StoreState>()(
  immer((set, get) => ({
    // Initial state
    items: [],
    currentItem: null,
    isLoading: false,
    error: null,

    // Actions
    loadItems: async () => {
      // Implementation with error handling
    },
    
    clearError: () => {
      set(state => { state.error = null })
    }
  }))
)
```

### Store Integration with IPC
```typescript
// Event listeners for real-time updates
React.useEffect(() => {
  const handleItemCreated = (item: Item) => {
    setItems(prev => [...prev, item])
  }
  
  const handleItemUpdated = (item: Item) => {
    setItems(prev => prev.map(i => i.id === item.id ? item : i))
  }
  
  const handleItemDeleted = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
  }
  
  // Register event listeners
  window.electronAPI.on('item:created', handleItemCreated)
  window.electronAPI.on('item:updated', handleItemUpdated)
  window.electronAPI.on('item:deleted', handleItemDeleted)
  
  // Cleanup on unmount
  return () => {
    window.electronAPI.off('item:created', handleItemCreated)
    window.electronAPI.off('item:updated', handleItemUpdated)
    window.electronAPI.off('item:deleted', handleItemDeleted)
  }
}, [])
```

## Testing Patterns

### Service Tests
```typescript
// Example: src/main/services/__tests__/feature.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { featureService } from '../feature'

describe('FeatureService', () => {
  beforeEach(async () => {
    // Setup test database
  })

  it('should create a feature', async () => {
    const data = { name: 'Test Feature', description: 'Test description' }
    const feature = await featureService.create(data)
    
    expect(feature.id).toBeDefined()
    expect(feature.name).toBe(data.name)
    expect(feature.description).toBe(data.description)
  })
})
```

### Component Tests
```typescript
// Example: src/renderer/src/components/__tests__/FeatureList.test.tsx
import { render, screen } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { FeatureList } from '../features/feature/FeatureList'

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider>{children}</ChakraProvider>
)

test('renders feature list', async () => {
  render(<FeatureList />, { wrapper: TestWrapper })
  
  expect(screen.getByText('Add Feature')).toBeInTheDocument()
})
```

## Performance Considerations

### Database Optimization
- Use prepared statements for repeated queries
- Implement proper indexing for search operations
- Use transactions for batch operations
- Implement connection pooling

### Frontend Optimization
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Use Zustand selectors to prevent unnecessary re-renders
- Implement proper loading states

### Memory Management
- Clean up event listeners in useEffect cleanup
- Avoid memory leaks in IPC handlers
- Implement proper error boundaries
- Use AbortController for cancellable operations

## Security Best Practices

### Input Validation
```typescript
// Sanitize file paths
const sanitizePath = (path: string): string => {
  return path.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_')
}

// Sanitize user content
const sanitizeContent = (content: string): string => {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim()
}
```

### IPC Security
- Validate all IPC inputs
- Use type guards for runtime validation
- Implement rate limiting for API calls
- Log security-relevant events

## Debugging

### Development Tools
- **Debug Window**: Infrastructure available via `?mode=debug` parameter (currently disabled)
- **DevTools**: Auto-opens in debug mode
- **Console Logging**: Comprehensive logging throughout the application

### Common Issues
- **IPC Communication**: Check both main and renderer console logs
- **State Updates**: Use React DevTools to inspect store changes
- **Database Issues**: Check migration status and query logs
- **Type Errors**: Run `npx tsc --noEmit` for type checking

## Deployment

### Build Process
```bash
# Development build
pnpm build

# Production distributables
pnpm dist

# Platform-specific builds
pnpm dist:win
pnpm dist:mac
pnpm dist:linux
```

### Release Checklist
1. Run all tests: `pnpm test`
2. Type check: `npx tsc --noEmit`
3. Lint code: `pnpm lint`
4. Build application: `pnpm build`
5. Test built application: `pnpm preview`
6. Create distributables: `pnpm dist`
7. Test distributables on target platforms

## Best Practices Summary

1. **Follow Three-Layer Architecture**: Clear separation between main, renderer, and shared code
2. **Type Everything**: Use TypeScript interfaces for all data structures
3. **Handle Errors Gracefully**: Implement comprehensive error handling at all levels
4. **Test Thoroughly**: Write tests for services, components, and integration points
5. **Optimize Performance**: Use efficient patterns for state management and rendering
6. **Secure by Default**: Validate inputs, sanitize outputs, and follow security guidelines
7. **Document Decisions**: Keep code self-documenting with clear naming and structure

This development guide ensures consistency, maintainability, and quality across the entire codebase while leveraging the established patterns and architecture.