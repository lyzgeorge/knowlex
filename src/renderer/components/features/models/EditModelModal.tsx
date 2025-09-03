import { useState, useEffect } from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Button,
  Checkbox,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Collapse,
  useDisclosure,
  InputGroup,
  InputRightElement,
  IconButton,
  Spinner
} from '@chakra-ui/react'
import {
  HiEye,
  HiEyeSlash,
  HiChevronDown,
  HiChevronUp,
  HiLightBulb,
  HiWrench,
  HiMagnifyingGlass
} from 'react-icons/hi2'
import { Modal } from '@renderer/components/ui'
import { useModelConfigStore } from '@renderer/stores/model-config'
import type { ModelConfig, ModelConfigPublic, CreateModelConfigInput } from '@shared/types/models'

interface EditModelModalProps {
  isOpen: boolean
  onClose: () => void
  model?: ModelConfigPublic | null
}

interface FormData {
  name: string
  apiEndpoint: string
  apiKey: string
  modelId: string
  temperature: number | ''
  topP: number | ''
  frequencyPenalty: number | ''
  presencePenalty: number | ''
  supportsReasoning: boolean
  supportsVision: boolean
  supportsToolUse: boolean
  supportsWebSearch: boolean
}

const QUICK_TEMPLATES = {
  openai: {
    name: 'OpenAI',
    apiEndpoint: 'https://api.openai.com/v1',
    modelId: 'gpt-4o'
  },
  azure: {
    name: 'Azure',
    apiEndpoint: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}/',
    modelId: 'gpt-4'
  },
  ollama: {
    name: 'Ollama',
    apiEndpoint: 'http://localhost:11434/v1',
    modelId: 'llama3.1'
  },
  'lm-studio': {
    name: 'LM Studio',
    apiEndpoint: 'http://localhost:1234/v1',
    modelId: 'local-model'
  }
}

export function EditModelModal({ isOpen, onClose, model }: EditModelModalProps) {
  const { createModel, updateModel } = useModelConfigStore()
  const { isOpen: showAdvanced, onToggle: toggleAdvanced } = useDisclosure()
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [fullModel, setFullModel] = useState<ModelConfig | null>(null)
  const [fetchingModel, setFetchingModel] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    apiEndpoint: '',
    apiKey: '',
    modelId: '',
    temperature: '',
    topP: '',
    frequencyPenalty: '',
    presencePenalty: '',
    supportsReasoning: false,
    supportsVision: false,
    supportsToolUse: false,
    supportsWebSearch: false
  })

  // Fetch full model config with API key when editing
  useEffect(() => {
    if (model && isOpen) {
      setFetchingModel(true)
      window.knowlex.modelConfig
        .get(model.id, { includeApiKey: true })
        .then((res) => {
          if (res?.success && res.data) {
            const fullModelData = res.data as ModelConfig
            setFullModel(fullModelData)
            setFormData({
              name: fullModelData.name,
              apiEndpoint: fullModelData.apiEndpoint,
              apiKey: fullModelData.apiKey || '',
              modelId: fullModelData.modelId,
              temperature: fullModelData.temperature ?? '',
              topP: fullModelData.topP ?? '',
              frequencyPenalty: fullModelData.frequencyPenalty ?? '',
              presencePenalty: fullModelData.presencePenalty ?? '',
              supportsReasoning: fullModelData.supportsReasoning,
              supportsVision: fullModelData.supportsVision,
              supportsToolUse: fullModelData.supportsToolUse,
              supportsWebSearch: fullModelData.supportsWebSearch
            })
          }
        })
        .catch((e) => {
          console.error('Failed to fetch full model config:', e)
          // Fallback to public data
          setFormData({
            name: model.name,
            apiEndpoint: model.apiEndpoint,
            apiKey: '',
            modelId: model.modelId,
            temperature: model.temperature ?? '',
            topP: model.topP ?? '',
            frequencyPenalty: model.frequencyPenalty ?? '',
            presencePenalty: model.presencePenalty ?? '',
            supportsReasoning: model.supportsReasoning,
            supportsVision: model.supportsVision,
            supportsToolUse: model.supportsToolUse,
            supportsWebSearch: model.supportsWebSearch
          })
        })
        .finally(() => {
          setFetchingModel(false)
        })
    } else if (!model) {
      // Reset for new model
      setFullModel(null)
      setFormData({
        name: '',
        apiEndpoint: '',
        apiKey: '',
        modelId: '',
        temperature: '',
        topP: '',
        frequencyPenalty: '',
        presencePenalty: '',
        supportsReasoning: false,
        supportsVision: false,
        supportsToolUse: false,
        supportsWebSearch: false
      })
    }
    setErrors({})
    setShowApiKey(false)
  }, [model, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Model name is required'
    }

    if (!formData.apiEndpoint.trim()) {
      newErrors.apiEndpoint = 'API endpoint is required'
    } else if (!formData.apiEndpoint.trim().match(/^https?:\/\//)) {
      newErrors.apiEndpoint = 'Endpoint must start with http:// or https://'
    }

    if (!formData.modelId.trim()) {
      newErrors.modelId = 'Model ID is required'
    }

    if (formData.temperature !== '' && (formData.temperature < 0 || formData.temperature > 2)) {
      newErrors.temperature = 'Temperature must be between 0 and 2'
    }

    if (formData.topP !== '' && (formData.topP <= 0 || formData.topP > 1)) {
      newErrors.topP = 'Top P must be between 0 and 1'
    }

    if (
      formData.frequencyPenalty !== '' &&
      (formData.frequencyPenalty < -2 || formData.frequencyPenalty > 2)
    ) {
      newErrors.frequencyPenalty = 'Frequency penalty must be between -2 and 2'
    }

    if (
      formData.presencePenalty !== '' &&
      (formData.presencePenalty < -2 || formData.presencePenalty > 2)
    ) {
      newErrors.presencePenalty = 'Presence penalty must be between -2 and 2'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const input: CreateModelConfigInput = {
        name: formData.name.trim(),
        apiEndpoint: formData.apiEndpoint.trim(),
        apiKey: formData.apiKey.trim() || undefined,
        modelId: formData.modelId.trim(),
        ...(formData.temperature !== '' && { temperature: formData.temperature }),
        ...(formData.topP !== '' && { topP: formData.topP }),
        ...(formData.frequencyPenalty !== '' && { frequencyPenalty: formData.frequencyPenalty }),
        ...(formData.presencePenalty !== '' && { presencePenalty: formData.presencePenalty }),
        supportsReasoning: formData.supportsReasoning,
        supportsVision: formData.supportsVision,
        supportsToolUse: formData.supportsToolUse,
        supportsWebSearch: formData.supportsWebSearch
      }

      if (fullModel || model) {
        const modelId = fullModel?.id || model!.id
        await updateModel(modelId, input)
      } else {
        await createModel(input)
      }

      onClose()
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save model'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: keyof typeof QUICK_TEMPLATES) => {
    const templateData = QUICK_TEMPLATES[template]
    setFormData((prev) => ({
      ...prev,
      apiEndpoint: templateData.apiEndpoint,
      modelId: templateData.modelId
    }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={model ? 'Edit Model' : 'Add New Model'}
      size="lg"
    >
      {fetchingModel ? (
        <Box display="flex" alignItems="center" justifyContent="center" py={8}>
          <Spinner size="lg" mr={3} />
          <Text>Loading model configuration...</Text>
        </Box>
      ) : (
        <VStack spacing={4} align="stretch">
          {/* Basic Configuration */}
          <Box>
            <Text fontSize="md" fontWeight="semibold" mb={3}>
              Basic Configuration
            </Text>

            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!errors.name}>
                <FormLabel>Model Name *</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., GPT-4 Production"
                />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>

              {!model && (
                <Box>
                  <Text fontSize="sm" mb={2}>
                    Quick Templates:
                  </Text>
                  <HStack spacing={2} wrap="wrap">
                    {Object.entries(QUICK_TEMPLATES).map(([key, template]) => (
                      <Button
                        key={key}
                        size="sm"
                        variant="outline"
                        onClick={() => handleTemplateSelect(key as keyof typeof QUICK_TEMPLATES)}
                      >
                        {template.name}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, apiEndpoint: '', modelId: '' }))
                      }
                    >
                      Custom
                    </Button>
                  </HStack>
                </Box>
              )}

              <FormControl isInvalid={!!errors.apiEndpoint}>
                <FormLabel>API Endpoint *</FormLabel>
                <Input
                  value={formData.apiEndpoint}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, apiEndpoint: e.target.value }))
                  }
                  placeholder="https://api.openai.com/v1"
                />
                <FormErrorMessage>{errors.apiEndpoint}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.apiKey}>
                <FormLabel>API Key</FormLabel>
                <InputGroup>
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="sk-..."
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      icon={showApiKey ? <HiEyeSlash /> : <HiEye />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowApiKey(!showApiKey)}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{errors.apiKey}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.modelId}>
                <FormLabel>Model ID *</FormLabel>
                <Input
                  value={formData.modelId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, modelId: e.target.value }))}
                  placeholder="gpt-4o"
                />
                <FormErrorMessage>{errors.modelId}</FormErrorMessage>
              </FormControl>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Model Capabilities
                </Text>
                <VStack align="stretch" spacing={2}>
                  <Checkbox
                    isChecked={formData.supportsReasoning}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, supportsReasoning: e.target.checked }))
                    }
                  >
                    <HStack spacing={2}>
                      <HiLightBulb />
                      <Text>Reasoning - Chain-of-thought reasoning</Text>
                    </HStack>
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.supportsVision}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, supportsVision: e.target.checked }))
                    }
                  >
                    <HStack spacing={2}>
                      <HiEye />
                      <Text>Vision - Image analysis & processing</Text>
                    </HStack>
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.supportsToolUse}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, supportsToolUse: e.target.checked }))
                    }
                  >
                    <HStack spacing={2}>
                      <HiWrench />
                      <Text>Tool Use - Function calling support</Text>
                    </HStack>
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.supportsWebSearch}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, supportsWebSearch: e.target.checked }))
                    }
                  >
                    <HStack spacing={2}>
                      <HiMagnifyingGlass />
                      <Text>Web Search - Internet search capability</Text>
                    </HStack>
                  </Checkbox>
                </VStack>
              </Box>
            </VStack>
          </Box>

          {/* Advanced Settings */}
          <Box>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={showAdvanced ? <HiChevronUp /> : <HiChevronDown />}
              onClick={toggleAdvanced}
            >
              Advanced Settings
            </Button>

            <Collapse in={showAdvanced}>
              <Box mt={3} p={4} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" mb={3}>
                  Response Configuration
                </Text>

                <VStack spacing={4} align="stretch">
                  <FormControl isInvalid={!!errors.temperature}>
                    <FormLabel fontSize="sm">Temperature</FormLabel>
                    <NumberInput
                      value={formData.temperature}
                      onChange={(_, val) =>
                        setFormData((prev) => ({ ...prev, temperature: isNaN(val) ? '' : val }))
                      }
                      min={0}
                      max={2}
                      step={0.1}
                      precision={1}
                    >
                      <NumberInputField placeholder="0.7" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.temperature}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.topP}>
                    <FormLabel fontSize="sm">Top P</FormLabel>
                    <NumberInput
                      value={formData.topP}
                      onChange={(_, val) =>
                        setFormData((prev) => ({ ...prev, topP: isNaN(val) ? '' : val }))
                      }
                      min={0.01}
                      max={1}
                      step={0.1}
                      precision={2}
                    >
                      <NumberInputField placeholder="1.0" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.topP}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.frequencyPenalty}>
                    <FormLabel fontSize="sm">Frequency Penalty</FormLabel>
                    <NumberInput
                      value={formData.frequencyPenalty}
                      onChange={(_, val) =>
                        setFormData((prev) => ({
                          ...prev,
                          frequencyPenalty: isNaN(val) ? '' : val
                        }))
                      }
                      min={-2}
                      max={2}
                      step={0.1}
                      precision={1}
                    >
                      <NumberInputField placeholder="0.0" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.frequencyPenalty}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.presencePenalty}>
                    <FormLabel fontSize="sm">Presence Penalty</FormLabel>
                    <NumberInput
                      value={formData.presencePenalty}
                      onChange={(_, val) =>
                        setFormData((prev) => ({ ...prev, presencePenalty: isNaN(val) ? '' : val }))
                      }
                      min={-2}
                      max={2}
                      step={0.1}
                      precision={1}
                    >
                      <NumberInputField placeholder="0.0" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.presencePenalty}</FormErrorMessage>
                  </FormControl>
                </VStack>
              </Box>
            </Collapse>
          </Box>

          {errors.submit && (
            <Text color="red.500" fontSize="sm">
              {errors.submit}
            </Text>
          )}

          <HStack justify="flex-end" spacing={3}>
            <Button variant="ghost" onClick={onClose} isDisabled={loading}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={loading}
              loadingText={model ? 'Updating...' : 'Creating...'}
            >
              {model ? 'Update' : 'Create'}
            </Button>
          </HStack>
        </VStack>
      )}
    </Modal>
  )
}
