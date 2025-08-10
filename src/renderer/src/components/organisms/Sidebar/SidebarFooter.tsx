import { Avatar, Box, HStack, Text } from '@chakra-ui/react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { mockUser } from '../../../lib/mock-data'
import { NavIconButton } from '../../atoms/NavIconButton'

export const SidebarFooter = () => {
  return (
    <Box as="footer">
      <HStack w="100%" p={2} borderRadius="md" _hover={{ bg: 'whiteAlpha.100' }} cursor="pointer">
        <Avatar size="sm" name={mockUser.name} src={mockUser.avatarUrl} />
        <Text noOfLines={1} flex={1} fontSize="sm" fontWeight="medium">
          {mockUser.name}
        </Text>
        <NavIconButton icon={Cog6ToothIcon} label="Settings" />
      </HStack>
    </Box>
  )
}
