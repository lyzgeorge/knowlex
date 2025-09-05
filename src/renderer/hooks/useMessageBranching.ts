import { useMemo, useState, useCallback } from 'react'
import type { Message } from '@shared/types/message'

// Sentinel key for top-level roots (messages with parentMessageId === null)
const ROOT_KEY = '__ROOT__'

interface MessageBranchingResult {
  filteredMessages: Message[]
  branchStates: Record<string, number>
  setBranchIndex: (parentKey: string, index: number) => void
  getBranchInfo: (message: Message) => {
    branches: Message[]
    currentIndex: number
    totalCount: number
  }
}

/**
 * Simplified message branching with deterministic traversal.
 *
 * Behaviors:
 * - Default picks the latest user child at every fork (top-level and below).
 * - Per-parent selections are remembered (parentKey -> index) until changed.
 * - No implicit/explicit heuristics or cascading resets; switching a parent
 *   naturally changes the path because downstream parent keys differ.
 * - Only messages along the currently selected path are returned.
 */
export const useMessageBranching = (messages: Message[]): MessageBranchingResult => {
  // Track branch selections: parentKey -> selected user-child index
  const [branchStates, setBranchStates] = useState<Record<string, number>>({})

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

  // Set active branch with cascading reset
  const setBranchIndex = useCallback(
    (parentKey: string, index: number) => {
      setBranchStates((prev) => ({ ...prev, [parentKey]: index }))
    },
    [childrenMap]
  )

  // Get branch info for UI display
  const getBranchInfo = useCallback(
    (message: Message) => {
      const parentKey = message.parentMessageId ?? ROOT_KEY
      const siblings = (childrenMap[parentKey] || []).filter((m) => m.role === 'user')
      const selectedIndex = branchStates[parentKey]
      const fallbackIndex = siblings.findIndex((m) => m.id === message.id)
      const currentIndex =
        selectedIndex !== undefined
          ? Math.max(0, Math.min(selectedIndex, siblings.length - 1))
          : fallbackIndex >= 0
            ? fallbackIndex
            : Math.max(0, siblings.length - 1)

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
    const topIndex =
      branchStates[ROOT_KEY] !== undefined
        ? Math.max(0, Math.min(branchStates[ROOT_KEY]!, topLevelUsers.length - 1))
        : topLevelUsers.length - 1
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
        const childIndex =
          branchStates[current.id] !== undefined
            ? Math.max(0, Math.min(branchStates[current.id]!, userChildren.length - 1))
            : userChildren.length - 1
        const clampedChildIndex = Math.max(0, Math.min(childIndex, userChildren.length - 1))

        current = userChildren[clampedChildIndex]
      }
    }

    return result
  }, [childrenMap, branchStates, messages])

  return { filteredMessages, branchStates, setBranchIndex, getBranchInfo }
}

export default useMessageBranching
