# Contributing to Knowlex

Thanks for investing time into the Knowlex desktop app. This guide captures the ground rules we follow so the codebase stays predictable and type-safe.

## Quick Start

1. Install dependencies with `pnpm install`.
2. Launch the app in development mode via `pnpm run dev`.
3. Format and lint before pushing: `pnpm run format && pnpm run lint`.
4. Run `pnpm test` and `pnpm typecheck` to keep runtime and types green.

Need a new UI slice? Use the scaffold:

```bash
pnpm gen:feature project-dashboard
```

This creates `features/`, `stores/`, and `hooks/` stubs wired to the agreed directory layout.

## Layered Architecture

We enforce a strict three-layer boundary:

- **shared/** — Single source of truth for types, Zod schemas, constants (e.g. `constants/notifications.ts`), and cross-layer utilities. This layer has no dependencies on `main/` or `renderer/`.
- **main/** — Electron main process. Organised as `domain/` (ports), `services/` (application logic), `infra/` (SQLite, AI, file adapters), and `ipc/` (validation + delegation). All persistence and side-effects stay here.
- **renderer/** — React + Zustand client. `features/` hold UX flows, `stores/` encapsulate state, `hooks/` manage reusable UI logic, and `components/layout|ui/` provide structure and primitives. Renderer never touches Node APIs directly—go through IPC.

Use the TypeScript path aliases (`@shared/*`, `@main/*`, `@renderer/*`, `@preload/*`) instead of relative paths. ESLint checks forbid cross-layer imports that break this contract.

## Coding Conventions

- Naming sticks to `get/list/create/update/delete/move/test/generate` prefixes for side-effectful operations.
- Keep modules focused; extract helpers when a file approaches 300 lines or mixes responsibilities.
- Shared constants live in `src/shared/constants`. Example: notification presets moved to `@shared/constants/notifications` and consumed by `useNotifications`.
- IPC handlers must call `handleIPCCall` and validate payloads with the schemas from `@shared/schemas/*`.
- Services use the query helpers in `@main/infra/database/queries`, never inline SQL.
- For long-running work, register with the cancellation manager (`@main/infra/utils/cancellation`).

## Testing & Quality

- **Services/Domain:** write unit tests with in-memory fakes under `src/main/services/__tests__`.
- **IPC:** add contract tests that assert schema validation and error handling.
- **Renderer:** use React Testing Library with the global `window.knowlex` mocks for integration flows.
- Maintain ≥70% coverage on new service/IPC logic; add regression tests when fixing bugs.

## Documentation

Update both `CLAUDE.md` and `docs/source-code-documentation.md` when behaviour or structure changes. Include a note about new IPC channels or shared constants so other clients stay aligned.

Questions? Open a draft PR early or drop a comment in the issue—it keeps iterations short and the architecture coherent.
