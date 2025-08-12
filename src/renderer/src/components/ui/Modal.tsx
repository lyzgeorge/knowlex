import React from 'react'
import {
  Modal as ChakraModal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  ModalProps as ChakraModalProps,
  UseDisclosureReturn
} from '@chakra-ui/react'

export interface ModalProps extends Omit<ChakraModalProps, 'children'> {
  /** Modal disclosure state and handlers */
  disclosure?: UseDisclosureReturn
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to call when the modal should be closed */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Modal size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
  /** Whether the modal should be centered */
  isCentered?: boolean
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Whether clicking outside should close the modal */
  closeOnOverlayClick?: boolean
  /** Whether pressing escape should close the modal */
  closeOnEsc?: boolean
  /** Custom header content */
  header?: React.ReactNode
  /** Modal body content */
  children: React.ReactNode
  /** Custom footer content */
  footer?: React.ReactNode
  /** Whether to block scroll when modal is open */
  blockScrollOnMount?: boolean
  /** Preserve scroll bar gap */
  preserveScrollBarGap?: boolean
  /** Modal z-index */
  zIndex?: number
}

/**
 * Modal component for dialogs, confirmations, and forms
 *
 * Features:
 * - Backdrop overlay with customizable click behavior
 * - Smooth fade-in/fade-out animations
 * - Keyboard navigation (ESC to close)
 * - Multiple size variants (xs to full)
 * - Header, body, footer sections
 * - Full accessibility support
 * - Scroll management
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  isCentered = true,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  header,
  children,
  footer,
  blockScrollOnMount = true,
  preserveScrollBarGap = true,
  zIndex = 1400,
  ...rest
}) => {
  return (
    <ChakraModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      isCentered={isCentered}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEsc={closeOnEsc}
      blockScrollOnMount={blockScrollOnMount}
      preserveScrollBarGap={preserveScrollBarGap}
      // Accessibility
      trapFocus={true}
      returnFocusOnClose={true}
      // Animation
      motionPreset="slideInBottom"
      {...rest}
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent zIndex={zIndex}>
        {(title || header) && <ModalHeader>{header || title}</ModalHeader>}

        {showCloseButton && (
          <ModalCloseButton
            aria-label="Close modal"
            _focus={{
              boxShadow: 'outline'
            }}
          />
        )}

        <ModalBody>{children}</ModalBody>

        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </ChakraModal>
  )
}

Modal.displayName = 'Modal'

export default Modal
