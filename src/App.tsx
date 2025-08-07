import React, { useState } from 'react'
import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
  Flex,
  IconButton,
  useColorModeValue,
  useBreakpointValue,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  useDisclosure,
} from '@chakra-ui/react'
import { useTranslations } from './providers'
import Sidebar from './components/ui/layout/Sidebar'
import { OpenAISimpleTest } from './components/chat/OpenAISimpleTest'

// Using simple text icons to avoid dependency issues
const HamburgerIcon = () => <span>☰</span>

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
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent width="260px" maxWidth="260px">
          <DrawerBody p={0}>
            <Sidebar />
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
const MainContent: React.FC<{ showTest: boolean; onShowTest: (show: boolean) => void }> = ({
  showTest,
  onShowTest,
}) => {
  const { t } = useTranslations()
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const headingColor = useColorModeValue('gray.800', 'white')
  const titleColor = useColorModeValue('gray.600', 'gray.300')
  const welcomeColor = useColorModeValue('gray.500', 'gray.400')

  if (showTest) {
    return (
      <Box height="100%" overflow="auto" bg={bgColor}>
        <Box p={4}>
          <Button onClick={() => onShowTest(false)} mb={4} variant="outline">
            ← Back to Home
          </Button>
        </Box>
        <OpenAISimpleTest />
      </Box>
    )
  }

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
        <Heading size={{ base: 'lg', md: 'xl' }} color={headingColor}>
          Knowlex
        </Heading>
        <Text fontSize={{ base: 'md', md: 'lg' }} color={titleColor}>
          {t('ui.app.title')}
        </Text>
        <Text color={welcomeColor} fontSize={{ base: 'sm', md: 'md' }}>
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
        <Button
          colorScheme="green"
          variant="outline"
          size={{ base: 'sm', md: 'md' }}
          onClick={() => onShowTest(true)}
        >
          Test OpenAI Agents
        </Button>
      </VStack>
    </VStack>
  )
}

function App() {
  const [showTest, setShowTest] = useState(false)

  return (
    <Flex height="100vh" width="100vw" overflow="hidden" position="relative">
      {/* Mobile sidebar */}
      <MobileSidebar />

      {/* Desktop sidebar */}
      <Box display={{ base: 'none', lg: 'block' }}>
        <Sidebar />
      </Box>

      {/* Main content area */}
      <Flex direction="column" flex={1} overflow="hidden">
        {/* Header */}
        <ResponsiveHeader />

        {/* Main content */}
        <Box flex={1} overflow="auto">
          <MainContent showTest={showTest} onShowTest={setShowTest} />
        </Box>
      </Flex>
    </Flex>
  )
}

export default App
