import {
  VStack,
  Box,
  Text,
  Divider,
  FormControl,
  FormLabel,
  useColorModeValue
} from '@chakra-ui/react'
import { useI18n } from '@renderer/hooks/useI18n'
import { LanguageSelector } from '@renderer/components/ui/LanguageSelector'
import { ThemeSelector } from '@renderer/components/ui/ThemeSelector'
import { useEffect } from 'react'

export function GeneralSettingsSection() {
  const { t } = useI18n()
  const sectionBg = useColorModeValue('surface.primary', 'surface.primary')
  const sectionBorder = useColorModeValue('border.secondary', 'border.secondary')
  // No longer manages File Processing; moved to Model Settings

  useEffect(() => {
    // Nothing to preload here currently
  }, [])

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
    </VStack>
  )
}
