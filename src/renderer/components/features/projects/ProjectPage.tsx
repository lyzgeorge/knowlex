import React, { useMemo } from 'react'
import { Box, Heading, VStack, Text } from '@chakra-ui/react'
import { useConversations, useConversationStore } from '@renderer/stores/conversation'
import { useProjectStore } from '@renderer/stores/project'
import ConversationCard from './ConversationCard'
import ConversationMenu from '@renderer/components/ui/ConversationMenu'
import { useState } from 'react'
import ChatInputBox from '@renderer/components/features/chat/ChatInputBox'

interface Props {
  projectId: string
}

const ProjectPage: React.FC<Props> = ({ projectId }) => {
  const conversations = useConversations()
  const setCurrentConversation = useConversationStore((s) => s.setCurrentConversation)
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))

  const projectConversations = useMemo(
    () => conversations.filter((c) => c.projectId === projectId),
    [conversations, projectId]
  )

  const [menuTargetId, setMenuTargetId] = useState<string | null>(null)

  return (
    <Box p={6}>
      <Heading size="md" mb={4}>
        {project?.name || 'Project'}
      </Heading>

      {/* Start a New Conversation */}
      <Box mb={6}>
        <Text fontWeight="semibold" mb={2}>
          Start a New Conversation
        </Text>
        <ChatInputBox variant="project-entrance" projectId={projectId} />
      </Box>

      <Box>
        <Text fontWeight="semibold" mb={3}>
          Project Conversations ({projectConversations.length})
        </Text>
        <VStack align="stretch" spacing={3}>
          {projectConversations.length === 0 ? (
            <Text fontSize="sm" color="text.tertiary">
              Start your first conversation
            </Text>
          ) : (
            projectConversations.map((c) => (
              <Box key={c.id} position="relative">
                <ConversationCard
                  conversation={c}
                  onOpen={(id) => setCurrentConversation(id)}
                  onMenu={(id) => setMenuTargetId(id)}
                />
                {menuTargetId === c.id && (
                  <Box position="absolute" top={2} right={2}>
                    <ConversationMenu
                      conversationId={c.id}
                      currentProjectId={projectId}
                      onRename={() => setMenuTargetId(null)}
                      onDelete={() => setMenuTargetId(null)}
                    />
                  </Box>
                )}
              </Box>
            ))
          )}
        </VStack>
      </Box>
    </Box>
  )
}

export default ProjectPage
