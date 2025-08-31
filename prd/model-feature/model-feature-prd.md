# Model Configuration Feature - Product Requirements Document

**Version:** 4.1
 **Date:** August 31, 2025
 **Author:** Development Team

## 1. Executive Summary

### 1.1 Feature Overview

The Model Configuration feature enables users to configure multiple AI models within Knowlex using OpenAI-compatible APIs. Users can manage different models with separate API keys, endpoints, and parameters, providing flexibility to choose the best model for different tasks. The feature includes in-conversation model switching and reasoning effort controls directly in the chat interface.

### 1.2 Core Value Proposition

- **Universal Compatibility**: Support any OpenAI-compatible API service
- **Multiple Configurations**: Manage different models with separate settings
- **In-Conversation Flexibility**: Switch models and reasoning effort between messages
- **Flexible Endpoints**: Configure custom endpoints for different providers
- **Simple Testing**: Optional connection validation
- **Cost Optimization**: Use appropriate models for different use cases

## 2. User Requirements

### 2.1 Primary User Stories

**As a user, I want to:**

- Configure multiple AI models using OpenAI-compatible APIs
- Switch between models directly in the conversation header
- Adjust reasoning effort per message without leaving the conversation
- Connect to different providers (OpenAI, Azure, local models, etc.) using the same interface
- Set separate API keys and endpoints for each model configuration
- Optionally test model connections before use
- Change models or reasoning settings for any new message in the same conversation
- See which model is being used in the conversation header
- Manage all model configurations in a centralized settings interface

### 2.2 User Journey

```
1. User opens Settings → Models for the first time
2. User clicks "Add Model" to configure their first AI model
3. User enters model name, API endpoint, and API key
4. User selects or enters the specific model ID
5. User optionally tests the connection
6. User adds additional models with different endpoints/keys
7. In conversation, user sees model selector in the header
8. User can switch models using the dropdown in the conversation header
9. User can adjust reasoning effort using the dropdown next to the attachment icon
10. Each message uses the currently selected model and reasoning settings
```

## 3. Functional Requirements

### 3.1 Conversation Header Integration

**Header Layout (3rem height):**

- **Left side**: Model selector dropdown
- **Center**: Conversation title

**Model Selector Dropdown:**

- Shows currently active model name
- Clicking opens dropdown with all configured models
- Switching models applies to the next message sent
- No special labeling needed for model changes

### 3.2 Chat Input Box Integration

**Reasoning Effort Control:**

- Located to the right of the attachment icon
- Dropdown menu with options:
  - "Disable" (sets reasoningEffort to undefined in ai-sdk)
  - "Low"
  - "Medium"
  - "High"
- Default state: "Disable"
- Available for all models (not restricted by model capabilities)
- Visual indicator shows current setting

**Layout in Chat Input Box:**

```
[📎 Attachment] [🧠 Reasoning: Disable ▼] | Type your message... | [Send]
```

### 3.3 OpenAI-Compatible API Support

The system supports any service that implements the OpenAI API specification:

**Common Providers (via OpenAI-compatible endpoints):**

- **OpenAI**: Direct API access (api.openai.com)
- **Azure OpenAI**: Microsoft's hosted OpenAI service
- **Local Models**: Ollama, LM Studio, text-generation-webui
- **Alternative Providers**: Together AI, Anyscale, Perplexity
- **Self-hosted**: Custom deployments with OpenAI-compatible interfaces

**Supported Model Examples:**

- GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- o1-preview, o1-mini (with reasoning support)
- Claude (via compatible proxy)
- LLaMA, Mistral, Mixtral (via local servers)
- Custom fine-tuned models

### 3.4 Model Configuration Fields

**Essential Configuration:**

- **Model Name**: User-friendly display name (e.g., "GPT-4 Production", "Local Mixtral")
- **API Endpoint**: Full API URL (e.g., "https://api.openai.com/v1", "http://localhost:11434/v1")
- **API Key**: Authentication token (optional for local models)
- **Model ID**: Specific model identifier (e.g., "gpt-4-turbo", "mixtral-8x7b")

**Model Capabilities:** Users can specify which features the model supports:

- **Reasoning**: Model supports chain-of-thought reasoning (e.g., o1 models)
- **Vision**: Model can process and analyze images
- **Tool Use**: Model supports function calling/tool integration
- **Web Search**: Model can be used with web search capabilities

**Advanced Parameters:**

- **Temperature**: Controls response creativity (0.0-2.0)
- **Top P**: Nucleus sampling parameter (0.0-1.0)
- **Frequency Penalty**: Reduce word repetition (-2.0 to 2.0)
- **Presence Penalty**: Encourage topic diversity (-2.0 to 2.0)

### 3.5 Connection Testing (Optional)

**Test Connection Feature:**

- User can optionally test connection
- Validate endpoint accessibility
- Verify API key authentication (if provided)
- Check model availability at the endpoint
- Send test prompt to verify full pipeline
- Testing is not mandatory to use a model

### 3.6 In-Conversation Model Management

**Model Switching Behavior:**

- Each message uses the model selected at the time of sending
- No retroactive changes to previous messages
- Model changes apply immediately to the next message
- No special UI indicators for model changes between messages
- Conversation history maintains coherence regardless of model switches

**Reasoning Effort Behavior:**

- Each message uses the reasoning effort selected at the time of sending
- When "Disable" is selected, reasoningEffort parameter is undefined
- Available for all models regardless of their capabilities
- Changes apply to the next message sent

## 4. User Interface Design

### 4.1 Conversation Header with Model Selector

The updated conversation header layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  [GPT-4 Turbo ▼]        Conversation Title                 │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Model Selector Dropdown (Expanded):**

```
┌─────────────────────┐
│ Select Model        │
├─────────────────────┤
│ GPT-4 Turbo         │
│ Azure GPT-4         │
│ Local Mixtral       │
│ o1-preview          │
│ Claude-3            │
├─────────────────────┤
│ ⚙️ Manage Models    │
└─────────────────────┘
```

### 4.2 Chat Input Box with Reasoning Control

Updated chat input box layout:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Type your message...                                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [📎] [🧠 Reasoning: Disable ▼]                          [Send] │
└─────────────────────────────────────────────────────────────────┘
```

**Reasoning Effort Dropdown (Expanded):**

```
┌──────────────────┐
│ Reasoning Effort │
├──────────────────┤
│ ○ Disable        │
│ ○ Low            │
│ ○ Medium         │
│ ○ High           │
└──────────────────┘
```

### 4.3 Settings → Models Overview

The main models management interface:

```
┌─────────────────────────────────────────────────────┐
│ Settings / Models                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ AI Model Configurations                [+ Add Model]│
│ ─────────────────────                              │
│ Configure OpenAI-compatible models for             │
│ conversations and agents.                          │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ GPT-4 Turbo                                   │  │
│ │ https://api.openai.com/v1                     │  │
│ │ Model: gpt-4-turbo-preview                    │  │
│ │ Capabilities: 🧠 👁️ 🔧 🔍                    │  │
│ │                          [Test] [Edit] [Delete]│  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ Azure GPT-4                                   │  │
│ │ https://mycompany.openai.azure.com/           │  │
│ │ Model: gpt-4-32k                              │  │
│ │ Capabilities: 🧠 👁️ 🔧 🔍                    │  │
│ │                          [Test] [Edit] [Delete]│  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ o1-preview                                    │  │
│ │ https://api.openai.com/v1                     │  │
│ │ Model: o1-preview                             │  │
│ │ Capabilities: 🧠 (Reasoning-optimized)        │  │
│ │                          [Test] [Edit] [Delete]│  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.4 Add/Edit Model Dialog

The model configuration interface:

```
┌─────────────────────────────────────────────────────┐
│ Add New Model                                    [X]│
├─────────────────────────────────────────────────────┤
│                                                     │
│ Basic Configuration                                 │
│ ────────────────────                               │
│                                                     │
│ Model Name *                                       │
│ ┌─────────────────────────────────────────────┐   │
│ │ o1-preview                                  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Quick Templates:                                   │
│ [OpenAI] [Azure] [Ollama] [LM Studio] [Custom]    │
│                                                     │
│ API Endpoint *                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ https://api.openai.com/v1                  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ API Key                                           │
│ ┌─────────────────────────────────────────────┐   │
│ │ sk-••••••••••••••••••••••••••••••••••4a2b  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Model ID *                                         │
│ ┌─────────────────────────────────────────────┐   │
│ │ o1-preview                              ▼   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Model Capabilities                                 │
│ ┌─────────────────────────────────────────────┐   │
│ │ ☐ Reasoning - Chain-of-thought reasoning    │   │
│ │ ☐ Vision - Image analysis & processing      │   │
│ │ ☐ Tool Use - Function calling support       │   │
│ │ ☐ Web Search - Internet search capability   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│              [Test Connection] [Cancel] [Save]      │
└─────────────────────────────────────────────────────┘
```

**Quick Templates (when clicked):**

- **OpenAI**: Pre-fills `https://api.openai.com/v1`
- **Azure**: Pre-fills `https://{resource}.openai.azure.com/openai/deployments/{deployment}/`
- **Ollama**: Pre-fills `http://localhost:11434/v1`
- **LM Studio**: Pre-fills `http://localhost:1234/v1`
- **Custom**: Clears field for manual entry

**Advanced Settings Panel (Optional):**

```
│ ▼ Advanced Settings                                │
│ ┌─────────────────────────────────────────────┐   │
│ │ Response Configuration                       │   │
│ │                                              │   │
│ │ Temperature          [0.7 ]    ←─────→      │   │
│ │ Top P                [1.0 ]    ←─────→      │   │
│ │ Frequency Penalty    [0.0 ]    ←─────→      │   │
│ │ Presence Penalty     [0.0 ]    ←─────→      │   │
│ └─────────────────────────────────────────────┘   │
```

### 4.5 Connection Testing Interface (Optional)

When user chooses to test a connection:

```
┌─────────────────────────────────────────────────────┐
│ Testing Connection                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Testing "GPT-4 Production"...                      │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🔄 Connecting to API endpoint                │   │
│ │ 🔄 Authenticating with API key               │   │
│ │ 🔄 Sending test prompt                       │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 5. Technical Implementation Details

### 5.1 AI SDK Integration

**Message Request with Reasoning:**

```typescript
interface MessageRequest {
  model: string;
  messages: Message[];
  reasoningEffort?: 'low' | 'medium' | 'high' | undefined;
  // When user selects "Disable", reasoningEffort is undefined
  // When user selects a level, pass the string value
}
```

### 5.2 State Management

**Conversation State:**

```typescript
interface ConversationState {
  currentModel: string;
  messages: Message[];
  // reasoningEffort is per-message, not stored in conversation state
}
```

### 5.3 Model Switching Logic

- Store selected model ID in conversation state
- Update model selector UI when changed
- Apply new model to next message request
- No modification to existing messages
- Maintain conversation context across model switches

## 6. User Experience Considerations

### 6.1 Seamless Model Switching

- Instant model switching without page reload
- Clear visual feedback of active model
- Persist last used model per conversation
- Quick access to model management from dropdown

### 6.2 Reasoning Effort UX

- Default to "Disable" for all models
- Available for all models (not restricted)
- Visual indicator when reasoning is selected
- Tooltip explaining reasoning effort levels
- Models may generate reasoning content regardless of setting

### 6.3 Performance Considerations

- Cache model configurations locally
- Lazy load model list in dropdown
- Debounce model switching requests
- Show loading state during model switch

### 6.4 Visual Feedback

- Model selector shows current selection
- Reasoning dropdown shows active state
- Loading spinner during model operations
- Smooth transitions between states
- Backend error messages displayed directly to user

## 7. Migration Path

### 7.1 Existing Conversations

- Conversations maintain their history
- New messages use selected model
- No retroactive changes to old messages
- Smooth transition for existing users

### 7.2 Settings Migration

- Import existing API keys from environment
- Auto-create default model configuration
- Preserve user preferences
- One-time migration wizard