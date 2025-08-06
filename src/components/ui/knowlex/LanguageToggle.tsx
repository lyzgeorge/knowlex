/**
 * LanguageToggle Component - Language switching component
 *
 * This component provides:
 * - Language switching with _i18n integration
 * - Multiple display variants
 * - Keyboard navigation support
 * - Accessible design
 * - RTL language support detection
 */

import React from 'react'
import {
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  MenuOptionGroup,
  MenuItemOption,
  Button,
  HStack,
  VStack,
  Text,
  Badge,
  Tooltip,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

// Import design system hooks and components
import { useAnimations } from '@/hooks'
import { ChevronDownIcon } from '../common'

// Import language helpers
import { languageHelpers, supportedLanguages, type LanguageConfig } from '@/i18n'

// Language toggle variants
export type LanguageToggleVariant = 'flag' | 'text' | 'menu' | 'compact'

export interface LanguageToggleProps {
  /**
   * Component variant
   */
  variant?: LanguageToggleVariant

  /**
   * Component size
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether to show language names
   */
  showLabel?: boolean

  /**
   * Whether to show native names
   */
  showNativeName?: boolean

  /**
   * Button variant (for button and menu variants)
   */
  buttonVariant?: 'solid' | 'outline' | 'ghost'

  /**
   * Custom callback for language change
   */
  onLanguageChange?: (language: string) => void

  /**
   * Whether to show beta badge for new languages
   */
  showBetaBadge?: boolean
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  variant = 'menu',
  size = 'md',
  showLabel = true,
  showNativeName = true,
  buttonVariant = 'ghost',
  onLanguageChange,
  showBetaBadge = false,
}) => {
  const { t } = useTranslation()
  const animations = useAnimations()

  const currentLanguage = languageHelpers.getCurrentLanguage()
  const availableLanguages = languageHelpers.getAvailableLanguages()

  // Get current language config
  const getCurrentLanguageConfig = (): LanguageConfig => {
    return supportedLanguages.find(lang => lang.code === currentLanguage) || supportedLanguages[0]
  }

  const currentLangConfig = getCurrentLanguageConfig()

  // Handle language change
  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await languageHelpers.changeLanguage(newLanguage)
      onLanguageChange?.(newLanguage)
    } catch (error) {
      // console.error('Failed to change language:', error)
    }
  }

  // Cycle through languages (for compact variant)
  const cycleLanguage = async () => {
    const currentIndex = availableLanguages.indexOf(currentLanguage)
    const nextIndex = (currentIndex + 1) % availableLanguages.length
    await handleLanguageChange(availableLanguages[nextIndex])
  }

  // Get flag emoji for language (simplified implementation)
  const getFlagEmoji = (languageCode: string): string => {
    const flagMap: Record<string, string> = {
      en: '🇺🇸',
      zh: '🇨🇳',
      ja: '🇯🇵',
      ko: '🇰🇷',
      fr: '🇫🇷',
      de: '🇩🇪',
      es: '🇪🇸',
      it: '🇮🇹',
      pt: '🇵🇹',
      ru: '🇷🇺',
    }
    return flagMap[languageCode] || '🌐'
  }

  // Get display text for language
  const getLanguageDisplayText = (lang: LanguageConfig): string => {
    if (showLabel && showNativeName) {
      return lang.code === currentLanguage ? lang.nativeName : `${lang.name} (${lang.nativeName})`
    }
    if (showNativeName) {
      return lang.nativeName
    }
    if (showLabel) {
      return lang.name
    }
    return lang.code.toUpperCase()
  }

  // Flag variant - shows flag emoji only
  if (variant === 'flag') {
    return (
      <Tooltip label={t('ui.language.currentLanguage', { language: currentLangConfig.nativeName })}>
        <IconButton
          size={size}
          variant={buttonVariant}
          onClick={cycleLanguage}
          aria-label={t('ui.language.languageSelector')}
          transition={animations.transitions.fast}
          fontSize={size === 'sm' ? 'md' : size === 'lg' ? 'xl' : 'lg'}
        >
          {getFlagEmoji(currentLanguage)}
        </IconButton>
      </Tooltip>
    )
  }

  // Text variant - shows language code or name
  if (variant === 'text') {
    return (
      <Button
        size={size}
        variant={buttonVariant}
        onClick={cycleLanguage}
        transition={animations.transitions.fast}
        rightIcon={availableLanguages.length > 2 ? <ChevronDownIcon /> : undefined}
      >
        {getLanguageDisplayText(currentLangConfig)}
      </Button>
    )
  }

  // Compact variant - minimal display with cycling
  if (variant === 'compact') {
    return (
      <Tooltip label={t('ui.language.currentLanguage', { language: currentLangConfig.nativeName })}>
        <Button
          size={size}
          variant={buttonVariant}
          onClick={cycleLanguage}
          transition={animations.transitions.fast}
          minW="auto"
          px={2}
        >
          <HStack spacing={1}>
            <Text fontSize={size === 'sm' ? 'xs' : 'sm'}>{getFlagEmoji(currentLanguage)}</Text>
            <Text fontSize={size === 'sm' ? 'xs' : 'sm'} fontWeight="medium">
              {currentLanguage.toUpperCase()}
            </Text>
          </HStack>
        </Button>
      </Tooltip>
    )
  }

  // Menu variant - dropdown menu with all options
  return (
    <Menu>
      <MenuButton
        as={Button}
        size={size}
        variant={buttonVariant}
        rightIcon={<ChevronDownIcon />}
        transition={animations.transitions.fast}
      >
        <HStack spacing={2}>
          <Text fontSize={size === 'sm' ? 'sm' : 'md'}>{getFlagEmoji(currentLanguage)}</Text>
          {showLabel && (
            <Text fontSize={size === 'sm' ? 'sm' : 'md'}>
              {getLanguageDisplayText(currentLangConfig)}
            </Text>
          )}
        </HStack>
      </MenuButton>

      <MenuList>
        <MenuOptionGroup
          value={currentLanguage}
          type="radio"
          onChange={value => handleLanguageChange(value as string)}
        >
          {supportedLanguages.map((lang: LanguageConfig) => (
            <MenuItemOption key={lang.code} value={lang.code}>
              <HStack spacing={3} justify="space-between" w="full">
                <HStack spacing={3}>
                  <Text fontSize="md">{getFlagEmoji(lang.code)}</Text>
                  <VStack align="flex-start" spacing={0}>
                    <Text
                      fontSize="sm"
                      fontWeight={lang.code === currentLanguage ? 'medium' : 'normal'}
                    >
                      {lang.nativeName}
                    </Text>
                    {lang.name !== lang.nativeName && (
                      <Text fontSize="xs" color="text.muted">
                        {lang.name}
                      </Text>
                    )}
                  </VStack>
                </HStack>

                {/* Beta badge for new languages */}
                {showBetaBadge && ['ja', 'ko', 'fr'].includes(lang.code) && (
                  <Badge size="sm" colorScheme="blue" variant="subtle">
                    Beta
                  </Badge>
                )}

                {/* RTL indicator */}
                {lang.rtl && (
                  <Badge size="sm" colorScheme="gray" variant="outline">
                    RTL
                  </Badge>
                )}
              </HStack>
            </MenuItemOption>
          ))}
        </MenuOptionGroup>

        {/* Separator and additional options */}
        <MenuDivider />
        <MenuItem fontSize="sm" color="text.muted" isDisabled>
          {t('ui.language.moreLanguagesSoon')}
        </MenuItem>
      </MenuList>
    </Menu>
  )
}

// Convenience components for common use cases
export const FlagLanguageToggle: React.FC<Omit<LanguageToggleProps, 'variant'>> = props => (
  <LanguageToggle variant="flag" {...props} />
)

export const TextLanguageToggle: React.FC<Omit<LanguageToggleProps, 'variant'>> = props => (
  <LanguageToggle variant="text" {...props} />
)

export const CompactLanguageToggle: React.FC<Omit<LanguageToggleProps, 'variant'>> = props => (
  <LanguageToggle variant="compact" {...props} />
)

export const MenuLanguageToggle: React.FC<Omit<LanguageToggleProps, 'variant'>> = props => (
  <LanguageToggle variant="menu" {...props} />
)

export default LanguageToggle
