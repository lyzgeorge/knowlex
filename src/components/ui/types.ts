/**
 * TypeScript type definitions for UI components
 *
 * This file contains shared types and interfaces used across UI components
 */

import { ReactNode, MouseEvent, KeyboardEvent, ChangeEvent } from 'react'
import {
  BoxProps,
  ButtonProps as ChakraButtonProps,
  InputProps as ChakraInputProps,
  TextareaProps as ChakraTextareaProps,
  SelectProps as ChakraSelectProps,
  FlexProps,
  StackProps,
  ModalProps as ChakraModalProps,
  DrawerProps as ChakraDrawerProps,
  PopoverProps as ChakraPopoverProps,
  TooltipProps as ChakraTooltipProps,
  AlertProps as ChakraAlertProps,
  CardProps as ChakraCardProps,
  ThemingProps,
  ResponsiveValue,
} from '@chakra-ui/react'

// Common component props
export interface BaseComponentProps {
  children?: ReactNode
  className?: string
  _id?: string
  'data-testid'?: string
}

// Size variants used across components
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Color scheme variants
export type ColorScheme =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'gray'
  | 'brand'

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error'

// Theme variants
export type ThemeMode = 'light' | 'dark' | 'system'

// Language codes
export type LanguageCode = 'en' | 'zh'

// Extended Button Props
export interface ButtonProps
  extends Omit<ChakraButtonProps, 'size' | 'variant' | 'leftIcon' | 'rightIcon'> {
  size?: ComponentSize
  variant?: 'solid' | 'outline' | 'ghost' | 'subtle' | 'unstyled'
  colorScheme?: ColorScheme
  isFullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loadingText?: string
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

// Extended Input Props
export interface InputProps extends Omit<ChakraInputProps, 'size' | 'variant'> {
  size?: ComponentSize
  variant?: 'outline' | 'filled' | 'flushed' | 'unstyled'
  label?: string
  helperText?: string
  errorMessage?: string
  isRequired?: boolean
  leftElement?: ReactNode
  rightElement?: ReactNode
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

// Extended Textarea Props
export interface TextareaProps extends Omit<ChakraTextareaProps, 'size' | 'variant'> {
  size?: ComponentSize
  variant?: 'outline' | 'filled' | 'flushed' | 'unstyled'
  label?: string
  helperText?: string
  errorMessage?: string
  isRequired?: boolean
  resize?: 'none' | 'both' | 'horizontal' | 'vertical'
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void
}

// Extended Select Props
export interface SelectProps extends Omit<ChakraSelectProps, 'size' | 'variant'> {
  size?: ComponentSize
  variant?: 'outline' | 'filled' | 'flushed' | 'unstyled'
  label?: string
  helperText?: string
  errorMessage?: string
  isRequired?: boolean
  placeholder?: string
  options?: Array<{
    value: string | number
    label: string
    disabled?: boolean
  }>
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
}

// Card Props
export interface CardProps extends ChakraCardProps {
  variant?: 'elevated' | 'outline' | 'filled' | 'unstyled'
  size?: ComponentSize
  isClickable?: boolean
  isSelected?: boolean
  onSelect?: () => void
}

// Modal Props
export interface ModalProps extends Omit<ChakraModalProps, 'children'> {
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  isCentered?: boolean
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
  onClose: () => void
}

// Alert Props
export interface AlertProps extends ChakraAlertProps {
  _status?: 'info' | 'warning' | 'success' | 'error'
  variant?: 'subtle' | 'left-accent' | 'top-accent' | 'solid'
  title?: string
  description?: string
  isClosable?: boolean
  onClose?: () => void
}

// Toast Props
export interface ToastProps {
  _id?: string
  title?: string
  description?: string
  _status?: 'info' | 'warning' | 'success' | 'error'
  duration?: number
  isClosable?: boolean
  position?: 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right'
  onClose?: () => void
}

// File Upload Props
export interface FileUploadProps extends BaseComponentProps {
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  disabled?: boolean
  loading?: boolean
  onFileSelect?: (files: File[]) => void
  onFileRemove?: (_index: number) => void
  allowedTypes?: string[]
  showPreview?: boolean
}

// Chat Message Props
export interface ChatMessageProps extends BaseComponentProps {
  _id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  _status?: 'sending' | 'sent' | 'error'
  isStreaming?: boolean
  references?: Array<{
    _id: string
    title: string
    snippet: string
    score?: number
  }>
  onCopy?: () => void
  onSave?: () => void
  onRegenerate?: () => void
}

// Project Card Props
export interface ProjectCardProps extends BaseComponentProps {
  _id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  conversationCount: number
  fileCount: number
  isSelected?: boolean
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

// Conversation Item Props
export interface ConversationItemProps extends BaseComponentProps {
  _id: string
  title: string
  preview?: string
  updatedAt: Date
  messageCount: number
  isSelected?: boolean
  projectName?: string
  onClick?: () => void
  onRename?: (newTitle: string) => void
  onDelete?: () => void
  onMove?: (projectId: string) => void
}

// Search Modal Props
export interface SearchModalProps extends BaseComponentProps {
  _isOpen: boolean
  onClose: () => void
  onSearch?: (query: string) => void
  onResultSelect?: (result: SearchResult) => void
  placeholder?: string
}

// Search Result Types
export interface SearchResult {
  _id: string
  type: 'conversation' | 'file' | 'knowledge' | 'memory'
  title: string
  content: string
  snippet: string
  projectName?: string
  updatedAt: Date
  score?: number
  highlights?: string[]
}

// Theme Toggle Props
export interface ThemeToggleProps extends BaseComponentProps {
  currentTheme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  showLabel?: boolean
}

// Language Toggle Props
export interface LanguageToggleProps extends BaseComponentProps {
  currentLanguage: LanguageCode
  onLanguageChange: (language: LanguageCode) => void
  showLabel?: boolean
}

// Layout Props
export interface SidebarProps extends BaseComponentProps {
  _isOpen?: boolean
  isCollapsed?: boolean
  _onToggle?: () => void
  width?: string
  collapsedWidth?: string
}

export interface HeaderProps extends BaseComponentProps {
  title?: string
  subtitle?: string
  showWindowControls?: boolean
  height?: string
}

export interface MainLayoutProps extends BaseComponentProps {
  sidebar?: ReactNode
  header?: ReactNode
  children: ReactNode
  sidebarWidth?: string
  headerHeight?: string
}

// Form Field Props (for form composition)
export interface FormFieldProps extends BaseComponentProps {
  label?: string
  helperText?: string
  errorMessage?: string
  isRequired?: boolean
  isDisabled?: boolean
  isInvalid?: boolean
}

// List Props
export interface ListProps extends BaseComponentProps {
  items: Array<{
    _id: string
    content: ReactNode
    onClick?: () => void
    isSelected?: boolean
    isDisabled?: boolean
  }>
  variant?: 'simple' | 'ordered' | 'unordered'
  spacing?: ResponsiveValue<string | number>
  onItemClick?: (_id: string) => void
}

// Table Props
export interface TableColumn {
  key: string
  title: string
  dataIndex: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (value: unknown, record: unknown, _index: number) => ReactNode
}

export interface TableProps extends BaseComponentProps {
  columns: TableColumn[]
  data: unknown[]
  loading?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string, order: 'asc' | 'desc') => void
  onRowClick?: (record: unknown, _index: number) => void
  rowKey?: string
  showHeader?: boolean
  size?: ComponentSize
}

// Pagination Props
export interface PaginationProps extends BaseComponentProps {
  current: number
  total: number
  pageSize: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: boolean
  onChange?: (page: number, pageSize?: number) => void
  size?: ComponentSize
}

// Progress Props
export interface ProgressProps extends BaseComponentProps {
  value: number
  max?: number
  size?: ComponentSize
  colorScheme?: ColorScheme
  hasStripe?: boolean
  isAnimated?: boolean
  isIndeterminate?: boolean
  label?: string
}

// Skeleton Props
export interface SkeletonProps extends BaseComponentProps {
  isLoaded: boolean
  fadeDuration?: number
  speed?: number
  startColor?: string
  endColor?: string
  height?: string | number
  width?: string | number
}

// Avatar Props
export interface AvatarProps extends BaseComponentProps {
  src?: string
  name?: string
  size?: ComponentSize
  showBorder?: boolean
  borderColor?: string
  bg?: string
  color?: string
  onClick?: () => void
}

// Badge Props
export interface BadgeProps extends BaseComponentProps {
  variant?: 'subtle' | 'solid' | 'outline'
  colorScheme?: ColorScheme
  size?: ComponentSize
}

// Tag Props
export interface TagProps extends BaseComponentProps {
  variant?: 'subtle' | 'solid' | 'outline'
  colorScheme?: ColorScheme
  size?: ComponentSize
  isClosable?: boolean
  onClose?: () => void
}

// Event Handler Types
export type ClickHandler = (event: MouseEvent<HTMLElement>) => void
export type KeyHandler = (event: KeyboardEvent<HTMLElement>) => void
export type ChangeHandler<T = HTMLInputElement> = (event: ChangeEvent<T>) => void

// Responsive Types
export type ResponsiveString = ResponsiveValue<string>
export type ResponsiveNumber = ResponsiveValue<number>
export type ResponsiveBoolean = ResponsiveValue<boolean>

// Component State Types
export interface ComponentState {
  isHovered?: boolean
  isFocused?: boolean
  isPressed?: boolean
  isSelected?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  isInvalid?: boolean
}

// Animation Types
export interface AnimationProps {
  initial?: object
  animate?: object
  exit?: object
  transition?: object
  whileHover?: object
  whileTap?: object
  whileFocus?: object
}

export default {}
