import { Box, Button, HStack, Icon, Text } from '@chakra-ui/react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { NavIconButton } from '../../atoms/NavIconButton'

export const SidebarHeader = () => {
  return (
    <Box as="header">
      <HStack justify="space-between" mb={4}>
        <Text fontSize="xl" fontWeight="bold">
          Knowlex
        </Text>
        {/* Placeholder for Logo */}
      </HStack>
      <HStack>
        <Button
          leftIcon={<Icon as={PlusIcon} boxSize={4} />}
          bg="green.600"
          color="white"
          _hover={{ bg: 'green.700' }}
          size="sm"
          flex={1}
        >
          New Chat
        </Button>
        <NavIconButton
          icon={MagnifyingGlassIcon}
          label="Search"
          bg="gray.700"
          _hover={{ bg: 'gray.600' }}
        />
      </HStack>
    </Box>
  )
}
