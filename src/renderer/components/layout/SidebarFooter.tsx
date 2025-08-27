import React from 'react'
import { Box, HStack, VStack, Text, IconButton, Avatar } from '@chakra-ui/react'
import { HiCog6Tooth } from 'react-icons/hi2'

export const SidebarFooter: React.FC = () => {
  return (
    <Box p={4}>
      <HStack spacing={3}>
        <Avatar size="sm" name="User Name" />
        <VStack align="start" spacing={0} flex={1} minW={0}>
          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
            用户名
          </Text>
        </VStack>
        <IconButton
          aria-label="Settings"
          icon={<HiCog6Tooth />}
          size="sm"
          variant="ghost"
          onClick={() => {
            console.log('Open settings')
          }}
        />
      </HStack>
    </Box>
  )
}

export default SidebarFooter
