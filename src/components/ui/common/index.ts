/**
 * Common UI Components Export
 *
 * This file exports all foundational UI components that are part of the design system.
 * These components are built on top of Chakra UI with custom theming and design tokens.
 */

// Button Components
export {
  default as Button,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  DangerButton,
  SuccessButton,
  IconButton,
  type ButtonProps,
  type IconButtonProps,
} from './Button'

// Input Components
export {
  default as Input,
  SearchInput,
  PasswordInput,
  EmailInput,
  NumberInput,
  type InputProps,
} from './Input'

// Card Components
export {
  default as Card,
  ClickableCard,
  LoadingCard,
  ActionCard,
  InfoCard,
  FeatureCard,
  type CardProps,
} from './Card'

// Icon Components
export {
  default as Icon,
  ExternalIcon,
  createHeroIcon,
  // Pre-built icons
  HomeIcon,
  SearchIcon,
  SettingsIcon,
  FileIcon,
  FolderIcon,
  UploadIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
  CopyIcon,
  CheckIcon,
  CloseIcon,
  WarningIcon,
  InfoIcon,
  MenuIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  // Types
  type IconProps,
  type ExternalIconProps,
  type IconSize,
  type IconPath,
} from './Icon'
