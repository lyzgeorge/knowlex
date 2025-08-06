/**
 * Main Layout Component for Knowlex Desktop Application
 *
 * This component provides the main application layout with sidebar and header.
 * It follows the desktop app structure with a fixed 260px sidebar.
 */

import React from 'react'
import { Box, Flex, useColorModeValue } from '@chakra-ui/react'
import { useTranslations } from '@/providers'
import type { MainLayoutProps } from '../types'

const MainLayout: React.FC<MainLayoutProps> = ({
  sidebar,
  header,
  children,
  sidebarWidth = '260px',
  headerHeight = '60px',
  className,
  'data-testid': testId,
  ...props
}) => {
  const { t } = useTranslations()

  // Theme-aware _colors
  const bgColor = useColorModeValue('white', 'dark.50')
  const borderColor = useColorModeValue('gray.200', 'dark.300')

  return (
    <Flex
      height="100vh"
      width="100vw"
      overflow="hidden"
      bg={bgColor}
      className={className}
      data-testid={testId}
      {...props}
    >
      {/* Sidebar */}
      {sidebar && (
        <Box
          width={sidebarWidth}
          minWidth={sidebarWidth}
          height="100%"
          borderRight="1px solid"
          borderColor={borderColor}
          bg={useColorModeValue('gray.50', 'dark.100')}
          display="flex"
          flexDirection="column"
          position="relative"
          zIndex="docked"
        >
          {sidebar}
        </Box>
      )}

      {/* Main Content Area */}
      <Flex
        flex={1}
        direction="column"
        height="100%"
        overflow="hidden"
        minWidth={0} // Prevents flex item from overflowing
      >
        {/* Header */}
        {header && (
          <Box
            height={headerHeight}
            minHeight={headerHeight}
            borderBottom="1px solid"
            borderColor={borderColor}
            bg={bgColor}
            display="flex"
            alignItems="center"
            position="relative"
            zIndex="sticky"
          >
            {header}
          </Box>
        )}

        {/* Main Content */}
        <Box
          flex={1}
          overflow="hidden"
          position="relative"
          bg={useColorModeValue('gray.25', 'dark.50')}
        >
          {children}
        </Box>
      </Flex>
    </Flex>
  )
}

export default MainLayout
