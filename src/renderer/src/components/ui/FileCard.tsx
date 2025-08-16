import React from 'react'
import {
  Card,
  CardBody,
  HStack,
  VStack,
  Text,
  Badge,
  IconButton,
  Progress,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Box,
  useColorModeValue
} from '@chakra-ui/react'
import {
  DeleteIcon,
  DownloadIcon,
  ViewIcon,
  RepeatIcon,
  AttachmentIcon,
  CheckCircleIcon,
  WarningIcon,
  TimeIcon,
  HamburgerIcon
} from '@chakra-ui/icons'
import type { ProjectFile, TemporaryFile, FileStatus } from '../../../shared/types'

export interface FileCardProps {
  /** File data - can be ProjectFile or TemporaryFile */
  file: ProjectFile | TemporaryFile
  /** File type for display purposes */
  type?: 'project' | 'temporary'
  /** Whether the card should be compact */
  compact?: boolean
  /** Whether to show action buttons */
  showActions?: boolean
  /** Whether the file is selected */
  isSelected?: boolean
  /** Click handler for the card */
  onClick?: (file: ProjectFile | TemporaryFile) => void
  /** View file handler */
  onView?: (file: ProjectFile | TemporaryFile) => void
  /** Delete file handler */
  onDelete?: (file: ProjectFile | TemporaryFile) => void
  /** Download file handler */
  onDownload?: (file: ProjectFile | TemporaryFile) => void
  /** Retry processing handler (for project files only) */
  onRetry?: (file: ProjectFile) => void
  /** Processing progress (0-100) */
  progress?: number
}

/**
 * FileCard component for displaying file information with actions
 *
 * Features:
 * - File icon based on type/extension
 * - File metadata display (name, size, type, status)
 * - Action buttons (view, delete, download, retry)
 * - Processing status indicators with progress
 * - Hover states and click interactions
 * - Support for both project and temporary files
 */
export const FileCard: React.FC<FileCardProps> = ({
  file,
  type: _type = 'project',
  compact = false,
  showActions = true,
  isSelected = false,
  onClick,
  onView,
  onDelete,
  onDownload,
  onRetry,
  progress
}) => {
  const hoverBg = useColorModeValue('gray.50', 'gray.700')
  const selectedBg = useColorModeValue('blue.50', 'blue.900')
  const errorBg = useColorModeValue('red.50', 'red.900')

  const isProjectFile = (f: ProjectFile | TemporaryFile): f is ProjectFile => {
    return 'status' in f && 'projectId' in f
  }

  const projectFile = isProjectFile(file) ? file : null
  const status: FileStatus = projectFile?.status || 'ready'

  // File size formatting
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Get file extension for icon
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  // Status badge color and text
  const getStatusBadge = (status: FileStatus) => {
    const statusConfig = {
      pending: { color: 'gray', text: 'Pending', icon: <TimeIcon boxSize={3} /> },
      processing: { color: 'blue', text: 'Processing', icon: <RepeatIcon boxSize={3} /> },
      ready: { color: 'green', text: 'Ready', icon: <CheckCircleIcon boxSize={3} /> },
      failed: { color: 'red', text: 'Failed', icon: <WarningIcon boxSize={3} /> }
    }
    return statusConfig[status] || statusConfig.ready
  }

  const statusInfo = getStatusBadge(status)
  const hasError = status === 'failed' || file.error
  const isProcessing = status === 'processing'

  const handleCardClick = () => {
    if (onClick) {
      onClick(file)
    }
  }

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onView) onView(file)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) onDelete(file)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDownload) onDownload(file)
  }

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRetry && projectFile) onRetry(projectFile)
  }

  return (
    <Card
      variant="file"
      size={compact ? 'sm' : 'md'}
      cursor={onClick ? 'pointer' : 'default'}
      bg={isSelected ? selectedBg : hasError ? errorBg : 'surface.primary'}
      borderColor={isSelected ? 'blue.200' : hasError ? 'red.200' : 'border.primary'}
      _hover={onClick ? { bg: hoverBg } : undefined}
      onClick={handleCardClick}
      transition="all 0.2s"
    >
      <CardBody p={compact ? 3 : 4}>
        <HStack spacing={3} align="flex-start">
          {/* File Icon */}
          <Box color="text.secondary" fontSize={compact ? 'lg' : 'xl'} minWidth="24px">
            <AttachmentIcon />
          </Box>

          {/* File Info */}
          <VStack align="flex-start" spacing={1} flex="1" minWidth="0">
            <HStack spacing={2} width="100%">
              <Text
                fontWeight="medium"
                fontSize={compact ? 'sm' : 'md'}
                color="text.primary"
                noOfLines={1}
                flex="1"
                title={file.filename}
              >
                {file.filename}
              </Text>

              {projectFile && (
                <Badge
                  colorScheme={statusInfo.color}
                  size="sm"
                  variant="subtle"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  {statusInfo.icon}
                  {statusInfo.text}
                </Badge>
              )}
            </HStack>

            {/* File Details */}
            <HStack spacing={3} fontSize="xs" color="text.secondary">
              <Text>{formatFileSize(file.size)}</Text>
              <Text>{getFileExtension(file.filename).toUpperCase()}</Text>
              {projectFile && projectFile.chunkCount > 0 && (
                <Text>{projectFile.chunkCount} chunks</Text>
              )}
            </HStack>

            {/* Processing Progress */}
            {isProcessing && (
              <Box width="100%" mt={1}>
                <Progress value={progress || 0} size="sm" colorScheme="blue" hasStripe isAnimated />
              </Box>
            )}

            {/* Error Message */}
            {file.error && (
              <Text fontSize="xs" color="red.500" noOfLines={2}>
                {file.error}
              </Text>
            )}
          </VStack>

          {/* Action Buttons */}
          {showActions && (
            <HStack spacing={1} flexShrink={0}>
              {onView && (
                <Tooltip label="View file">
                  <IconButton
                    aria-label="View file"
                    icon={<ViewIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={handleView}
                    isDisabled={hasError}
                  />
                </Tooltip>
              )}

              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="More actions"
                  icon={<HamburgerIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                />
                <MenuList>
                  {onDownload && (
                    <MenuItem icon={<DownloadIcon />} onClick={handleDownload}>
                      Download
                    </MenuItem>
                  )}

                  {onRetry && projectFile && status === 'failed' && (
                    <MenuItem icon={<RepeatIcon />} onClick={handleRetry}>
                      Retry Processing
                    </MenuItem>
                  )}

                  {onDelete && (
                    <MenuItem
                      icon={<DeleteIcon />}
                      onClick={handleDelete}
                      color="red.500"
                      _hover={{ bg: 'red.50', _dark: { bg: 'red.900' } }}
                    >
                      Delete
                    </MenuItem>
                  )}
                </MenuList>
              </Menu>
            </HStack>
          )}
        </HStack>
      </CardBody>
    </Card>
  )
}

FileCard.displayName = 'FileCard'

export default FileCard
