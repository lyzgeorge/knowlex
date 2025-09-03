import React, { useEffect } from 'react'
import { VStack, Text, Box } from '@chakra-ui/react'
import ChatInputBox from './ChatInputBox'
import { ModelSelector } from '@renderer/components/features/models/ModelSelector'
import { useI18n } from '@renderer/hooks/useI18n'
import { useConversationStore } from '@renderer/stores/conversation'
import { useNavigationActions } from '@renderer/stores/navigation'

export interface MainPageProps {
  /** Additional CSS classes */
  className?: string | undefined
}

/**
 * Main entrance page component
 *
 * Shows when no conversation is selected or when starting a new conversation.
 * Features:
 * - Welcome message
 * - Main entrance input box for starting conversations
 */
export const MainPage: React.FC<MainPageProps> = ({ className }) => {
  const { t } = useI18n()
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const { openConversation } = useNavigationActions()

  // 监听新创建的对话并自动导航
  useEffect(() => {
    if (currentConversationId) {
      openConversation(currentConversationId)
    }
  }, [currentConversationId, openConversation])

  return (
    <Box position="relative" w="full" h="full" className={className}>
      {/* Model Selector - Top Left */}
      <Box position="absolute" top={4} left={4} zIndex={10}>
        <ModelSelector />
      </Box>

      {/* Main Content - Centered */}
      <VStack
        spacing={8}
        textAlign="center"
        w="full"
        h="full"
        justify="center"
        align="center"
        px={8}
      >
        {/* Welcome Message */}
        <Text fontSize="3xl" fontWeight="medium" color="text.primary">
          {t('chat.greeting')}
        </Text>

        {/* Main Entrance Input - Uses main-entrance variant */}
        <ChatInputBox variant="main-entrance" showFileAttachment={true} />
      </VStack>
    </Box>
  )
}

MainPage.displayName = 'MainPage'

export default MainPage
