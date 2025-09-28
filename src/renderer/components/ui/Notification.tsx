import type { ReactNode } from 'react'

interface NotificationProviderProps {
  children: ReactNode
}

/**
 * Chakra's `useToast` already exposes notifications globally through the hook.
 * We keep this provider as a structural placeholder so the tree stays future-proof
 * but it simply renders its children for now.
 */
export function NotificationProvider({ children }: NotificationProviderProps): JSX.Element {
  return <>{children}</>
}
