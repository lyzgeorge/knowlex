/**
 * ThemeToggle Component - Theme switching component
 *
 * This component provides:
 * - Light/Dark/System theme switching
 * - Keyboard navigation support
 * - Smooth transitions
 * - Accessible design
 * - Integration with Chakra UI color mode
 */

import React from 'react'
import {
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  MenuItemOption,
  Button,
  HStack,
  Text,
  useColorMode,
  Tooltip,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

// Import design system hooks and components
import { useAnimations } from '@/hooks'
import { SunIcon, MoonIcon, MonitorIcon, ChevronDownIcon } from '../common'

// Theme toggle variants
export type ThemeToggleVariant = 'icon' | 'button' | 'menu'

export interface ThemeToggleProps {
  /**
   * Component variant
   */
  variant?: ThemeToggleVariant

  /**
   * Component size
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether to show labels
   */
  showLabel?: boolean

  /**
   * Button variant (for button and menu variants)
   */
  buttonVariant?: 'solid' | 'outline' | 'ghost'

  /**
   * Custom callback for theme change
   */
  onThemeChange?: (theme: string) => void
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  size = 'md',
  showLabel = false,
  buttonVariant = 'ghost',
  onThemeChange,
}) => {
  const { t } = useTranslation()
  const { colorMode, setColorMode } = useColorMode()
  const animations = useAnimations()

  // Get the current theme display info
  const getCurrentThemeInfo = () => {
    switch (colorMode) {
      case 'light':
        return {
          icon: <SunIcon />,
          label: t('ui.theme.light'),
          key: 'light',
        }
      case 'dark':
        return {
          icon: <MoonIcon />,
          label: t('ui.theme.dark'),
          key: 'dark',
        }
      default:
        return {
          icon: <MonitorIcon />,
          label: t('ui.theme.system'),
          key: 'system',
        }
    }
  }

  const currentTheme = getCurrentThemeInfo()

  // Handle theme change
  const handleThemeChange = (newTheme: string) => {
    setColorMode(newTheme as 'light' | 'dark' | 'system')
    onThemeChange?.(newTheme)
  }

  // Cycle through themes (for icon variant)
  const cycleTheme = () => {
    const themes = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(colorMode)
    const nextIndex = (currentIndex + 1) % themes.length
    handleThemeChange(themes[nextIndex])
  }

  // Theme options for menu variant
  const themeOptions = [
    {
      value: 'light',
      label: t('ui.theme.light'),
      icon: <SunIcon />,
    },
    {
      value: 'dark',
      label: t('ui.theme.dark'),
      icon: <MoonIcon />,
    },
    {
      value: 'system',
      label: t('ui.theme.system'),
      icon: <MonitorIcon />,
    },
  ]

  // Icon variant - single button that cycles themes
  if (variant === 'icon') {
    return (
      <Tooltip label={t('ui.theme.currentTheme', { theme: currentTheme.label })}>
        <IconButton
          size={size}
          variant={buttonVariant}
          icon={currentTheme.icon}
          onClick={cycleTheme}
          aria-label={t('ui.theme.themeSelector')}
          transition={animations.transitions.fast}
          _hover={{
            transform: 'rotate(15deg)',
          }}
        />
      </Tooltip>
    )
  }

  // Button variant - button with current theme
  if (variant === 'button') {
    return (
      <Button
        size={size}
        variant={buttonVariant}
        leftIcon={currentTheme.icon}
        onClick={cycleTheme}
        transition={animations.transitions.fast}
      >
        {showLabel ? currentTheme.label : t('ui.theme.theme')}
      </Button>
    )
  }

  // Menu variant - dropdown menu with all options
  return (
    <Menu>
      <MenuButton
        as={Button}
        size={size}
        variant={buttonVariant}
        leftIcon={currentTheme.icon}
        rightIcon={<ChevronDownIcon />}
        transition={animations.transitions.fast}
      >
        {showLabel ? currentTheme.label : t('ui.theme.theme')}
      </MenuButton>

      <MenuList>
        <MenuOptionGroup
          value={colorMode}
          type="radio"
          onChange={value => handleThemeChange(value as string)}
        >
          {themeOptions.map(option => (
            <MenuItemOption key={option.value} value={option.value}>
              <HStack spacing={3}>
                {option.icon}
                <Text>{option.label}</Text>
              </HStack>
            </MenuItemOption>
          ))}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}

// Convenience components for common use cases
export const IconThemeToggle: React.FC<Omit<ThemeToggleProps, 'variant'>> = props => (
  <ThemeToggle variant="icon" {...props} />
)

export const ButtonThemeToggle: React.FC<Omit<ThemeToggleProps, 'variant'>> = props => (
  <ThemeToggle variant="button" {...props} />
)

export const MenuThemeToggle: React.FC<Omit<ThemeToggleProps, 'variant'>> = props => (
  <ThemeToggle variant="menu" {...props} />
)

export default ThemeToggle
