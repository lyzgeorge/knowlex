import React, { useMemo, useState } from 'react'
import { Box, Text, Button as ChakraButton, VStack, HStack, Badge } from '@chakra-ui/react'
import Modal from './Modal'

interface Props {
  isOpen: boolean
  onClose: () => void
  projectName: string
  conversationCount: number
  messageCount: number
  onConfirm: () => Promise<void>
}

const DeleteProjectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projectName,
  conversationCount,
  messageCount,
  onConfirm
}) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [input, setInput] = useState('')
  const matches = useMemo(() => input === projectName, [input, projectName])

  const footer = (
    <HStack justify="space-between" w="full">
      <ChakraButton onClick={() => (step === 1 ? onClose() : setStep(1))} variant="ghost">
        {step === 1 ? 'Cancel' : 'Back'}
      </ChakraButton>
      {step === 1 ? (
        <ChakraButton colorScheme="red" onClick={() => setStep(2)}>
          Continue
        </ChakraButton>
      ) : (
        <ChakraButton colorScheme="red" isDisabled={!matches} onClick={onConfirm}>
          Delete Project
        </ChakraButton>
      )}
    </HStack>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setStep(1)
        setInput('')
        onClose()
      }}
      title={step === 1 ? 'Delete Project' : 'Confirm Deletion'}
      footer={footer}
    >
      {step === 1 ? (
        <VStack align="stretch" spacing={3}>
          <Text>
            You are about to permanently delete project “{projectName}”. This action will delete:
          </Text>
          <HStack>
            <Badge colorScheme="red">{conversationCount}</Badge>
            <Text>conversations</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="red">{messageCount}</Badge>
            <Text>messages</Text>
          </HStack>
          <Text fontWeight="semibold" color="red.500">
            This action cannot be undone.
          </Text>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={3}>
          <Text>Type the project name to confirm deletion:</Text>
          <Box
            as="input"
            value={input}
            onChange={(e: any) => setInput(e.target.value)}
            placeholder={projectName}
            border="1px solid"
            borderColor={matches ? 'green.400' : 'red.400'}
            borderRadius="md"
            p={2}
          />
          <Text fontSize="sm" color={matches ? 'green.500' : 'red.500'}>
            {matches ? '✓ Names match' : "Names don't match"}
          </Text>
        </VStack>
      )}
    </Modal>
  )
}

export default DeleteProjectModal
