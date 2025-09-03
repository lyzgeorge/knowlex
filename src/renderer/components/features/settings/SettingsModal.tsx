import { useState, useEffect } from 'react'
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Text,
  Button,
  Alert,
  AlertIcon
} from '@chakra-ui/react'
import { HiCpuChip } from 'react-icons/hi2'
import { Modal } from '@renderer/components/ui'
import { useModelConfigStore } from '@renderer/stores/model-config'
import { ModelSettingsSection } from './ModelSettingsSection'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: number
}

export function SettingsModal({ isOpen, onClose, defaultTab = 0 }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const {
    loading: modelsLoading,
    initialized: modelsInitialized,
    fetchModels
  } = useModelConfigStore()
  // Only the Models tab is functional at the moment; other settings are removed
  const error = null
  const clearError = () => {}

  useEffect(() => {
    if (isOpen && !modelsInitialized && !modelsLoading) {
      fetchModels()
    }
  }, [isOpen, modelsInitialized, modelsLoading, fetchModels])

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab)
      clearError()
    }
  }, [isOpen, defaultTab, clearError])

  const handleClose = () => {
    clearError()
    onClose()
  }

  const tabs = [
    {
      id: 'models',
      label: 'AI Models',
      icon: HiCpuChip,
      component: <ModelSettingsSection />
    }
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Settings"
      size="lg"
      closeOnOverlayClick={true}
    >
      <Box minH="500px">
        {error && (
          <Alert status="error" variant="subtle" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Tabs index={activeTab} onChange={setActiveTab} variant="line" colorScheme="primary">
          <TabList>
            {tabs.map((tab) => (
              <Tab key={tab.id}>
                <HStack spacing={2}>
                  <Box as={tab.icon} boxSize={4} />
                  <Text>{tab.label}</Text>
                </HStack>
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            {tabs.map((tab) => (
              <TabPanel key={tab.id} px={0} py={4}>
                {tab.component}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>

        {/* Footer with close button only (other settings removed) */}
        <HStack justify="flex-end" pt={4}>
          <Button variant="ghost" colorScheme="primary" onClick={handleClose}>
            Close
          </Button>
        </HStack>
      </Box>
    </Modal>
  )
}
