import { useState, useEffect } from 'react'
import { Tabs, TabList, TabPanels, Tab, TabPanel, HStack, Text } from '@chakra-ui/react'
import { HiCpuChip, HiCog6Tooth } from 'react-icons/hi2'
import { Modal } from '@renderer/components/ui'
import { ModelSettingsSection } from './ModelSettingsSection'
import { GeneralSettingsSection } from './GeneralSettingsSection'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: number
}

export function SettingsModal({ isOpen, onClose, defaultTab = 0 }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Reset to defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab)
    }
  }, [isOpen, defaultTab])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg" closeOnOverlayClick={true}>
      <Tabs index={activeTab} onChange={setActiveTab} variant="line">
        <TabList>
          <Tab>
            <HStack spacing={2}>
              <HiCog6Tooth size={16} />
              <Text>General</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <HiCpuChip size={16} />
              <Text>AI Models</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} py={4}>
            <GeneralSettingsSection />
          </TabPanel>
          <TabPanel px={0} py={4}>
            <ModelSettingsSection />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Modal>
  )
}
