import { useMemo, useState, useCallback } from 'react'
import type { Message } from '../../../shared/types/message'

// Sentinel key for top-level roots (messages with parentMessageId === null)
const ROOT_KEY = '__ROOT__'

interface BranchState {
  parentKey: string
  activeIndex: number
  explicit: boolean // Whether this is an explicit user choice or automatic default
  knownLength?: number // Track number of known children for new message detection
}

interface MessageBranchingResult {
  filteredMessages: Message[]
  branchStates: Record<string, BranchState>
  setBranchIndex: (parentKey: string, index: number) => void
  getBranchInfo: (message: Message) => {
    branches: Message[]
    currentIndex: number
    totalCount: number
  }
}

/**
 * Enhanced message branching with proper tree traversal and explicit user choices.
 *
 * Key behaviors:
 * 1. Default shows the latest top-level message chain
 * 2. User selections are remembered and persist until changed
 * 3. When switching branches, downstream paths reset to defaults (latest)
 * 4. Only shows messages in the currently selected chain
 */
export const useMessageBranching = (messages: Message[]): MessageBranchingResult => {
  // Track branch selections with explicit vs implicit state
  const [branchStates, setBranchStates] = useState<Record<string, BranchState>>({})

  // Build parent-child relationships
  const childrenMap = useMemo(() => {
    const map: Record<string, Message[]> = {}

    for (const message of messages) {
      const parentKey = message.parentMessageId ?? ROOT_KEY
      if (!map[parentKey]) map[parentKey] = []
      map[parentKey].push(message)
    }

    // Sort children by creation time (ascending)
    Object.values(map).forEach((children) => {
      children.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    })

    return map
  }, [messages])

  // Initialize default branch states and handle new message auto-switching
  useMemo(() => {
    setBranchStates((prev) => {
      const next: Record<string, BranchState> = { ...prev }
      let changed = false

      // For each parent that has user children, set default to latest
      for (const [parentKey, children] of Object.entries(childrenMap)) {
        const userChildren = children.filter((m) => m.role === 'user')
        if (userChildren.length > 0) {
          const currentState = next[parentKey]
          const latestIndex = userChildren.length - 1

          // Auto-switch to latest message in these cases:
          // 1. No current state exists
          // 2. Current choice is invalid (out of bounds)
          // 3. There's a new message (userChildren.length > previous known length) AND no explicit choice
          // We also treat a previously 'explicit' selection that was made when there was
          // only a single option as implicit once new siblings appear. This fixes the
          // scenario where the very first (and only) root user message becomes flagged
          // explicit (e.g. due to a programmatic set) and then prevents auto-switching
          // when a new top-level user message (fork) is created.
          const previouslySingleChoiceBecomesMulti =
            !!currentState?.explicit &&
            (currentState.knownLength || 0) === 1 &&
            userChildren.length > 1

          const shouldAutoSwitch =
            !currentState ||
            currentState.activeIndex >= userChildren.length ||
            currentState.activeIndex < 0 ||
            (!currentState.explicit && userChildren.length > (currentState?.knownLength || 0)) ||
            previouslySingleChoiceBecomesMulti

          if (shouldAutoSwitch) {
            next[parentKey] = {
              parentKey,
              activeIndex: latestIndex,
              explicit: currentState?.explicit || false,
              knownLength: userChildren.length // Track known length for new message detection
            }
            changed = true
          } else if (currentState.knownLength !== userChildren.length) {
            // Update known length without changing selection
            next[parentKey] = {
              ...currentState,
              knownLength: userChildren.length
            }
            changed = true
          }
        }
      }

      return changed ? next : prev
    })
  }, [childrenMap])

  // Set active branch with cascading reset
  const setBranchIndex = useCallback(
    (parentKey: string, index: number) => {
      setBranchStates((prev) => {
        const next: Record<string, BranchState> = { ...prev }

        // Get current known length
        const parentChildren = childrenMap[parentKey] || []
        const userChildren = parentChildren.filter((m) => m.role === 'user')

        // Set the explicit choice
        next[parentKey] = {
          parentKey,
          activeIndex: index,
          // Only mark as explicit if there is a genuine choice (>= 2 siblings)
          explicit: userChildren.length > 1,
          knownLength: userChildren.length
        }

        // Find the selected message to determine what needs to be reset
        const selectedMessage = userChildren[index]

        if (selectedMessage) {
          // Reset all downstream explicit choices to allow re-evaluation
          const resetDownstream = (messageId: string) => {
            const children = childrenMap[messageId] || []
            for (const child of children) {
              if (next[child.id]?.explicit) {
                const existing = next[child.id]!
                next[child.id] = {
                  parentKey: existing.parentKey,
                  activeIndex: existing.activeIndex,
                  explicit: false,
                  knownLength: existing.knownLength ?? 0
                }
              }
              resetDownstream(child.id)
            }
          }
          resetDownstream(selectedMessage.id)
        }

        return next
      })
    },
    [childrenMap]
  )

  // Get branch info for UI display
  const getBranchInfo = useCallback(
    (message: Message) => {
      const parentKey = message.parentMessageId ?? ROOT_KEY
      const siblings = (childrenMap[parentKey] || []).filter((m) => m.role === 'user')
      const currentIndex =
        branchStates[parentKey]?.activeIndex ??
        Math.max(
          0,
          siblings.findIndex((m) => m.id === message.id)
        )

      return {
        branches: siblings,
        currentIndex: Math.max(0, Math.min(currentIndex, siblings.length - 1)),
        totalCount: siblings.length
      }
    },
    [childrenMap, branchStates]
  )

  // Compute visible message chain
  const filteredMessages = useMemo(() => {
    const result: Message[] = []

    // Get top-level user messages (those with parentMessageId === null)
    const topLevelUsers = (childrenMap[ROOT_KEY] || []).filter((m) => m.role === 'user')

    if (topLevelUsers.length === 0) {
      // Fallback: return all messages in chronological order
      return messages
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }

    // Select top-level message based on branch state
    const rootState = branchStates[ROOT_KEY]
    const topIndex = rootState?.activeIndex ?? topLevelUsers.length - 1
    const clampedIndex = Math.max(0, Math.min(topIndex, topLevelUsers.length - 1))

    let current: Message | undefined = topLevelUsers[clampedIndex]

    // Traverse the selected chain
    while (current) {
      result.push(current)

      if (current.role === 'user') {
        // User message -> find its assistant response
        const assistantChildren = (childrenMap[current.id] || []).filter(
          (m) => m.role === 'assistant'
        )
        if (assistantChildren.length === 0) break

        // For assistant responses, always take the latest (there should only be one typically)
        current = assistantChildren[assistantChildren.length - 1]
      } else {
        // Assistant message -> find selected user response
        const userChildren = (childrenMap[current.id] || []).filter((m) => m.role === 'user')
        if (userChildren.length === 0) break

        // Use branch state to select which user child to follow
        const branchState = branchStates[current.id]
        const childIndex = branchState?.activeIndex ?? userChildren.length - 1
        const clampedChildIndex = Math.max(0, Math.min(childIndex, userChildren.length - 1))

        current = userChildren[clampedChildIndex]
      }
    }

    return result
  }, [childrenMap, branchStates, messages])

  return { filteredMessages, branchStates, setBranchIndex, getBranchInfo }
}

export default useMessageBranching
