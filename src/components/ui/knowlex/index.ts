/**
 * Knowlex-Specific Components Export
 *
 * This file exports all components specific to the Knowlex application,
 * including chat interfaces, file management, theme controls, and other
 * application-specific UI elements.
 */

// Chat Components
export { default as ChatInterface } from './ChatInterface'
export { default as ProjectOverview } from './ProjectOverview'
export {
  default as ChatMessage,
  type ChatMessageProps,
  type MessageRole,
  type FileReference,
  type MessageCitation,
} from './ChatMessage'

// File Management Components
export { default as FileUpload, type FileUploadProps, type FileUploadItem } from './FileUpload'

// Theme and Language Controls
export {
  default as ThemeToggle,
  IconThemeToggle,
  ButtonThemeToggle,
  MenuThemeToggle,
  type ThemeToggleProps,
  type ThemeToggleVariant,
} from './ThemeToggle'

export {
  default as LanguageToggle,
  FlagLanguageToggle,
  TextLanguageToggle,
  CompactLanguageToggle,
  MenuLanguageToggle,
  type LanguageToggleProps,
  type LanguageToggleVariant,
} from './LanguageToggle'
