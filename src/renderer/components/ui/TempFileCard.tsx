import React from 'react'
import { Box, HStack, Text, IconButton, useColorModeValue, Icon } from '@chakra-ui/react'
import type { BoxProps } from '@chakra-ui/react'
import { CloseIcon, AttachmentIcon } from '@chakra-ui/icons'
import { FiFile, FiFileText, FiImage } from 'react-icons/fi'
import type { MessageContentPart } from '../../../../shared/types/message'

export interface MessageFileLike {
  filename: string
  size: number
  mimeType: string
  url?: string
}

export interface TempFileCardProps {
  /** File to preview (when uploading) */
  file?: File
  /** Message-based file data (when rendering from a saved message) */
  messageFile?: MessageFileLike
  /** Callback when file is removed */
  onRemove?: () => void
  /** Display variant */
  variant?: 'default' | 'compact'
  /** Additional CSS classes */
  className?: string
}

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
}

const getFileIcon = (mimeType: string, filename: string) => {
  if (mimeType.startsWith('image/')) return FiImage
  if (mimeType.includes('text') || filename.endsWith('.md') || filename.endsWith('.txt'))
    return FiFileText
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('office'))
    return FiFile
  return AttachmentIcon
}

const useFileCardTheme = () => ({
  bgColor: useColorModeValue('surface.secondary', 'surface.secondary'),
  borderColor: useColorModeValue('border.secondary', 'border.secondary'),
  textColor: useColorModeValue('text.primary', 'text.primary'),
  secondaryTextColor: useColorModeValue('text.secondary', 'text.secondary')
})

/**
 * TempFileCard component for displaying uploaded file information
 *
 * Features:
 * - Shows file name and size with appropriate file type icon
 * - Remove button with hover effects
 * - Unified design for all file types (text, PDF, office, images)
 * - Compact and default variants
 */
export const TempFileCard: React.FC<TempFileCardProps> = ({
  file,
  messageFile,
  onRemove,
  variant = 'default',
  className
}) => {
  const filename = file?.name || messageFile?.filename || ''
  const filesize = file?.size || messageFile?.size || 0
  const mimeType = file?.type || messageFile?.mimeType || ''

  const theme = useFileCardTheme()
  const FileIcon = getFileIcon(mimeType, filename)

  const isCompact = variant === 'compact'

  const boxProps = {
    bg: theme.bgColor,
    border: '1px solid' as const,
    borderColor: theme.borderColor,
    borderRadius: 'md' as const,
    p: 2,
    className,
    ...(isCompact ? { w: '160px', flexShrink: 0 } : { mb: 2 })
  }

  return (
    <Box {...boxProps}>
      <HStack spacing={isCompact ? 2 : 3} align="center">
        {/* File Icon - appropriate icon for file type */}
        <Icon
          as={FileIcon}
          color={theme.secondaryTextColor}
          flexShrink={0}
          boxSize={isCompact ? 3 : 4}
        />

        {/* File Info */}
        <Box flex={1} minWidth={0}>
          <Text
            fontSize={isCompact ? 'xs' : 'sm'}
            fontWeight="medium"
            color={theme.textColor}
            noOfLines={1}
            title={filename}
            textAlign="left"
          >
            {filename}
          </Text>
          <Text
            fontSize={isCompact ? '2xs' : 'xs'}
            color={theme.secondaryTextColor}
            textAlign="left"
          >
            {formatFileSize(filesize)}
          </Text>
        </Box>

        {/* Remove Button */}
        {onRemove && (
          <IconButton
            aria-label={`Remove ${filename}`}
            icon={<CloseIcon />}
            size={isCompact ? '2xs' : 'xs'}
            variant="ghost"
            colorScheme="red"
            onClick={onRemove}
            _hover={{ bg: 'red.50' }}
            {...(isCompact ? { minW: 'auto', h: 'auto', p: 1 } : {})}
          />
        )}
      </HStack>
    </Box>
  )
}

TempFileCard.displayName = 'TempFileCard'

export default TempFileCard

/**
 * Converts a message content part to a MessageFileLike object for TempFileCard
 * Handles both temporary files and images with simplified logic
 */
export const toMessageFileLikeFromMessagePart = (
  part: MessageContentPart
): MessageFileLike | null => {
  switch (part.type) {
    case 'temporary-file': {
      if (!part.temporaryFile) return null
      return {
        filename: part.temporaryFile.filename,
        size: part.temporaryFile.size,
        mimeType: part.temporaryFile.mimeType
      }
    }

    case 'image': {
      if (!part.image) return null

      // Generate filename from mediaType or use provided filename
      const filename =
        part.image.filename || `image.${part.image.mediaType?.split('/')[1] || 'png'}`

      // Estimate size from base64 data if available
      const size = (() => {
        const data = part.image?.image
        if (typeof data === 'string' && data.startsWith('data:')) {
          const base64 = data.split(',')[1] || ''
          return Math.round((base64.length * 3) / 4)
        }
        return 0
      })()

      return {
        filename,
        size,
        mimeType: part.image.mediaType || 'image/*'
      }
    }

    default:
      return null
  }
}

/**
 * Unified horizontally scrollable list wrapper for TempFileCard items
 * Ensures consistent spacing and scrollbar styling across the app.
 */
export interface TempFileCardListProps
  extends Pick<BoxProps, 'alignSelf' | 'maxW' | 'mb' | 'className'> {
  children: React.ReactNode
  spacing?: number
}

export const TempFileCardList: React.FC<TempFileCardListProps> = ({
  children,
  spacing = 2,
  alignSelf,
  maxW = '100%',
  mb = 1,
  className
}) => {
  const boxProps = {
    mb,
    maxW,
    className,
    ...(alignSelf ? { alignSelf } : {})
  }

  return (
    <Box {...boxProps}>
      <HStack
        spacing={spacing}
        overflowX="auto"
        maxW="100%"
        pb={1}
        sx={{
          '&::-webkit-scrollbar': {
            height: '4px'
          },
          '&::-webkit-scrollbar-track': {
            bg: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            bg: 'gray.300',
            borderRadius: '2px'
          }
        }}
      >
        {children}
      </HStack>
    </Box>
  )
}
