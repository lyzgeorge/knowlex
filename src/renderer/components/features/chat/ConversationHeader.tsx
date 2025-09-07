import { Box, HStack, Heading } from '@chakra-ui/react'
import { useCurrentConversation } from '@renderer/stores/conversation/index'
import { ModelSelector } from '../models/ModelSelector'

export function ConversationHeader() {
  const { currentConversation } = useCurrentConversation()

  if (!currentConversation) return null

  return (
    <Box h="4rem" px={4} bg="background.secondary" position="sticky" top={0} zIndex={10}>
      <HStack h="full" justify="space-between" align="center">
        <ModelSelector />
        <Heading size="sm" isTruncated flex={1} textAlign="center">
          {currentConversation.title}
        </Heading>
        <Box w="140px" />
      </HStack>
    </Box>
  )
}
