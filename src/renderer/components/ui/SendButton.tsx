import React, { useState } from 'react'
import { IconButton, Icon } from '@chakra-ui/react'
import { HiArrowUp, HiArrowPath, HiStop } from 'react-icons/hi2'
import { keyframes } from '@emotion/react'

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

export interface SendButtonProps {
  isBusy: boolean
  canSend: boolean
  onSend: () => void
  onStop: () => void
  stopLabel?: string
  sendingLabel?: string
  sendLabel?: string
  overLimit?: boolean
}

export const SendButton: React.FC<SendButtonProps> = ({
  isBusy,
  canSend,
  onSend,
  onStop,
  stopLabel = 'Stop',
  sendingLabel = 'Processing',
  sendLabel = 'Send',
  overLimit
}) => {
  const [isStopHovered, setIsStopHovered] = useState(false)

  if (isBusy) {
    return (
      <IconButton
        aria-label={isStopHovered ? stopLabel : sendingLabel}
        icon={
          isStopHovered ? (
            <HiStop />
          ) : (
            <Icon as={HiArrowPath} css={{ animation: `${spinAnimation} 1s linear infinite` }} />
          )
        }
        variant="solid"
        {...(isStopHovered ? { colorScheme: 'red' } : { bg: 'gray.300' })}
        size="sm"
        borderRadius="md"
        onClick={onStop}
        onMouseEnter={() => setIsStopHovered(true)}
        onMouseLeave={() => setIsStopHovered(false)}
        cursor="pointer"
      />
    )
  }

  return (
    <IconButton
      aria-label={overLimit ? 'Token limit exceeded' : sendLabel}
      icon={<HiArrowUp />}
      {...(canSend ? { colorScheme: 'primary' } : {})}
      size="sm"
      borderRadius="md"
      isDisabled={!canSend}
      onClick={onSend}
      cursor={canSend ? 'pointer' : 'not-allowed'}
    />
  )
}

export default SendButton
