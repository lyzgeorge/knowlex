/**
 * ChatMessage Component - Message display component for chat interface
 *
 * This component provides:
 * - User and AI _message rendering
 * - Markdown support for AI responses
 * - File attachment display
 * - Reference citations
 * - Message actions (copy, save to knowledge)
 * - Loading/streaming states
 * - Accessibility support
 */

import React, { useState, useRef } from 'react'
import {
  Box,
  HStack,
  VStack,
  Text,
  Avatar,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Flex,
  Tooltip,
  useClipboard,
  useColorModeValue,
  Button,
  Collapse,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'

// Import design system hooks and components
import { useColors, useAnimations } from '@/hooks'
import { Icon, CopyIcon, EditIcon, WarningIcon, CheckIcon } from '../common'

// Message types
export type MessageRole = 'user' | 'assistant' | 'system'

export interface FileReference {
  _id: string
  name: string
  type: string
  size: number
}

export interface MessageCitation {
  _id: string
  filename: string
  content: string
  score: number
  chunkIndex: number
}

export interface ChatMessageProps {
  /**
   * Unique _message ID
   */
  _id: string

  /**
   * Message role (user, assistant, system)
   */
  role: MessageRole

  /**
   * Message content
   */
  content: string

  /**
   * File attachments for user messages
   */
  files?: FileReference[]

  /**
   * Citations for AI responses
   */
  citations?: MessageCitation[]

  /**
   * Whether the _message is currently being streamed
   */
  streaming?: boolean

  /**
   * Error state for failed messages
   */
  error?: string

  /**
   * Timestamp of the _message
   */
  timestamp: Date

  /**
   * Whether the _message can be edited
   */
  editable?: boolean

  /**
   * Whether to show _message actions
   */
  showActions?: boolean

  /**
   * Callback for copying _message content
   */
  onCopy?: (content: string) => void

  /**
   * Callback for saving to knowledge
   */
  onSaveToKnowledge?: (content: string) => void

  /**
   * Callback for editing _message
   */
  onEdit?: (messageId: string) => void

  /**
   * Callback for regenerating AI response
   */
  onRegenerate?: (messageId: string) => void

  /**
   * Callback for viewing citation
   */
  onViewCitation?: (citation: MessageCitation) => void
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  _id,
  role,
  content,
  files = [],
  citations = [],
  streaming = false,
  error,
  timestamp,
  editable = false,
  showActions = true,
  onCopy,
  onSaveToKnowledge,
  onEdit,
  onRegenerate,
  onViewCitation,
}) => {
  // const { t } = useTranslation()()
  const _colors = useColors()
  const animations = useAnimations()
  const { onCopy: copyToClipboard, hasCopied } = useClipboard(content)

  const [showCitations, setShowCitations] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)

  // Determine if this is a user or AI _message
  const isUser = role === 'user'
  const isSystem = role === 'system'
  const isAssistant = role === 'assistant'

  // Color mode values
  const userBg = useColorModeValue('primary.50', 'primary.900')
  const assistantBg = useColorModeValue('gray.50', 'dark.100')
  const systemBg = useColorModeValue('yellow.50', 'yellow.900')
  const errorBg = useColorModeValue('red.50', 'red.900')

  // Handle copy action
  const handleCopy = () => {
    copyToClipboard()
    onCopy?.(content)
  }

  // Handle save to knowledge
  const handleSaveToKnowledge = () => {
    onSaveToKnowledge?.(content)
  }

  // Render user avatar
  const renderAvatar = () => {
    if (isUser) {
      return <Avatar size="sm" name="User" bg="primary.500" color="white" />
    }

    if (isAssistant) {
      return (
        <Avatar
          size="sm"
          name="AI"
          bg="secondary.500"
          color="white"
          icon={<Icon path="search" size="sm" />}
        />
      )
    }

    return null
  }

  // Render _message content
  const renderContent = () => {
    if (error) {
      return (
        <VStack align="flex-start" spacing={2}>
          <HStack>
            <WarningIcon size="sm" color="error.500" />
            <Text color="error.500" fontSize="sm">
              {t('error.generic')}
            </Text>
          </HStack>
          <Text fontSize="sm" color="text.muted">
            {error}
          </Text>
        </VStack>
      )
    }

    if (isAssistant) {
      return (
        <Box>
          <ReactMarkdown
            components={{
              p: ({ children }) => <Text mb={2}>{children}</Text>,
              h1: ({ children }) => (
                <Text fontSize="xl" fontWeight="bold" mb={2}>
                  {children}
                </Text>
              ),
              h2: ({ children }) => (
                <Text fontSize="lg" fontWeight="semibold" mb={2}>
                  {children}
                </Text>
              ),
              h3: ({ children }) => (
                <Text fontSize="md" fontWeight="medium" mb={2}>
                  {children}
                </Text>
              ),
              code: ({ children, className }) => {
                const isInline = !className
                return isInline ? (
                  <Text
                    as="code"
                    bg={_colors.background.subtle}
                    px={1}
                    borderRadius="sm"
                    fontSize="sm"
                  >
                    {children}
                  </Text>
                ) : (
                  <Box
                    as="pre"
                    bg={_colors.background.subtle}
                    p={3}
                    borderRadius="md"
                    overflow="auto"
                  >
                    <Text as="code" fontSize="sm">
                      {children}
                    </Text>
                  </Box>
                )
              },
              blockquote: ({ children }) => (
                <Box
                  borderLeft="4px solid"
                  borderColor="primary.200"
                  pl={4}
                  py={2}
                  bg={_colors.background.subtle}
                >
                  {children}
                </Box>
              ),
            }}
          >
            {content}
          </ReactMarkdown>

          {streaming && (
            <HStack mt={2}>
              <Box
                w={2}
                h={2}
                bg="primary.500"
                borderRadius="full"
                animation={animations.animations.pulse}
              />
              <Text fontSize="xs" color="text.muted">
                {t('ui.chat.typing')}
              </Text>
            </HStack>
          )}
        </Box>
      )
    }

    return <Text>{content}</Text>
  }

  // Render file attachments
  const renderFiles = () => {
    if (files.length === 0) return null

    return (
      <VStack align="flex-start" spacing={2} mt={2}>
        <Text fontSize="sm" color="text.muted">
          {t('ui.chat.attachments')}:
        </Text>
        {files.map(file => (
          <HStack key={file._id} spacing={2}>
            <Icon path="file" size="sm" color="primary.500" />
            <Text fontSize="sm">{file.name}</Text>
            <Badge size="sm" variant="subtle">
              {(file.size / 1024).toFixed(1)}KB
            </Badge>
          </HStack>
        ))}
      </VStack>
    )
  }

  // Render citations
  const renderCitations = () => {
    if (citations.length === 0) return null

    return (
      <VStack align="flex-start" spacing={2} mt={3}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCitations(!showCitations)}
          rightIcon={<Icon path={showCitations ? 'chevronUp' : 'chevronDown'} size="xs" />}
        >
          {t('ui.chat.references')} ({citations.length})
        </Button>

        <Collapse in={showCitations}>
          <VStack align="flex-start" spacing={2} pl={4}>
            {citations.map((citation, _index) => (
              <HStack
                key={citation._id}
                spacing={2}
                cursor="pointer"
                onClick={() => onViewCitation?.(citation)}
                _hover={{ bg: _colors.background.subtle }}
                p={2}
                borderRadius="md"
                transition={animations.transitions.fast}
              >
                <Badge size="sm" colorScheme="primary">
                  {_index + 1}
                </Badge>
                <VStack align="flex-start" spacing={0} flex={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    {citation.filename}
                  </Text>
                  <Text fontSize="xs" color="text.muted" noOfLines={2}>
                    {citation.content}
                  </Text>
                </VStack>
                <Text fontSize="xs" color="text.subtle">
                  {(citation.score * 100).toFixed(0)}%
                </Text>
              </HStack>
            ))}
          </VStack>
        </Collapse>
      </VStack>
    )
  }

  // Render _message actions
  const renderActions = () => {
    if (!showActions) return null

    return (
      <HStack
        spacing={1}
        opacity={0}
        _groupHover={{ opacity: 1 }}
        transition={animations.transitions.fast}
      >
        <Tooltip label={hasCopied ? t('common.actions.copied') : t('common.actions.copy')}>
          <IconButton
            size="xs"
            variant="ghost"
            icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
            onClick={handleCopy}
            aria-label={t('common.actions.copy')}
          />
        </Tooltip>

        {isAssistant && onSaveToKnowledge && (
          <Tooltip label={t('ui.chat.saveToKnowledge')}>
            <IconButton
              size="xs"
              variant="ghost"
              icon={<Icon path="plus" size="xs" />}
              onClick={handleSaveToKnowledge}
              aria-label={t('ui.chat.saveToKnowledge')}
            />
          </Tooltip>
        )}

        {editable && onEdit && (
          <Tooltip label={t('common.actions.edit')}>
            <IconButton
              size="xs"
              variant="ghost"
              icon={<EditIcon />}
              onClick={() => onEdit(_id)}
              aria-label={t('common.actions.edit')}
            />
          </Tooltip>
        )}

        {isAssistant && onRegenerate && (
          <Tooltip label={t('ui.chat.regenerate')}>
            <IconButton
              size="xs"
              variant="ghost"
              icon={<Icon path="refresh" size="xs" />}
              onClick={() => onRegenerate(_id)}
              aria-label={t('ui.chat.regenerate')}
            />
          </Tooltip>
        )}
      </HStack>
    )
  }

  return (
    <Box
      ref={messageRef}
      role="group"
      py={4}
      px={4}
      bg={error ? errorBg : isUser ? userBg : isSystem ? systemBg : assistantBg}
      borderRadius="lg"
      transition={animations.transitions.fast}
      _hover={{ bg: error ? errorBg : _colors.background.subtle }}
    >
      <HStack align="flex-start" spacing={3}>
        {renderAvatar()}

        <VStack align="flex-start" spacing={2} flex={1} minW={0}>
          <Flex justify="space-between" align="center" w="full">
            <HStack>
              <Text fontSize="sm" fontWeight="medium" color="text.secondary">
                {isUser ? t('ui.chat.you') : isAssistant ? t('ui.chat.ai') : t('ui.chat.system')}
              </Text>
              <Text fontSize="xs" color="text.subtle">
                {timestamp.toLocaleTimeString()}
              </Text>
            </HStack>

            {renderActions()}
          </Flex>

          {renderContent()}
          {renderFiles()}
          {renderCitations()}
        </VStack>
      </HStack>
    </Box>
  )
}

export default ChatMessage
