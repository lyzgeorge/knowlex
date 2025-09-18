import {
  VStack,
  Box,
  Text,
  Divider,
  FormControl,
  FormLabel,
  useColorModeValue,
  Select,
  NumberInput,
  NumberInputField,
  HStack,
  Button
} from '@chakra-ui/react'
import { useI18n } from '@renderer/hooks/useI18n'
import { LanguageSelector } from '@renderer/components/ui/LanguageSelector'
import { ThemeSelector } from '@renderer/components/ui/ThemeSelector'
import { useEffect, useState } from 'react'
import { useModelConfigStore } from '@renderer/stores/model-config'

export function GeneralSettingsSection() {
  const { t } = useI18n()
  const sectionBg = useColorModeValue('surface.primary', 'surface.primary')
  const sectionBorder = useColorModeValue('border.secondary', 'border.secondary')
  const { models, fetchModels } = useModelConfigStore()
  const [fileProcessingModelId, setFileProcessingModelId] = useState<string>('')
  const [fileMaxInputTokens, setFileMaxInputTokens] = useState<number>(131072)

  useEffect(() => {
    fetchModels()
    // Load current settings
    window.knowlex.settings.get(undefined).then((res: any) => {
      if (res?.success && res.data) {
        setFileProcessingModelId(res.data.fileProcessingModelId || '')
        setFileMaxInputTokens(res.data.fileMaxInputTokens || 131072)
      }
    })
  }, [fetchModels])

  return (
    <VStack spacing={6} align="stretch">
      {/* Appearance Section */}
      <Box>
        <Text fontSize="lg" fontWeight="semibold" color="text.primary" mb={4}>
          {t('settings.general')}
        </Text>

        <VStack spacing={4} align="stretch">
          {/* Language Setting */}
          <Box
            p={4}
            bg={sectionBg}
            borderRadius="md"
            border="1px solid"
            borderColor={sectionBorder}
          >
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="text.secondary" mb={3}>
                {t('settings.language')}
              </FormLabel>
              <LanguageSelector variant="compact" size="sm" />
            </FormControl>
          </Box>

          {/* Theme Setting */}
          <Box
            p={4}
            bg={sectionBg}
            borderRadius="md"
            border="1px solid"
            borderColor={sectionBorder}
          >
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="text.secondary" mb={3}>
                {t('settings.theme')}
              </FormLabel>
              <ThemeSelector variant="compact" size="sm" />
            </FormControl>
          </Box>
        </VStack>
      </Box>

      <Divider />

      {/* File Processing Settings */}
      <Box>
        <Text fontSize="lg" fontWeight="semibold" color="text.primary" mb={4}>
          File Processing
        </Text>

        <VStack spacing={4} align="stretch">
          <Box
            p={4}
            bg={sectionBg}
            borderRadius="md"
            border="1px solid"
            borderColor={sectionBorder}
          >
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="text.secondary" mb={2}>
                File Processing Model
              </FormLabel>
              <Select
                size="sm"
                value={fileProcessingModelId}
                onChange={(e) => setFileProcessingModelId(e.target.value)}
              >
                <option value="">Use Default Chat Model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.modelId})
                  </option>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box
            p={4}
            bg={sectionBg}
            borderRadius="md"
            border="1px solid"
            borderColor={sectionBorder}
          >
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="text.secondary" mb={2}>
                Max Input Tokens
              </FormLabel>
              <NumberInput
                size="sm"
                value={fileMaxInputTokens}
                min={8192}
                max={1048576}
                step={1024}
                onChange={(_, n) => setFileMaxInputTokens(n)}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </Box>

          <HStack>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={async () => {
                await window.knowlex.settings.update({
                  fileProcessingModelId: fileProcessingModelId || null,
                  fileMaxInputTokens
                })
              }}
            >
              Save
            </Button>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  )
}
