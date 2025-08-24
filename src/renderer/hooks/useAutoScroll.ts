import { useRef, useEffect, useCallback, useState } from 'react'

export interface UseAutoScrollOptions {
  /** Distance from bottom to consider "at bottom" */
  threshold?: number
  /** Enable/disable behavior */
  enabled?: boolean
  /** Use smooth behavior for scrolling */
  smooth?: boolean
  /** Always follow bottom (e.g., while streaming) */
  follow?: boolean
}

export interface UseAutoScrollReturn<T extends HTMLElement> {
  scrollRef: React.RefObject<T>
  anchorRef: React.RefObject<HTMLDivElement>
  forceScrollToBottom: () => void
  isAtBottom: boolean
}

/**
 * Super-simplified auto-scroll: bottom anchor + scroll listener + effect on deps.
 * - Follows anchor when near bottom or `follow` is true.
 * - Stops following when user scrolls up beyond threshold; resumes when back to bottom.
 */
export function useAutoScroll<T extends HTMLElement>(
  dependencies: React.DependencyList,
  options: UseAutoScrollOptions = {}
): UseAutoScrollReturn<T> {
  const { threshold = 120, enabled = true, smooth = true, follow = false } = options

  const scrollRef = useRef<T>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const isStickyRef = useRef(true)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const [isAtBottom, setIsAtBottom] = useState(true)

  const checkNearBottom = useCallback(
    (el: HTMLElement) => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      return distance <= threshold
    },
    [threshold]
  )

  // Local helper kept internal to avoid exposing reactive state
  // (removed from public API to keep hook minimal)

  const forceScrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      const target = el.scrollHeight - el.clientHeight
      // Prefer smooth scrolling when available; fallback to direct assignment
      if ((el as any).scrollTo && smooth) {
        ;(el as any).scrollTo({ top: target, behavior: 'smooth' })
        // Update states immediately for smooth scroll
        setIsAtBottom(true)
      } else {
        el.scrollTop = target
        // Update states immediately for instant scroll
        setIsAtBottom(true)
      }
    }
    isStickyRef.current = true
  }, [smooth])

  // Track user scroll to toggle sticky state
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !enabled) return

    const onScroll = () => {
      isUserScrollingRef.current = true
      const nearBottom = checkNearBottom(el)
      isStickyRef.current = nearBottom
      setIsAtBottom(nearBottom)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 120)
    }

    // Initialize
    const nearBottom = checkNearBottom(el)
    isStickyRef.current = nearBottom
    setIsAtBottom(nearBottom)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [enabled, checkNearBottom])

  // Scroll on dependency changes
  useEffect(() => {
    if (!enabled) return
    const el = scrollRef.current
    if (!el) return
    // Recompute bottom state when content changes (e.g., streaming grows)
    const nearBottom = checkNearBottom(el)
    isStickyRef.current = nearBottom
    setIsAtBottom(nearBottom)
    // Only follow when explicitly requested (e.g., streaming mode)
    if (follow && !isUserScrollingRef.current) {
      forceScrollToBottom()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, follow, forceScrollToBottom, checkNearBottom, threshold, ...dependencies])

  return {
    scrollRef,
    anchorRef,
    forceScrollToBottom,
    isAtBottom
  }
}

export default useAutoScroll
