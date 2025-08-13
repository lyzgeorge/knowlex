import React from 'react'
import { Box, HStack, Text, IconButton, useColorModeValue } from '@chakra-ui/react'
import { CloseIcon, AttachmentIcon } from '@chakra-ui/icons'

export interface FilePreviewProps {
  /** File to preview */
  file: File
  /** Callback when file is removed */
  onRemove: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * FilePreview component for displaying uploaded file information
 *
 * Features:
 * - Shows file name and size
 * - File type icon
 * - Remove button
 * - Compact card layout
 */
export const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove, className }) => {
  // Theme colors
  const bgColor = useColorModeValue('surface.secondary', 'surface.secondary')
  const borderColor = useColorModeValue('border.secondary', 'border.secondary')
  const textColor = useColorModeValue('text.primary', 'text.primary')
  const secondaryTextColor = useColorModeValue('text.secondary', 'text.secondary')

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
  }

  return (
    <Box
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      p={2}
      mb={2}
      className={className}
    >
      <HStack spacing={3} align="center">
        {/* File Icon */}
        <AttachmentIcon color={secondaryTextColor} flexShrink={0} boxSize={4} />

        {/* File Info */}
        <Box flex={1} minWidth={0}>
          <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={1} title={file.name}>
            {file.name}
          </Text>
          <Text fontSize="xs" color={secondaryTextColor}>
            {formatFileSize(file.size)}
          </Text>
        </Box>

        {/* Remove Button */}
        <IconButton
          aria-label={`Remove ${file.name}`}
          icon={<CloseIcon />}
          size="xs"
          variant="ghost"
          colorScheme="red"
          onClick={onRemove}
          _hover={{ bg: 'red.50' }}
        />
      </HStack>
    </Box>
  )
}

FilePreview.displayName = 'FilePreview'

export default FilePreview
