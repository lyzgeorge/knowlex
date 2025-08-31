# Technical Design: Model Configuration & In-Conversation Switching Feature

**Version:** 1.0  
**Date:** August 31, 2025  
**Author:** GitHub Copilot

## 1. Introduction

This document translates `model-feature-prd.md` into an engineering plan covering data model, backend services, AI adapter integration, IPC contracts, renderer state & UI components, reasoning effort control, and migration strategy. The feature enables users to configure multiple OpenAI‑compatible model endpoints, switch the active model per conversation, and set a per-message reasoning effort.

## 2. Goals & Scope

### 2.1 Goals
- Persist multiple user-defined AI model configurations (endpoint + credentials + parameters + capability flags).
- Provide secure, typed IPC APIs for CRUD + connection testing.
- Allow selecting the active model per conversation (persist selection per conversation).
- Allow per-message reasoning effort selection (low | medium | high | disabled) without modifying stored conversation state.
- Integrate selected model + reasoningEffort into existing streaming pipeline (Vercel AI SDK).
- Provide centralized Models settings UI and convenient header dropdown + reasoning control in chat input.

### 2.2 Out of Scope (Initial Iteration)
- Provider-specific parameter validation beyond basic ranges (e.g., Azure deployment vs. model id mapping wizard).
- Secret encryption at rest (will store API keys in plain text in local DB for MVP—see Open Questions).
- Automatic model capability discovery (user manually sets capability flags).
- Cost tracking / usage metrics.
- Fine-grained rate limiting or quota management.

## 3. Data Model

### 3.1 New Table: `model_configs`
Stores all user-configured models.

```sql
CREATE TABLE model_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                  -- User-friendly name
  api_endpoint TEXT NOT NULL,          -- Base URL ending with /v1 (no trailing slash enforced in code)
  api_key TEXT NULL,                   -- May be NULL for local/no-auth endpoints
  model_id TEXT NOT NULL,              -- Provider model identifier
  temperature REAL NULL,               -- Nullable => use default (undefined in request)
  top_p REAL NULL,
  frequency_penalty REAL NULL,
  presence_penalty REAL NULL,
  supports_reasoning INTEGER NOT NULL DEFAULT 0, -- 0/1 flags
  supports_vision INTEGER NOT NULL DEFAULT 0,
  supports_tool_use INTEGER NOT NULL DEFAULT 0,
  supports_web_search INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### 3.2 Modified Table: `conversations`
Add `model_config_id` to persist the last explicitly chosen model per conversation. If NULL, fallback to a global default (first model or environment model).

```sql
ALTER TABLE conversations
ADD COLUMN model_config_id TEXT NULL REFERENCES model_configs(id) ON DELETE SET NULL;

CREATE INDEX idx_conversations_model_config_id ON conversations(model_config_id);
```

### 3.3 Rationale
- Storing model selection on conversation enables persistence across sessions & window reloads.
- Per-message reasoning effort is ephemeral—does not need persistence (just UI state in component during message send).

### 3.4 Migrations
Add a new migration version performing:
1. Create `model_configs` table.
2. Add `model_config_id` column + index.
3. Optional bootstrap: Insert a default row if legacy env keys exist (see Migration Strategy).

Rollback reverses operations (drop index, drop column—requires shadow copy / table rebuild if SQLite limitations; we already have migration utilities; will implement with table rebuild pattern if necessary.)

## 4. Shared Types (`src/shared/types/models.ts`)

```ts
export interface ModelConfig {
  id: string;
  name: string;
  apiEndpoint: string;     // normalized (no trailing /)
  apiKey: string | null;
  modelId: string;
  temperature?: number;    // undefined => not sent
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  supportsReasoning: boolean;
  supportsVision: boolean;
  supportsToolUse: boolean;
  supportsWebSearch: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ReasoningEffort = 'low' | 'medium' | 'high';
```

Conversation augmentation (in `conversation` shared type):
```ts
modelConfigId: string | null; // selected model id when conversation was last updated
```

Message request extension (not persisted):
```ts
interface OutgoingAIRequest {
  model: string;                    // modelConfigs.modelId
  endpoint: string;                 // per config
  apiKey?: string;                  // per config
  messages: Message[];
  reasoningEffort?: ReasoningEffort; // only when user selected (omit entirely if disabled)
  temperature?: number;             // include only if defined
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}
```

## 5. Backend (Main Process)

### 5.1 New Service: `model-config-service.ts`
Location: `src/main/services/model-config-service.ts`

Responsibilities:
- CRUD operations on `model_configs` table.
- Validation (field presence, numeric ranges, URL normalization).
- Connection testing (network call with test completion message).
- Normalization (strip trailing slashes, clamp parameter ranges).

Interface:
```ts
interface IModelConfigService {
  list(): Promise<ModelConfig[]>;
  get(id: string): Promise<ModelConfig | null>;
  create(input: CreateModelConfigInput): Promise<ModelConfig>;
  update(id: string, updates: UpdateModelConfigInput): Promise<ModelConfig>;
  delete(id: string): Promise<void>; // sets conversations.model_config_id = NULL via FK ON DELETE SET NULL
  testConnection(id: string): Promise<ModelConnectionTestResult>;
  resolveDefaultModel(): Promise<ModelConfig | null>; // first by created_at if exists
}
```

Validation Rules:
- `name`: non-empty, unique case-insensitive.
- `apiEndpoint`: must start with http(s)://; trimmed; remove trailing `/`.
- `temperature` in [0,2]; `topP` in (0,1]; penalties in [-2,2]. Reject out-of-range.
- `modelId`: non-empty.

### 5.2 Assistant Integration (`assistant-service.ts` & `openai-adapter.ts`)
Changes:
- Accept an extra parameter `modelConfigId` + `reasoningEffort?: ReasoningEffort` in request from IPC.
- Lookup model config; build dynamic OpenAI-compatible client instance (headers: `Authorization: Bearer <apiKey>` if present).
- Override base URL for AI SDK (use fetch wrapper or environment override).
- Pass `reasoning: { effort: <value> }` or equivalent if AI SDK expects; else convert to provider-specific param (`reasoning_effort`). If not supported, ignoring is acceptable (SDK likely filters unknown fields) — document fallback.
- Include optional sampling params only if defined.

### 5.3 Security Considerations
- API keys stored locally in DB (plain text) for MVP.
- Mask in renderer lists (show `sk-****last4`). Full value only when editing model.
- Never log raw apiKey (sanitize logs).

### 5.4 Connection Testing Implementation
Utility function:
```ts
async function testConnection(config: ModelConfig): Promise<ModelConnectionTestResult> {
  // Steps: HEAD/GET health (optional), then POST /chat/completions (or /responses) with a trivial prompt
  // Timeout 8s total (AbortController)
}
```
Simplified test body (OpenAI style):
```json
{"model":"<modelId>","messages":[{"role":"user","content":"ping"}],"max_tokens":8}
```
Result classification:
- endpointReachable: boolean
- authValid: boolean (401 vs 200/400)
- modelAvailable: boolean (404 model not found vs success)
- roundTripMs
- errorMessage?: string

### 5.5 IPC Layer (`src/main/ipc/model-config.ts`)
Channels (request/response in `IPCResult<T>`):
- `model-config:list`
- `model-config:create`
- `model-config:update`
- `model-config:delete`
- `model-config:test`

Outbound events for live sync:
- `model-config:created`
- `model-config:updated`
- `model-config:deleted`

Assistant Invocation Adjustment:
- Existing message generation IPC (e.g., `assistant:generate` or similar) extended to accept `{ modelConfigId?: string, reasoningEffort?: ReasoningEffort }`.

### 5.6 Error Handling Strategy
- Validation failures => 400-style error messages via `handleIPCCall`.
- Network timeouts => user-friendly "Connection timed out (8s)".
- Auth failures => "Authentication failed (401) – check API key".

## 6. Renderer Architecture

### 6.1 New Zustand Store: `modelConfigStore` (`src/renderer/stores/model-config.ts`)
State:
```ts
interface ModelConfigStore {
  models: ModelConfig[];
  loading: boolean;
  testing: Record<string, boolean>; // per-model test in-flight
  initialized: boolean;
  fetchModels: () => Promise<void>;
  createModel: (input: CreateModelConfigInput) => Promise<ModelConfig>;
  updateModel: (id: string, updates: UpdateModelConfigInput) => Promise<ModelConfig>;
  deleteModel: (id: string) => Promise<void>;
  testModel: (id: string) => Promise<ModelConnectionTestResult>;
  getModelById: (id: string) => ModelConfig | undefined;
  getDefaultModel: () => ModelConfig | undefined;
}
```
Listeners:
- Subscribe to IPC events to keep `models` in sync without full refetch.

### 6.2 Conversation Store Update
Add field:
```ts
activeModelId: string | null; // derived: conversation.modelConfigId OR fallback default
setActiveModel: (modelId: string) => Promise<void>; // updates conversation via IPC
```
When switching models in header:
- Update conversation row (PATCH conversation: set model_config_id)
- Update local state; subsequent message send uses new model.

### 6.3 Reasoning Effort UI State
Handled inside chat input component local state or a lightweight ephemeral store:
```ts
const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort | undefined>(undefined);
```
Reset policy: persist selection during session per conversation tab; not stored in DB.

### 6.4 Components

New / Updated Components:
1. `components/features/models/ModelSettingsPage.tsx`
   - Lists model cards + Add button.
2. `components/features/models/ModelCard.tsx`
   - Shows name, endpoint, modelId, capability icons, masked key, [Test][Edit][Delete].
3. `components/features/models/EditModelModal.tsx`
   - Add/Edit form with Basic + Advanced (collapsible) sections.
4. `components/features/chat/ModelSelector.tsx`
   - Dropdown in conversation header; includes "Manage Models" footer action.
5. `components/features/chat/ReasoningEffortSelector.tsx`
   - Dropdown adjacent to attachment icon.

Reuse existing `Modal`, `Button`, `Input`, `Dropdown` primitives.

### 6.5 Form Validation (Client-Side)
- Mirror backend validation; disable Save when invalid.
- Quick Templates: simple onClick handlers setting endpoint field preset.
- Mask API key input (password field type) with show/hide toggle.

### 6.6 UX Flows
#### Add Model
1. User opens Settings → Models → clicks Add.
2. Modal opens; user fills fields.
3. Optional: clicks Test (disabled until required fields valid).
4. Save → `model-config:create` → store updates via event.
5. Auto-select newly created as default if no prior models.

#### Switch Model (Header)
1. User opens dropdown → selects model.
2. Conversation store updates conversation.modelConfigId.
3. No retroactive changes; future messages use new config.

#### Send Message with Reasoning
1. User picks reasoning level (or leaves disabled).
2. On send, assistant request passes `reasoningEffort` only if selected.
3. UI displays reasoning stream in existing ReasoningBox (already used by o1 streaming) if reasoning chunks arrive.

#### Test Connection
- Show inline spinner & status icons (✅/❌) per step or consolidated result banner.

## 7. Request / Response & IPC Contracts

### 7.1 IPC Payload Types
```ts
interface CreateModelConfigInput {
  name: string;
  apiEndpoint: string;
  apiKey?: string | null;
  modelId: string;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  supportsReasoning?: boolean;
  supportsVision?: boolean;
  supportsToolUse?: boolean;
  supportsWebSearch?: boolean;
}

interface UpdateModelConfigInput extends Partial<CreateModelConfigInput> {}

interface ModelConnectionTestResult {
  endpointReachable: boolean;
  authValid: boolean | null; // null if no key supplied / not tested
  modelAvailable: boolean | null;
  roundTripMs?: number;
  errorMessage?: string;
}
```

### 7.2 Conversation Update IPC
Add / extend existing channel (example naming): `conversation:update` supporting field `{ modelConfigId?: string | null }`.

### 7.3 Assistant Generation IPC
Augment existing request type with:
```ts
modelConfigId?: string; // optional override
reasoningEffort?: ReasoningEffort; // ephemeral
```
On main side: if `modelConfigId` absent use conversation.model_config_id else fallback default model; if still none → error.

## 8. AI Adapter Adjustments

`openai-adapter.ts` modifications:
- Accept dynamic base URL & apiKey per invocation.
- Build fetch with custom headers.
- Map reasoning effort: if provided pass as `reasoning: { effort: 'low'|'medium'|'high' }` or vendor-specific param name; fallback: `extraHeaders['X-Reasoning-Effort']` (future extension) but initial pass just standard property (the Vercel AI SDK for o1 uses `reasoning: { effort }`).
- Only include sampling params if not `undefined` to preserve provider defaults.

Edge Case Handling:
- If provider rejects reasoning parameter (HTTP 400 with unknown param), adapter retries once without reasoning (log suppressed friendly warning) — optional resilience.

## 9. Migration Strategy

### 9.1 Detect Legacy Env Settings
If `OPENAI_API_KEY` or `MODEL_ID` present in `app.env` (via existing settings service) and no rows in `model_configs`, auto-create a default model:
- name: `Default Model`
- endpoint: `https://api.openai.com/v1`
- modelId: from env or fallback `gpt-4o`

### 9.2 Existing Conversations
- `model_config_id` initially NULL; on first model creation not auto-assigned (user picks). Optional enhancement: background script sets all NULL to default model (deferred).

## 10. Validation & Error Messages

| Condition | Message |
|-----------|---------|
| Duplicate name | "Model name already exists" |
| Invalid endpoint | "Endpoint must start with http:// or https://" |
| Missing modelId | "Model ID is required" |
| Range errors | "Temperature must be between 0 and 2" (similarly others) |
| No models configured during send | "No model configured. Add a model in Settings → Models." |

## 11. Performance Considerations
- Model list expected small (<25) => simple in-memory array fine.
- Connection tests limited (single-flight per model) with throttle (disable button while `testing[id]`).
- Header dropdown lazy loads models (ensure store fetched during app init or first open of menu). Initial fetch executed during global settings load.
- Avoid recreating large objects per render (memoize transformed list for dropdown options).

## 12. Testing Strategy

### 12.1 Unit Tests (Main)
- `model-config-service.spec.ts`: CRUD, validation failures, normalization.
- Connection test: mock fetch responses (200, 401, 404, timeout).
- Assistant adapter: param mapping (reasoning & sampling).

### 12.2 IPC Integration Tests
- Create / list / update / delete flow; event emission assertions.
- Conversation model switch updates DB and event broadcast.

### 12.3 Renderer Tests
- Store tests: optimistic updates & event handling.
- Component tests: ModelSelector renders active model, switches model triggers store & IPC mock.
- ReasoningEffortSelector toggles states and passes param to send handler.

### 12.4 Manual QA Checklist
- Add multiple models, switch quickly, send messages (ensure proper model id in logs / debug overlay).
- Test connection success & failure scenarios.
- Delete a model used by a conversation → conversation header fallback logic.

## 13. Edge Cases & Failure Modes
- Delete active model while conversation open → fallback to default model (emit notification).
- No models configured → hide model selector & show inline CTA in header.
- Empty API key for local endpoint requiring none → succeed.
- Invalid reasoning effort param for selected provider → degrade silently (log debug only).
- Network offline → connection test exposes `endpointReachable=false` quickly (5s abort controller) & send message fails with user-friendly error.

## 14. Sequencing Plan
1. Migration + types.
2. Service + IPC CRUD (no UI yet) + unit tests.
3. Renderer store + basic settings page list (read-only).
4. Add create/update modal + validation.
5. Integrate model selector into conversation header + conversation DB field update.
6. Add reasoning effort selector & wire to assistant send.
7. Connection testing backend + UI.
8. Polishing (mask keys, capability icons, fallback flows).
9. Comprehensive tests + docs update.

## 15. Capability Icon Mapping
| Capability | Icon (placeholder) | Tooltip |
|-----------|--------------------|---------|
| Reasoning | 🧠 | Enhanced reasoning support |
| Vision | 👁️ | Image understanding |
| Tool Use | 🔧 | Function calling |
| Web Search | 🔍 | External search integration |

## 16. Logging & Telemetry (Local Only)
- Add debug logs (guarded by `process.env.DEBUG_MODELS === '1'`) for model selection changes & connection test outcomes.
- Avoid logging API keys.

## 17. Open Questions & Future Enhancements
1. Encrypt API keys at rest (OS keychain integration?).
2. Auto-discover capabilities via a metadata endpoint (if provider offers) to reduce manual flags.
3. Per-model rate limiting & usage statistics UI.
4. Conversation-level default reasoning preference (persist optional).
5. Bulk assignment of model to multiple conversations.
6. Azure specialized fields (deployment name vs model id) — add template wizard.
7. Vision file/image support gating via `supportsVision` (conditionally enable image upload UI).
8. Tool use integration (function calling DSL) – handshake with future feature.
9. Web search gating: if enabled, later pipeline to external search pre-processing.
10. Multi-window synchronization race conditions (currently event-driven; consider version conflict resolution if edits simultaneous).

## 18. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Inconsistent model state across windows | Wrong model used | IPC broadcast events + store reconciliation on focus |
| Provider rejects reasoning param | Message failure | Retry w/o reasoning once |
| User deletes model in use | Send failure | Fallback logic + notification |
| Plain text key storage | Security concern | Document, roadmap encryption |
| Migration failure | Launch block | Versioned migration with rollback test |

## 19. Documentation Updates
- Update onboarding docs (CLAUDE.md) section 6.1 Services: add model-config-service.
- Add user doc: Settings → Models usage.
- Update AI integration docs with reasoningEffort param semantics.

## 20. Completion Criteria
- All CRUD + test connection working end-to-end.
- Model selector + reasoning effort visible & functional in conversation view.
- Assistant requests reflect selected model + optional reasoning parameter.
- All new/modified tables migrated; tests green.
- Documentation sections updated; no TypeScript errors; lint passes.

---
This technical design defines the foundation for implementing multi-model configuration and reasoning effort controls while minimizing disruption to existing assistant and conversation workflows.
