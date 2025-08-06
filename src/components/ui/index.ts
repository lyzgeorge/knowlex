/**
 * UI Component Library for Knowlex Desktop Application
 *
 * This file exports all reusable UI components that follow the design system.
 * Components are built on top of Chakra UI with custom theming and TypeScript support.
 */

// Common/Foundation Components
export * from './common'

// Layout Components
export { default as Sidebar } from './layout/Sidebar'
export { default as Header } from './layout/Header'
export { default as MainLayout } from './layout/MainLayout'

// Knowlex Specific Components
export * from './knowlex'

// Types
export type * from './types'

// Re-export key components for convenience
export { default as Button } from './common/Button'
export { default as Input } from './common/Input'
export { default as Card } from './common/Card'
export { default as Icon } from './common/Icon'
