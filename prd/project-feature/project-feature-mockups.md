# Project Feature UI Mockups

## 1. Updated Sidebar with Projects Section

```
┌─────────────────────────────────────┐
│ ☰ Knowlex                      ⚙️  │
├─────────────────────────────────────┤
│                                     │
│ Projects                       [+]  │
│                                     │
│ 📁 AI Research              [...]   │
│   ├─ GPT-4 Analysis                │
│   ├─ Model Comparison              │
│   └─ Research Notes                │
│                                     │
│ 📁 Work Tasks               [...]   │
│                                     │
│ 📁 Personal Projects        [...]   │
│                                     │
│ 📁 Client Work              [...]   │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ Conversations                       │
│                                     │
│ ├─ Random Chat                      │
│ ├─ Quick Question                   │
│ └─ Debug Help                       │
│                                     │
└─────────────────────────────────────┘
```

**Interactive Elements:**
- `[+]` button: Create new project
- `📁` folder icon: Click to Expand/collapse project
- Project name: Click to open project page
- `[...]` menu: Rename/Delete project options
- Conversation items: Click to open conversation

## 2. Project Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Research Project                                      [...] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    Start a New Conversation                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Type a message to discuss AI research topics...        │   │
│  │                                                   [📎] │   │
│  │                                              [Send] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Project Conversations (3)                                       │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🤖 GPT-4 Analysis                                    2h [...] │ │
│ │ Let's analyze the capabilities and limitations of...         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📊 Model Comparison                                  1d [...] │ │
│ │ I want to compare different AI models for text...           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📝 Research Notes                                   3d [...] │ │
│ │ Can you help me organize my research findings...            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Interactive Elements:**

- `[...]` header menu: Project rename/delete
- Chat input box: Create new conversation in this project
- Conversation cards: Click to open, [...] for actions
- Each card shows: Title, preview text, time, actions

## 3. Project Creation Flow

### Step 1: Click + Button
```
┌─────────────────────────────────────┐
│ Projects                       [+]  │ ← Click here
│                                     │
│ 📁 Existing Project          [...] │
└─────────────────────────────────────┘
```

### Step 2: Inline Input Appears
```
┌─────────────────────────────────────┐
│ Projects                       [+]  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ New Project Name         [×] [√]│ │ ← Type here
│ └─────────────────────────────────┘ │
│                                     │
│ 📁 Existing Project          [...] │
└─────────────────────────────────────┘
```

### Step 3: Project Created
```
┌─────────────────────────────────────┐
│ Projects                       [+]  │
│                                     │
│    📁 New Project Name          [...] │ ← New project added
│    📁 Existing Project          [...] │
└─────────────────────────────────────┘
```

## 4. Move Conversation Submenu

**Triggered from:** Conversation [...] menu → Move ▶

```
┌─────────────────────────────────────┐
│ 🤖 GPT-4 Analysis          2h [...] │ ← Click menu
│   ┌─────────────────────────────────┐ │
│   │ Move                             │ ← Hover to show submenu
│   │   Remove from project           │
│   │   ──────────────                │
│   │   AI Research                   │
│   │   Work Tasks                    │
│   │   Personal Projects             │
│   │   Client Work                   │
│   │ Rename                          │
│   │ Delete                          │
│   └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Submenu Behavior:**
- Hover/Click "Move ▶" shows project list inline
- "Remove from project" moves to uncategorized conversations
- Project options show all available projects except current one
- Click project name immediately moves conversation (no additional confirmation)
- Submenu closes after selection

## 5. Project Rename Flow

### Step 1: Click [...] → Rename
```
┌─────────────────────────────────────┐
│    📁 Work Tasks               [...] │ ← Click menu
│   ┌─────────────────────────────────┐ │
│   │ Rename                          │ ← Select option
│   │ Delete                          │
│   └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Step 2: Inline Edit Mode
```
┌─────────────────────────────────────┐
│     ┌───────────────────────┐       │
│  📁 │ Work Tasks     [×] [√]│       │ ← Edit inline
│     └───────────────────────┘       │
└─────────────────────────────────────┘
```

### Step 3: Save on Enter/Blur
```
┌─────────────────────────────────────┐
│    📁 Client Projects          [...] │ ← Updated name
└─────────────────────────────────────┘
```

## 6. Project Deletion Confirmation (Two-Step)

**Triggered from:** Project [...] menu → Delete

### Step 1: Warning Dialog
```
┌─────────────────────────────────────┐
│ ⚠️  Delete Project?                  │
├─────────────────────────────────────┤
│                                     │
│ Project: "Work Tasks"               │
│                                     │
│ This will PERMANENTLY DELETE:       │
│ • The project "Work Tasks"          │
│ • ALL 5 conversations in project   │
│ • ALL 127 messages in those         │
│   conversations                     │
│                                     │
│ This action cannot be undone.       │
│                                     │
├─────────────────────────────────────┤
│            [Cancel]   [Continue]    │
└─────────────────────────────────────┘
```

### Step 2: Name Confirmation Dialog
```
┌─────────────────────────────────────┐
│ ⚠️  Confirm Deletion                 │
├─────────────────────────────────────┤
│                                     │
│ To confirm deletion, type the       │
│ project name exactly:               │
│                                     │
│ Work Tasks                          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │                               │ │ ← Type here
│ └─────────────────────────────────┘ │
│                                     │
│ ✓ Names match                       │
│                                     │
├─────────────────────────────────────┤
│            [Cancel]    [Delete]     │
└─────────────────────────────────────┘
```

**States:**
- Input empty: Delete button disabled
- Names don't match: "Names don't match" warning, Delete disabled  
- Names match: ✓ confirmation, Delete button enabled

## 7. Conversation Menu Variations

**In Project Context:**
```
┌─────────────────────────────────────┐
│ 🤖 GPT-4 Analysis          2h [...] │ ← Click menu
│   ┌─────────────────────────────────┐ │
│   │ Move                             │ ← Hover/Click for submenu
│   │   Remove from project           │
│   │   ──────────────                │
│   │   AI Research                   │
│   │   Personal Projects             │
│   │   Client Work                   │
│   │ Rename                          │
│   │ Delete                          │
│   └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**In Uncategorized Context:**
```
┌─────────────────────────────────────┐
│ 💬 Random Chat             1h [...] │ ← Click menu
│   ┌─────────────────────────────────┐ │
│   │ Move to                         │ ← Hover/Click for submenu
│   │   AI Research                   │
│   │   Work Tasks                    │
│   │   Personal Projects             │
│   │   Client Work                   │
│   │ Rename                          │
│   │ Delete                          │
│   └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Submenu Interaction:**
- **Desktop**: Hover shows submenu, click selects
- **Immediate action**: Click project name directly moves conversation
- **No confirmation dialog**: Direct move for better UX

## 8. Empty States

### Empty Project
```
┌─────────────────────────────────────────────────────────────────┐
│                                                           [...] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    Start Your First Conversation               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ What would you like to discuss in this project?        │   │
│  │                                                     │   │
│  │  [📎]                                        [Send] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       No conversations yet                      │
│                                                                 │
│              Create your first conversation above               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### No Projects
```
┌─────────────────────────────────────┐
│ Projects                       [+]  │
│                                     │
│        📂 No projects yet           │
│    Click [+] to create your first   │
│                                     │
│ ─────────────────────────────────── │
│ Conversations                       │
│ ├─ 💬 Random Chat                   │
└─────────────────────────────────────┘
```
