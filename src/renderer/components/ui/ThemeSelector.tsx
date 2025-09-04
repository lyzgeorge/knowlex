import React from 'react'
import { Menu, MenuButton, MenuList, MenuItem, Button, Text, HStack, Box } from '@chakra-ui/react'
import { HiChevronDown, HiSun, HiMoon, HiComputerDesktop } from 'react-icons/hi2'
import { useI18n } from '@renderer/hooks/useI18n'
import { useCurrentTheme, useSetTheme } from '@renderer/stores/app'
import { type ColorMode } from '@renderer/utils/theme/colorMode'

export interface ThemeSelectorProps {
  variant?: 'button' | 'compact'
  size?: 'xs' | 'sm' | 'md'
}

const THEME_OPTIONS: Array<{
  value: ColorMode
  translationKey: string
  icon: React.ElementType
}> = [
  { value: 'light', translationKey: 'themes.light', icon: HiSun },
  { value: 'dark', translationKey: 'themes.dark', icon: HiMoon },
  { value: 'system', translationKey: 'themes.system', icon: HiComputerDesktop }
]

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  variant = 'button',
  size = 'sm'
}) => {
  const { t } = useI18n()
  const theme = useCurrentTheme()
  const setTheme = useSetTheme()
  const handleThemeChange = (newTheme: ColorMode) => {
    // Update our custom theme store
    // The useThemeSync hook will handle syncing with Chakra UI
    setTheme(newTheme)
  }

  const currentThemeOption = THEME_OPTIONS.find((option) => option.value === theme)
  const currentLabel = currentThemeOption ? t(currentThemeOption.translationKey) : theme
  const CurrentIcon = currentThemeOption?.icon || HiComputerDesktop

  if (variant === 'compact') {
    return (
      <Menu>
        <MenuButton
          as={Button}
          size={size}
          variant="ghost"
          rightIcon={<HiChevronDown />}
          fontSize="xs"
          p={1}
          minW="auto"
          h="auto"
        >
          <HStack spacing={1}>
            <Box as={CurrentIcon} boxSize={3} />
            <Text>{currentLabel}</Text>
          </HStack>
        </MenuButton>
        <MenuList>
          {THEME_OPTIONS.map(({ value, translationKey, icon: Icon }) => (
            <MenuItem
              key={value}
              onClick={() => handleThemeChange(value)}
              fontSize="sm"
              isDisabled={value === theme}
            >
              <HStack spacing={2}>
                <Box as={Icon} boxSize={4} />
                <Text>{t(translationKey)}</Text>
              </HStack>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    )
  }

  return (
    <Menu>
      <MenuButton as={Button} size={size} variant="outline" rightIcon={<HiChevronDown />}>
        <HStack spacing={2}>
          <Text>{t('settings.theme')}:</Text>
          <HStack spacing={1}>
            <Box as={CurrentIcon} boxSize={4} />
            <Text fontWeight="medium">{currentLabel}</Text>
          </HStack>
        </HStack>
      </MenuButton>
      <MenuList>
        {THEME_OPTIONS.map(({ value, translationKey, icon: Icon }) => (
          <MenuItem
            key={value}
            onClick={() => handleThemeChange(value)}
            isDisabled={value === theme}
          >
            <HStack spacing={2}>
              <Box as={Icon} boxSize={4} />
              <Text>{t(translationKey)}</Text>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}
