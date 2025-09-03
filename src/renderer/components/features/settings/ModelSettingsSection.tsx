import { Box } from '@chakra-ui/react'
import { ModelSettingsPanel } from '@renderer/components/features/models/ModelSettingsPanel'

export function ModelSettingsSection() {
  // Reuse the full Models page UI inside the settings modal
  return (
    <Box px={0} py={0}>
      <ModelSettingsPanel />
    </Box>
  )
}
