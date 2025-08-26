import React, { forwardRef, useState } from 'react'
import {
  Input as ChakraInput,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  InputProps as ChakraInputProps,
  IconButton
} from '@chakra-ui/react'
import { LiaEyeSolid, LiaEyeSlashSolid } from 'react-icons/lia'

export interface InputProps extends Omit<ChakraInputProps, 'size'> {
  /** Input size */
  size?: 'sm' | 'md' | 'lg'
  /** Input variant */
  variant?: 'outline' | 'filled' | 'flushed' | 'unstyled'
  /** Label for the input */
  label?: string
  /** Helper text displayed below the input */
  helperText?: string
  /** Error message - if provided, input will show error state */
  error?: string
  /** Icon to display on the left side */
  leftIcon?: React.ReactElement
  /** Icon to display on the right side */
  rightIcon?: React.ReactElement
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  /** Whether the input is required */
  isRequired?: boolean
  /** Whether the input is invalid */
  isInvalid?: boolean
  /** Whether the input is disabled */
  isDisabled?: boolean
  /** Whether the input is read-only */
  isReadOnly?: boolean
  /** Full width input */
  isFullWidth?: boolean
  /** Show/hide password toggle for password inputs */
  showPasswordToggle?: boolean
}

/**
 * Input component with validation, icons, and error handling
 *
 * Features:
 * - Multiple input types (text, email, password, etc.)
 * - Built-in validation with error messages
 * - Helper text and labels
 * - Icon support (left/right positioning)
 * - Password visibility toggle
 * - Controlled component functionality
 * - Full accessibility support
 */
export const Input = forwardRef<'input', InputProps>((props, ref) => {
  const {
    size = 'sm',
    variant = 'outline',
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    type = 'text',
    isRequired = false,
    isInvalid,
    isDisabled = false,
    isReadOnly = false,
    isFullWidth = true,
    showPasswordToggle = false,
    ...rest
  } = props

  const [showPassword, setShowPassword] = useState(false)
  const [internalType, setInternalType] = useState(type)

  // Handle password visibility toggle
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
    setInternalType(showPassword ? 'password' : 'text')
  }

  const isPasswordField = type === 'password'
  const shouldShowPasswordToggle = isPasswordField && showPasswordToggle
  const finalIsInvalid = isInvalid || !!error

  const inputElement = (
    <InputGroup size={size}>
      {leftIcon && <InputLeftElement pointerEvents="none">{leftIcon}</InputLeftElement>}

      <ChakraInput
        ref={ref}
        type={isPasswordField && showPasswordToggle ? internalType : type}
        variant={variant}
        size={size}
        isRequired={isRequired}
        isInvalid={finalIsInvalid}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        width={isFullWidth ? '100%' : 'auto'}
        // Accessibility
        aria-describedby={error ? `${rest.id}-error` : helperText ? `${rest.id}-helper` : undefined}
        aria-required={isRequired}
        aria-invalid={finalIsInvalid}
        {...rest}
      />

      {(rightIcon || shouldShowPasswordToggle) && (
        <InputRightElement>
          {shouldShowPasswordToggle ? (
            <IconButton
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              icon={showPassword ? <LiaEyeSlashSolid /> : <LiaEyeSolid />}
              onClick={togglePasswordVisibility}
              variant="ghost"
              size="sm"
              isDisabled={isDisabled}
            />
          ) : (
            rightIcon
          )}
        </InputRightElement>
      )}
    </InputGroup>
  )

  // If no label, helper text, or error, return input without FormControl wrapper
  if (!label && !helperText && !error) {
    return inputElement
  }

  return (
    <FormControl
      isRequired={isRequired}
      isInvalid={finalIsInvalid}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
    >
      {label && (
        <FormLabel htmlFor={rest.id}>
          {label}
          {isRequired && <span style={{ color: 'var(--chakra-colors-red-500)' }}>{' *'}</span>}
        </FormLabel>
      )}

      {inputElement}

      {error ? (
        <FormErrorMessage id={`${rest.id}-error`}>{error}</FormErrorMessage>
      ) : helperText ? (
        <FormHelperText id={`${rest.id}-helper`}>{helperText}</FormHelperText>
      ) : null}
    </FormControl>
  )
})

Input.displayName = 'Input'

export default Input
