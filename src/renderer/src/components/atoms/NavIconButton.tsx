import { IconButton, IconButtonProps } from '@chakra-ui/react'
import { ElementType } from 'react'

interface NavIconButtonProps extends Omit<IconButtonProps, 'aria-label'> {
  icon: ElementType
  label: string
}

export const NavIconButton = ({ icon, label, ...props }: NavIconButtonProps) => {
  return (
    <IconButton
      as={icon}
      aria-label={label}
      variant="ghost"
      size="sm"
      color="gray.400"
      _hover={{
        color: 'white',
        bg: 'gray.700'
      }}
      {...props}
    />
  )
}
