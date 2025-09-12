import { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Select,
  FormControl,
  FormLabel,
  useDisclosure,
  Alert,
  AlertIcon,
  Spinner,
  Badge,
  Divider
} from '@chakra-ui/react'
import { HiPlus, HiLightBulb, HiEye, HiWrench, HiMagnifyingGlass } from 'react-icons/hi2'
import { useModelConfigStore } from '@renderer/stores/model-config'
import { useUserDefaultModelPreference } from '@renderer/stores/settings'
import { ModelCard } from './ModelCard'
import { EditModelModal } from './EditModelModal'
import type { ModelConfigPublic } from '@shared/types/models'

export function ModelSettingsPanel() {
  const { models, loading, initialized, error: modelError, fetchModels } = useModelConfigStore()
  const { defaultModelId: currentDefaultFromStore, setDefaultModelId: setDefaultInStore } =
    useUserDefaultModelPreference()

  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editingModel, setEditingModel] = useState<ModelConfigPublic | null>(null)

  useEffect(() => {
    if (!initialized && !loading) {
      fetchModels()
    }
  }, [initialized, loading, fetchModels])

  const handleEdit = (model: ModelConfigPublic) => {
    setEditingModel(model)
    onOpen()
  }

  const handleAdd = () => {
    setEditingModel(null)
    onOpen()
  }

  const handleCloseModal = () => {
    setEditingModel(null)
    onClose()
  }

  const handleDefaultModelChange = async (modelId: string) => {
    try {
      const res = await window.knowlex.modelConfig.setDefault(modelId)
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to set default model')
      }
      setDefaultInStore(modelId)
    } catch (e) {
      console.error('Failed to set default model:', e)
    }
  }

  const activeDefaultId = currentDefaultFromStore || (models.length > 0 ? models[0]?.id : '')
  const defaultModel = models.find((m) => m.id === activeDefaultId)

  if (loading && !initialized) {
    return (
      <Box p={6} maxW="4xl" mx="auto">
        <Box display="flex" alignItems="center" justifyContent="center" py={8}>
          <Spinner size="lg" mr={3} />
          <Text>Loading model configurations...</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box p={6} maxW="4xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Box>
            <Heading size="lg" mb={2}>
              AI Model Configurations
            </Heading>
            <Text color="gray.600" fontSize="sm">
              Configure OpenAI-compatible models for conversations and agents.
            </Text>
          </Box>
          <Button leftIcon={<HiPlus />} colorScheme="blue" onClick={handleAdd}>
            Add Model
          </Button>
        </HStack>

        {modelError && (
          <Alert status="error">
            <AlertIcon />
            {modelError}
          </Alert>
        )}

        <Box>
          <FormControl>
            <FormLabel fontSize="sm" fontWeight="medium">
              Default Model
            </FormLabel>
            <HStack spacing={3} align="center">
              <Select
                value={activeDefaultId}
                onChange={(e) => handleDefaultModelChange(e.target.value)}
                maxW="300px"
                isDisabled={models.length === 0}
              >
                {models.length === 0 ? (
                  <option value="">No models configured</option>
                ) : (
                  models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))
                )}
              </Select>
              {defaultModel && (
                <VStack spacing={1} align="start">
                  <Text fontSize="xs" color="gray.600">
                    {defaultModel.modelId}
                  </Text>
                  <HStack spacing={1}>
                    {defaultModel.supportsReasoning && (
                      <Badge size="sm" colorScheme="purple" title="Supports Reasoning">
                        <HiLightBulb />
                      </Badge>
                    )}
                    {defaultModel.supportsVision && (
                      <Badge size="sm" colorScheme="green" title="Supports Vision">
                        <HiEye />
                      </Badge>
                    )}
                    {defaultModel.supportsToolUse && (
                      <Badge size="sm" colorScheme="blue" title="Supports Tools">
                        <HiWrench />
                      </Badge>
                    )}
                    {defaultModel.supportsWebSearch && (
                      <Badge size="sm" colorScheme="orange" title="Supports Web Search">
                        <HiMagnifyingGlass />
                      </Badge>
                    )}
                  </HStack>
                </VStack>
              )}
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={1}>
              This model will be used for new conversations by default
            </Text>
          </FormControl>
        </Box>

        <Divider />

        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={3}>
            Configured Models ({models.length})
          </Text>

          {models.length === 0 ? (
            <Box p={8} textAlign="center" borderRadius="lg" bg="gray.50">
              <Text color="gray.500" mb={4}>
                No model configurations found
              </Text>
              <Button leftIcon={<HiPlus />} colorScheme="blue" onClick={handleAdd}>
                Add Your First Model
              </Button>
            </Box>
          ) : (
            <VStack spacing={4} align="stretch">
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onEdit={() => handleEdit(model)}
                  isDefault={model.id === activeDefaultId}
                  variant="page"
                />
              ))}
            </VStack>
          )}
        </Box>

        <EditModelModal isOpen={isOpen} onClose={handleCloseModal} model={editingModel} />
      </VStack>
    </Box>
  )
}
