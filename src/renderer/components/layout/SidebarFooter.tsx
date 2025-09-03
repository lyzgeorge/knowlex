import React from 'react'
import { Box, HStack, VStack, Text, IconButton, Avatar, Divider } from '@chakra-ui/react'
import { HiCog6Tooth } from 'react-icons/hi2'
import { useI18n } from '@renderer/hooks/useI18n'
import { useNavigationActions } from '@renderer/stores/navigation'

export const SidebarFooter: React.FC = () => {
  const { t } = useI18n()
  const { openSettings } = useNavigationActions()

  return (
    <Box p={4}>
      <VStack spacing={3} align="stretch">
        <Divider />

        {/* User Info and Settings */}
        <HStack spacing={3}>
          <Avatar size="sm" name="User Name" />
          <VStack align="start" spacing={0} flex={1} minW={0}>
            <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
              用户名
            </Text>
          </VStack>
          <IconButton
            aria-label={t('sidebar.settings')}
            icon={<HiCog6Tooth />}
            size="sm"
            variant="ghost"
            onClick={() => openSettings()}
          />
        </HStack>
      </VStack>
    </Box>
  )
}

export default SidebarFooter
