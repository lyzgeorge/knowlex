import { useEffect, useState } from 'react'
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  HStack,
  Box,
  useColorModeValue
} from '@chakra-ui/react'
import { HiChevronDown, HiCog6Tooth, HiMiniCheck } from 'react-icons/hi2'
import { useModelConfigStore } from '@renderer/stores/model-config'
import { useConversationStore } from '@renderer/stores/conversation'
import { useDefaultModel } from '@renderer/stores/settings'
import { useNavigationActions } from '@renderer/stores/navigation'

export function ModelSelector() {
  const { models, initialized, loading, fetchModels, getDefaultModel } = useModelConfigStore()

  const { setActiveModel, getActiveModelId } = useConversationStore()
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const { defaultModelId } = useDefaultModel()

  const { openSettings } = useNavigationActions()

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  const buttonBg = useColorModeValue('white', 'gray.700')

  useEffect(() => {
    if (!initialized && !loading) {
      fetchModels()
    }
  }, [initialized, loading, fetchModels])

  useEffect(() => {
    const currentActiveModelId = getActiveModelId(defaultModelId || undefined)
    setSelectedModelId(currentActiveModelId)
  }, [getActiveModelId, defaultModelId])

  const handleModelSelect = async (modelId: string) => {
    try {
      if (currentConversationId) {
        // Update the active model for the current conversation
        await setActiveModel(modelId)
      } else {
        // No conversation yet: set app default model via new IPC
        const res = await window.knowlex.modelConfig.setDefault(modelId)
        if (!res?.success) {
          throw new Error(res?.error || 'Failed to set default model')
        }
      }
      setSelectedModelId(modelId)
    } catch (error) {
      console.error('Failed to set model:', error)
    }
  }

  const handleManageModels = () => {
    openSettings()
  }

  const getSelectedModel = () => {
    if (!selectedModelId) return null
    return models.find((m) => m.id === selectedModelId) || null
  }

  const selectedModel = getSelectedModel()
  // Prefer user default when no selection, then system default (oldest)
  const defaultModel =
    (defaultModelId && models.find((m) => m.id === defaultModelId)) || getDefaultModel()
  const displayModel = selectedModel || defaultModel

  if (models.length === 0) {
    return (
      <Button
        size="sm"
        variant="outline"
        bg={buttonBg}
        leftIcon={<HiCog6Tooth />}
        onClick={handleManageModels}
      >
        Add Model
      </Button>
    )
  }

  return (
    <Menu>
      <MenuButton
        as={Button}
        size="sm"
        variant="ghost"
        bg={buttonBg}
        rightIcon={<HiChevronDown />}
        justifyContent="flex-start"
      >
        <Text fontSize="sm" isTruncated>
          {displayModel?.name || 'Select Model'}
        </Text>
      </MenuButton>

      <MenuList minW="200px">
        <Text fontSize="xs" color="gray.500" px={3} py={1} fontWeight="medium">
          Select Model
        </Text>

        {models.map((model) => (
          <MenuItem
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            {...(selectedModelId === model.id ? { bg: 'blue.50' } : {})}
            _hover={{ bg: 'blue.100' }}
          >
            <HStack justify="space-between" w="full">
              <Text fontSize="sm">{model.name}</Text>
              {selectedModelId === model.id && (
                <Box as={HiMiniCheck} boxSize={4} color="primary.500" />
              )}
            </HStack>
          </MenuItem>
        ))}

        <MenuDivider />

        <MenuItem onClick={handleManageModels} _hover={{ bg: 'gray.100' }}>
          <HStack>
            <HiCog6Tooth />
            <Text fontSize="sm">Manage Models</Text>
          </HStack>
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
