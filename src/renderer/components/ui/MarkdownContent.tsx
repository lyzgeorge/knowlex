import React from 'react'
import { Box, Icon } from '@chakra-ui/react'
import { HiCpuChip } from 'react-icons/hi2'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { markdownComponents } from '@renderer/utils/markdownComponents'

export interface MarkdownContentProps {
  /** Text content to render */
  text: string
  /** Whether content is currently being streamed */
  isStreaming?: boolean
  /** Whether to show streaming cursor */
  showCursor?: boolean
}

/**
 * Pure markdown content renderer
 * Handles text rendering with streaming cursor support
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  text,
  isStreaming = false,
  showCursor = false
}) => {
  // Clean up zero-width space placeholder
  const displayText = text.replace(/\u200B/g, '')

  return (
    <Box as="div" display="inline-block" className="markdown-content" width="100%" maxWidth="100%">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {displayText}
      </ReactMarkdown>
      {showCursor && isStreaming && (
        <Icon
          as={HiCpuChip}
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

MarkdownContent.displayName = 'MarkdownContent'

export default MarkdownContent
