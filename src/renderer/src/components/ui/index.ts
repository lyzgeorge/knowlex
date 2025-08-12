/**
 * UI Components Barrel Export
 *
 * This file provides a centralized export for all UI components,
 * making it easier to import components throughout the application.
 */

export { Button, type ButtonProps } from './Button'
export { Input, type InputProps } from './Input'
export { Modal, type ModalProps } from './Modal'
export { FileCard, type FileCardProps } from './FileCard'
export { MessageBubble, type MessageBubbleProps } from './MessageBubble'

// Re-export commonly used Chakra UI components for convenience
export {
  Box,
  Flex,
  HStack,
  VStack,
  Stack,
  Grid,
  GridItem,
  Container,
  Center,
  Square,
  Circle,
  Text,
  Heading,
  Link,
  Image,
  Icon,
  Badge,
  Tag,
  Avatar,
  Divider,
  Spacer,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Spinner,
  Progress,
  CircularProgress,
  Skeleton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
  useDisclosure,
  useColorModeValue,
  useTheme,
  useToken
} from '@chakra-ui/react'

export {
  // Common icons
  AddIcon,
  CloseIcon,
  DeleteIcon,
  EditIcon,
  ViewIcon,
  DownloadIcon,
  UploadIcon,
  SearchIcon,
  SettingsIcon,
  InfoIcon,
  WarningIcon,
  CheckIcon,
  CheckCircleIcon,
  TimeIcon,
  RepeatIcon,
  ExternalLinkIcon,
  CopyIcon,
  LinkIcon,
  AttachmentIcon,
  HamburgerIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowBackIcon,
  ArrowForwardIcon
} from '@chakra-ui/icons'
