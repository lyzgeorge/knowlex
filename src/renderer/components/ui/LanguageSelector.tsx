import React from 'react'
import { Menu, MenuButton, MenuList, MenuItem, Button, Text, HStack } from '@chakra-ui/react'
import { HiChevronDown } from 'react-icons/hi2'
import { useI18n } from '@renderer/hooks/useI18n'
import { SUPPORTED_LANGUAGES, type Language } from '@shared/i18n/types'

export interface LanguageSelectorProps {
  variant?: 'button' | 'compact'
  size?: 'xs' | 'sm' | 'md'
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'button',
  size = 'sm'
}) => {
  const { t, currentLanguage, changeLanguage } = useI18n()

  const handleLanguageChange = (language: Language) => {
    changeLanguage(language)
  }

  const currentLanguageLabel =
    SUPPORTED_LANGUAGES[currentLanguage as keyof typeof SUPPORTED_LANGUAGES] || currentLanguage

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
          {currentLanguageLabel}
        </MenuButton>
        <MenuList>
          {Object.entries(SUPPORTED_LANGUAGES).map(([lang, label]) => (
            <MenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang as Language)}
              fontSize="sm"
              isDisabled={lang === currentLanguage}
            >
              <Text>{label}</Text>
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
          <Text>{t('settings.language')}:</Text>
          <Text fontWeight="medium">{currentLanguageLabel}</Text>
        </HStack>
      </MenuButton>
      <MenuList>
        {Object.entries(SUPPORTED_LANGUAGES).map(([lang, label]) => (
          <MenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang as Language)}
            isDisabled={lang === currentLanguage}
          >
            <Text>{label}</Text>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}
