import { useState } from 'react'
import {
  Box,
  Text,
  HStack,
  VStack,
  Button,
  Badge,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
  Tooltip,
  useDisclosure
} from '@chakra-ui/react'
import {
  HiPencil,
  HiTrash,
  HiPlay,
  HiLightBulb,
  HiEye,
  HiWrench,
  HiMagnifyingGlass
} from 'react-icons/hi2'
import type { ModelConfigPublic, ModelConnectionTestResult } from '@shared/types/models'
import { useModelConfigStore } from '@renderer/stores/model-config'
import { Modal } from '@renderer/components/ui'

interface ModelCardProps {
  model: ModelConfigPublic
  onEdit: () => void
  isDefault?: boolean
  variant?: 'page' | 'section'
}

export function ModelCard({ model, onEdit, isDefault = false }: ModelCardProps) {
  const { deleteModel, testModel, testing } = useModelConfigStore()
  const [testResult, setTestResult] = useState<ModelConnectionTestResult | null>(null)
  const [showTestResult, setShowTestResult] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const cardBg = useColorModeValue('white', 'gray.800')

  const handleTest = async () => {
    try {
      setTestResult(null)
      setShowTestResult(false)
      const result = await testModel(model.id)
      setTestResult(result)
      setShowTestResult(true)
    } catch (error) {
      setTestResult({
        endpointReachable: false,
        authValid: null,
        modelAvailable: null,
        errorMessage: error instanceof Error ? error.message : 'Test failed'
      })
      setShowTestResult(true)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteModel(model.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete model:', error)
    }
  }

  const getCapabilityIcons = () => {
    const capabilities: { Icon: React.ComponentType<any>; tooltip: string }[] = []
    if (model.supportsReasoning) {
      capabilities.push({ Icon: HiLightBulb, tooltip: 'Enhanced reasoning support' })
    }
    if (model.supportsVision) {
      capabilities.push({ Icon: HiEye, tooltip: 'Image understanding' })
    }
    if (model.supportsToolUse) {
      capabilities.push({ Icon: HiWrench, tooltip: 'Function calling' })
    }
    if (model.supportsWebSearch) {
      capabilities.push({ Icon: HiMagnifyingGlass, tooltip: 'External search integration' })
    }
    return capabilities
  }

  const getTestStatus = () => {
    if (!testResult) return 'info'
    if (testResult.endpointReachable && testResult.modelAvailable) return 'success'
    if (testResult.authValid === false) return 'warning'
    return 'error'
  }

  return (
    <Box p={4} bg={cardBg} borderRadius="lg" shadow="sm" _hover={{ shadow: 'md' }}>
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between" align="flex-start">
          <VStack align="stretch" spacing={1} flex={1}>
            <HStack align="center" spacing={2}>
              <Text fontSize="lg" fontWeight="semibold">
                {model.name}
              </Text>
              {isDefault && (
                <Badge colorScheme="green" size="sm">
                  Default
                </Badge>
              )}
              <HStack spacing={1}>
                {getCapabilityIcons().map(({ Icon, tooltip }, index) => (
                  <Tooltip key={index} label={tooltip}>
                    <Box>
                      <Icon size={16} color="var(--chakra-colors-gray-500)" />
                    </Box>
                  </Tooltip>
                ))}
              </HStack>
            </HStack>

            <Text fontSize="sm" color="gray.600">
              {model.apiEndpoint}
            </Text>

            <Text fontSize="sm" color="gray.500">
              Model: {model.modelId}
            </Text>

            <Text fontSize="xs" color="gray.500">
              Endpoint: {model.apiEndpoint}
            </Text>
          </VStack>

          <HStack spacing={2}>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={testing[model.id] ? <Spinner size="xs" /> : <HiPlay />}
              onClick={handleTest}
              isDisabled={testing[model.id] || false}
            >
              Test
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<HiPencil />} onClick={onEdit}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<HiTrash />}
              colorScheme="red"
              onClick={onOpen}
            >
              Delete
            </Button>
          </HStack>
        </HStack>

        {showTestResult && testResult && (
          <Box>
            <Alert status={getTestStatus()} size="sm">
              <AlertIcon />
              <VStack align="stretch" spacing={1} flex={1}>
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium">
                    Connection Test
                  </Text>
                  {testResult.roundTripMs && (
                    <Text fontSize="xs" color="gray.500">
                      {testResult.roundTripMs}ms
                    </Text>
                  )}
                </HStack>
                {testResult.errorMessage ? (
                  <Text fontSize="xs">{testResult.errorMessage}</Text>
                ) : (
                  <Text fontSize="xs">Connection successful</Text>
                )}
              </VStack>
            </Alert>
          </Box>
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} title="Delete Model Configuration">
        <VStack spacing={4} align="stretch">
          <Text>
            Are you sure you want to delete &quot;{model.name}&quot;? This action cannot be undone.
            Conversations using this model will fall back to the default model.
          </Text>
          <HStack justify="flex-end" spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDelete}>
              Delete
            </Button>
          </HStack>
        </VStack>
      </Modal>
    </Box>
  )
}
