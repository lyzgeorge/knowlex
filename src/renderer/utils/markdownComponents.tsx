import React, { useState } from 'react'
import {
  Box,
  Text,
  Heading,
  Code,
  Link,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  useColorModeValue,
  IconButton,
  Tooltip
} from '@chakra-ui/react'
import { HiClipboard } from 'react-icons/hi2'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'

// --- Simplified Components ---

const CodeBlock: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => {
  const isInline = !className
  const inlineBg = useColorModeValue('gray.100', 'gray.700')
  const blockBg = useColorModeValue('gray.50', 'gray.800')
  const border = useColorModeValue('gray.200', 'gray.600')
  const copyBg = useColorModeValue('whiteAlpha.800', 'blackAlpha.400')
  const [copied, setCopied] = useState(false)

  if (isInline) {
    return (
      <Code
        bg={inlineBg}
        borderRadius="sm"
        px={1}
        py={0.5}
        fontSize="0.85em"
        border="1px solid"
        borderColor={border}
      >
        {children}
      </Code>
    )
  }

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(String(children))
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch (e) {
      // Don't block UI on copy failures; log for diagnostics

      console.warn('Failed to copy code block', e)
    }
  }

  return (
    <Box position="relative" bg={blockBg} border="1px solid" borderColor={border} borderRadius="md">
      <Tooltip label={copied ? '已复制' : '复制'} hasArrow openDelay={150}>
        <IconButton
          aria-label="copy"
          size="xs"
          variant="ghost"
          position="absolute"
          top={1}
          right={1}
          icon={<HiClipboard />}
          onClick={handleCopy}
          bg={copyBg}
          _hover={{ bg: copyBg }}
        />
      </Tooltip>
      <Box as="pre" m={0} p={3} overflow="auto" fontSize="sm" fontFamily="mono">
        <code className={className}>{children}</code>
      </Box>
    </Box>
  )
}

const BlockQuote: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Box as="blockquote">{children}</Box>
}

const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box overflowX="auto">
    <Table variant="simple" size="sm">
      {children}
    </Table>
  </Box>
)

const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Thead>{children}</Thead>
}

/**
 * Custom React Markdown components that match Knowlex design system
 * Provides consistent styling across all markdown content
 */
export const markdownComponents: Components = {
  // Headings - styles handled by CSS
  h1: ({ children }) => <Heading as="h1">{children}</Heading>,
  h2: ({ children }) => <Heading as="h2">{children}</Heading>,
  h3: ({ children }) => <Heading as="h3">{children}</Heading>,
  h4: ({ children }) => <Heading as="h4">{children}</Heading>,
  h5: ({ children }) => <Heading as="h5">{children}</Heading>,
  h6: ({ children }) => <Heading as="h6">{children}</Heading>,

  // Paragraph - styles handled by CSS
  p: ({ children }) => <Text as="p">{children}</Text>,

  // Interactive components
  code: ({ children, className }: any) => <CodeBlock className={className}>{children}</CodeBlock>,
  blockquote: ({ children }) => <BlockQuote>{children}</BlockQuote>,
  a: ({ children, href }: any) => (
    <Link href={href} {...(href?.startsWith('http') ? { isExternal: true } : {})}>
      {children}
    </Link>
  ),
  hr: () => <Divider />,
  table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <Tbody>{children}</Tbody>,
  tr: ({ children }) => <Tr>{children}</Tr>,
  th: ({ children }) => <Th>{children}</Th>,
  td: ({ children }) => <Td>{children}</Td>,
  strong: ({ children }) => (
    <Text as="strong" display="inline">
      {children}
    </Text>
  ),
  em: ({ children }) => (
    <Text as="em" display="inline">
      {children}
    </Text>
  )
}

export interface MarkdownContentProps {
  /** Text content to render */
  text: string
}

/**
 * Pure markdown content renderer
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({ text }) => (
  <Box className="markdown-content" width="100%" maxWidth="100%">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={markdownComponents}
    >
      {text}
    </ReactMarkdown>
  </Box>
)

MarkdownContent.displayName = 'MarkdownContent'

export default markdownComponents
