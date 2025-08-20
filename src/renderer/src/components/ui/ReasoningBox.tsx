import React, { useState, useEffect, useRef } from 'react'
import { Box, HStack, Text, Collapse, IconButton, useColorModeValue, Icon } from '@chakra-ui/react'
import { FaChevronDown, FaChevronRight, FaBrain } from 'react-icons/fa'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { markdownComponents } from '../../utils/markdownComponents'

export interface ReasoningBoxProps {
  /** Reasoning content to display */
  reasoning?: string
  /** Whether reasoning is currently being streamed */
  isReasoningStreaming?: boolean
  /** Whether text streaming has started */
  isTextStreaming?: boolean
  /** Whether to show the reasoning box when empty (for streaming state) */
  showWhenEmpty?: boolean
}

/**
 * ReasoningBox component that displays AI reasoning with expand/collapse functionality
 * Shows before the main content when reasoning starts, streams content, and collapses when done
 */
export const ReasoningBox: React.FC<ReasoningBoxProps> = ({
  reasoning = '',
  isReasoningStreaming = false,
  isTextStreaming = false,
  showWhenEmpty = false
}) => {
  // Start expanded if reasoning is streaming or has content, otherwise collapsed
  const [isExpanded, setIsExpanded] = useState(isReasoningStreaming || showWhenEmpty)

  // Theme colors
  const bgColor = useColorModeValue('rgba(168, 85, 247, 0.05)', 'rgba(168, 85, 247, 0.1)')
  const borderColor = useColorModeValue('rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.3)')
  const iconColor = useColorModeValue('purple.600', 'purple.400')
  const textColor = useColorModeValue('gray.700', 'gray.300')
  const headerTextColor = useColorModeValue('purple.700', 'purple.300')
  const inlineCodeBg = useColorModeValue('gray.100', 'gray.700')
  const blockCodeBg = useColorModeValue('gray.50', 'gray.800')
  const hoverBg = useColorModeValue('rgba(168, 85, 247, 0.08)', 'rgba(168, 85, 247, 0.15)')

  // Track previous streaming states to detect changes
  const prevIsReasoningStreamingRef = useRef(isReasoningStreaming)
  const prevIsTextStreamingRef = useRef(isTextStreaming)

  // Auto-expand/collapse based on reasoning streaming state changes
  useEffect(() => {
    console.log('[ReasoningBox] useEffect triggered:', {
      isReasoningStreaming,
      prevIsReasoningStreaming: prevIsReasoningStreamingRef.current,
      isTextStreaming,
      prevIsTextStreaming: prevIsTextStreamingRef.current,
      hasReasoning: !!reasoning?.trim(),
      reasoning: reasoning?.substring(0, 50) + '...',
      isExpanded,
      timestamp: new Date().toISOString()
    })

    // If reasoning streaming just started (went from false to true), expand
    if (!prevIsReasoningStreamingRef.current && isReasoningStreaming) {
      console.log('[ReasoningBox] Expanding reasoning box - reasoning started')
      setIsExpanded(true)
    }
    // Don't auto-collapse on reasoning-end due to out-of-order events
    // The collapse will be triggered by text streaming start instead
    else if (prevIsReasoningStreamingRef.current && !isReasoningStreaming) {
      console.log('[ReasoningBox] Reasoning ended, but keeping expanded until text starts')
    }

    // Collapse when text streaming starts (reasoning is complete at this point)
    if (!prevIsTextStreamingRef.current && isTextStreaming) {
      console.log('[ReasoningBox] Auto-collapsing reasoning box - text streaming started')
      setIsExpanded(false)
    }

    // Update previous state refs
    prevIsReasoningStreamingRef.current = isReasoningStreaming
    prevIsTextStreamingRef.current = isTextStreaming
  }, [isReasoningStreaming, isTextStreaming, reasoning, isExpanded])

  // Don't render if no reasoning and not showing for streaming
  if (!reasoning?.trim() && !isReasoningStreaming && !showWhenEmpty) {
    return null
  }

  // Render text content with streaming cursor
  const renderReasoningContent = (text: string, showCursor: boolean = false) => {
    // Clean up zero-width space placeholder
    const displayText = text.replace(/\u200B/g, '')

    return (
      <Box as="span" display="inline" className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            ...markdownComponents,
            // Override for reasoning content with smaller font
            p: ({ children }) => (
              <Text fontSize="sm" lineHeight="1.5" mb={2}>
                {children}
              </Text>
            ),
            // Override code blocks for reasoning
            code: ({ children, className }) => {
              const isInline = !className
              if (isInline) {
                return (
                  <Box
                    as="code"
                    px={1}
                    py={0.5}
                    bg={inlineCodeBg}
                    borderRadius="sm"
                    fontSize="sm"
                    fontFamily="mono"
                  >
                    {children}
                  </Box>
                )
              }
              return (
                <Box
                  as="pre"
                  p={2}
                  bg={blockCodeBg}
                  borderRadius="md"
                  overflow="auto"
                  fontSize="sm"
                >
                  <code className={className}>{children}</code>
                </Box>
              )
            }
          }}
        >
          {displayText}
        </ReactMarkdown>
        {showCursor && (
          <Icon
            as={FaBrain}
            boxSize={3}
            color="purple.400"
            ml={1}
            display="inline"
            verticalAlign="baseline"
            animation="pulse 1.5s ease-in-out infinite"
            sx={{
              '@keyframes pulse': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0.4 }
              }
            }}
          />
        )}
      </Box>
    )
  }

  return (
    <Box
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      overflow="hidden"
    >
      {/* Header with expand/collapse button */}
      <HStack
        px={3}
        py={0}
        spacing={2}
        cursor="pointer"
        minHeight="2rem"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: hoverBg }}
        transition="background-color 0.2s"
      >
        <Icon as={FaBrain} boxSize={3} color={iconColor} />
        <Text fontSize="sx" fontWeight="medium" color={headerTextColor} flex={1}>
          {isReasoningStreaming ? 'Thinking...' : 'Reasoning'}
        </Text>
        <IconButton
          aria-label={isExpanded ? 'Collapse reasoning' : 'Expand reasoning'}
          icon={<Icon as={isExpanded ? FaChevronDown : FaChevronRight} />}
          size={'sx'}
          variant="ghost"
          color={iconColor}
          _hover={{ bg: 'transparent' }}
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        />
      </HStack>

      {/* Collapsible content */}
      <Collapse
        in={isExpanded}
        animateOpacity
        transition={{ enter: { duration: 0.2 }, exit: { duration: 0.15 } }}
      >
        <Box px={3} pt={2} pb={2} color={textColor}>
          {reasoning?.trim() ? (
            renderReasoningContent(reasoning, isReasoningStreaming)
          ) : isReasoningStreaming ? (
            <Text fontSize="sm" color="gray.500" fontStyle="italic">
              Processing thoughts...
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.500" fontStyle="italic">
              No reasoning available
            </Text>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

ReasoningBox.displayName = 'ReasoningBox'

export default ReasoningBox
