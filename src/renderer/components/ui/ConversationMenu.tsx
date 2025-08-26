import React from 'react'
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  MenuDivider,
  Text,
  Box
} from '@chakra-ui/react'
import { LiaBarsSolid } from 'react-icons/lia'
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

  return (
    <Box
      position="relative"
      minW="80px"
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
          transition: 'opacity 0.2s'
        },
        '&:hover': {
          '.timestamp': { opacity: 0 },
          '.menu-button': { opacity: 1, pointerEvents: 'auto' }
        }
      }}
    >
      {/* Timestamp Display */}
      {showTimestamp && updatedAt && (
        <Text
          fontSize="xs"
          color="text.tertiary"
          className="timestamp"
          position="absolute"
          right={0}
        >
          {formatRelativeTime(updatedAt)}
        </Text>
      )}
      {/* Menu */}
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="Conversation options"
          icon={<LiaBarsSolid />}
          size="xs"
          variant="ghost"
          className="menu-button"
          onClick={(e) => e.stopPropagation()}
        />
        <MenuList>
          <MenuItem isDisabled>Move to</MenuItem>
          {currentProjectId && (
            <MenuItem
              onClick={(e) => {
                e.stopPropagation()
                move(conversationId, null)
              }}
            >
              Remove from project
            </MenuItem>
          )}
          {projects.filter((p) => p.id !== currentProjectId).length > 0 && <MenuDivider />}
          {projects
            .filter((p) => p.id !== currentProjectId)
            .map((p) => (
              <MenuItem
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation()
                  move(conversationId, p.id)
                }}
              >
                {p.name}
              </MenuItem>
            ))}
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
    </Box>
  )
}

export default ConversationMenu
