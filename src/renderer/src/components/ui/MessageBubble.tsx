import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  Badge,
  Link,
  Code,
  useColorModeValue,
  Skeleton,
  Avatar,
  Tooltip
} from '@chakra-ui/react'
import { ExternalLinkIcon, CopyIcon, LinkIcon } from '@chakra-ui/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import {
  Message,
  MessageContent,
  MessageContentPart,
  CitationContent,
  ToolCallContent,
  ImageContent
} from '../../../shared/types/message'

export interface MessageBubbleProps {
  /** Message data */
  message: Message
  /** Whether this message is currently being streamed */
  isStreaming?: boolean
  /** Whether to show the avatar */
  showAvatar?: boolean
  /** Whether to show the timestamp */
  showTimestamp?: boolean
  /** Whether this is a compact display */
  compact?: boolean
  /** Click handler for citations */
  onCitationClick?: (citation: CitationContent) => void
  /** Click handler for images */
  onImageClick?: (image: ImageContent) => void
  /** Copy message handler */
  onCopyMessage?: (message: Message) => void
}

/**
 * MessageBubble component for rendering chat messages with multi-part content
 *
 * Features:
 * - Multi-part content rendering (text, images, citations, tool calls)
 * - Markdown rendering with syntax highlighting
 * - User/Assistant message styling differentiation
 * - Streaming content support with loading indicators
 * - Citation links and tool call displays
 * - Image rendering with click handlers
 * - Copy functionality
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  showAvatar = true,
  showTimestamp = true,
  compact = false,
  onCitationClick,
  onImageClick,
  onCopyMessage
}) => {
  const isUser = message.role === 'user'

  // Theme colors
  const userBg = useColorModeValue('blue.500', 'blue.600')
  const assistantBg = useColorModeValue('surface.primary', 'surface.secondary')
  const userTextColor = 'white'
  const assistantTextColor = useColorModeValue('text.primary', 'text.primary')
  const timestampColor = useColorModeValue('text.tertiary', 'text.tertiary')
  const codeBlockBg = useColorModeValue('gray.100', 'gray.800')
  const inlineCodeBg = useColorModeValue('gray.100', 'gray.700')
  const blockquoteBg = useColorModeValue('gray.50', 'gray.800')
  const citationBg = useColorModeValue('blue.50', 'blue.900')
  const citationHoverBg = useColorModeValue('blue.100', 'blue.800')
  const toolCallBg = useColorModeValue('purple.50', 'purple.900')
  const toolCallCodeBg = useColorModeValue('gray.100', 'gray.800')

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Render text content with markdown
  const renderTextContent = (text: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // Custom components for consistent styling
        p: ({ children }) => (
          <Text mb={2} lineHeight="tall">
            {children}
          </Text>
        ),
        code: ({ inline, children, className, ...props }) => {
          return !inline ? (
            <Code
              display="block"
              whiteSpace="pre"
              p={4}
              borderRadius="md"
              bg={codeBlockBg}
              overflowX="auto"
              fontSize="sm"
              className={className}
              {...props}
            >
              {children}
            </Code>
          ) : (
            <Code px={1} py={0.5} borderRadius="sm" fontSize="sm" bg={inlineCodeBg} {...props}>
              {children}
            </Code>
          )
        },
        blockquote: ({ children }) => (
          <Box borderLeft="4px solid" borderColor="gray.300" pl={4} py={2} my={4} bg={blockquoteBg}>
            {children}
          </Box>
        ),
        a: ({ href, children }) => (
          <Link href={href} isExternal color="blue.500" textDecoration="underline">
            {children}
            <ExternalLinkIcon mx="2px" />
          </Link>
        )
      }}
    >
      {text}
    </ReactMarkdown>
  )

  // Render image content
  const renderImageContent = (image: ImageContent) => (
    <Box
      key={`image-${image.url}`}
      borderRadius="md"
      overflow="hidden"
      cursor={onImageClick ? 'pointer' : 'default'}
      onClick={() => onImageClick && onImageClick(image)}
      maxWidth="400px"
    >
      <Image
        src={image.url}
        alt={image.alt || 'Message image'}
        objectFit="cover"
        borderRadius="md"
        _hover={onImageClick ? { opacity: 0.9 } : undefined}
        transition="opacity 0.2s"
      />
    </Box>
  )

  // Render citation content
  const renderCitationContent = (citation: CitationContent) => (
    <Box
      key={`citation-${citation.fileId}`}
      p={3}
      bg={citationBg}
      borderRadius="md"
      borderLeft="4px solid"
      borderColor="blue.500"
      cursor={onCitationClick ? 'pointer' : 'default'}
      onClick={() => onCitationClick && onCitationClick(citation)}
      _hover={onCitationClick ? { bg: citationHoverBg } : undefined}
      transition="background 0.2s"
    >
      <VStack align="flex-start" spacing={2}>
        <HStack spacing={2}>
          <LinkIcon boxSize={3} color="blue.500" />
          <Text fontSize="sm" fontWeight="medium" color="blue.600">
            {citation.filename}
          </Text>
          <Badge colorScheme="blue" size="sm">
            {Math.round(citation.similarity * 100)}% match
          </Badge>
        </HStack>
        <Text fontSize="sm" color="text.secondary" noOfLines={3}>
          {citation.content}
        </Text>
      </VStack>
    </Box>
  )

  // Render tool call content
  const renderToolCallContent = (toolCall: ToolCallContent) => (
    <Box
      key={`tool-${toolCall.id}`}
      p={3}
      bg={toolCallBg}
      borderRadius="md"
      borderLeft="4px solid"
      borderColor="purple.500"
    >
      <VStack align="flex-start" spacing={2}>
        <HStack spacing={2}>
          <Badge colorScheme="purple" size="sm">
            Tool Call
          </Badge>
          <Text fontSize="sm" fontWeight="medium">
            {toolCall.name}
          </Text>
        </HStack>

        {Object.keys(toolCall.arguments).length > 0 && (
          <Code fontSize="xs" p={2} borderRadius="sm" bg={toolCallCodeBg} width="100%">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </Code>
        )}

        {toolCall.result && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Result:
            </Text>
            <Code fontSize="xs" p={2} borderRadius="sm" bg={toolCallCodeBg} width="100%">
              {typeof toolCall.result === 'string'
                ? toolCall.result
                : JSON.stringify(toolCall.result, null, 2)}
            </Code>
          </Box>
        )}
      </VStack>
    </Box>
  )

  // Render content parts
  const renderContentParts = (content: MessageContent) => {
    return content.map((part: MessageContentPart, index: number) => {
      const key = `part-${index}`

      switch (part.type) {
        case 'text':
          return part.text ? <Box key={key}>{renderTextContent(part.text)}</Box> : null

        case 'image':
          return part.image ? renderImageContent(part.image) : null

        case 'citation':
          return part.citation ? renderCitationContent(part.citation) : null

        case 'tool-call':
          return part.toolCall ? renderToolCallContent(part.toolCall) : null

        default:
          return null
      }
    })
  }

  return (
    <HStack
      align="flex-start"
      spacing={3}
      width="100%"
      justify={isUser ? 'flex-end' : 'flex-start'}
      mb={compact ? 2 : 4}
    >
      {/* Assistant Avatar */}
      {showAvatar && !isUser && (
        <Avatar
          size={compact ? 'sm' : 'md'}
          name="Assistant"
          bg="brand.primary"
          color="white"
          flexShrink={0}
        />
      )}

      {/* Message Content */}
      <VStack
        align={isUser ? 'flex-end' : 'flex-start'}
        spacing={1}
        maxWidth="70%"
        minWidth="200px"
      >
        {/* Message Bubble */}
        <Box
          bg={isUser ? userBg : assistantBg}
          color={isUser ? userTextColor : assistantTextColor}
          px={4}
          py={3}
          borderRadius="lg"
          borderBottomRightRadius={isUser ? 'sm' : 'lg'}
          borderBottomLeftRadius={isUser ? 'lg' : 'sm'}
          shadow="sm"
          position="relative"
          width="100%"
          border={!isUser ? '1px solid' : 'none'}
          borderColor={!isUser ? 'border.primary' : 'transparent'}
        >
          <VStack align="flex-start" spacing={3}>
            {renderContentParts(message.content)}

            {/* Streaming indicator */}
            {isStreaming && (
              <HStack spacing={1}>
                <Skeleton height="20px" width="60px" />
                <Skeleton height="20px" width="40px" />
              </HStack>
            )}
          </VStack>

          {/* Copy button */}
          {onCopyMessage && (
            <Tooltip label="Copy message">
              <Box
                position="absolute"
                top={2}
                right={2}
                opacity={0}
                _groupHover={{ opacity: 1 }}
                transition="opacity 0.2s"
              >
                <CopyIcon
                  boxSize={3}
                  cursor="pointer"
                  onClick={() => onCopyMessage(message)}
                  _hover={{ color: 'blue.500' }}
                />
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Timestamp */}
        {showTimestamp && (
          <Text fontSize="xs" color={timestampColor} px={2}>
            {formatTime(message.createdAt)}
          </Text>
        )}
      </VStack>

      {/* User Avatar */}
      {showAvatar && isUser && (
        <Avatar
          size={compact ? 'sm' : 'md'}
          name="User"
          bg="blue.500"
          color="white"
          flexShrink={0}
        />
      )}
    </HStack>
  )
}

MessageBubble.displayName = 'MessageBubble'

export default MessageBubble
