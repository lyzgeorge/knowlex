import React from 'react'
import { VStack, Text } from '@chakra-ui/react'
import ChatInputBox from './ChatInputBox'
import { useI18n } from '@renderer/hooks/useI18n'

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

  return (
    <VStack
      spacing={8}
      textAlign="center"
      w="full"
      h="full"
      justify="center"
      align="center"
      px={8}
      className={className}
    >
      {/* Welcome Message */}
      <Text fontSize="3xl" fontWeight="medium" color="text.primary">
        {t('chat.greeting')}
      </Text>

      {/* Main Entrance Input - Uses main-entrance variant */}
      <ChatInputBox variant="main-entrance" showFileAttachment={true} />
    </VStack>
  )
}

MainPage.displayName = 'MainPage'

export default MainPage
