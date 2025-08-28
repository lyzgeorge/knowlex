import { useCallback } from 'react'
import type { Message } from '@shared/types/message'

export interface BranchInfo {
  branches: Message[]
  currentIndex: number
  totalCount: number
}

export interface UseMessageBranchResult {
  branches: Message[]
  activeIndex: number
  currentBranch: Message
  hasMultiple: boolean
  goToPrevious: () => void
  goToNext: () => void
  canGoPrevious: boolean
  canGoNext: boolean
}

/**
 * Hook for managing message branch navigation
 */
export function useMessageBranch(
  message: Message,
  branchInfo?: BranchInfo,
  onBranchChange?: (index: number) => void
): UseMessageBranchResult {
  // Use branch info from props or fall back to single message
  const branches = branchInfo?.branches || [message]
  const activeIndex = branchInfo?.currentIndex || 0
  const currentBranch = branches[activeIndex] || message
  const hasMultiple = branches.length > 1

  const canGoPrevious = activeIndex > 0
  const canGoNext = activeIndex < branches.length - 1

  const goToPrevious = useCallback(() => {
    const newIndex = Math.max(0, activeIndex - 1)
    onBranchChange?.(newIndex)
  }, [activeIndex, onBranchChange])

  const goToNext = useCallback(() => {
    const newIndex = Math.min(branches.length - 1, activeIndex + 1)
    onBranchChange?.(newIndex)
  }, [activeIndex, branches.length, onBranchChange])

  return {
    branches,
    activeIndex,
    currentBranch,
    hasMultiple,
    goToPrevious,
    goToNext,
    canGoPrevious,
    canGoNext
  }
}
