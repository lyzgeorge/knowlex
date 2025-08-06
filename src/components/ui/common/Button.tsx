/**
 * Button Component - Foundational button component with design system integration
 *
 * This component provides a comprehensive button implementation with:
 * - Multiple variants (solid, outline, ghost, etc.)
 * - Size variations (xs, sm, md, lg, xl)
 * - Icon support
 * - Loading states
 * - Full accessibility support
 * - TypeScript integration
 */

import React, { forwardRef } from 'react'
import {
  Button as ChakraButton,
  ButtonProps as ChakraButtonProps,
  Spinner,
  HStack,
  Text,
} from '@chakra-ui/react'
// Import design tokens for consistency
import { icons } from '@/theme/tokens'

// Extended props interface
export interface ButtonProps extends Omit<ChakraButtonProps, 'leftIcon' | 'rightIcon'> {
  /**
   * Button variant following our design system
   */
  variant?: 'solid' | 'outline' | 'ghost' | 'link' | 'danger' | 'success'

  /**
   * Button size following our design system
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'

  /**
   * Loading state - shows spinner and disables button
   */
  loading?: boolean

  /**
   * Loading text to show when loading is true
   */
  loadingText?: string

  /**
   * Icon to show on the left side
   */
  leftIcon?: React.ReactElement

  /**
   * Icon to show on the right side
   */
  rightIcon?: React.ReactElement

  /**
   * Icon size for left and right icons
   */
  iconSize?: keyof typeof icons.sizes

  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean

  /**
   * Tooltip text for accessibility
   */
  tooltip?: string

  /**
   * Button type for form submissions
   */
  type?: 'button' | 'submit' | 'reset'
}

// Component implementation
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'solid',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      iconSize = 'sm',
      fullWidth = false,
      tooltip,
      type = 'button',
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    // Handle loading state
    const isDisabled = disabled || loading

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

    // Handle button click
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return
      onClick?.(event)
    }

    return (
      <ChakraButton
        ref={ref}
        variant={variant}
        size={size}
        width={fullWidth ? 'full' : undefined}
        isDisabled={isDisabled}
        isLoading={loading}
        loadingText={loadingText}
        leftIcon={loading ? undefined : renderIcon(leftIcon) || undefined}
        rightIcon={loading ? undefined : renderIcon(rightIcon) || undefined}
        spinner={<Spinner size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />}
        type={type}
        title={tooltip}
        onClick={handleClick}
        // Accessibility props
        aria-disabled={isDisabled}
        aria-label={tooltip || (typeof children === 'string' ? children : undefined)}
        {...props}
      >
        {loading && loadingText ? (
          <HStack spacing={2}>
            <Text>{loadingText}</Text>
          </HStack>
        ) : (
          children
        )}
      </ChakraButton>
    )
  }
)

Button.displayName = 'Button'

// Additional button variants for common use cases
export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="solid" {...props} />
)

PrimaryButton.displayName = 'PrimaryButton'

export const SecondaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="outline" {...props} />
)

SecondaryButton.displayName = 'SecondaryButton'

export const GhostButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="ghost" {...props} />
)

GhostButton.displayName = 'GhostButton'

export const DangerButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="danger" {...props} />
)

DangerButton.displayName = 'DangerButton'

export const SuccessButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="success" {...props} />
)

SuccessButton.displayName = 'SuccessButton'

// Icon button for cases where only an icon is needed
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactElement
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, iconSize = 'md', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        leftIcon={renderIcon(icon, iconSize)}
        px={props.size === 'xs' ? 1 : props.size === 'sm' ? 2 : 3}
        {...props}
      />
    )
  }
)

IconButton.displayName = 'IconButton'

// Helper function to render icons with proper sizing
function renderIcon(icon: React.ReactElement, size: keyof typeof icons.sizes) {
  return React.cloneElement(icon, {
    ...icon.props,
    style: {
      width: icons.sizes[size],
      height: icons.sizes[size],
      ...icon.props.style,
    },
  })
}

// Types are exported above with their interface definitions

// Default export
export default Button
