import { useEffect, useRef, useState } from 'react'
import { Box, Button, SimpleGrid, Text, HStack, Badge } from '@chakra-ui/react'
import { useProjectFileStore } from '@renderer/stores/project-file-store'
import ProjectFileModal from './ProjectFileModal'

export function ProjectFilesGrid({ projectId }: { projectId: string }) {
  const { items, fetch, upload, remove, processingIds } = useProjectFileStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    fetch(projectId)
  }, [projectId, fetch])

  // Filter out invalid items
  const validItems = items.filter((item) => item && item.id && item.filename)

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Text fontSize="sm">Files ({validItems.length}/100)</Text>
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={async (e) => {
              const files = e.target.files
              if (files && files.length) {
                await upload(projectId, Array.from(files))
                if (fileInputRef.current) fileInputRef.current.value = ''
              }
            }}
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            Upload
          </Button>
        </Box>
      </Box>
      <SimpleGrid columns={[2, 3, 4]} spacing={3}>
        {validItems.slice(0, 20).map((f) => (
          <Box
            key={`${f.id}-${f.smart_notes_status}-${f.smart_notes_generated_at ?? ''}-${f.updated_at ?? ''}`}
            borderWidth="1px"
            borderRadius="md"
            p={3}
            onClick={() => setActiveId(f.id)}
            _hover={{ cursor: 'pointer', bg: 'surface.hover' }}
            bg="surface.primary"
            minH="80px"
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
          >
            <Text noOfLines={2} fontSize="sm" fontWeight="medium" mb={2}>
              {f.filename || 'Unknown file'}
            </Text>
            <HStack justify="space-between" align="center">
              <Badge
                colorScheme={
                  processingIds.has(f.id)
                    ? 'blue'
                    : f.smart_notes_status === 'completed'
                      ? 'green'
                      : f.smart_notes_status === 'failed'
                        ? 'red'
                        : 'yellow'
                }
                size="sm"
              >
                {processingIds.has(f.id) ? 'processing' : f.smart_notes_status}
              </Badge>
              <Button
                size="xs"
                variant="outline"
                colorScheme="red"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(f.id)
                }}
              >
                Delete
              </Button>
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
      {validItems.length > 20 && (
        <Box textAlign="center" mt={3}>
          <Text fontSize="sm" color="gray.600">
            Showing first 20 files. Pagination coming next.
          </Text>
        </Box>
      )}
      <ProjectFileModal
        id={activeId || ''}
        isOpen={activeId !== null}
        onClose={() => setActiveId(null)}
      />
    </Box>
  )
}

export default ProjectFilesGrid
