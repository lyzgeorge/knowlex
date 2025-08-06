/**
 * Header Component for Knowlex Desktop Application
 *
 * This component renders the main header with title, controls, and theme/language toggles.
 * It includes window controls for the Electron desktop app.
 */

import React from 'react'
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
} from '@chakra-ui/react'
import {
  MinusIcon,
  Square2StackIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  LanguageIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { useTheme, useLanguage, useTranslations } from '@/providers'
import type { HeaderProps } from '../types'

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showWindowControls = true,
  height = '60px',
  className,
  'data-testid': testId,
  ...props
}) => {
  const { t } = useTranslations()
  const { theme, setTheme, _actualTheme } = useTheme()
  const { language, setLanguage, _getLanguageDisplayName } = useLanguage()

  // Theme-aware _colors
  const bgColor = useColorModeValue('white', 'dark.100')
  const borderColor = useColorModeValue('gray.200', 'dark.300')
  const textColor = useColorModeValue('gray.800', 'dark.700')
  const mutedTextColor = useColorModeValue('gray.500', 'dark.500')
  const hoverBg = useColorModeValue('gray.100', 'dark.200')

  // Window control handlers (these would be connected to Electron IPC in real implementation)
  const handleMinimize = () => {
    // window.electronAPI?.minimize();
    // console.log('Minimize window')
  }

  const handleMaximize = () => {
    // window.electronAPI?.toggleMaximize();
    // console.log('Toggle maximize window')
  }

  const handleClose = () => {
    // window.electronAPI?.close();
    // console.log('Close window')
  }

  // Theme change handler
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
  }

  // Language change handler
  const handleLanguageChange = (newLanguage: 'en' | 'zh') => {
    setLanguage(newLanguage)
  }

  // Get theme icon
  const getThemeIcon = (themeMode: string) => {
    switch (themeMode) {
      case 'light':
        return <SunIcon className="w-4 h-4" />
      case 'dark':
        return <MoonIcon className="w-4 h-4" />
      case 'system':
        return <ComputerDesktopIcon className="w-4 h-4" />
      default:
        return <SunIcon className="w-4 h-4" />
    }
  }

  return (
    <Flex
      height={height}
      width="100%"
      bg={bgColor}
      borderBottom="1px solid"
      borderColor={borderColor}
      align="center"
      justify="space-between"
      px={4}
      className={className}
      data-testid={testId}
      {...props}
    >
      {/* Left Section - Title */}
      <HStack spacing={3} flex={1}>
        <VStack spacing={0} align="start">
          <Text fontSize="lg" fontWeight="semibold" color={textColor} lineHeight="short">
            {title || t('ui.header.title')}
          </Text>
          {subtitle && (
            <Text fontSize="sm" color={mutedTextColor} lineHeight="short">
              {subtitle}
            </Text>
          )}
        </VStack>
      </HStack>

      {/* Center Section - Could be used for breadcrumbs or search */}
      <Box flex={2}>{/* Reserved for future use */}</Box>

      {/* Right Section - Controls */}
      <HStack spacing={2} flex={1} justify="flex-end">
        {/* Theme Toggle */}
        <Menu>
          <MenuButton
            as={IconButton}
            icon={getThemeIcon(theme)}
            variant="ghost"
            size="sm"
            aria-label={t('ui.header.theme')}
            _hover={{ bg: hoverBg }}
          />
          <MenuList>
            <MenuItem
              icon={<SunIcon className="w-4 h-4" />}
              onClick={() => handleThemeChange('light')}
              bg={
                theme === 'light' ? useColorModeValue('primary.50', 'primary.900') : 'transparent'
              }
            >
              {t('ui.theme.light')}
            </MenuItem>
            <MenuItem
              icon={<MoonIcon className="w-4 h-4" />}
              onClick={() => handleThemeChange('dark')}
              bg={theme === 'dark' ? useColorModeValue('primary.50', 'primary.900') : 'transparent'}
            >
              {t('ui.theme.dark')}
            </MenuItem>
            <MenuItem
              icon={<ComputerDesktopIcon className="w-4 h-4" />}
              onClick={() => handleThemeChange('system')}
              bg={
                theme === 'system' ? useColorModeValue('primary.50', 'primary.900') : 'transparent'
              }
            >
              {t('ui.theme.system')}
            </MenuItem>
          </MenuList>
        </Menu>

        {/* Language Toggle */}
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<LanguageIcon className="w-4 h-4" />}
            variant="ghost"
            size="sm"
            aria-label={t('ui.header.language')}
            _hover={{ bg: hoverBg }}
          />
          <MenuList>
            <MenuItem
              onClick={() => handleLanguageChange('en')}
              bg={
                language === 'en' ? useColorModeValue('primary.50', 'primary.900') : 'transparent'
              }
            >
              English
            </MenuItem>
            <MenuItem
              onClick={() => handleLanguageChange('zh')}
              bg={
                language === 'zh' ? useColorModeValue('primary.50', 'primary.900') : 'transparent'
              }
            >
              中文
            </MenuItem>
          </MenuList>
        </Menu>

        {/* Help Menu */}
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<QuestionMarkCircleIcon className="w-4 h-4" />}
            variant="ghost"
            size="sm"
            aria-label={t('ui.header.help')}
            _hover={{ bg: hoverBg }}
          />
          <MenuList>
            <MenuItem icon={<QuestionMarkCircleIcon className="w-4 h-4" />}>
              {t('ui.header.help')}
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<InformationCircleIcon className="w-4 h-4" />}>
              {t('ui.header.about')}
            </MenuItem>
          </MenuList>
        </Menu>

        {/* Window Controls (Desktop Only) */}
        {showWindowControls && (
          <HStack spacing={1} ml={4}>
            <IconButton
              icon={<MinusIcon className="w-3 h-3" />}
              size="sm"
              variant="ghost"
              aria-label={t('ui.header.minimize')}
              onClick={handleMinimize}
              _hover={{ bg: useColorModeValue('yellow.100', 'yellow.800') }}
              borderRadius="full"
              w={8}
              h={8}
              minW={8}
            />
            <IconButton
              icon={<Square2StackIcon className="w-3 h-3" />}
              size="sm"
              variant="ghost"
              aria-label={t('ui.header.maximize')}
              onClick={handleMaximize}
              _hover={{ bg: useColorModeValue('green.100', 'green.800') }}
              borderRadius="full"
              w={8}
              h={8}
              minW={8}
            />
            <IconButton
              icon={<XMarkIcon className="w-3 h-3" />}
              size="sm"
              variant="ghost"
              aria-label={t('ui.header.close')}
              onClick={handleClose}
              _hover={{ bg: useColorModeValue('red.100', 'red.800') }}
              borderRadius="full"
              w={8}
              h={8}
              minW={8}
            />
          </HStack>
        )}
      </HStack>
    </Flex>
  )
}

export default Header
