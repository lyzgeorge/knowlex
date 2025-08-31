# Agent System Feature - Product Requirements Document

**Version:** 1.0  
**Date:** August 29, 2025  
**Author:** Development Team  

## 1. Executive Summary

### 1.1 Feature Overview
The Agent System introduces a pluggable, per-message assistant selection mechanism that enables users to choose different AI agents for each conversation turn. Each agent can have customized capabilities, system prompts, and specialized functions like tool calling or structured data generation.

### 1.2 Core Value Proposition
- **Specialized Assistance**: Different agents optimized for specific tasks (coding, writing, analysis, etc.)
- **Flexibility**: Per-message agent selection allows dynamic conversation flows
- **Model Integration**: Each agent can use different configured AI models
- **Extensibility**: Plugin architecture enables easy addition of new agent types
- **Customization**: User-defined agents with custom prompts, capabilities, and model assignments
- **Context Awareness**: Agents maintain conversation context while applying their specialized behavior

## 2. User Requirements

### 2.1 Primary User Stories

**As a user, I want to:**
- Select different agents for different messages within the same conversation
- Access a set of predefined agents optimized for common tasks
- Create and customize my own agents with specific prompts, capabilities, and model assignments
- See agent-specific UI indicators showing which agent and model generated each response
- Configure agent settings including system prompts, tools, output formats, and model selection
- Have agent selection persist as preference for new conversations

### 2.2 User Journey

```
1. User opens chat interface and sees agent selector below input box
2. User chooses "Code Assistant" agent (configured to use GPT-4 model) for technical question
3. Agent responds using GPT-4 with code-focused formatting and tools
4. User switches to "Creative Writer" agent (configured to use Claude model) for next message
5. Agent responds using Claude with creative, narrative-focused assistance
6. User creates custom "Data Analyst" agent in settings with specialized prompts and preferred model
7. Custom agent appears in selector with specialized data analysis capabilities
```

*Note: This journey assumes that AI models have been previously configured using the Model Configuration feature.*

## 3. Functional Requirements

*Note: This feature depends on the Model Configuration feature for managing AI models.*

### 3.1 Agent Selection Interface

**Agent Selector UI:**
- Dropdown/menu component positioned below ChatInputBox
- Format: `🤖 [Agent Name] [▼]` with agent icon and dropdown indicator
- Shows currently selected agent name and icon
- Click to expand agent selection menu with search capability

**Agent Selection Menu:**
```
┌─────────────────────────────────────────┐
│ 🔍 Search agents...                    │
├─────────────────────────────────────────┤
│ 📋 PRESET AGENTS                       │
│ 🤖 General Assistant          [★] GPT-4│
│ 💻 Code Assistant             [★] GPT-4│
│ ✍️  Creative Writer           [★] Claude│
│ 📊 Data Analyst              [★] GPT-4│
│ 🔬 Research Assistant        [★] Claude│
├─────────────────────────────────────────┤
│ 👤 CUSTOM AGENTS                       │
│ 🎯 My Marketing Agent        [⚙️] Claude│
│ 📝 Meeting Summarizer        [⚙️] GPT-4│
│ + Create New Agent           [+]       │
└─────────────────────────────────────────┘
```

**Agent Selection Behavior:**
- Selection applies to current message being composed
- Previous messages retain their original agent and model context
- Agent choice persists as default for new conversations
- Visual indicator in message history shows which agent and model was used
- Model name displayed next to agent name for clarity

### 3.2 Predefined Agent Types

**Core Preset Agents:**

1. **General Assistant** (`general`)
   - Default balanced conversational AI
   - Model: User's configured default model
   - No specialized tools or constraints
   - Standard system prompt for helpful assistance

2. **Code Assistant** (`code`)
   - Specialized in programming and technical tasks
   - Recommended model: GPT-4 (configurable)
   - Tools: Code execution, syntax highlighting, linting
   - System prompt optimized for code generation and debugging

3. **Creative Writer** (`creative`)
   - Optimized for creative and narrative content
   - Recommended model: Claude (configurable)
   - Tools: Text formatting, style analysis
   - System prompt encouraging creative and engaging responses

4. **Data Analyst** (`data`)
   - Specialized in data analysis and visualization
   - Recommended model: GPT-4 (configurable)
   - Tools: Chart generation, statistical analysis, data processing
   - System prompt focused on analytical thinking and data insights

5. **Research Assistant** (`research`)
   - Optimized for research and fact-finding
   - Recommended model: Claude (configurable)
   - Tools: Citation formatting, source validation
   - System prompt encouraging thorough research and citations

**Model Assignment for Preset Agents:**
- Preset agents come with recommended models based on their specialization
- Users can override the model selection for any preset agent from available configured models
- If recommended model is not configured, falls back to default model
- Model preferences are saved per-agent

### 3.3 Agent Configuration System

**Agent Configuration Schema:**
```typescript
interface AgentConfig {
  id: string
  name: string
  description: string
  icon: string
  type: 'preset' | 'custom'
  
  // Model Configuration
  modelId?: string                // References configured ModelConfig.id
  modelOverrides?: {              // Override model-specific parameters
    temperature?: number
    maxTokens?: number
    topP?: number
    reasoningEffort?: 'low' | 'medium' | 'high'
  }
  
  // Core AI Configuration
  systemPrompt?: string
  
  // Capability Configuration
  capabilities: {
    toolCalling?: boolean
    structuredOutput?: boolean
    codeExecution?: boolean
    webSearch?: boolean
    fileAnalysis?: boolean
  }
  
  // Tools Configuration
  tools: Tool[]
  outputFormat?: 'text' | 'json' | 'markdown' | 'structured'
  
  // UI Configuration
  messageStyle?: {
    accentColor?: string
    showReasoning?: boolean
    showToolCalls?: boolean
  }
  
  // Meta
  createdAt: number
  updatedAt: number
  isActive: boolean
}
```

**Tool Definition Schema:**
```typescript
interface Tool {
  id: string
  name: string
  description: string
  type: 'function' | 'api' | 'builtin'
  
  // Function definition for AI
  function: {
    name: string
    description: string
    parameters: JSONSchema
  }
  
  // Execution configuration
  handler: string | ToolHandler
  timeout?: number
  enabled: boolean
}
```

### 3.4 Custom Agent Creation

**Agent Creation Flow:**

1. **Access Settings** → Navigate to Settings → Agents tab
2. **Create New Agent** → Click "Create New Agent" button
3. **Basic Configuration**:
   - Agent name and description
   - Icon selection (emoji or custom)
   - Base template selection (optional)

4. **Model Configuration**:
   - Select model from available configured models dropdown
   - Override model parameters if needed (temperature, max tokens, etc.)
   - Preview model capabilities and limitations

5. **Advanced Configuration**:
   - System prompt editor with preview
   - Capability toggles (tools, structured output, etc.)
   - Output format selection

6. **Tool Configuration**:
   - Enable/disable available tools
   - Configure tool parameters
   - Add custom tools (advanced users)

7. **Testing & Preview**:
   - Test agent with sample prompts using selected model
   - Preview message formatting and model responses
   - Validate configuration and model connectivity

8. **Save & Activate** → Agent available in selector

*Note: Model selection dropdown only shows models that have been configured in Settings → Models.*

### 3.5 Message Context & Agent Switching

**Per-Message Agent Application:**
- Each message records the agent ID and model ID used for generation
- Agent/model switching creates context boundaries in conversation
- Previous context is preserved but processed through new agent and model
- Agent-specific formatting, tools, and model capabilities apply only to new message

**Context Handling Rules:**
- System prompt and model parameters apply only to current message generation
- Conversation history is preserved across agent/model switches
- Each agent sees the full conversation but interprets through its system prompt and model
- Tool calls and structured outputs are agent and model-specific
- Model-specific features (like reasoning) are available per-agent configuration

## 4. Technical Requirements

### 4.1 Database Schema Changes

*Note: This assumes the Model Configuration feature has created the `models` table.*

**New Table: `agents`**
```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    type TEXT NOT NULL CHECK (type IN ('preset', 'custom')),
    model_id TEXT, -- References models.id from Model Configuration feature
    config TEXT NOT NULL, -- JSON configuration (systemPrompt, tools, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (model_id) REFERENCES models(id)
);
```

**Modified Table: `messages`**
```sql
ALTER TABLE messages ADD COLUMN agent_id TEXT;
ALTER TABLE messages ADD COLUMN agent_config TEXT; -- Snapshot of agent config used
-- Add indexes for performance
-- Add foreign key constraints to agents table
-- Note: model_id and model_config are handled by Model Configuration feature
```

### 4.2 Backend Architecture

*Note: This depends on `model-service.ts` from the Model Configuration feature.*

**New Service: `src/main/services/agent-service.ts`**

Core methods:
- `getAvailableAgents(): Promise<Agent[]>`
- `getAgent(id: string): Promise<Agent | null>`
- `createAgent(config: AgentConfig): Promise<Agent>`
- `updateAgent(id: string, config: Partial<AgentConfig>): Promise<Agent>`
- `deleteAgent(id: string): Promise<void>`
- `executeAgentTools(agentId: string, toolCall: ToolCall): Promise<ToolResult>`
- `resolveAgentModel(agentId: string): Promise<ModelConfig>` // Resolves agent's model or fallback

**Updated Service: `src/main/services/assistant-service.ts`**

Enhanced methods:
- `streamAssistantReply(config: AssistantGenConfig & { agentId?: string })`
- Agent and model-specific message generation with system prompt injection
- Tool calling integration based on agent capabilities
- Structured output formatting per agent configuration
- Dynamic model selection based on agent configuration

**New Tool System: `src/main/services/tool-system.ts`**

- Plugin architecture for tool registration
- Built-in tools: code execution, web search, file analysis
- Custom tool execution framework
- Tool result formatting and error handling

### 4.3 Frontend Architecture

*Note: This depends on `model.ts` store from the Model Configuration feature.*

**New Store: `src/renderer/stores/agent.ts`**
```typescript
interface AgentStore {
  agents: Agent[]
  selectedAgent: Agent | null
  isLoading: boolean
  
  // Actions
  loadAgents(): Promise<void>
  selectAgent(agent: Agent): void
  createAgent(config: AgentConfig): Promise<Agent>
  updateAgent(id: string, config: Partial<AgentConfig>): Promise<void>
  deleteAgent(id: string): Promise<void>
  
  // Agent execution with model context
  executeWithAgent(message: string, agentId: string): Promise<void>
  
  // Integration with model store
  getAvailableModelsForAgent(agentId?: string): ModelConfig[]
}
```

**New Components:**
- `src/renderer/components/features/agents/AgentSelector.tsx`
- `src/renderer/components/features/agents/AgentCreator.tsx`
- `src/renderer/components/features/agents/AgentSettings.tsx`
- `src/renderer/components/features/agents/ToolConfigEditor.tsx`
- `src/renderer/components/ui/AgentIndicator.tsx`

**Updated Components:**
- `ChatInputBox.tsx`: Add agent selector integration
- `AssistantMessage.tsx`: Add agent indicator with specialized formatting
- `Settings.tsx`: Add Agents tab for management

*Note: Model-related components are part of the Model Configuration feature.*

### 4.4 Plugin Architecture

**Agent Plugin Interface:**
```typescript
interface AgentPlugin {
  id: string
  name: string
  version: string
  
  // Plugin lifecycle
  initialize(): Promise<void>
  destroy(): Promise<void>
  
  // Agent capabilities
  createAgent(config: AgentConfig): Agent
  executeTools(toolCall: ToolCall): Promise<ToolResult>
  formatOutput(content: any, format: OutputFormat): string
  
  // UI integration
  getConfigUI(): React.ComponentType<AgentConfigProps>
  getMessageUI(): React.ComponentType<MessageProps>
}
```

**Plugin Registration:**
- Dynamic plugin loading from `plugins/` directory
- Plugin manifest validation
- Sandbox execution for security
- Plugin dependency management

## 5. User Interface Design

### 5.1 Agent Selector Component

**Default State:**
```
┌─────────────────────────────────────────┐
│ Type your message...                   │
│                                        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🤖 General Assistant            [▼]   │
└─────────────────────────────────────────┘
```

**Expanded State:**
```
┌─────────────────────────────────────────┐
│ Type your message...                   │
│                                        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🔍 Search agents...                    │
├─────────────────────────────────────────┤
│ 📋 PRESET AGENTS                       │
│ ✓ 🤖 General Assistant                 │
│   💻 Code Assistant                    │
│   ✍️  Creative Writer                  │
│   📊 Data Analyst                     │
├─────────────────────────────────────────┤
│ 👤 CUSTOM AGENTS                       │
│   🎯 My Marketing Agent               │
│   + Create New Agent                  │
└─────────────────────────────────────────┘
```

### 5.2 Message History with Agent Indicators

```
User: Can you help me debug this code?

🤖 General Assistant • GPT-4 • 2m ago
I'd be happy to help! However, I don't see any code...

User: [Switched to Code Assistant] Here's the Python code:
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

💻 Code Assistant • GPT-4 • 1m ago
I can see the issue with this recursive Fibonacci implementation...
[Tool: Code Execution] ✓
[Tool: Performance Analysis] ✓
```

### 5.3 Settings Interface

**Settings → Models Tab:**
```
┌─────────────────────────────────────────┐
│ AI MODELS                        [+ Add]│
│ ┌─────────────────────────────────────┐  │
│ │ ⭐ GPT-4 Turbo (Default)         │  │
│ │ OpenAI • gpt-4-turbo    [Test][Edit]│  │
│ └─────────────────────────────────────┘  │
│ ┌─────────────────────────────────────┐  │
│ │ Claude 3.5 Sonnet               │  │
│ │ Anthropic • claude-3-5-sonnet [Edit]│  │
│ └─────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Settings → Agents Tab:**
```
┌─────────────────────────────────────────┐
│ PRESET AGENTS                          │
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │ 🤖 General      │ │ 💻 Code         │ │
│ │ Assistant       │ │ Assistant       │ │
│ │ Default Model   │ │ GPT-4 Turbo    │ │
│ │ [Customize]     │ │ [Customize]     │ │
│ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────┤
│ CUSTOM AGENTS                    [+ New] │
│ ┌─────────────────────────────────────┐  │
│ │ 🎯 My Marketing Agent • Claude   │ │
│ │ Created: Aug 29, 2025     [Edit][×] │ │
│ └─────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

*Note: Model settings are managed in Settings → Models tab (Model Configuration feature).*

## 6. Implementation Phases

*Note: This implementation assumes the Model Configuration feature has been completed.*

### 6.1 Phase 1: Core Agent Infrastructure (Week 1-2)
- Database schema changes and migration (agents table)
- Agent service and IPC integration with model service
- Basic agent configuration system with model references
- Simple agent selector UI integration

### 6.2 Phase 2: Preset Agents (Week 3-4)
- Implement 5 core preset agents with model assignments
- Agent-specific system prompts and model integration
- Agent selector UI with model display
- Message history with agent indicators

### 6.3 Phase 3: Custom Agents (Week 5-6)
- Custom agent creation and management UI
- Agent settings integration with model selection
- Agent testing with selected models
- Agent customization capabilities

### 6.4 Phase 4: Advanced Features (Week 7-8)
- Tool calling system
- Structured output formats
- Plugin architecture foundation
- Performance optimization

## 7. Success Criteria

### 7.1 Functional Success
- Users can successfully switch between agents (and their models) mid-conversation
- All preset agents demonstrate their specialized capabilities with appropriate models
- Custom agent creation works without technical knowledge
- Tool calling integrates seamlessly with agent responses
- Message history clearly indicates which agent and model was used

### 7.2 Technical Success
- Agent switching adds minimal latency (<200ms)
- System supports 50+ active agents without performance degradation
- Plugin architecture allows third-party agent development
- All agent configurations are properly validated and sanitized
- Data consistency maintained across agent and model switches
- Proper integration with Model Configuration feature

### 7.3 User Experience Success
- Agent selection feels intuitive and discoverable
- Specialized agents provide measurably better results for their domains with appropriate models
- Custom agent creation has <5 minute learning curve
- Visual indicators clearly communicate agent and model context
- No disruption to existing conversation workflows

## 8. Security Considerations

### 8.1 Agent Security
- System prompt injection prevention
- Tool execution sandboxing
- Custom agent validation and sanitization
- Plugin security model with permissions
- Secure integration with model configurations

### 8.2 Data Protection
- Agent configurations stored securely
- Tool execution logs are privacy-compliant
- Custom prompts don't leak sensitive information
- Plugin data isolation
- Model switching doesn't expose previous model's data

## 9. Dependencies

### 9.1 Feature Dependencies
- **Model Configuration Feature**: Required for model selection and management
- Agents reference models configured in the Model Configuration system
- Agent testing depends on model connection capabilities

### 9.2 Integration Points
- Agent service integrates with model service for model resolution
- Agent store integrates with model store for available model list
- Agent UI components reference model configurations
- Message recording includes both agent and model information

## 10. Future Enhancements

### 10.1 Advanced Capabilities
- Multi-agent collaboration (agents consulting each other)
- Agent learning from user feedback
- Marketplace for community-created agents
- Advanced tool ecosystem with third-party integrations

### 10.2 Integration Opportunities
- Project-specific agent defaults
- Agent recommendation based on conversation context
- Integration with external AI services and APIs
- Voice/audio agent personalities
