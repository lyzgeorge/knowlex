import { useState } from 'react'
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
import type { ModelConfigPublic } from '@shared/types/models'
import useModelForm from '@renderer/hooks/useModelForm'

interface EditModelModalProps {
  isOpen: boolean
  onClose: () => void
  model?: ModelConfigPublic | null
}

// All form logic is managed by useModelForm hook

export function EditModelModal({ isOpen, onClose, model }: EditModelModalProps) {
  const { isOpen: showAdvanced, onToggle: toggleAdvanced } = useDisclosure()
  const [showApiKey, setShowApiKey] = useState(false)
  const {
    formData,
    setField,
    errors,
    isSubmitting,
    isLoadingModel,
    submit,
    applyTemplate,
    templates
  } = useModelForm(model, { isOpen, onSubmitSuccess: onClose })

  // Hide API key when reopening modal
  // Reset visibility when modal opens
  // Note: form values are handled by hook

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={model ? 'Edit Model' : 'Add New Model'}
      size="lg"
    >
      {isLoadingModel ? (
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
                  onChange={(e) => setField('name', e.target.value)}
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
                    {templates.map(({ key, name }) => (
                      <Button
                        key={key}
                        size="sm"
                        variant="outline"
                        onClick={() => applyTemplate(key as any)}
                      >
                        {name}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setField('apiEndpoint', '')
                        setField('modelId', '')
                      }}
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
                  onChange={(e) => setField('apiEndpoint', e.target.value)}
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
                    onChange={(e) => setField('apiKey', e.target.value)}
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
                  onChange={(e) => setField('modelId', e.target.value)}
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
                    onChange={(e) => setField('supportsReasoning', e.target.checked)}
                  >
                    <HStack spacing={2}>
                      <HiLightBulb />
                      <Text>Reasoning - Chain-of-thought reasoning</Text>
                    </HStack>
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.supportsVision}
                    onChange={(e) => setField('supportsVision', e.target.checked)}
                  >
                    <HStack spacing={2}>
                      <HiEye />
                      <Text>Vision - Image analysis & processing</Text>
                    </HStack>
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.supportsToolUse}
                    onChange={(e) => setField('supportsToolUse', e.target.checked)}
                  >
                    <HStack spacing={2}>
                      <HiWrench />
                      <Text>Tool Use - Function calling support</Text>
                    </HStack>
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.supportsWebSearch}
                    onChange={(e) => setField('supportsWebSearch', e.target.checked)}
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
                      onChange={(_, val) => setField('temperature', isNaN(val) ? '' : val)}
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
                      onChange={(_, val) => setField('topP', isNaN(val) ? '' : val)}
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
                      onChange={(_, val) => setField('frequencyPenalty', isNaN(val) ? '' : val)}
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
                      onChange={(_, val) => setField('presencePenalty', isNaN(val) ? '' : val)}
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

                  <FormControl isInvalid={!!errors.maxInputTokens}>
                    <FormLabel fontSize="sm">Max Input Tokens</FormLabel>
                    <NumberInput
                      value={formData.maxInputTokens}
                      onChange={(_, val) => setField('maxInputTokens', isNaN(val) ? '' : val)}
                      min={1024}
                      max={2000000}
                      step={1024}
                    >
                      <NumberInputField placeholder="131072 (128K)" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.maxInputTokens}</FormErrorMessage>
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
            <Button variant="ghost" onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={submit}
              isLoading={isSubmitting}
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
