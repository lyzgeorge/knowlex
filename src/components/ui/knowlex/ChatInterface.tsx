/**
 * Chat Interface Component for Knowlex Desktop Application
 *
 * This component provides the main chat interface with _message display,
 * input area, file upload, and RAG toggle functionality.
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Textarea,
  Button,
  IconButton,
  Badge,
  Switch,
  FormControl,
  FormLabel,
  Tooltip,
  Avatar,
  Card,
  CardBody,
  Flex,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  BookmarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { useTranslations } from '@/providers'
import type { ChatMessageProps } from '../types'

// Mock _message data
const mockMessages = [
  {
    _id: '1',
    role: 'user' as const,
    content: 'Hello! Can you help me understand React hooks?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    _status: 'sent' as const,
  },
  {
    _id: '2',
    role: 'assistant' as const,
    content:
      "Hello! I'd be happy to help you understand React hooks. React hooks are functions that let you use state and other React features in functional components.\n\nHere are the main hooks you should know:\n\n1. **useState** - for managing local state\n2. **useEffect** - for side effects and lifecycle events\n3. **useContext** - for consuming context\n4. **useReducer** - for complex state management\n\nWould you like me to explain any of these in more detail?",
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
    _status: 'sent' as const,
    references: [
      {
        _id: 'ref1',
        title: 'React Hooks Documentation',
        snippet:
          'Hooks are a new addition in React 16.8. They let you use state and other React features without writing a class.',
        score: 0.92,
      },
      {
        _id: 'ref2',
        title: 'useState Hook Guide',
        snippet: 'useState is a Hook that lets you add React state to function components.',
        score: 0.87,
      },
    ],
  },
]

// Message component
const ChatMessage: React.FC<
  ChatMessageProps & { onCopy?: () => void; onSave?: () => void; onRegenerate?: () => void }
> = ({
  _id,
  content,
  role,
  timestamp,
  _status,
  isStreaming,
  references,
  onCopy,
  onSave,
  onRegenerate,
}) => {
  const { t, formatRelativeTime } = useTranslations()
  const toast = useToast()

  const isUser = role === 'user'
  const isAssistant = role === 'assistant'

  // Theme-aware _colors
  const userBg = useColorModeValue('primary.500', 'primary.600')
  const assistantBg = useColorModeValue('white', 'dark.100')
  const borderColor = useColorModeValue('gray.200', 'dark.300')
  const messageColor = useColorModeValue('gray.800', 'dark.700')
  const boxShadow = useColorModeValue('sm', 'dark.sm')
  const refBadgeHoverBg = useColorModeValue('primary.50', 'primary.900')
  const timestampColor = useColorModeValue('gray.500', 'dark.500')

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast({
      title: t('ui.chat.copy'),
      _status: 'success',
      duration: 2000,
      isClosable: true,
    })
    onCopy?.()
  }

  const handleSave = () => {
    toast({
      title: t('ui.chat.saveToKnowledge'),
      _status: 'success',
      duration: 2000,
      isClosable: true,
    })
    onSave?.()
  }

  return (
    <HStack
      align="start"
      spacing={3}
      w="100%"
      justify={isUser ? 'flex-end' : 'flex-start'}
      px={4}
      py={3}
    >
      {!isUser && (
        <Avatar size="sm" name="AI Assistant" bg="primary.500" color="white" fontWeight="bold" />
      )}

      <VStack align={isUser ? 'end' : 'start'} spacing={2} maxW="70%" w={isUser ? 'auto' : '100%'}>
        {/* Message Content */}
        <Card
          bg={isUser ? userBg : assistantBg}
          color={isUser ? 'white' : messageColor}
          border={isUser ? 'none' : '1px solid'}
          borderColor={borderColor}
          borderRadius="lg"
          boxShadow={boxShadow}
          maxW="100%"
        >
          <CardBody p={3}>
            <Text fontSize="sm" lineHeight="1.5" whiteSpace="pre-wrap" wordBreak="break-word">
              {content}
              {isStreaming && (
                <Text as="span" opacity={0.5} animation="pulse 1.5s infinite">
                  ▊
                </Text>
              )}
            </Text>
          </CardBody>
        </Card>

        {/* References */}
        {references && references.length > 0 && (
          <VStack align="start" spacing={2} w="100%">
            <Text fontSize="xs" color={timestampColor} fontWeight="medium">
              {t('ui.chat.references')}:
            </Text>
            <HStack spacing={2} flexWrap="wrap">
              {references.map((ref, _index) => (
                <Tooltip key={ref._id} label={ref.snippet} placement="top" hasArrow>
                  <Badge
                    colorScheme="primary"
                    variant="outline"
                    cursor="pointer"
                    fontSize="xs"
                    _hover={{ bg: refBadgeHoverBg }}
                  >
                    {_index + 1}. {ref.title}
                  </Badge>
                </Tooltip>
              ))}
            </HStack>
          </VStack>
        )}

        {/* Message Actions */}
        <HStack spacing={1} opacity={0.7} _hover={{ opacity: 1 }}>
          <Text fontSize="xs" color={timestampColor}>
            {formatRelativeTime(timestamp)}
          </Text>
          {isAssistant && (
            <>
              <IconButton
                icon={<ClipboardDocumentIcon className="w-3 h-3" />}
                size="xs"
                variant="ghost"
                aria-label={t('ui.chat.copy')}
                onClick={handleCopy}
              />
              <IconButton
                icon={<BookmarkIcon className="w-3 h-3" />}
                size="xs"
                variant="ghost"
                aria-label={t('ui.chat.saveToKnowledge')}
                onClick={handleSave}
              />
              <IconButton
                icon={<ArrowPathIcon className="w-3 h-3" />}
                size="xs"
                variant="ghost"
                aria-label={t('ui.chat.regenerate')}
                onClick={onRegenerate}
              />
            </>
          )}
        </HStack>
      </VStack>

      {isUser && <Avatar size="sm" name="User" bg="gray.400" color="white" />}
    </HStack>
  )
}

// Main chat interface component
const ChatInterface: React.FC = () => {
  const { t } = useTranslations()
  const [_message, setMessage] = useState('')
  const [isRAGEnabled, setIsRAGEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState(mockMessages)

  // Theme-aware _colors
  const bgColor = useColorModeValue('gray.50', 'dark.50')
  const inputBg = useColorModeValue('white', 'dark.100')
  const borderColor = useColorModeValue('gray.200', 'dark.300')
  const typingColor = useColorModeValue('gray.500', 'dark.500')
  const helperTextColor = useColorModeValue('gray.500', 'dark.500')

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle _message send
  const handleSend = async () => {
    if (!_message.trim() || isLoading) return

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setMessage('')
      setMessages(prev => [
        ...prev,
        {
          _id: Date.now().toString(),
          role: 'user',
          content: _message,
          timestamp: new Date(),
          _status: 'sent',
        },
      ])
    }, 2000)
  }

  // Handle file upload
  const handleFileUpload = () => {
    // Implement file upload logic
    // console.log('File upload clicked')
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Flex direction="column" height="100%" bg={bgColor}>
      {/* Chat Messages Area */}
      <Box flex={1} overflow="auto" className="scrollbar-thin" bg={bgColor}>
        <VStack spacing={2} align="stretch" py={4}>
          {messages.map(_message => (
            <ChatMessage key={_message._id} {..._message} />
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <HStack align="start" spacing={3} px={4} py={3}>
              <Avatar size="sm" name="AI Assistant" bg="primary.500" color="white" />
              <Card bg={inputBg} border="1px solid" borderColor={borderColor}>
                <CardBody p={3}>
                  <Text fontSize="sm" color={typingColor}>
                    {t('ui.chat.typing')}
                    <Text as="span" animation="pulse 1.5s infinite">
                      ...
                    </Text>
                  </Text>
                </CardBody>
              </Card>
            </HStack>
          )}

          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input Area */}
      <Box p={4} bg={inputBg} borderTop="1px solid" borderColor={borderColor}>
        <VStack spacing={3} align="stretch">
          {/* RAG Toggle */}
          <HStack justify="space-between">
            <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel htmlFor="rag-toggle" mb={0} fontSize="sm">
                <HStack spacing={2}>
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  <Text>RAG</Text>
                </HStack>
              </FormLabel>
              <Switch
                _id="rag-toggle"
                isChecked={isRAGEnabled}
                onChange={e => setIsRAGEnabled(e.target.checked)}
                colorScheme="primary"
                size="sm"
              />
            </FormControl>
            <Badge colorScheme={isRAGEnabled ? 'green' : 'gray'} variant="subtle" fontSize="xs">
              {isRAGEnabled ? t('ui.chat.ragEnabled') : t('ui.chat.ragDisabled')}
            </Badge>
          </HStack>

          {/* Message Input */}
          <HStack spacing={2} align="end">
            <IconButton
              icon={<PaperClipIcon className="w-4 h-4" />}
              variant="outline"
              size="sm"
              aria-label="Upload file"
              onClick={handleFileUpload}
              isDisabled={isLoading}
            />

            <Box flex={1}>
              <Textarea
                ref={textareaRef}
                value={_message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('ui.chat.placeholder')}
                size="sm"
                resize="none"
                minH="40px"
                maxH="120px"
                bg={inputBg}
                border="2px solid"
                borderColor={borderColor}
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'none',
                }}
                isDisabled={isLoading}
              />
            </Box>

            <Button
              leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
              colorScheme="primary"
              size="sm"
              onClick={handleSend}
              isLoading={isLoading}
              isDisabled={!_message.trim()}
              loadingText={t('common._status.sending')}
            >
              {t('ui.chat.send')}
            </Button>
          </HStack>

          {/* Helper Text */}
          <Text fontSize="xs" color={helperTextColor}>
            Press ⌘+Enter to send • {t('ui.chat.maxFileSize', { size: '1MB' })}
          </Text>
        </VStack>
      </Box>
    </Flex>
  )
}

export default ChatInterface
