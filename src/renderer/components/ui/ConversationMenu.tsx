import React from 'react'
import { Menu, MenuButton, MenuList, MenuItem, IconButton } from '@chakra-ui/react'
import { HamburgerIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { useProjectStore } from '@renderer/stores/project'
import { useConversationStore } from '@renderer/stores/conversation'

interface Props {
  conversationId: string
  currentProjectId: string | null
  onRename: () => void
  onDelete: () => void
}

const ConversationMenu: React.FC<Props> = ({
  conversationId,
  currentProjectId,
  onRename,
  onDelete
}) => {
  const projects = useProjectStore((s) => s.projects)
  const move = useConversationStore((s) => s.moveConversationToProject)

  return (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="Conversation options"
        icon={<HamburgerIcon />}
        size="xs"
        variant="ghost"
      />
      <MenuList>
        <Menu placement="right-start" autoSelect={false}>
          <MenuButton as={MenuItem} icon={<ChevronRightIcon />}>
            Move
          </MenuButton>
          <MenuList>
            {currentProjectId && (
              <MenuItem onClick={() => move(conversationId, null)}>Remove from project</MenuItem>
            )}
            {currentProjectId && <MenuItem isDisabled>──────────────</MenuItem>}
            {projects
              .filter((p) => p.id !== currentProjectId)
              .map((p) => (
                <MenuItem key={p.id} onClick={() => move(conversationId, p.id)}>
                  {p.name}
                </MenuItem>
              ))}
          </MenuList>
        </Menu>
        <MenuItem onClick={onRename}>Rename</MenuItem>
        <MenuItem color="red.500" onClick={onDelete}>
          Delete
        </MenuItem>
      </MenuList>
    </Menu>
  )
}

export default ConversationMenu
