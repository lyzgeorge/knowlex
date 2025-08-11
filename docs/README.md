# Knowlex Desktop Documentation

This directory contains comprehensive documentation for the Knowlex Desktop application.

## Architecture Documentation

- **[Architecture Overview](./architecture.md)** - Complete architectural documentation including three-layer design, directory structure, development standards, and communication patterns
- **[Module Dependencies](./module-dependencies.md)** - Visual diagrams and detailed explanation of how modules depend on each other across the application

## Implementation Documentation

- **[Project Setup](./project-setup.md)** - Initial project setup and development environment configuration

## Documentation Standards

Each major feature or module should have corresponding documentation that includes:

1. **Purpose and Scope** - What the module does and why it exists
2. **API Reference** - Public interfaces and key functions
3. **Usage Examples** - How to use the module correctly
4. **Architecture Decisions** - Key design choices and rationale
5. **Testing Strategy** - How the module is tested
6. **Known Limitations** - Current constraints and future improvements

## File Organization

```
docs/
├── README.md              # This file - documentation index
├── architecture.md        # System architecture and design
├── module-dependencies.md # Dependency diagrams and flow
├── project-setup.md       # Project setup documentation
└── [future modules]/      # Module-specific documentation
    ├── database.md        # Database design and queries
    ├── ai-integration.md  # AI model integration
    ├── file-processing.md # File handling and RAG
    ├── ui-components.md   # Component library
    └── ipc-communication.md # Inter-process communication
```

## Contributing to Documentation

When adding new features or modifying existing ones:

1. **Update Architecture**: Modify `architecture.md` if the change affects overall system design
2. **Update Dependencies**: Modify `module-dependencies.md` if new dependencies are introduced
3. **Create Module Docs**: Add specific documentation for new major modules
4. **Update Examples**: Ensure all code examples remain current and functional
5. **Review Standards**: Ensure documentation follows the established patterns and conventions

## Quick Reference

- **Project Structure**: See [Architecture - Directory Structure](./architecture.md#directory-structure-and-responsibilities)
- **Type Definitions**: All types are defined in `src/shared/types/`
- **Constants**: Application constants in `src/shared/constants/`
- **Development Standards**: See [Architecture - Development Standards](./architecture.md#development-standards-and-conventions)
- **IPC Patterns**: See [Architecture - Communication Patterns](./architecture.md#communication-patterns)