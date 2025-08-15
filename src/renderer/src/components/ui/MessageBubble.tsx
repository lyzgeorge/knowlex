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
  Icon
} from '@chakra-ui/react'
import { ExternalLinkIcon, LinkIcon, AttachmentIcon } from '@chakra-ui/icons'
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
  ImageContent,
  TemporaryFileContent
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
  /** Click handler for files */
  onFileClick?: (file: TemporaryFileContent) => void
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
  onFileClick
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
  const fileBg = useColorModeValue('gray.50', 'gray.800')
  const fileBorder = useColorModeValue('gray.200', 'gray.600')
  const fileHoverBg = useColorModeValue('gray.100', 'gray.700')

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
  const renderTextContent = (
    text: string,
    isUserMessage: boolean = false,
    showCursor: boolean = false
  ) => (
    <Box as="span" display="inline">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom components for consistent styling
          p: ({ children }) => (
            <Box as="span" display="inline" lineHeight="tall">
              {children}
            </Box>
          ),
          code: ({ inline, children, className, ...props }) => {
            return inline === false ? (
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
              <Box
                as="code"
                display="inline"
                px="0.2em"
                py="0.1em"
                borderRadius="0.25rem"
                fontSize="0.9em"
                bg={isUserMessage ? userInlineCodeBg : inlineCodeBg}
                fontFamily="mono"
                {...props}
              >
                {children}
              </Box>
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
              _hover={{ textDecoration: 'none', opacity: 0.8 }}
            >
              {children}
              <ExternalLinkIcon mx="2px" />
            </Link>
          ),
          h1: ({ children }) => (
            <Text fontSize="2xl" fontWeight="bold" mb={4} mt={6}>
              {children}
            </Text>
          ),
          h2: ({ children }) => (
            <Text fontSize="xl" fontWeight="semibold" mb={3} mt={5}>
              {children}
            </Text>
          ),
          h3: ({ children }) => (
            <Text fontSize="lg" fontWeight="medium" mb={2} mt={4}>
              {children}
            </Text>
          ),
          ul: ({ children }) => (
            <Box as="ul" pl={4} mb={4}>
              {children}
            </Box>
          ),
          ol: ({ children }) => (
            <Box as="ol" pl={4} mb={4}>
              {children}
            </Box>
          ),
          li: ({ children }) => (
            <Text as="li" mb={1}>
              {children}
            </Text>
          ),
          strong: ({ children }) => (
            <Text as="strong" fontWeight="semibold">
              {children}
            </Text>
          ),
          em: ({ children }) => (
            <Text as="em" fontStyle="italic">
              {children}
            </Text>
          )
        }}
      >
        {text}
      </ReactMarkdown>
      {showCursor && (
        <Icon
          as={FaRobot}
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

  // Render temporary file content
  const renderTemporaryFileContent = (file: TemporaryFileContent) => {
    const truncatedContent =
      file.content.length > 150 ? file.content.substring(0, 150) + '...' : file.content

    return (
      <Box
        key={`file-${file.filename}`}
        width="8rem"
        height="6rem"
        p={2}
        bg={fileBg}
        borderRadius="md"
        border="1px solid"
        borderColor={fileBorder}
        cursor={onFileClick ? 'pointer' : 'default'}
        onClick={() => onFileClick && onFileClick(file)}
        _hover={onFileClick ? { bg: fileHoverBg } : undefined}
        transition="background 0.2s"
        overflow="hidden"
        flexShrink={0}
        position="relative"
      >
        <VStack align="flex-start" spacing={1} height="100%">
          <Text fontSize="xs" fontWeight="medium" noOfLines={1} width="100%" pr={4}>
            {file.filename}
          </Text>
          <Text
            fontSize="10px"
            color="text.secondary"
            flex={1}
            overflow="hidden"
            whiteSpace="pre-wrap"
            fontFamily="mono"
            lineHeight="1.2"
            width="100%"
            pb={4}
          >
            {truncatedContent}
          </Text>
        </VStack>

        {/* Floating attachment icon and filesize in bottom right */}
        <Box position="absolute" bottom={1} right={1} bg={fileBg} borderRadius="sm" px={1} py={0.5}>
          <HStack spacing={1} align="center">
            <AttachmentIcon boxSize={2.5} color="gray.500" />
            <Text fontSize="9px" color="text.secondary" lineHeight={1}>
              {(file.size / 1024).toFixed(1)}K
            </Text>
          </HStack>
        </Box>
      </Box>
    )
  }

  // Render content parts
  const renderContentParts = (
    content: MessageContent,
    isUserMessage: boolean = false,
    showStreamingCursor: boolean = false
  ) => {
    return content.map((part: MessageContentPart, index: number) => {
      const key = `part-${index}`
      const isLastTextPart = index === content.length - 1 && part.type === 'text'

      switch (part.type) {
        case 'text':
          return part.text ? (
            <Box key={key}>
              {renderTextContent(part.text, isUserMessage, showStreamingCursor && isLastTextPart)}
            </Box>
          ) : null

        case 'image':
          return part.image ? renderImageContent(part.image) : null

        case 'citation':
          return part.citation ? renderCitationContent(part.citation) : null

        case 'tool-call':
          return part.toolCall ? renderToolCallContent(part.toolCall) : null

        case 'temporary-file':
          return part.temporaryFile ? renderTemporaryFileContent(part.temporaryFile) : null

        default:
          return null
      }
    })
  }

  // User messages: display in bubble on the right
  if (isUser) {
    // Separate files from other content parts
    const fileParts = message.content.filter((part) => part.type === 'temporary-file')
    const otherParts = message.content.filter((part) => part.type !== 'temporary-file')

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
            <VStack align="flex-start" spacing={0} width="100%">
              {/* File attachments - horizontal scrolling */}
              {fileParts.length > 0 && (
                <Box
                  width="100%"
                  overflowX="auto"
                  overflowY="hidden"
                  sx={{
                    '&::-webkit-scrollbar': {
                      height: '4px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: userBorderColor,
                      borderRadius: '2px'
                    }
                  }}
                >
                  <HStack spacing={2} pb={1}>
                    {fileParts.map(
                      (part, _index) =>
                        part.temporaryFile && renderTemporaryFileContent(part.temporaryFile)
                    )}
                  </HStack>
                </Box>
              )}

              {/* Text content */}
              {renderContentParts(otherParts, true)}
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
          px={3}
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
            {renderContentParts(message.content, false, isStreaming)}
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
