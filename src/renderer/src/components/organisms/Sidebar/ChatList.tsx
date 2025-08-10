import { Box, Text, VStack } from '@chakra-ui/react'
import { useChatStore } from '../../../stores'
import { ChatItem } from '../../molecules/ChatItem'

export const ChatList = () => {
  const chats = useChatStore((state) => state.uncategorizedChats)

  return (
    <Box>
      <Text fontSize="xs" color="gray.400" mb={1} px={2}>
        Chats (Uncategorized)
      </Text>
      <VStack spacing={1} align="stretch">
        {chats.map((chat) => (
          <ChatItem key={chat.id} chat={chat} />
        ))}
      </VStack>
    </Box>
  )
}
