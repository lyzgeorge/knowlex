import React from 'react'
import { Box, HStack } from '@chakra-ui/react'
import { Sidebar } from './Sidebar'

export interface MainLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  className?: string
}

/**
 * Main layout component for Knowlex Desktop Application
 *
 * Features:
 * - Fixed sidebar on the left (280px width)
 * - Flexible main content area
 * - Responsive design for different screen sizes
 * - Consistent layout across all main app pages
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children, sidebar, className }) => {
  return (
    <HStack h="100vh" w="100vw" spacing={0} overflow="hidden" className={className}>
      {/* Sidebar - Fixed width */}
      {sidebar || <Sidebar />}

      {/* Main Content Area - Flexible width */}
      <Box flex={1} h="100vh" overflow="hidden" bg="background.primary" position="relative">
        {/* Draggable Top Area */}
        <Box
          h="2rem"
          w="100%"
          position="absolute"
          top={0}
          left={0}
          zIndex={1000}
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          bg="transparent"
          pointerEvents="all"
        />

        {/* Main Content with top padding */}
        <Box h="100%" pt="2rem" overflow="hidden">
          {children}
        </Box>
      </Box>
    </HStack>
  )
}

export default MainLayout
