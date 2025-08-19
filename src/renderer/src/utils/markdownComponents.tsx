import React from 'react'
import {
  Box,
  Text,
  Heading,
  Code,
  List,
  ListItem,
  Link,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  useColorModeValue
} from '@chakra-ui/react'
import type { Components } from 'react-markdown'

// Helper components that can use hooks
const CodeBlock: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => {
  const isInline = !className
  const inlineCodeBg = useColorModeValue('gray.100', 'gray.700')
  const blockCodeBg = useColorModeValue('gray.50', 'gray.800')
  const codeBorder = useColorModeValue('gray.200', 'gray.600')

  if (isInline) {
    return (
      <Code
        px={1.5}
        py={0.5}
        bg={inlineCodeBg}
        borderRadius="sm"
        fontSize="0.9em"
        fontFamily="mono"
        border="1px solid"
        borderColor={codeBorder}
        color="text.primary"
      >
        {children}
      </Code>
    )
  }

  return (
    <Box
      as="pre"
      p={4}
      bg={blockCodeBg}
      borderRadius="md"
      overflow="auto"
      fontSize="sm"
      fontFamily="mono"
      border="1px solid"
      borderColor={codeBorder}
      my={3}
      sx={{
        // Syntax highlighting styles
        '& .hljs': {
          background: 'transparent',
          color: 'text.primary'
        },
        '& .hljs-comment': {
          color: 'gray.500'
        },
        '& .hljs-keyword': {
          color: 'blue.500',
          fontWeight: 'semibold'
        },
        '& .hljs-string': {
          color: 'green.500'
        },
        '& .hljs-number': {
          color: 'orange.500'
        },
        '& .hljs-function': {
          color: 'purple.500'
        },
        '& .hljs-variable': {
          color: 'cyan.500'
        }
      }}
    >
      <code className={className}>{children}</code>
    </Box>
  )
}

const BlockQuote: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const quoteBg = useColorModeValue('gray.50', 'gray.800')
  const quoteBorder = useColorModeValue('gray.300', 'gray.600')

  return (
    <Box
      as="blockquote"
      borderLeft="4px solid"
      borderColor={quoteBorder}
      bg={quoteBg}
      p={3}
      my={3}
      fontStyle="italic"
      color="text.secondary"
    >
      {children}
    </Box>
  )
}

const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tableBorder = useColorModeValue('gray.200', 'gray.600')

  return (
    <Box overflowX="auto" my={4}>
      <Table variant="simple" size="sm" border="1px solid" borderColor={tableBorder}>
        {children}
      </Table>
    </Box>
  )
}

const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const headBg = useColorModeValue('gray.50', 'gray.700')

  return <Thead bg={headBg}>{children}</Thead>
}

/**
 * Custom React Markdown components that match Knowlex design system
 * Provides consistent styling across all markdown content
 */
export const markdownComponents: Components = {
  // Headings with proper hierarchy and spacing
  h1: ({ children }) => (
    <Heading
      as="h1"
      size="lg"
      color="text.primary"
      fontWeight="semibold"
      mb={4}
      mt={6}
      lineHeight="1.3"
    >
      {children}
    </Heading>
  ),
  h2: ({ children }) => (
    <Heading
      as="h2"
      size="md"
      color="text.primary"
      fontWeight="semibold"
      mb={3}
      mt={5}
      lineHeight="1.3"
    >
      {children}
    </Heading>
  ),
  h3: ({ children }) => (
    <Heading
      as="h3"
      size="sm"
      color="text.primary"
      fontWeight="semibold"
      mb={2}
      mt={4}
      lineHeight="1.3"
    >
      {children}
    </Heading>
  ),
  h4: ({ children }) => (
    <Heading
      as="h4"
      size="xs"
      color="text.primary"
      fontWeight="semibold"
      mb={2}
      mt={3}
      lineHeight="1.3"
    >
      {children}
    </Heading>
  ),
  h5: ({ children }) => (
    <Heading
      as="h5"
      size="xs"
      color="text.secondary"
      fontWeight="medium"
      mb={2}
      mt={3}
      lineHeight="1.3"
    >
      {children}
    </Heading>
  ),
  h6: ({ children }) => (
    <Heading
      as="h6"
      size="xs"
      color="text.secondary"
      fontWeight="medium"
      mb={1}
      mt={2}
      lineHeight="1.3"
    >
      {children}
    </Heading>
  ),

  // Paragraphs with consistent spacing and line height
  p: ({ children }) => (
    <Text fontSize="sm" lineHeight="1.6" mb={3} color="text.primary">
      {children}
    </Text>
  ),

  // Improved list styling with proper indentation
  ul: ({ children }) => (
    <List
      spacing={1}
      mb={3}
      pl={4} // Proper indentation
      styleType="disc"
      stylePosition="outside"
    >
      {children}
    </List>
  ),
  ol: ({ children }) => (
    <List
      spacing={1}
      mb={3}
      pl={4} // Proper indentation
      styleType="decimal"
      stylePosition="outside"
    >
      {children}
    </List>
  ),
  li: ({ children }) => (
    <ListItem
      fontSize="sm"
      lineHeight="1.6"
      color="text.primary"
      pl={2} // Additional padding for better readability
    >
      {children}
    </ListItem>
  ),

  // Code styling consistent with theme
  code: ({ children, className }: any) => (
    <CodeBlock className={className || undefined}>{children}</CodeBlock>
  ),

  // Blockquotes with visual styling
  blockquote: ({ children }) => <BlockQuote>{children}</BlockQuote>,

  // Links with proper styling
  a: ({ children, href }: any) => (
    <Link
      href={href}
      color="brand.secondary"
      textDecoration="underline"
      _hover={{
        color: 'brand.primary',
        textDecoration: 'none'
      }}
      {...(href?.startsWith('http') ? { isExternal: true } : {})}
    >
      {children}
    </Link>
  ),

  // Horizontal rule
  hr: () => <Divider my={4} />,

  // Tables with proper styling
  table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <Tbody>{children}</Tbody>,
  tr: ({ children }) => <Tr>{children}</Tr>,
  th: ({ children }) => (
    <Th
      fontSize="xs"
      fontWeight="semibold"
      color="text.secondary"
      textTransform="uppercase"
      letterSpacing="wider"
    >
      {children}
    </Th>
  ),
  td: ({ children }) => (
    <Td fontSize="sm" color="text.primary">
      {children}
    </Td>
  ),

  // Strong and emphasis
  strong: ({ children }) => (
    <Text as="strong" fontWeight="semibold" color="text.primary">
      {children}
    </Text>
  ),
  em: ({ children }) => (
    <Text as="em" fontStyle="italic" color="text.secondary">
      {children}
    </Text>
  )
}

export default markdownComponents
