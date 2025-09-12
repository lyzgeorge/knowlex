/**
 * Message branching context provider
 *
 * Centralizes branching logic and eliminates prop drilling of branchInfo
 * and onBranchChange callbacks throughout the component tree.
 */

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react'
import { useMessageBranching } from '@renderer/hooks/useMessageBranching'
import type { Message } from '@shared/types/message'

/**
 * Branch information for a message
 */
export interface BranchInfo {
  branches: Message[]
  currentIndex: number
  totalCount: number
}

/**
 * Branching context interface
 */
interface MessageBranchingContextValue {
  filteredMessages: Message[]
  getBranchInfo: (message: Message) => BranchInfo | undefined
  setBranchIndex: (parentKey: string, index: number) => void
}

/**
 * Message branching context
 */
const MessageBranchingContext = createContext<MessageBranchingContextValue | null>(null)

/**
 * Props for the message branching provider
 */
interface MessageBranchingProviderProps {
  messages: Message[]
  children: ReactNode
}

/**
 * Message branching provider component
 *
 * Wraps message components and provides branching context to eliminate
 * prop drilling and centralize branching logic.
 */
export const MessageBranchingProvider: React.FC<MessageBranchingProviderProps> = ({
  messages,
  children
}) => {
  const { filteredMessages, setBranchIndex, getBranchInfo } = useMessageBranching(messages)

  // Stable getters to avoid recalculation churn in consumers
  const stableGetBranchInfo = useCallback(getBranchInfo, [getBranchInfo])
  const stableSetBranchIndex = useCallback(setBranchIndex, [setBranchIndex])

  const value = useMemo(
    () => ({
      filteredMessages,
      getBranchInfo: stableGetBranchInfo,
      setBranchIndex: stableSetBranchIndex
    }),
    [filteredMessages, stableGetBranchInfo, stableSetBranchIndex]
  )

  return (
    <MessageBranchingContext.Provider value={value}>{children}</MessageBranchingContext.Provider>
  )
}

/**
 * Hook to use message branching context
 *
 * @returns Branching context value
 * @throws Error if used outside MessageBranchingProvider
 */
/**
 * Context consumer hook (renamed)
 *
 * Use `useMessageBranchingContext` to consume the context. `useBranching`
 * remains exported as a backward-compatible alias for one release.
 */
export const useMessageBranchingContext = (): MessageBranchingContextValue => {
  const context = useContext(MessageBranchingContext)
  if (!context) {
    throw new Error('useMessageBranchingContext must be used within a MessageBranchingProvider')
  }
  return context
}

// Backward-compatible alias
export const useBranching = useMessageBranchingContext

/**
 * Hook to get branch info for a specific message
 *
 * @param message - The message to get branch info for
 * @returns Branch information or undefined
 */
export const useMessageBranchInfo = (message: Message): BranchInfo | undefined => {
  const { getBranchInfo } = useBranching()
  return useMemo(() => getBranchInfo(message), [getBranchInfo, message])
}

/**
 * Hook to get branch change handler for a message
 *
 * @param message - The message to create handler for
 * @returns Branch change handler
 */
export const useMessageBranchChange = (message: Message) => {
  const { setBranchIndex } = useBranching()
  return useMemo(() => {
    return (index: number) => {
      const parentKey = message.parentMessageId ?? '__ROOT__'
      setBranchIndex(parentKey, index)
    }
  }, [setBranchIndex, message.parentMessageId])
}

/**
 * Optional branching hook - returns null if not in branching context
 *
 * @returns Branching context value or null
 */
export const useOptionalBranching = (): MessageBranchingContextValue | null => {
  return useContext(MessageBranchingContext)
}
