import React from 'react'
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Flex,
  IconButton,
  useColorMode,
  useColorModeValue,
  useBreakpointValue,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  useDisclosure,
} from '@chakra-ui/react'
import { useTranslations, useLanguage } from './providers'

// Using simple text icons to avoid dependency issues
const HamburgerIcon = () => <span>☰</span>
const CloseIcon = () => <span>×</span>

// Simple theme toggle component
const SimpleThemeToggle: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode()
  const themeIcon = colorMode === 'dark' ? '☀️' : '🌙'

  return (
    <IconButton
      size="sm"
      variant="ghost"
      aria-label="Toggle theme"
      icon={<span>{themeIcon}</span>}
      onClick={toggleColorMode}
    />
  )
}

// Simple language toggle component
const SimpleLanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage()
  const currentLang = language === 'zh' ? 'EN' : '中'

  const toggleLanguage = () => {
    const newLang = language === 'zh' ? 'en' : 'zh'
    setLanguage(newLang)
  }

  return (
    <Button size="sm" variant="ghost" onClick={toggleLanguage}>
      {currentLang}
    </Button>
  )
}

// Sidebar content component (shared between desktop and mobile)
const SidebarContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { t } = useTranslations()

  return (
    <VStack spacing={4} align="stretch" height="100%">
      <Flex justify="space-between" align="center">
        <Heading size="md" color="blue.500">
          Knowlex
        </Heading>
        {onClose && (
          <IconButton
            size="sm"
            variant="ghost"
            icon={<CloseIcon />}
            onClick={onClose}
            aria-label="Close"
            display={{ base: 'flex', lg: 'none' }}
          />
        )}
      </Flex>

      <Button colorScheme="blue" size="md" width="100%">
        + {t('ui.sidebar.newChat')}
      </Button>

      <VStack spacing={2} align="stretch" flex={1}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.600">
          {t('ui.sidebar.projects')}
        </Text>
        <Text fontSize="sm" color="gray.400">
          {t('ui.sidebar.noProjects')}
        </Text>
      </VStack>

      <VStack spacing={2}>
        <HStack width="100%" justify="space-between">
          <SimpleThemeToggle />
          <SimpleLanguageToggle />
        </HStack>
      </VStack>
    </VStack>
  )
}

// Desktop sidebar component
const DesktopSidebar: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <Box
      width="260px"
      minWidth="260px"
      height="100vh"
      bg={bgColor}
      borderRight="1px solid"
      borderColor={borderColor}
      p={4}
      display={{ base: 'none', lg: 'block' }}
    >
      <SidebarContent />
    </Box>
  )
}

// Mobile sidebar component
const MobileSidebar: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      {/* Mobile menu button */}
      <IconButton
        size="md"
        variant="ghost"
        icon={<HamburgerIcon />}
        onClick={onOpen}
        aria-label="Open menu"
        display={{ base: 'flex', lg: 'none' }}
        position="fixed"
        top={4}
        left={4}
        zIndex={200}
        bg={useColorModeValue('white', 'gray.800')}
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
      />

      {/* Mobile drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody p={4}>
            <SidebarContent onClose={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}

// Responsive header component
const ResponsiveHeader: React.FC = () => {
  const { t } = useTranslations()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const isMobile = useBreakpointValue({ base: true, lg: false })

  return (
    <Box
      height="60px"
      borderBottom="1px solid"
      borderColor={borderColor}
      bg={bgColor}
      px={{ base: 16, lg: 6 }} // Extra padding on mobile for hamburger menu
      display="flex"
      alignItems="center"
      justifyContent="space-between"
    >
      <Heading size={{ base: 'sm', md: 'md' }}>{isMobile ? 'Knowlex' : 'Knowlex Desktop'}</Heading>
      <Text color="gray.500" fontSize={{ base: 'xs', md: 'sm' }}>
        {t('ui.app.tagline')}
      </Text>
    </Box>
  )
}

// Main content area
const MainContent: React.FC = () => {
  const { t } = useTranslations()
  const bgColor = useColorModeValue('gray.50', 'gray.900')

  return (
    <VStack
      spacing={8}
      justify="center"
      align="center"
      height="100%"
      p={{ base: 4, md: 8 }}
      bg={bgColor}
    >
      <VStack spacing={4} textAlign="center">
        <Heading size={{ base: 'lg', md: 'xl' }} color={useColorModeValue('gray.800', 'white')}>
          Knowlex
        </Heading>
        <Text fontSize={{ base: 'md', md: 'lg' }} color={useColorModeValue('gray.600', 'gray.300')}>
          {t('ui.app.title')}
        </Text>
        <Text color={useColorModeValue('gray.500', 'gray.400')} fontSize={{ base: 'sm', md: 'md' }}>
          {t('ui.app.welcome')}
        </Text>
      </VStack>

      <VStack spacing={4}>
        <Button colorScheme="blue" size={{ base: 'md', md: 'lg' }}>
          {t('ui.app.getStarted')}
        </Button>
        <Button variant="outline" size={{ base: 'sm', md: 'md' }}>
          {t('ui.app.viewDocs')}
        </Button>
      </VStack>
    </VStack>
  )
}

function App() {
  return (
    <Flex height="100vh" width="100vw" overflow="hidden" position="relative">
      {/* Mobile sidebar */}
      <MobileSidebar />

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Main content area */}
      <Flex direction="column" flex={1} overflow="hidden">
        {/* Header */}
        <ResponsiveHeader />

        {/* Main content */}
        <Box flex={1} overflow="auto">
          <MainContent />
        </Box>
      </Flex>
    </Flex>
  )
}

export default App
