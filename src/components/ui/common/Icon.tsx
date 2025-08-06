/**
 * Icon Component - Foundational icon component with design system integration
 *
 * This component provides a comprehensive icon implementation with:
 * - Design system size tokens
 * - Color theming support
 * - Custom SVG path support
 * - Accessibility features
 * - Loading states
 * - TypeScript integration
 * - Heroicons integration
 */

import React, { forwardRef } from 'react'
import { Box, BoxProps, Spinner } from '@chakra-ui/react'
import { icons } from '@/theme/tokens'

// Icon size type based on design tokens
export type IconSize = keyof typeof icons.sizes

// Icon path type for custom icons
export type IconPath = keyof typeof icons.paths

// Extended props interface
export interface IconProps extends Omit<BoxProps, 'children'> {
  /**
   * Icon size following design system tokens
   */
  size?: IconSize

  /**
   * Icon path from design tokens or custom SVG path
   */
  path?: IconPath | string

  /**
   * Custom viewBox for SVG (default: "0 0 24 24")
   */
  viewBox?: string

  /**
   * Stroke width for outlined icons
   */
  strokeWidth?: number

  /**
   * Whether the icon should be filled
   */
  filled?: boolean

  /**
   * Loading state - shows spinner instead of icon
   */
  loading?: boolean

  /**
   * Icon label for accessibility
   */
  label?: string

  /**
   * Whether the icon is decorative (hidden from screen readers)
   */
  decorative?: boolean

  /**
   * Custom children (for wrapping other icon libraries)
   */
  children?: React.ReactNode
}

// Component implementation
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'md',
      path,
      viewBox = '0 0 24 24',
      strokeWidth = 2,
      filled = false,
      loading = false,
      label,
      decorative = false,
      children,
      color = 'currentColor',
      ...props
    },
    ref
  ) => {
    const iconSize = icons.sizes[size]

    // Show spinner if loading
    if (loading) {
      return (
        <Spinner
          size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'}
          color={typeof color === 'string' ? color : undefined}
          {...props}
        />
      )
    }

    // If children are provided, wrap them in a Box with proper sizing
    if (children) {
      return (
        <Box
          as="span"
          display="inline-block"
          width={iconSize}
          height={iconSize}
          color={color}
          aria-label={!decorative ? label : undefined}
          aria-hidden={decorative}
          role={!decorative ? 'img' : undefined}
          {...props}
        >
          {children}
        </Box>
      )
    }

    // Get the path string
    const pathString =
      path && typeof path === 'string' && path in icons.paths ? icons.paths[path as IconPath] : path

    if (!pathString) {
      // console.warn('Icon: No valid path provided')
      return null
    }

    return (
      <Box
        as="svg"
        ref={ref}
        width={iconSize}
        height={iconSize}
        viewBox={viewBox}
        fill={filled ? color : 'none'}
        stroke={filled ? 'none' : color}
        strokeWidth={filled ? 0 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        color={color}
        aria-label={!decorative ? label : undefined}
        aria-hidden={decorative}
        role={!decorative ? 'img' : undefined}
        {...props}
      >
        <path d={pathString} fill={filled ? 'currentColor' : 'none'} />
      </Box>
    )
  }
)

Icon.displayName = 'Icon'

// Pre-built icon components using design token paths
export const HomeIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="home" label="Home" {...props} />
))
HomeIcon.displayName = 'HomeIcon'

export const SearchIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="search" label="Search" {...props} />
))
SearchIcon.displayName = 'SearchIcon'

export const SettingsIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="settings" label="Settings" {...props} />
))
SettingsIcon.displayName = 'SettingsIcon'

export const FileIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="file" label="File" {...props} />
))
FileIcon.displayName = 'FileIcon'

export const FolderIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="folder" label="Folder" {...props} />
))
FolderIcon.displayName = 'FolderIcon'

export const UploadIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="upload" label="Upload" {...props} />
))
UploadIcon.displayName = 'UploadIcon'

export const PlusIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="plus" label="Add" {...props} />
))
PlusIcon.displayName = 'PlusIcon'

export const EditIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="edit" label="Edit" {...props} />
))
EditIcon.displayName = 'EditIcon'

export const DeleteIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="delete" label="Delete" {...props} />
))
DeleteIcon.displayName = 'DeleteIcon'

export const CopyIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="copy" label="Copy" {...props} />
))
CopyIcon.displayName = 'CopyIcon'

export const CheckIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="check" label="Check" {...props} />
))
CheckIcon.displayName = 'CheckIcon'

export const CloseIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="close" label="Close" {...props} />
))
CloseIcon.displayName = 'CloseIcon'

export const WarningIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="warning" label="Warning" {...props} />
))
WarningIcon.displayName = 'WarningIcon'

export const InfoIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="info" label="Information" {...props} />
))
InfoIcon.displayName = 'InfoIcon'

export const MenuIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="menu" label="Menu" {...props} />
))
MenuIcon.displayName = 'MenuIcon'

export const ChevronDownIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="chevronDown" label="Expand" {...props} />
))
ChevronDownIcon.displayName = 'ChevronDownIcon'

export const ChevronUpIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="chevronUp" label="Collapse" {...props} />
))
ChevronUpIcon.displayName = 'ChevronUpIcon'

export const ChevronLeftIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="chevronLeft" label="Previous" {...props} />
))
ChevronLeftIcon.displayName = 'ChevronLeftIcon'

export const ChevronRightIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="chevronRight" label="Next" {...props} />
))
ChevronRightIcon.displayName = 'ChevronRightIcon'

export const SunIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="sun" label="Light mode" {...props} />
))
SunIcon.displayName = 'SunIcon'

export const MoonIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="moon" label="Dark mode" {...props} />
))
MoonIcon.displayName = 'MoonIcon'

export const MonitorIcon = forwardRef<SVGSVGElement, Omit<IconProps, 'path'>>((props, ref) => (
  <Icon ref={ref} path="monitor" label="System theme" {...props} />
))
MonitorIcon.displayName = 'MonitorIcon'

// Icon wrapper for external icon libraries (like Heroicons)
export interface ExternalIconProps extends Omit<IconProps, 'path' | 'children'> {
  /**
   * External icon component
   */
  as: React.ComponentType<Record<string, unknown>>

  /**
   * Additional props to pass to the external icon component
   */
  iconProps?: Record<string, unknown>
}

export const ExternalIcon = forwardRef<HTMLElement, ExternalIconProps>(
  (
    { as: IconComponent, size = 'md', iconProps = {}, label, decorative = false, ...props },
    ref
  ) => {
    const iconSize = icons.sizes[size]

    return (
      <Box
        as={IconComponent}
        ref={ref}
        width={iconSize}
        height={iconSize}
        aria-label={!decorative ? label : undefined}
        aria-hidden={decorative}
        role={!decorative ? 'img' : undefined}
        {...iconProps}
        {...props}
      />
    )
  }
)

ExternalIcon.displayName = 'ExternalIcon'

// Utility function to create icon components from Heroicons
export const createHeroIcon = (
  HeroIconComponent: React.ComponentType<Record<string, unknown>>,
  label?: string
) => {
  const HeroIcon = forwardRef<HTMLElement, Omit<ExternalIconProps, 'as' | 'label'>>(
    (props, ref) => <ExternalIcon ref={ref} as={HeroIconComponent} label={label} {...props} />
  )
  HeroIcon.displayName = 'HeroIcon'
  return HeroIcon
}

// Types are exported above with their interface definitions

// Default export
export default Icon
