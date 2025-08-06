/**
 * Card Component - Foundational card component with design system integration
 *
 * This component provides a comprehensive card implementation with:
 * - Multiple variants (elevated, outlined, filled)
 * - Size variations (sm, md, lg, xl)
 * - Interactive states (hover, clickable)
 * - Header, body, and footer sections
 * - Loading states
 * - Full accessibility support
 * - TypeScript integration
 */

import React, { forwardRef } from 'react'
import {
  Card as ChakraCard,
  CardHeader,
  CardBody,
  CardFooter,
  CardProps as ChakraCardProps,
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  Skeleton,
  SkeletonText,
  useColorModeValue,
} from '@chakra-ui/react'
// Import design tokens
import { components } from '@/theme/tokens'

// Extended props interface
export interface CardProps extends Omit<ChakraCardProps, 'size'> {
  /**
   * Card variant following our design system
   */
  variant?: 'elevated' | 'outline' | 'filled' | 'ghost'

  /**
   * Card size following our design system
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'

  /**
   * Card title for the header section
   */
  title?: string

  /**
   * Card subtitle for the header section
   */
  subtitle?: string

  /**
   * Custom header content (overrides title/subtitle)
   */
  header?: React.ReactNode

  /**
   * Card body content
   */
  children?: React.ReactNode

  /**
   * Footer content
   */
  footer?: React.ReactNode

  /**
   * Whether the card is clickable (adds hover effects and cursor pointer)
   */
  clickable?: boolean

  /**
   * Whether the card is in a loading state
   */
  loading?: boolean

  /**
   * Whether the card is in a selected state
   */
  selected?: boolean

  /**
   * Whether the card is disabled
   */
  disabled?: boolean

  /**
   * Icon to show in the header
   */
  icon?: React.ReactElement

  /**
   * Action buttons to show in the header
   */
  actions?: React.ReactNode

  /**
   * Whether to show dividers between sections
   */
  withDividers?: boolean

  /**
   * Custom padding for the card content
   */
  padding?: string | number

  /**
   * Click handler for clickable cards
   */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void

  /**
   * Keyboard handler for clickable cards
   */
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void
}

// Component implementation
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'elevated',
      size = 'md',
      title,
      subtitle,
      header,
      children,
      footer,
      clickable = false,
      loading = false,
      selected = false,
      disabled = false,
      icon,
      actions,
      withDividers = false,
      padding,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    // const { t } = useTranslation() // Not currently used

    // Color mode values
    const selectedBg = useColorModeValue('primary.50', 'primary.900')
    const selectedBorder = useColorModeValue('primary.200', 'primary.700')
    const disabledOpacity = 0.6

    // Get padding value based on size
    const getPadding = () => {
      if (padding !== undefined) return padding
      return components.card.paddings[size]
    }

    // Handle click events
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || loading) return
      onClick?.(event)
    }

    // Handle keyboard events for accessibility
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || loading) return

      if (clickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>)
      }

      onKeyDown?.(event)
    }

    // Render header content
    const renderHeader = () => {
      if (loading) {
        return (
          <CardHeader pb={withDividers ? 4 : 0}>
            <HStack spacing={3} align="flex-start">
              {icon && <Skeleton height="24px" width="24px" borderRadius="md" />}
              <VStack align="flex-start" spacing={1} flex={1}>
                <Skeleton height="20px" width="60%" />
                <Skeleton height="16px" width="40%" />
              </VStack>
              {actions && <Skeleton height="32px" width="80px" borderRadius="md" />}
            </HStack>
          </CardHeader>
        )
      }

      if (header) {
        return <CardHeader pb={withDividers ? 4 : 0}>{header}</CardHeader>
      }

      if (title || subtitle || icon || actions) {
        return (
          <CardHeader pb={withDividers ? 4 : 0}>
            <HStack spacing={3} align="flex-start">
              {icon && (
                <Box color="primary.500" flexShrink={0}>
                  {React.cloneElement(icon, {
                    ...icon.props,
                    style: {
                      width: '24px',
                      height: '24px',
                      ...icon.props.style,
                    },
                  })}
                </Box>
              )}

              <VStack align="flex-start" spacing={1} flex={1}>
                {title && (
                  <Heading size={size === 'sm' ? 'sm' : size === 'lg' ? 'md' : 'sm'}>
                    {title}
                  </Heading>
                )}
                {subtitle && (
                  <Text fontSize={size === 'sm' ? 'xs' : 'sm'} color="text.muted" noOfLines={2}>
                    {subtitle}
                  </Text>
                )}
              </VStack>

              {actions && <Box flexShrink={0}>{actions}</Box>}
            </HStack>
          </CardHeader>
        )
      }

      return null
    }

    // Render body content
    const renderBody = () => {
      if (loading) {
        return (
          <CardBody py={withDividers ? 4 : undefined}>
            <SkeletonText noOfLines={3} spacing={2} />
          </CardBody>
        )
      }

      if (children) {
        return <CardBody py={withDividers ? 4 : undefined}>{children}</CardBody>
      }

      return null
    }

    // Render footer content
    const renderFooter = () => {
      if (loading || !footer) return null

      return <CardFooter pt={withDividers ? 4 : 0}>{footer}</CardFooter>
    }

    return (
      <ChakraCard
        ref={ref}
        variant={variant}
        p={getPadding()}
        cursor={clickable && !disabled && !loading ? 'pointer' : undefined}
        opacity={disabled ? disabledOpacity : 1}
        bg={selected ? selectedBg : undefined}
        borderColor={selected ? selectedBorder : undefined}
        transition="all 0.2s"
        _hover={
          clickable && !disabled && !loading
            ? {
                transform: 'translateY(-2px)',
                shadow: components.card.shadows.lg,
              }
            : {}
        }
        _active={
          clickable && !disabled && !loading
            ? {
                transform: 'translateY(0)',
              }
            : {}
        }
        // Accessibility props
        role={clickable ? 'button' : undefined}
        tabIndex={clickable && !disabled && !loading ? 0 : undefined}
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {renderHeader()}
        {renderBody()}
        {renderFooter()}
      </ChakraCard>
    )
  }
)

Card.displayName = 'Card'

// Specialized card components for common use cases
export const ClickableCard = forwardRef<HTMLDivElement, Omit<CardProps, 'clickable'>>(
  (props, ref) => <Card ref={ref} clickable {...props} />
)
ClickableCard.displayName = 'ClickableCard'

export const LoadingCard = forwardRef<HTMLDivElement, Omit<CardProps, 'loading'>>((props, ref) => (
  <Card ref={ref} loading {...props} />
))
LoadingCard.displayName = 'LoadingCard'

export const ActionCard = forwardRef<HTMLDivElement, CardProps>(({ actions, ...props }, ref) => (
  <Card ref={ref} actions={actions} clickable={!!props.onClick} {...props} />
))
ActionCard.displayName = 'ActionCard'

// Simple card variants
export const InfoCard = forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <Card ref={ref} variant="outline" size="sm" {...props} />
))
InfoCard.displayName = 'InfoCard'

export const FeatureCard = forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <Card ref={ref} variant="elevated" size="lg" withDividers {...props} />
))
FeatureCard.displayName = 'FeatureCard'

// Types are exported above with their interface definitions

// Default export
export default Card
