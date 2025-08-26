import React from 'react'
import { Box, VStack, Text, InputGroup, InputLeftElement, Input } from '@chakra-ui/react'
import { LiaPlusSolid, LiaSearchSolid } from 'react-icons/lia'
import { Button } from '@renderer/components/ui/Button'

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
      <Box p={4} pt="2rem">
        <VStack spacing={4} align="stretch">
          {/* Logo */}
          <Text fontSize="xl" fontWeight="bold" color="text.primary">
            Knowlex
          </Text>

          {/* New Chat Button */}
          <Button
            leftIcon={<LiaPlusSolid />}
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
            New Chat
          </Button>

          {/* Global Search */}
          <InputGroup size="sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <InputLeftElement>
              <LiaSearchSolid color="text.secondary" />
            </InputLeftElement>
            <Input
              placeholder="Global Search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              bg="surface.secondary"
              border="1px solid"
              borderColor="border.secondary"
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
