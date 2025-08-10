import { Box, VStack } from '@chakra-ui/react'
import { SidebarHeader } from './SidebarHeader'
import { ProjectList } from './ProjectList'
import { ChatList } from './ChatList'
import { SidebarFooter } from './SidebarFooter'

export const Sidebar = () => {
  return (
    <VStack
      as="aside"
      w="260px"
      h="100vh"
      bg="gray.800"
      color="white"
      p={2}
      spacing={4}
      align="stretch"
      position="fixed"
      left="0"
      top="0"
    >
      <SidebarHeader />
      <ProjectList />
      <ChatList />
      <Box flex={1} /> {/* Spacer */}
      <SidebarFooter />
    </VStack>
  )
}
