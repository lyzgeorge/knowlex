# Knowlex Desktop

Knowlex is a local-first AI chat workspace built with Electron, React, and TypeScript. It organises conversations by project, supports attachment-enhanced prompts, and keeps all data in a bundled SQLite database for privacy.

## Highlights

- Project-centric navigation with conversation branching and message regeneration
- Streaming responses with reasoning traces and cancellable requests
- Attachment uploads with shared validation and multi-format parsing
- Multi-provider AI integration via the Vercel AI SDK adapters
- Full i18n support (English & Chinese) and Chakra-based theming

## Getting Started

```bash
pnpm install
pnpm run dev # start renderer + main process with hot reload
```

Useful scripts:

- `pnpm run build` – production bundle
- `pnpm run lint` / `pnpm run format` – quality gates
- `pnpm test` / `pnpm typecheck` – unit tests and TS validation
- `pnpm gen:feature <name>` – scaffold renderer feature/store/hook skeleton

## Architecture Overview

The codebase is split into three layers beneath `src/`:

- `main/` – Electron main process, organised into `domain/`, `services/`, `infra/`, and `ipc/`. Services are ports/adapters that call into infra helpers such as `infra/database/queries.ts`.
- `renderer/` – React client composed of `features/`, `stores/`, `hooks/`, and `components/(layout|ui)`. Renderer owns presentation and state management only.
- `shared/` – Single source of truth for TypeScript types, constants (`constants/notifications.ts`, file constraints, IPC channels), validation schemas, and utilities.

Path aliases (`@main/*`, `@renderer/*`, `@shared/*`, `@preload/*`) keep imports explicit and enforce layer boundaries.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for coding standards, testing expectations, and documentation requirements.

## License

MIT © Knowlex Team
