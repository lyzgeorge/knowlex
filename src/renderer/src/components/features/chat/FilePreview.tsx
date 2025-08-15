import React, { useState, useEffect } from 'react'
import { Box, HStack, Text, IconButton, useColorModeValue, Image } from '@chakra-ui/react'
import { CloseIcon, AttachmentIcon } from '@chakra-ui/icons'
import { isImageFile } from '../../../../../shared/utils/validation'

export interface FilePreviewProps {
  /** File to preview */
  file: File
  /** Callback when file is removed */
  onRemove: () => void
  /** Display variant */
  variant?: 'default' | 'compact'
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
export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  variant = 'default',
  className
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const isImage = isImageFile(file.name)

  // Theme colors
  const bgColor = useColorModeValue('surface.secondary', 'surface.secondary')
  const borderColor = useColorModeValue('border.secondary', 'border.secondary')
  const textColor = useColorModeValue('text.primary', 'text.primary')
  const secondaryTextColor = useColorModeValue('text.secondary', 'text.secondary')

  // Create image preview URL for image files
  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)

      // Cleanup function to revoke the URL
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [file, isImage])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
  }

  if (variant === 'compact') {
    if (isImage && imagePreview) {
      // Image preview variant
      return (
        <Box
          bg={bgColor}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="md"
          overflow="hidden"
          minW="120px"
          maxW="200px"
          flexShrink={0}
          className={className}
          position="relative"
        >
          {/* Image thumbnail */}
          <Image src={imagePreview} alt={file.name} objectFit="cover" width="100%" height="80px" />

          {/* File info overlay */}
          <Box p={2} bg={bgColor}>
            <HStack spacing={1} align="center">
              <Box flex={1} minWidth={0}>
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  color={textColor}
                  noOfLines={1}
                  title={file.name}
                >
                  {file.name}
                </Text>
                <Text fontSize="2xs" color={secondaryTextColor}>
                  {formatFileSize(file.size)}
                </Text>
              </Box>

              {/* Remove Button */}
              <IconButton
                aria-label={`Remove ${file.name}`}
                icon={<CloseIcon />}
                size="2xs"
                variant="ghost"
                colorScheme="red"
                onClick={onRemove}
                _hover={{ bg: 'red.50' }}
                minW="auto"
                h="auto"
                p={1}
              />
            </HStack>
          </Box>
        </Box>
      )
    }

    // Non-image file variant
    return (
      <Box
        bg={bgColor}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        p={2}
        minW="120px"
        maxW="200px"
        flexShrink={0}
        className={className}
      >
        <HStack spacing={2} align="center">
          {/* File Icon */}
          <AttachmentIcon color={secondaryTextColor} flexShrink={0} boxSize={3} />

          {/* File Info */}
          <Box flex={1} minWidth={0}>
            <Text
              fontSize="xs"
              fontWeight="medium"
              color={textColor}
              noOfLines={1}
              title={file.name}
            >
              {file.name}
            </Text>
            <Text fontSize="2xs" color={secondaryTextColor}>
              {formatFileSize(file.size)}
            </Text>
          </Box>

          {/* Remove Button */}
          <IconButton
            aria-label={`Remove ${file.name}`}
            icon={<CloseIcon />}
            size="2xs"
            variant="ghost"
            colorScheme="red"
            onClick={onRemove}
            _hover={{ bg: 'red.50' }}
            minW="auto"
            h="auto"
            p={1}
          />
        </HStack>
      </Box>
    )
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
        {/* File Icon or Image Preview */}
        {isImage && imagePreview ? (
          <Image
            src={imagePreview}
            alt={file.name}
            objectFit="cover"
            width="60px"
            height="60px"
            borderRadius="md"
            flexShrink={0}
          />
        ) : (
          <AttachmentIcon color={secondaryTextColor} flexShrink={0} boxSize={4} />
        )}

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
