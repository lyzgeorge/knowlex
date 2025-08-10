import {
  Box,
  Collapse,
  HStack,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon
} from '@chakra-ui/react'
import {
  FolderIcon,
  ChevronRightIcon,
  DocumentIcon,
  BookOpenIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { Project } from '../../lib/types'
import { useProjectStore } from '../../stores'
import { ChatItem } from './ChatItem'
import { NavIconButton } from '../atoms/NavIconButton'
import { useState } from 'react'

interface ProjectItemProps {
  project: Project
}

export const ProjectItem = ({ project }: ProjectItemProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const toggleProjectExpanded = useProjectStore((state) => state.toggleProjectExpanded)

  return (
    <Box>
      <HStack
        w="100%"
        px={2}
        py={1.5}
        borderRadius="md"
        _hover={{ bg: 'whiteAlpha.100' }}
        cursor="pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => toggleProjectExpanded(project.id)}
      >
        <Icon
          as={ChevronRightIcon}
          boxSize={4}
          transition="transform 0.2s"
          transform={project.isExpanded ? 'rotate(90deg)' : 'none'}
        />
        <Icon as={FolderIcon} boxSize={5} color="gray.400" />
        <Text noOfLines={1} flex={1} fontSize="sm" fontWeight="medium">
          {project.name}
        </Text>
        {isHovered && (
          <HStack spacing={0}>
            <NavIconButton
              icon={DocumentIcon}
              label="Manage Files"
              onClick={(e) => e.stopPropagation()}
            />
            <NavIconButton
              icon={BookOpenIcon}
              label="Manage Knowledge"
              onClick={(e) => e.stopPropagation()}
            />
            <Menu>
              <MenuButton
                as={NavIconButton}
                icon={EllipsisVerticalIcon}
                label="More options"
                onClick={(e) => e.stopPropagation()}
              />
              <MenuList>
                <MenuItem>Rename</MenuItem>
                <MenuItem color="red.400">Delete</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        )}
      </HStack>
      <Collapse in={project.isExpanded} animateOpacity>
        <Box pl={6} py={1}>
          {project.chats.map((chat) => (
            <ChatItem key={chat.id} chat={chat} isInProject={true} />
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}
