import { useEffect, useState } from 'react'
import {
  Button,
  HStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  VStack,
  Input,
  Textarea,
  Spinner,
  Box
} from '@chakra-ui/react'
import { HiDocument, HiSparkles } from 'react-icons/hi2'
import { Modal } from '@renderer/components/ui'
// Dynamic import with graceful fallback to Textarea to avoid blank panel when require is unavailable.
let MDEditorLazy: React.ComponentType<{
  height: number
  value: string
  onChange: (value: string | undefined) => void
}> | null = null
async function ensureMDEditor() {
  if (MDEditorLazy) return MDEditorLazy
  try {
    const mod = await import('@uiw/react-md-editor')
    MDEditorLazy = mod.default
  } catch {
    MDEditorLazy = null
  }
  return MDEditorLazy
}
import type { ProjectFileRow, SmartNotesV1_1 } from '@shared/types/project-file'
import { useProjectFileStore } from '@renderer/stores/project-file-store'

interface ProjectFileModalProps {
  id: string
  isOpen: boolean
  onClose: () => void
  defaultTab?: number
}

export function ProjectFileModal({ id, isOpen, onClose, defaultTab = 0 }: ProjectFileModalProps) {
  const { get, updateContent, updateSmartNotes, regenerate, processingIds } = useProjectFileStore()
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [row, setRow] = useState<ProjectFileRow | null>(null)
  const [content, setContent] = useState<string>('')
  const [notes, setNotes] = useState<SmartNotesV1_1>({
    summary: '',
    abstract: '',
    keywords: [],
    chunks: []
  })
  const [chunksJson, setChunksJson] = useState<string>('')
  const [chunksError, setChunksError] = useState<string>('')
  const [mdReady, setMdReady] = useState(false)

  // Reset to defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab)
    }
  }, [isOpen, defaultTab])

  useEffect(() => {
    if (isOpen && id) {
      get(id).then(({ row, content }: { row: ProjectFileRow; content: string | null }) => {
        setRow(row)
        setContent(content || '')
        const smartNotes = (row.smart_notes as SmartNotesV1_1) || {
          summary: '',
          abstract: '',
          keywords: [],
          chunks: []
        }
        setNotes(smartNotes)
        setChunksJson(JSON.stringify(smartNotes.chunks || [], null, 2))
        setChunksError('')
      })
    }
  }, [id, get, isOpen])

  useEffect(() => {
    // Try to load the markdown editor lazily
    ensureMDEditor().then(() => setMdReady(true))
  }, [])

  // Handle chunks JSON editing
  const handleChunksChange = (value: string) => {
    setChunksJson(value)
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        setNotes((prev) => ({ ...prev, chunks: parsed }))
        setChunksError('')
      } else {
        setChunksError('Chunks must be an array')
      }
    } catch {
      setChunksError('Invalid JSON format')
    }
  }

  // Reflect real-time processing using transient store state
  const processing = row ? processingIds.has(row.id) : false

  if (!isOpen) return null

  if (!row) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Loading..."
        size="5xl"
        closeOnOverlayClick={true}
      >
        <Box display="flex" justifyContent="center" alignItems="center" h="400px">
          <VStack spacing={4}>
            <Spinner size="lg" />
            <Text>Loading project file...</Text>
          </VStack>
        </Box>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={row.filename}
      size="5xl"
      closeOnOverlayClick={true}
    >
      <Tabs index={activeTab} onChange={setActiveTab} variant="line">
        <TabList>
          <Tab>
            <HStack spacing={2}>
              <HiDocument size={16} />
              <Text>Content</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <HiSparkles size={16} />
              <Text>Smart Notes</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} py={4}>
            <VStack align="stretch" spacing={4}>
              {row?.content_path ? (
                <>
                  {mdReady && MDEditorLazy ? (
                    <MDEditorLazy
                      height={400}
                      value={content}
                      onChange={(v: string | undefined) => setContent(v || '')}
                    />
                  ) : (
                    <Textarea
                      height={400}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  )}
                  <HStack>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (row.content_path) await updateContent(row.id, content)
                      }}
                      isDisabled={!row.content_path || processing}
                    >
                      Save Content
                    </Button>
                  </HStack>
                </>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  Binary/preview-only file; content editing disabled.
                </Text>
              )}

              <VStack
                align="stretch"
                spacing={2}
                pt={4}
                borderTop="1px solid"
                borderColor="gray.200"
              >
                <Text fontWeight="semibold" fontSize="sm">
                  File Information
                </Text>
                <VStack align="stretch" spacing={1} fontSize="sm" color="gray.600">
                  <Text>Size: {row?.file_size} bytes</Text>
                  <Text>MIME Type: {row?.mime_type}</Text>
                  <Text>Status: {row?.smart_notes_status}</Text>
                  {row?.smart_notes_generated_at && (
                    <Text>Generated: {row.smart_notes_generated_at}</Text>
                  )}
                </VStack>
              </VStack>
            </VStack>
          </TabPanel>
          <TabPanel px={0} py={4}>
            <VStack align="stretch" spacing={4}>
              <Input
                placeholder="Summary"
                value={notes.summary}
                onChange={(e) => setNotes({ ...notes, summary: e.target.value })}
                isDisabled={processing}
              />
              <Textarea
                placeholder="Abstract"
                value={notes.abstract}
                onChange={(e) => setNotes({ ...notes, abstract: e.target.value })}
                isDisabled={processing}
                rows={4}
              />

              <VStack align="stretch" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">
                  Keywords
                </Text>
                <HStack wrap="wrap" spacing={1}>
                  {notes.keywords.map((k: string, idx: number) => (
                    <Tag key={idx} size="sm" colorScheme="blue" mb={1}>
                      <TagLabel>{k}</TagLabel>
                      <TagCloseButton
                        onClick={() =>
                          setNotes({
                            ...notes,
                            keywords: notes.keywords.filter((_, i) => i !== idx)
                          })
                        }
                      />
                    </Tag>
                  ))}
                </HStack>
                <Input
                  size="sm"
                  placeholder="Add keyword and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim().toLowerCase()
                      if (val)
                        setNotes({
                          ...notes,
                          keywords: Array.from(new Set([...notes.keywords, val]))
                        })
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                  isDisabled={processing}
                />
              </VStack>

              <VStack align="stretch" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">
                  Chunks (JSON)
                </Text>
                {chunksError && (
                  <Text fontSize="xs" color="red.500">
                    {chunksError}
                  </Text>
                )}
                <Textarea
                  value={chunksJson}
                  onChange={(e) => handleChunksChange(e.target.value)}
                  placeholder="Chunks data in JSON format..."
                  rows={8}
                  fontFamily="monospace"
                  fontSize="sm"
                  isDisabled={processing}
                />
              </VStack>

              <HStack>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={async () => {
                    if (row) await updateSmartNotes(row.id, notes)
                  }}
                  isDisabled={processing}
                >
                  Save Notes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (row) await regenerate(row.id)
                  }}
                  isDisabled={processing}
                >
                  Regenerate
                </Button>
              </HStack>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Modal>
  )
}

export default ProjectFileModal
