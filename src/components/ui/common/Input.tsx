/**
 * Input Component - Foundational input component with design system integration
 *
 * This component provides a comprehensive input implementation with:
 * - Multiple variants (outline, filled, flushed)
 * - Size variations (sm, md, lg, xl)
 * - Icon support (left and right)
 * - Validation states
 * - Helper text and error messaging
 * - Full accessibility support
 * - TypeScript integration
 */

import React, { forwardRef, useState } from 'react'
import {
  Input as ChakraInput,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  InputProps as ChakraInputProps,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  IconButton,
  Box,
  Text,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

// Import design tokens
import { icons } from '@/theme/tokens'

// Icons for common input actions
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

// Extended props interface
export interface InputProps extends Omit<ChakraInputProps, 'size'> {
  /**
   * Input size following our design system
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'

  /**
   * Input variant following our design system
   */
  variant?: 'outline' | 'filled' | 'flushed' | 'unstyled'

  /**
   * Label text for the input
   */
  label?: string

  /**
   * Whether the label is required (shows asterisk)
   */
  required?: boolean

  /**
   * Helper text to show below the input
   */
  helperText?: string

  /**
   * Error message to show when input is invalid
   */
  error?: string

  /**
   * Whether the input is in an error state
   */
  isInvalid?: boolean

  /**
   * Icon to show on the left side
   */
  leftIcon?: React.ReactElement

  /**
   * Icon to show on the right side
   */
  rightIcon?: React.ReactElement

  /**
   * Custom element to show on the left side
   */
  leftElement?: React.ReactNode

  /**
   * Custom element to show on the right side
   */
  rightElement?: React.ReactNode

  /**
   * Icon size for left and right icons
   */
  iconSize?: keyof typeof icons.sizes

  /**
   * Whether to show password toggle for password inputs
   */
  showPasswordToggle?: boolean

  /**
   * Input type
   */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'

  /**
   * Whether the input should take full width
   */
  fullWidth?: boolean

  /**
   * Debounce delay for onChange (in ms)
   */
  debounceDelay?: number

  /**
   * Callback for debounced value changes
   */
  onDebouncedChange?: (value: string) => void
}

// Component implementation
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      variant = 'outline',
      label,
      required = false,
      helperText,
      error,
      isInvalid: isInvalidProp,
      leftIcon,
      rightIcon,
      leftElement,
      rightElement,
      iconSize = 'sm',
      showPasswordToggle = false,
      type = 'text',
      fullWidth = true,
      debounceDelay = 0,
      onDebouncedChange,
      onChange,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation()
    const [showPassword, setShowPassword] = useState(false)
    // const [_debouncedValue, _setDebouncedValue] = useState('')
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

    // Determine if input is invalid
    const isInvalid = isInvalidProp || !!error

    // Handle input type for password toggle
    const inputType = type === 'password' && showPassword ? 'text' : type

    // Render icon with proper sizing
    const renderIcon = (icon: React.ReactElement | undefined) => {
      if (!icon) return null

      return React.cloneElement(icon, {
        ...icon.props,
        style: {
          width: icons.sizes[iconSize],
          height: icons.sizes[iconSize],
          ...icon.props.style,
        },
      })
    }

    // Handle input change with optional debouncing
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value

      // Call the original onChange immediately
      onChange?.(event)

      // Handle debounced callback if specified
      if (onDebouncedChange && debounceDelay > 0) {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        const timer = setTimeout(() => {
          onDebouncedChange(value)
        }, debounceDelay)

        setDebounceTimer(timer)
      } else if (onDebouncedChange) {
        // No debounce, call immediately
        onDebouncedChange(value)
      }
    }

    // Toggle password visibility
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    // Determine what to show in left element
    const leftElementContent = leftElement || (leftIcon && renderIcon(leftIcon))

    // Determine what to show in right element
    const rightElementContent = (() => {
      if (type === 'password' && showPasswordToggle) {
        return (
          <IconButton
            variant="ghost"
            size="sm"
            icon={showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? t('ui.input.hidePassword') : t('ui.input.showPassword')}
            tabIndex={-1}
          />
        )
      }

      return rightElement || (rightIcon && renderIcon(rightIcon))
    })()

    return (
      <FormControl
        isInvalid={isInvalid}
        isRequired={required}
        width={fullWidth ? 'full' : undefined}
      >
        {label && (
          <FormLabel fontSize={size === 'sm' ? 'sm' : 'md'}>
            {label}
            {required && (
              <Text as="span" color="error.500" ml={1}>
                *
              </Text>
            )}
          </FormLabel>
        )}

        <InputGroup size={size}>
          {leftElementContent && (
            <InputLeftElement pointerEvents={leftElement ? 'auto' : 'none'}>
              {leftElementContent}
            </InputLeftElement>
          )}

          <ChakraInput
            ref={ref}
            type={inputType}
            size={size}
            variant={variant}
            isInvalid={isInvalid}
            onChange={handleChange}
            // Accessibility props
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />

          {rightElementContent && (
            <InputRightElement pointerEvents={rightElement ? 'auto' : 'none'}>
              {rightElementContent}
            </InputRightElement>
          )}
        </InputGroup>

        {error && <FormErrorMessage id={`${props.id}-error`}>{error}</FormErrorMessage>}

        {helperText && !error && (
          <FormHelperText id={`${props.id}-helper`}>{helperText}</FormHelperText>
        )}
      </FormControl>
    )
  }
)

Input.displayName = 'Input'

// Specialized input components for common use cases
export const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'leftIcon'>>(
  (props, ref) => {
    const { t } = useTranslation()
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<SearchIcon />}
        placeholder={props.placeholder || t('common.actions.search')}
        {...props}
      />
    )
  }
)
SearchInput.displayName = 'SearchInput'

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'type' | 'showPasswordToggle'>
>((props, ref) => <Input ref={ref} type="password" showPasswordToggle {...props} />)
PasswordInput.displayName = 'PasswordInput'

export const EmailInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="email" {...props} />
))
EmailInput.displayName = 'EmailInput'

export const NumberInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="number" {...props} />
))
NumberInput.displayName = 'NumberInput'

// Search icon component (using Heroicon path)
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Box
    as="svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d={icons.paths.search} />
  </Box>
)

// Types are exported above with their interface definitions

// Default export
export default Input
