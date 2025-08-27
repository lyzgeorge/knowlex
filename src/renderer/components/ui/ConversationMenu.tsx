import React, { useState } from 'react'
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  MenuDivider,
  Text,
  Box,
  Portal
} from '@chakra-ui/react'
import { HiBars3, HiChevronRight } from 'react-icons/hi2'
import { useProjectStore } from '@renderer/stores/project'
import { useConversationStore } from '@renderer/stores/conversation'
import { formatRelativeTime } from '@shared/utils/time'

interface Props {
  conversationId: string
  currentProjectId: string | null
  onRename: () => void
  onDelete: () => void
  updatedAt?: string | undefined
  showTimestamp?: boolean
}

const ConversationMenu: React.FC<Props> = ({
  conversationId,
  currentProjectId,
  onRename,
  onDelete,
  updatedAt,
  showTimestamp = true
}) => {
  const projects = useProjectStore((s) => s.projects)
  const move = useConversationStore((s) => s.moveConversationToProject)
  const [showSubmenu, setShowSubmenu] = useState(false)
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 })

  return (
    <Box
      display="flex"
      justifyContent="flex-end"
      alignItems="center"
      sx={{
        '.timestamp': {
          opacity: 1,
          transition: 'opacity 0.2s'
        },
        '.menu-button': {
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.2s',
          position: 'absolute'
        },
        '&:hover': {
          '.timestamp': { opacity: 0 },
          '.menu-button': { opacity: 1, pointerEvents: 'auto' }
        }
      }}
    >
      {/* Timestamp Display */}
      {showTimestamp && updatedAt && (
        <Text fontSize="xs" color="text.tertiary" className="timestamp" whiteSpace="nowrap" mr={2}>
          {formatRelativeTime(updatedAt)}
        </Text>
      )}
      {/* Menu */}
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="Conversation options"
          icon={<HiBars3 />}
          size="xs"
          variant="ghost"
          className="menu-button"
          onClick={(e) => e.stopPropagation()}
        />
        <MenuList minW="120px" maxW="300px">
          <MenuItem
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setSubmenuPosition({
                top: rect.top,
                left: rect.right
              })
              setShowSubmenu(true)
            }}
            onMouseLeave={() => setShowSubmenu(false)}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text>Move to</Text>
            <HiChevronRight size={12} />
          </MenuItem>
          <MenuDivider />
          <MenuItem
            onClick={(e) => {
              e.stopPropagation()
              onRename()
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            color="red.500"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            Delete
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Submenu Portal */}
      {showSubmenu && (
        <Portal>
          <Box
            position="fixed"
            top={`${submenuPosition.top}px`}
            left={`${submenuPosition.left}px`}
            zIndex={9999}
            bg="white"
            _dark={{ bg: 'gray.800', borderColor: 'gray.600' }}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            boxShadow="lg"
            py={2}
            minW="120px"
            onMouseEnter={() => setShowSubmenu(true)}
            onMouseLeave={() => setShowSubmenu(false)}
          >
            {currentProjectId && (
              <Box
                px={3}
                py={2}
                cursor="pointer"
                _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                onClick={(e) => {
                  e.stopPropagation()
                  move(conversationId, null)
                  setShowSubmenu(false)
                }}
              >
                Remove from project
              </Box>
            )}
            {projects.filter((p) => p.id !== currentProjectId).length > 0 && currentProjectId && (
              <Box h="1px" bg="gray.200" _dark={{ bg: 'gray.600' }} mx={2} my={1} />
            )}
            {projects
              .filter((p) => p.id !== currentProjectId)
              .map((p) => (
                <Box
                  key={p.id}
                  px={3}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                  onClick={(e) => {
                    e.stopPropagation()
                    move(conversationId, p.id)
                    setShowSubmenu(false)
                  }}
                >
                  {p.name}
                </Box>
              ))}
          </Box>
        </Portal>
      )}
    </Box>
  )
}

export default ConversationMenu
