import React, { useEffect, useImperativeHandle, useRef } from 'react'
import { Textarea, type TextareaProps } from '@chakra-ui/react'

export interface AutoResizeTextareaProps extends Omit<TextareaProps, 'rows'> {
  /** Maximum visible rows before scrolling */
  maxRows?: number
}

/**
 * AutoResizeTextarea
 * - Color-agnostic, reusable textarea with auto height growth up to maxRows.
 * - Does not apply any color styles; parent controls colors/placeholder styles.
 * - For consistency, defaults to single-row with 1.5rem line-height and no manual resize.
 */
const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, onChange, maxRows = 3, style, sx, ...rest }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null)

    // Expose the inner textarea ref
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement)

    // Adjust height based on content, limited to maxRows
    const adjustHeight = () => {
      const el = innerRef.current
      if (!el) return

      // Reset to auto to measure scroll height correctly
      el.style.height = 'auto'

      // Compute max height using computed line-height
      const comp = window.getComputedStyle(el)
      const lineHeightPx = parseFloat(comp.lineHeight || '24') || 24
      const maxPx = lineHeightPx * Math.max(1, maxRows)

      const next = Math.min(el.scrollHeight, maxPx)
      el.style.height = `${next}px`
    }

    useEffect(() => {
      adjustHeight()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, maxRows])

    return (
      <Textarea
        ref={innerRef}
        value={value as any}
        onChange={onChange}
        // Behavior defaults (no colors here)
        resize="none"
        rows={1}
        // Ensure compact default line height; parent can override via props
        lineHeight="1.5rem"
        // Avoid visual borders by default (not a color)
        border="none"
        py={0}
        px={0}
        bg="transparent"
        _focus={{ boxShadow: 'none' }}
        // Respect any parent-provided styles
        style={style}
        {...(sx && { sx })}
        {...rest}
      />
    )
  }
)

AutoResizeTextarea.displayName = 'AutoResizeTextarea'

export default AutoResizeTextarea
