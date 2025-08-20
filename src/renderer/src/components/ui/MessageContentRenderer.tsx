import React from 'react'
import { Box, Text, Icon } from '@chakra-ui/react'
import { FaForumbee } from 'react-icons/fa'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { markdownComponents } from '../../utils/markdownComponents'
import type { MessageContent, MessageContentPart } from '../../../../shared/types/message'
import TempFileCard from '../features/chat/TempFileCard'

export interface MessageContentRendererProps {
  /** Message content to render */
  content: MessageContent
  /** Rendering variant - affects styling and behavior */
  variant: 'user' | 'assistant'
  /** Whether content is currently being streamed */
  isStreaming?: boolean
  /** Whether to show streaming cursor */
  showCursor?: boolean
  /** Whether reasoning is currently streaming (hides text cursor) */
  isReasoningStreaming?: boolean
}

/**
 * Unified message content renderer
 * Handles rendering of all message content types for both user and assistant messages
 */
export const MessageContentRenderer: React.FC<MessageContentRendererProps> = ({
  content,
  variant,
  isStreaming = false,
  showCursor = false,
  isReasoningStreaming = false
}) => {
  // Render text content with optional streaming cursor
  const renderTextContent = (text: string, showTextCursor: boolean = false) => {
    // Clean up zero-width space placeholder
    const displayText = text.replace(/\u200B/g, '')

    return (
      <Box as="span" display="inline" className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={markdownComponents}
        >
          {displayText}
        </ReactMarkdown>
        {showTextCursor && (
          <Icon
            as={FaForumbee}
            boxSize={3}
            color="gray.400"
            ml={1}
            display="inline"
            verticalAlign="baseline"
            animation="flash 1.5s ease-in-out infinite"
            sx={{
              '@keyframes flash': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0.3 }
              }
            }}
          />
        )}
      </Box>
    )
  }

  // Render temporary file content part
  const renderTemporaryFile = (part: MessageContentPart, key: string) => {
    if (!part.temporaryFile) return null

    if (variant === 'user') {
      // User messages use TempFileCard for files
      return (
        <TempFileCard
          key={key}
          variant="compact"
          messageFile={{
            filename: part.temporaryFile.filename,
            size: part.temporaryFile.size,
            mimeType: part.temporaryFile.mimeType
          }}
        />
      )
    } else {
      // Assistant messages show file content inline
      return (
        <Box
          key={key}
          p={3}
          bg="gray.50"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.200"
          fontSize="sm"
        >
          <Text fontWeight="medium" mb={2}>
            {part.temporaryFile.filename}
          </Text>
          <Text fontSize="xs" color="gray.600" noOfLines={3}>
            {part.temporaryFile.content.substring(0, 200)}...
          </Text>
        </Box>
      )
    }
  }

  // Render image content part (for user messages)
  const renderImage = (part: MessageContentPart, key: string) => {
    if (!part.image || variant !== 'user') return null

    return (
      <TempFileCard
        key={key}
        variant="compact"
        messageFile={{
          filename: part.image.alt || 'Image',
          size: part.image.size || 0,
          mimeType: part.image.mimeType || 'image/*',
          url: part.image.url
        }}
      />
    )
  }

  // Render individual content part
  const renderContentPart = (part: MessageContentPart, index: number) => {
    const key = `part-${index}`
    const isLastTextPart = index === content.length - 1 && part.type === 'text'
    // Hide the streaming cursor when reasoning is streaming for this message
    const showTextCursor = isStreaming && showCursor && isLastTextPart && !isReasoningStreaming

    switch (part.type) {
      case 'text':
        // Always render text parts during streaming, even if empty
        if (part.text || showTextCursor) {
          return <Box key={key}>{renderTextContent(part.text || '', showTextCursor)}</Box>
        }
        return null

      case 'temporary-file':
        return renderTemporaryFile(part, key)

      case 'image':
        return renderImage(part, key)

      default:
        return null
    }
  }

  // Separate file-like parts from text parts for user messages
  if (variant === 'user') {
    const fileParts = content.filter(
      (p: MessageContentPart) => p.type === 'temporary-file' || p.type === 'image'
    )
    const textParts = content.filter((p: MessageContentPart) => p.type === 'text')

    return (
      <>
        {/* Render file parts first */}
        {fileParts.map((part: MessageContentPart, i: number) => renderContentPart(part, i))}
        {/* Then render text parts */}
        {textParts.map((part: MessageContentPart, i: number) =>
          renderContentPart(part, fileParts.length + i)
        )}
      </>
    )
  }

  // For assistant messages, render in order
  return (
    <>{content.map((part: MessageContentPart, index: number) => renderContentPart(part, index))}</>
  )
}

MessageContentRenderer.displayName = 'MessageContentRenderer'

export default MessageContentRenderer
