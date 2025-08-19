import { useRef, useEffect, useLayoutEffect } from 'react'

export interface UseAutoScrollOptions {
  /** Threshold in pixels from bottom to consider user "at bottom" */
  threshold?: number
  /** Whether to enable auto-scrolling */
  enabled?: boolean
}

/**
 * Hook for managing auto-scroll behavior in scrollable containers
 *
 * Automatically scrolls to bottom when new content is added, but only if:
 * - The user was at the bottom before the content was added
 * - Auto-scrolling is enabled
 *
 * @param dependencies - Array of dependencies that trigger scroll check
 * @param options - Configuration options
 * @returns ref to attach to the scrollable element
 */
export function useAutoScroll<T extends HTMLElement>(
  dependencies: React.DependencyList,
  options: UseAutoScrollOptions = {}
) {
  const { threshold = 100, enabled = true } = options
  const scrollRef = useRef<T>(null)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const wasAtBottomRef = useRef(true) // Track if user was at bottom before update

  // Check if user is near the bottom of the scroll container
  const isNearBottom = (element: HTMLElement): boolean => {
    const { scrollTop, scrollHeight, clientHeight } = element
    return scrollHeight - scrollTop - clientHeight <= threshold
  }

  // Scroll to bottom of the container
  const scrollToBottom = (element: HTMLElement): void => {
    element.scrollTop = element.scrollHeight
  }

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const element = scrollRef.current
    if (!element || !enabled) return

    const handleScroll = () => {
      // Mark that user is actively scrolling
      isUserScrollingRef.current = true

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Reset user scrolling flag after a delay
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 150)
    }

    // Set initial bottom state
    wasAtBottomRef.current = isNearBottom(element)

    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [enabled, isNearBottom])

  // Capture scroll position BEFORE DOM updates (useLayoutEffect runs before useEffect)
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !enabled) return

    // Capture whether user was at bottom before the new content renders
    wasAtBottomRef.current = isNearBottom(element)
  }, [enabled, isNearBottom, ...dependencies])

  // Auto-scroll effect triggered by dependencies (runs AFTER DOM updates)
  useEffect(() => {
    const element = scrollRef.current
    if (!element || !enabled) return

    // Only auto-scroll if:
    // 1. User is not actively scrolling
    // 2. User was at the bottom before the update
    if (!isUserScrollingRef.current && wasAtBottomRef.current) {
      scrollToBottom(element)
    }
  }, [enabled, ...dependencies])

  return scrollRef
}

export default useAutoScroll
