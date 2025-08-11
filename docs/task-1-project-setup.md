# Project Setup Documentation

## Project Structure

Knowlex Desktop follows a three-layer Electron architecture that separates concerns and ensures maintainable code organization:

```
knowlex/
├── src/
│   ├── main/                     # Main Process (Node.js + Electron)
│   │   ├── index.ts              # Application entry point
│   │   ├── services/             # Business logic services
│   │   ├── ai/                   # AI model integrations
│   │   ├── ipc/                  # IPC handlers
│   │   ├── database/             # Database operations
│   │   └── utils/                # Utility functions
│   │
│   ├── renderer/                 # Renderer Process (React + TypeScript)
│   │   ├── index.html            # HTML entry point
│   │   ├── src/
│   │   │   ├── main.tsx          # React application entry
│   │   │   ├── App.tsx           # Main application component
│   │   │   ├── components/       # React components
│   │   │   │   ├── ui/           # Reusable UI components
│   │   │   │   ├── layout/       # Layout components
│   │   │   │   └── features/     # Feature-specific components
│   │   │   ├── stores/           # State management (Zustand)
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── pages/            # Page components
│   │   │   └── utils/            # Frontend utilities
│   │
│   └── shared/                   # Shared Code
│       ├── types/                # TypeScript type definitions
│       ├── constants/            # Application constants
│       └── utils/                # Shared utility functions
│
├── docs/                         # Documentation
├── resources/                    # Application resources (icons, etc.)
├── electron.vite.config.ts       # Vite configuration
├── package.json                  # Project configuration
└── tsconfig.json                 # TypeScript configuration
```

### Architecture Principles

1. **Three-Layer Separation**: 
   - **Main Process**: System integration, data storage, AI services
   - **Renderer Process**: User interface and interactions
   - **Shared Code**: Common types, constants, and utilities

2. **Module Organization**:
   - Single responsibility principle for each module
   - Clear dependency boundaries between layers
   - Feature-based component organization

3. **Path Aliases**:
   - `@main` → `src/main`
   - `@renderer` → `src/renderer/src`
   - `@shared` → `src/shared`
   - `@preload` → `src/preload`

## Development Environment Configuration

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **pnpm**: Package manager (recommended over npm/yarn)
- **Git**: Version control

### Initial Setup

1. **Clone and Install Dependencies**:
   ```bash
   git clone <repository-url>
   cd knowlex
   pnpm install
   ```

2. **Verify Installation**:
   ```bash
   pnpm run build    # Test production build
   pnpm run lint     # Test code linting
   pnpm run format   # Test code formatting
   ```

3. **Start Development**:
   ```bash
   pnpm run dev      # Launch development server
   ```

### Development Tools

- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **TypeScript**: Type safety and IntelliSense
- **Vitest**: Testing framework
- **Husky**: Git hooks for quality assurance

## Build and Deployment Flow

### Development Workflow

1. **Development Server**:
   ```bash
   pnpm run dev
   ```
   - Launches Electron app with hot reload
   - Automatic recompilation on file changes
   - DevTools available for debugging

2. **Preview Mode**:
   ```bash
   pnpm run preview
   ```
   - Tests production build locally
   - Verifies optimization and bundling

### Production Build

1. **Build Application**:
   ```bash
   pnpm run build
   ```
   - Compiles TypeScript to JavaScript
   - Optimizes React bundle
   - Generates production-ready files in `out/` directory

2. **Package Distribution**:
   ```bash
   pnpm run dist          # All platforms
   pnpm run dist:mac      # macOS only
   pnpm run dist:win      # Windows only
   pnpm run dist:linux    # Linux only
   ```

### Build Output Structure

```
out/
├── main/
│   └── index.js          # Main process bundle
├── preload/
│   └── index.js          # Preload script bundle
└── renderer/
    ├── index.html        # Renderer HTML
    └── assets/           # Optimized assets and JS bundles
```

## Code Standards and Best Practices

### TypeScript Configuration

- **Strict Mode**: Enabled for maximum type safety
- **Path Mapping**: Configured for clean imports
- **Module Resolution**: Node.js style with ESM support

### Code Quality Rules

#### ESLint Configuration
- TypeScript recommended rules
- React and React Hooks rules
- Custom rules for consistency:
  - No unused variables (with `_` prefix exception)
  - `@typescript-eslint/no-explicit-any` as warning
  - React JSX scope rules disabled (React 17+)

#### Prettier Configuration
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 100,
  "endOfLine": "lf"
}
```

### Development Guidelines

1. **File Organization**:
   - Keep files under 300 lines when practical
   - Use descriptive, intention-revealing names
   - Group related functionality in modules

2. **Component Design**:
   - Prefer functional components with hooks
   - Extract custom hooks for reusable logic
   - Keep components focused on single responsibility

3. **Type Safety**:
   - Define interfaces for all data structures
   - Use type guards for runtime validation
   - Avoid `any` type (use `unknown` instead)

4. **Error Handling**:
   - Implement graceful error boundaries
   - Provide user-friendly error messages
   - Log errors appropriately for debugging

5. **Performance**:
   - Use React.memo for expensive components
   - Implement virtual scrolling for large lists
   - Lazy load components when appropriate

### Git Workflow

- **Pre-commit Hooks**: Automatic linting and formatting
- **Commit Messages**: Descriptive and conventional format
- **Branch Strategy**: Feature branches with PR review

### Testing Strategy

- **Unit Tests**: Vitest for business logic
- **Component Tests**: React Testing Library
- **Integration Tests**: IPC communication testing
- **Coverage**: Aim for 80%+ test coverage on critical paths

This documentation provides the foundation for understanding and contributing to the Knowlex Desktop project. Follow these guidelines to maintain code quality and architectural consistency.