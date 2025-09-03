import {
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  HStack,
  Box,
  useColorModeValue,
  Tooltip
} from '@chakra-ui/react'
import { HiChevronDown, HiLightBulb, HiMiniCheck } from 'react-icons/hi2'
import type { ReasoningEffort } from '@shared/types/models'

interface ReasoningEffortSelectorProps {
  value?: ReasoningEffort | undefined
  onChange: (effort?: ReasoningEffort | undefined) => void
  variant?: 'default' | 'icon'
  isDisabled?: boolean
}

const REASONING_OPTIONS = [
  { value: undefined, label: 'Disable', description: 'No reasoning enhancement' },
  { value: 'low' as const, label: 'Low', description: 'Basic reasoning support' },
  { value: 'medium' as const, label: 'Medium', description: 'Moderate reasoning depth' },
  { value: 'high' as const, label: 'High', description: 'Deep reasoning analysis' }
]

export function ReasoningEffortSelector({
  value,
  onChange,
  variant = 'default',
  isDisabled = false
}: ReasoningEffortSelectorProps) {
  const buttonBg = useColorModeValue('white', 'gray.700')

  const selectedOption =
    REASONING_OPTIONS.find((option) => option.value === value) || REASONING_OPTIONS[0]

  const handleSelect = (effort?: ReasoningEffort | undefined) => {
    onChange(effort)
  }

  return (
    <Menu>
      {variant === 'icon' ? (
        <Tooltip
          label={
            isDisabled ? 'Selected model does not support reasoning' : 'Toggle reasoning effort'
          }
        >
          <MenuButton
            as={IconButton}
            aria-label="Reasoning effort"
            icon={<HiLightBulb />}
            size="sm"
            variant={value ? 'solid' : 'ghost'}
            colorScheme={value ? 'yellow' : undefined}
            isDisabled={isDisabled}
          />
        </Tooltip>
      ) : (
        <Tooltip label="Reasoning effort controls how deeply the AI thinks through the response">
          <MenuButton
            as={Button}
            size="sm"
            variant="outline"
            bg={buttonBg}
            rightIcon={<HiChevronDown />}
            minW="120px"
            justifyContent="space-between"
          >
            <HStack spacing={1}>
              <Box as={HiLightBulb} boxSize={4} />
              <Text fontSize="sm" isTruncated>
                {selectedOption?.label}
              </Text>
            </HStack>
          </MenuButton>
        </Tooltip>
      )}

      <MenuList minW="200px">
        <Text fontSize="xs" color="gray.500" px={3} py={1} fontWeight="medium">
          Reasoning Effort
        </Text>

        {REASONING_OPTIONS.map((option) => (
          <MenuItem
            key={option.label}
            onClick={() => handleSelect(option.value)}
            {...(selectedOption?.value === option.value ? { bg: 'blue.50' } : {})}
            _hover={{ bg: 'blue.100' }}
          >
            <HStack justify="space-between" w="full">
              <div>
                <Text fontSize="sm" fontWeight="medium">
                  {option.label}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {option.description}
                </Text>
              </div>
              {selectedOption?.value === option.value && (
                <Box as={HiMiniCheck} boxSize={4} color="primary.500" />
              )}
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}
