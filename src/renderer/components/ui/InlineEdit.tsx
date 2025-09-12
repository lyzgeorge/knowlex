import React, { useState, useCallback, useRef, useEffect } from 'react'
import { HStack, Input, IconButton, Tooltip, Text } from '@chakra-ui/react'
import { HiCheck, HiXMark } from 'react-icons/hi2'

interface InlineEditProps {
  /** Current value to display and edit */
  value: string
  /** Whether the component is currently in editing mode */
  isEditing: boolean
  /** Callback when edit is cancelled */
  onCancelEdit: () => void
  /** Callback when edit is confirmed with new value */
  onConfirmEdit: (newValue: string) => void | Promise<void>
  /** Placeholder text for the input */
  placeholder?: string
  /** Validator function to check if the input is valid */
  validator?: (value: string) => boolean
  /** Optional tooltip label */
  tooltipLabel?: string
  /** Tooltip placement */
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
  /** Custom text display component when not editing */
  children?: React.ReactNode
  /** Optional callback when edit mode starts - not used internally but available for consumers */
  onStartEdit?: () => void
}

/**
 * InlineEdit - A reusable component for inline text editing
 *
 * Based on the pattern from ConversationsSection.tsx, this component provides
 * a consistent UI and behavior for inline editing of titles, names, etc.
 */
export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  isEditing,
  onCancelEdit,
  onConfirmEdit,
  placeholder = 'Enter text...',
  validator = (val) => val.trim().length > 0,
  tooltipLabel,
  tooltipPlacement = 'right',
  children,
  onStartEdit: _onStartEdit
}) => {
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update edit value when external value changes and not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value)
    }
  }, [value, isEditing])

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Use setTimeout to ensure the input is rendered and focusable
      setTimeout(() => {
        inputRef.current?.focus()
        // Set cursor at end of text
        const length = inputRef.current?.value.length || 0
        inputRef.current?.setSelectionRange(length, length)
      }, 0)
    }
  }, [isEditing])

  const handleConfirm = useCallback(async () => {
    if (!validator(editValue)) return

    try {
      await onConfirmEdit(editValue.trim())
    } catch (error) {
      console.error('Failed to confirm edit:', error)
      // Reset to original value on error
      setEditValue(value)
    }
  }, [editValue, validator, onConfirmEdit, value])

  const handleCancel = useCallback(() => {
    setEditValue(value) // Reset to original value
    onCancelEdit()
  }, [value, onCancelEdit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleConfirm, handleCancel]
  )

  const handleBlur = useCallback(() => {
    // Delay to allow button clicks to register before canceling
    setTimeout(() => {
      if (isEditing) {
        handleCancel()
      }
    }, 150)
  }, [isEditing, handleCancel])

  if (isEditing) {
    return (
      <HStack flex={1} spacing={1}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          fontSize="sm"
          fontWeight="medium"
          variant="unstyled"
          size="sm"
          h="24px"
          lineHeight="24px"
          px={0}
          py={0}
          bg="transparent"
          _focus={{ boxShadow: 'none', bg: 'transparent' }}
          autoFocus
        />
        <IconButton
          aria-label="Confirm rename"
          icon={<HiCheck />}
          size="xs"
          variant="ghost"
          color="green.500"
          _hover={{ bg: 'green.50', color: 'green.600' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation()
            handleConfirm()
          }}
          isDisabled={!validator(editValue)}
        />
        <IconButton
          aria-label="Cancel rename"
          icon={<HiXMark />}
          size="xs"
          variant="ghost"
          color="gray.500"
          _hover={{ bg: 'gray.50', color: 'gray.600' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation()
            handleCancel()
          }}
        />
      </HStack>
    )
  }

  // Display mode - if children provided, use them; otherwise use default text with optional tooltip
  const textContent = children || (
    <Text fontSize="sm" noOfLines={1} flex={1} py={0.5} minW={0}>
      {value}
    </Text>
  )

  if (tooltipLabel) {
    return (
      <Tooltip
        label={tooltipLabel}
        placement={tooltipPlacement}
        hasArrow
        openDelay={600}
        closeDelay={200}
        bg="surface.primary"
        color="text.primary"
        borderRadius="md"
        shadow="dropdown"
        fontSize="sm"
        fontWeight="medium"
        px={3}
        py={2}
        maxW="280px"
        textAlign="left"
        whiteSpace="normal"
      >
        {textContent}
      </Tooltip>
    )
  }

  return textContent
}

export default InlineEdit
