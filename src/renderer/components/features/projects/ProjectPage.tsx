import React, { useEffect, useMemo, useCallback } from 'react'
import { Box, Heading, VStack, Text, HStack, Input, IconButton, Tooltip } from '@chakra-ui/react'
import { HiCheck, HiXMark } from 'react-icons/hi2'
import { useConversations, useConversationStore } from '@renderer/stores/conversation/index'
import { useNavigationActions } from '@renderer/stores/navigation'
import { useProjectStore } from '@renderer/stores/project'
import ChatInputBox from '@renderer/components/features/chat/ChatInputBox'
import { useNotifications } from '@renderer/components/ui'
import ConversationMenu from '@renderer/components/ui/ConversationMenu'
import useEditableTitle from '@renderer/hooks/useEditableTitle'
import type { Conversation } from '@shared/types/conversation'
import type { Message } from '@shared/types/message'

interface Props {
  projectId: string
}

function getLatestReplyContent(messages: Message[]): string {
  const assistantMessages = messages.filter((m) => m.role === 'assistant')
  if (assistantMessages.length === 0) return 'No messages yet'

  const latestMessage = assistantMessages[assistantMessages.length - 1]
  if (!latestMessage) return 'No messages yet'

  const textParts = latestMessage.content.filter((part) => part.type === 'text' && part.text)

  if (textParts.length === 0) return 'No text content'

  const combinedText = textParts.map((part) => part.text).join(' ')
  return combinedText.trim() || 'No text content'
}

function truncateText(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

interface ConversationCardProps {
  conversation: Conversation
  onOpen: (id: string) => void
  onDelete?: (id: string) => void
}

const ConversationCard: React.FC<ConversationCardProps> = ({ conversation, onOpen, onDelete }) => {
  const messages = useConversationStore((s) => s.messages[conversation.id] || [])
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle)
  const {
    editing: isEditing,
    value: editTitle,
    setValue: setEditTitle,
    onStart,
    onCancel,
    onConfirm
  } = useEditableTitle(conversation.id, conversation.title, updateConversationTitle)

  const latestReplyContent = getLatestReplyContent(messages)

  const handleStartEdit = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation()
      onStart()
      setEditTitle(conversation.title)
    },
    [onStart, setEditTitle, conversation.title]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void onConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [onConfirm, onCancel]
  )

  return (
    <HStack
      borderRadius="md"
      p={3}
      bg="surface.primary"
      _hover={{ bg: 'surface.hover' }}
      cursor="pointer"
      onClick={() => !isEditing && onOpen(conversation.id)}
      justify="space-between"
      align="flex-start"
    >
      {/* Title and content section */}
      <VStack align="stretch" spacing={1} px={1} flex={1} minW={0}>
        {/* Title row */}
        {isEditing ? (
          <HStack flex={1} spacing={1}>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => void onConfirm()}
              fontSize="sm"
              fontWeight="medium"
              variant="unstyled"
              size="sm"
              h="24px"
              lineHeight="24px"
              px={0}
              py={0}
              bg="transparent"
              _focus={{ boxShadow: 'none', bg: 'transparent' }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </HStack>
        ) : (
          <Tooltip
            label={conversation.title}
            placement="top"
            hasArrow
            openDelay={600}
            closeDelay={200}
            bg="surface.primary"
            color="text.primary"
            borderRadius="md"
            shadow="dropdown"
            fontSize="sm"
            fontWeight="medium"
            px={3}
            py={2}
            maxW="280px"
            textAlign="left"
            whiteSpace="normal"
          >
            <Text fontWeight="medium" fontSize="sm" noOfLines={1} flex={1} minW={0}>
              {conversation.title}
            </Text>
          </Tooltip>
        )}

        {/* Latest reply content - second line */}
        <Text fontSize="sm" color="text.secondary" noOfLines={1} flex={1} minW={0}>
          {truncateText(latestReplyContent)}
        </Text>
      </VStack>

      {/* Right side: timestamp by default, menu on hover */}
      <HStack minW="80px" justify="flex-end" align="center">
        {isEditing ? (
          <HStack spacing={1}>
            <IconButton
              aria-label="Confirm rename"
              icon={<HiCheck />}
              size="xs"
              variant="ghost"
              color="green.500"
              _hover={{ bg: 'green.50', color: 'green.600' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                void onConfirm()
              }}
            />
            <IconButton
              aria-label="Cancel rename"
              icon={<HiXMark />}
              size="xs"
              variant="ghost"
              color="gray.500"
              _hover={{ bg: 'gray.50', color: 'gray.600' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
            />
          </HStack>
        ) : (
          <ConversationMenu
            conversationId={conversation.id}
            currentProjectId={conversation.projectId || null}
            onRename={() => handleStartEdit()}
            onDelete={() => onDelete?.(conversation.id)}
            updatedAt={conversation.updatedAt}
          />
        )}
      </HStack>
    </HStack>
  )
}

const ProjectPage: React.FC<Props> = ({ projectId }) => {
  const conversations = useConversations()
  const setCurrentConversation = useConversationStore((s) => s.setCurrentConversation)
  const deleteConversation = useConversationStore((s) => s.deleteConversation)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const { openConversation } = useNavigationActions()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))
  const notifications = useNotifications()

  const projectConversations = useMemo(
    () => conversations.filter((c) => c.projectId === projectId),
    [conversations, projectId]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id)
        notifications.conversationDeleted()
      } catch (error) {
        notifications.conversationDeleteFailed(
          error instanceof Error ? error.message : 'An error occurred'
        )
      }
    },
    [deleteConversation, notifications]
  )

  // When entering a project page, clear current selection so a new send will create
  // a fresh conversation and message:added event can set the new current conversation.
  useEffect(() => {
    setCurrentConversation(null)
  }, [projectId, setCurrentConversation])

  // If a conversation becomes selected (e.g. after sending a message from project input
  // or clicking a card), navigate to the conversation view.
  useEffect(() => {
    if (currentConversationId) {
      const conversation = conversations.find((c) => c.id === currentConversationId)
      const projectId = conversation?.projectId || null
      openConversation(currentConversationId, projectId)
    }
  }, [currentConversationId, conversations, openConversation])

  return (
    <Box p={6} display="flex" justifyContent="center">
      <Box maxWidth="780px" width="100%">
        {/* Project Title + Chat Input */}
        <VStack align="stretch" spacing={3} mb={6}>
          <Heading size="md">{project?.name || 'Project'}</Heading>
          <ChatInputBox variant="project-entrance" projectId={projectId} />
        </VStack>

        {/* Conversations List */}
        <VStack align="stretch" spacing={3}>
          {projectConversations.length === 0 ? (
            <Text fontSize="sm" color="text.tertiary">
              Start your first conversation
            </Text>
          ) : (
            projectConversations.map((c) => (
              <ConversationCard
                key={c.id}
                conversation={c}
                onOpen={(id) => {
                  const conv = conversations.find((x) => x.id === id)
                  openConversation(id, conv?.projectId || null)
                }}
                onDelete={handleDelete}
              />
            ))
          )}
        </VStack>
      </Box>
    </Box>
  )
}

export default ProjectPage
