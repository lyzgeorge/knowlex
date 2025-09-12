import React from 'react'
import { Tooltip, Text } from '@chakra-ui/react'

export interface TokenCounterProps {
  visible: boolean
  total: number
  limit: number
  overLimit: boolean
  label: string
  color?: string
}

export const TokenCounter: React.FC<TokenCounterProps> = ({
  visible,
  total,
  limit,
  overLimit,
  label,
  color
}) => {
  if (!visible) return null
  const effectiveColor = color || (overLimit ? 'red.500' : 'text.tertiary')

  return (
    <Tooltip label={label} placement="top">
      <Text
        fontSize="xs"
        color={effectiveColor}
        fontFamily="mono"
        minW="fit-content"
        textAlign="right"
      >
        {total.toLocaleString()} / {limit.toLocaleString()}
      </Text>
    </Tooltip>
  )
}

export default TokenCounter
