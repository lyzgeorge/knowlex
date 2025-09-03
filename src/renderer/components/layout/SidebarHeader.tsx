import React from 'react'
import { Box, VStack, Text, InputGroup, InputLeftElement, Input } from '@chakra-ui/react'
import { HiPlus, HiMagnifyingGlass } from 'react-icons/hi2'
import { Button } from '@renderer/components/ui/Button'
import { useI18n } from '@renderer/hooks/useI18n'

interface SidebarHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onNewChat: () => void
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onNewChat
}) => {
  const { t } = useI18n()

  return (
    <>
      {/* Draggable Top Area */}
      <Box
        h="2rem"
        w="100%"
        position="absolute"
        top={0}
        left={0}
        zIndex={1000}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        bg="transparent"
        pointerEvents="all"
      />

      {/* Top Section: Logo and New Chat */}
      <Box p={4} pt="3rem">
        <VStack spacing={4} align="stretch">
          {/* Logo */}
          <Text fontSize="xl" fontWeight="bold" color="text.primary">
            {t('app.name')}
          </Text>

          {/* New Chat Button */}
          <Button
            leftIcon={<HiPlus />}
            variant="solid"
            bg="primary.500"
            color="white"
            _hover={{ bg: 'primary.600' }}
            _active={{ bg: 'primary.700' }}
            size="sm"
            isFullWidth
            justifyContent="flex-start"
            onClick={onNewChat}
            aria-label="Create new chat conversation (Ctrl/Cmd+N)"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {t('sidebar.newChat')}
          </Button>

          {/* Global Search */}
          <InputGroup size="sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <InputLeftElement>
              <HiMagnifyingGlass color="text.secondary" />
            </InputLeftElement>
            <Input
              placeholder={t('sidebar.globalSearch')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              bg="surface.secondary"
              _focus={{
                borderColor: 'primary.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)'
              }}
              aria-label="Search across all conversations (Ctrl/Cmd+K)"
            />
          </InputGroup>
        </VStack>
      </Box>
    </>
  )
}

export default SidebarHeader
