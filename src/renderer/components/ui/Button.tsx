import React from 'react'
import {
  Button as ChakraButton,
  ButtonProps as ChakraButtonProps,
  forwardRef,
  Spinner
} from '@chakra-ui/react'

export interface ButtonProps extends Omit<ChakraButtonProps, 'leftIcon' | 'rightIcon'> {
  /** Button variant */
  variant?: 'solid' | 'outline' | 'ghost' | 'link' | 'danger'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Loading state */
  isLoading?: boolean
  /** Disabled state */
  isDisabled?: boolean
  /** Icon to display on the left side */
  leftIcon?: React.ReactElement
  /** Icon to display on the right side */
  rightIcon?: React.ReactElement
  /** Color scheme for the button */
  colorScheme?: string
  /** Full width button */
  isFullWidth?: boolean
  /** Button type for forms */
  type?: 'button' | 'submit' | 'reset'
}

/**
 * Button component with consistent styling and behavior
 *
 * Features:
 * - Multiple variants (solid, outline, ghost, link, danger)
 * - Three size options (sm, md, lg)
 * - Loading and disabled states
 * - Icon support (left/right positioning)
 * - Full accessibility support (ARIA attributes, keyboard navigation)
 * - Consistent with Chakra UI design system
 */
export const Button = forwardRef<ButtonProps, 'button'>((props, ref) => {
  const {
    variant = 'solid',
    size = 'md',
    isLoading = false,
    isDisabled = false,
    leftIcon,
    rightIcon,
    colorScheme,
    children,
    isFullWidth = false,
    type = 'button',
    ...rest
  } = props

  // Handle danger variant by using red color scheme
  const finalColorScheme = variant === 'danger' ? 'red' : colorScheme
  const finalVariant = variant === 'danger' ? 'solid' : variant

  return (
    <ChakraButton
      ref={ref}
      variant={finalVariant}
      size={size}
      {...(finalColorScheme ? { colorScheme: finalColorScheme } : {})}
      isLoading={isLoading}
      isDisabled={isDisabled || isLoading}
      {...(isLoading ? { leftIcon: <Spinner size="sm" /> } : leftIcon ? { leftIcon } : {})}
      {...(rightIcon ? { rightIcon } : {})}
      width={isFullWidth ? '100%' : 'auto'}
      type={type}
      // Accessibility
      aria-disabled={isDisabled || isLoading}
      // Loading state
      loadingText={isLoading && typeof children === 'string' ? children : undefined}
      spinner={<Spinner size="sm" />}
      {...rest}
    >
      {children}
    </ChakraButton>
  )
})

Button.displayName = 'Button'

export default Button
