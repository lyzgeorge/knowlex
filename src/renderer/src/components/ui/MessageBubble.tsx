import React, { useState } from 'react'
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
  Icon
} from '@chakra-ui/react'
import { ExternalLinkIcon, LinkIcon } from '@chakra-ui/icons'
import { FaRobot } from 'react-icons/fa'
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
import MessageActionIcons from '../features/chat/MessageActionIcons'

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
  onImageClick
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Color mode values (must be called at the top level)
  const avatarBg = useColorModeValue('gray.100', 'gray.700')
  const avatarBorder = useColorModeValue('gray.200', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'gray.300')
  const isUser = message.role === 'user'

  // Theme colors
  const userBg = useColorModeValue('rgba(74, 124, 74, 0.08)', 'rgba(74, 124, 74, 0.12)') // primary.500 with transparency
  const userTextColor = useColorModeValue('text.primary', 'text.primary')
  const assistantTextColor = useColorModeValue('text.primary', 'text.primary')
  const codeBlockBg = useColorModeValue('gray.100', 'gray.800')
  const inlineCodeBg = useColorModeValue('gray.100', 'gray.700')
  const blockquoteBg = useColorModeValue('gray.50', 'gray.800')
  const userCodeBlockBg = useColorModeValue('rgba(74, 124, 74, 0.15)', 'rgba(74, 124, 74, 0.2)')
  const userInlineCodeBg = useColorModeValue('rgba(74, 124, 74, 0.12)', 'rgba(74, 124, 74, 0.18)')
  const userBlockquoteBg = useColorModeValue('rgba(74, 124, 74, 0.08)', 'rgba(74, 124, 74, 0.12)')
  const userBorderColor = useColorModeValue('rgba(74, 124, 74, 0.2)', 'rgba(74, 124, 74, 0.3)')
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
  const renderTextContent = (text: string, isUserMessage: boolean = false) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // Custom components for consistent styling
        p: ({ children }) => (
          <Text mb={0} lineHeight="tall">
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
              bg={isUserMessage ? userCodeBlockBg : codeBlockBg}
              overflowX="auto"
              fontSize="sm"
              className={className}
              {...props}
            >
              {children}
            </Code>
          ) : (
            <Code
              px={1}
              py={1}
              borderRadius="sm"
              fontSize="sm"
              bg={isUserMessage ? userInlineCodeBg : inlineCodeBg}
              {...props}
            >
              {children}
            </Code>
          )
        },
        blockquote: ({ children }) => (
          <Box
            borderLeft="4px solid"
            borderColor={isUserMessage ? 'rgba(74, 124, 74, 0.4)' : 'gray.300'}
            pl={4}
            py={2}
            my={4}
            bg={isUserMessage ? userBlockquoteBg : blockquoteBg}
          >
            {children}
          </Box>
        ),
        a: ({ href, children }) => (
          <Link
            href={href}
            isExternal
            color={isUserMessage ? 'primary.600' : 'blue.500'}
            textDecoration="underline"
          >
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
  const renderContentParts = (content: MessageContent, isUserMessage: boolean = false) => {
    return content.map((part: MessageContentPart, index: number) => {
      const key = `part-${index}`

      switch (part.type) {
        case 'text':
          return part.text ? (
            <Box key={key}>{renderTextContent(part.text, isUserMessage)}</Box>
          ) : null

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

  // User messages: display in bubble on the right
  if (isUser) {
    return (
      <HStack
        align="flex-start"
        spacing={3}
        width="100%"
        justify="flex-end"
        mb={compact ? 2 : 4}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="group"
      >
        {/* User Message Bubble */}
        <VStack align="flex-end" spacing={1} maxWidth="70%" minWidth="200px">
          <Box
            bg={userBg}
            color={userTextColor}
            px={4}
            py={3}
            borderRadius="lg"
            borderBottomRightRadius="sm"
            border="1px solid"
            borderColor={userBorderColor}
            position="relative"
            width="100%"
          >
            <VStack align="flex-start" spacing={3}>
              {renderContentParts(message.content, true)}
            </VStack>
          </Box>

          {/* Timestamp or Action Icons */}
          <Box px={2} minHeight="16px" display="flex" alignItems="center">
            {isHovered ? (
              <Box transformOrigin="right">
                <MessageActionIcons message={message} isVisible={isHovered} />
              </Box>
            ) : (
              showTimestamp && <Text variant="timestamp">{formatTime(message.createdAt)}</Text>
            )}
          </Box>
        </VStack>
      </HStack>
    )
  }

  // Assistant messages: display in bubble on the left with transparent background
  return (
    <HStack
      align="flex-start"
      spacing={3}
      width="100%"
      justify="flex-start"
      mb={compact ? 2 : 4}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="group"
    >
      {/* Assistant Avatar - 2rem rectangle with robot icon */}
      {showAvatar && (
        <Box
          width="2rem"
          height="2rem"
          bg={avatarBg}
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          border="1px solid"
          borderColor={avatarBorder}
        >
          <Icon as={FaRobot} boxSize={4} color={iconColor} />
        </Box>
      )}

      {/* Assistant Message Bubble */}
      <VStack align="flex-start" spacing={1} maxWidth="70%" minWidth="200px" flex={1}>
        <Box
          bg="transparent"
          color={assistantTextColor}
          px={4}
          pt={0}
          pb={3}
          borderRadius="lg"
          borderBottomLeftRadius="sm"
          border="1px solid"
          borderColor="transparent"
          width="100%"
          outline="none"
          _focus={{ outline: 'none', boxShadow: 'none' }}
          _focusVisible={{ outline: 'none', boxShadow: 'none' }}
        >
          {/* Assistant Message Content */}
          <VStack align="flex-start" spacing={3}>
            {renderContentParts(message.content, false)}

            {/* Streaming indicator */}
            {isStreaming && (
              <HStack spacing={1}>
                <Skeleton height="20px" width="60px" />
                <Skeleton height="20px" width="40px" />
              </HStack>
            )}
          </VStack>
        </Box>

        {/* Timestamp or Action Icons */}
        <Box px={2} minHeight="16px" display="flex" alignItems="center">
          {isHovered ? (
            <Box transformOrigin="left">
              <MessageActionIcons message={message} isVisible={isHovered} />
            </Box>
          ) : (
            showTimestamp && <Text variant="timestamp">{formatTime(message.createdAt)}</Text>
          )}
        </Box>
      </VStack>
    </HStack>
  )
}

MessageBubble.displayName = 'MessageBubble'

export default MessageBubble
