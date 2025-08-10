import { Box, Text, VStack } from '@chakra-ui/react'
import { useProjectStore } from '../../../stores'
import { ProjectItem } from '../../molecules/ProjectItem'

export const ProjectList = () => {
  const projects = useProjectStore((state) => state.projects)

  return (
    <Box>
      <Text fontSize="xs" color="gray.400" mb={1} px={2}>
        Projects
      </Text>
      <VStack spacing={1} align="stretch">
        {projects.map((project) => (
          <ProjectItem key={project.id} project={project} />
        ))}
      </VStack>
    </Box>
  )
}
