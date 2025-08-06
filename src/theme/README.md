# Knowlex Design System

This document provides an overview of the Knowlex design system and guidelines for using it effectively in the application.

## Overview

The Knowlex design system is built on top of Chakra UI and provides:

- **Design Tokens**: Consistent values for colors, typography, spacing, and more
- **Semantic Tokens**: Theme-aware tokens that adapt to light/dark modes
- **Component Library**: Pre-built components following design system principles
- **Theme Integration**: Seamless integration between Chakra UI and Tailwind CSS
- **TypeScript Support**: Full type safety and IntelliSense support
- **Accessibility**: WCAG-compliant components with proper ARIA attributes

## Quick Start

```tsx
import { Button, Input, Card, useDesignTokens } from '@/components/ui';
import { useColors, useResponsive } from '@/hooks';

function MyComponent() {
  const colors = useColors();
  const { isMobile } = useResponsive();
  const tokens = useDesignTokens();
  
  return (
    <Card>
      <Button size={isMobile ? 'sm' : 'md'}>
        Click me
      </Button>
    </Card>
  );
}
```

## Design Tokens

### Colors

```tsx
import { colors } from '@/theme/tokens';

// Brand colors
colors.primary[500]  // Main brand color
colors.secondary[500]  // Secondary brand color

// Semantic colors
colors.success[500]  // Success state
colors.warning[500]  // Warning state
colors.error[500]    // Error state

// Neutral colors
colors.gray[500]     // Light theme grays
colors.dark[500]     // Dark theme grays
```

### Typography

```tsx
import { typography } from '@/theme/tokens';

// Font families
typography.fonts.heading  // For headings
typography.fonts.body     // For body text
typography.fonts.mono     // For code

// Font sizes
typography.fontSizes.xs   // 12px
typography.fontSizes.sm   // 14px
typography.fontSizes.md   // 16px (base)
typography.fontSizes.lg   // 18px
// ... and more
```

### Spacing

```tsx
import { spacing } from '@/theme/tokens';

// 4px grid system
spacing[1]   // 4px
spacing[2]   // 8px
spacing[4]   // 16px
spacing[8]   // 32px
// ... and more
```

## Semantic Tokens

Use semantic tokens for theme-aware styling:

```tsx
import { useColors } from '@/hooks';

function ThemedComponent() {
  const colors = useColors();
  
  return (
    <Box
      bg={colors.background.surface}
      color={colors.text.primary}
      borderColor={colors.border.primary}
    >
      Content adapts to theme automatically
    </Box>
  );
}
```

## Component Usage

### Button Component

```tsx
import { Button, PrimaryButton, IconButton } from '@/components/ui';

// Basic usage
<Button variant="solid" size="md">Click me</Button>

// Convenience components
<PrimaryButton loading loadingText="Saving...">Save</PrimaryButton>

// Icon button
<IconButton 
  icon={<SearchIcon />} 
  aria-label="Search" 
  size="sm" 
/>
```

### Input Component

```tsx
import { Input, SearchInput, PasswordInput } from '@/components/ui';

// Basic input with validation
<Input
  label="Email"
  type="email"
  required
  error={validationError}
  helperText="We'll never share your email"
/>

// Specialized inputs
<SearchInput placeholder="Search..." />
<PasswordInput label="Password" showPasswordToggle />
```

### Card Component

```tsx
import { Card, ClickableCard, LoadingCard } from '@/components/ui';

// Basic card
<Card
  title="Card Title"
  subtitle="Card subtitle"
  footer={<Button>Action</Button>}
>
  Card content goes here
</Card>

// Interactive card
<ClickableCard
  onClick={() => console.log('clicked')}
  icon={<FileIcon />}
  title="Clickable Card"
>
  This card is clickable
</ClickableCard>
```

### Icon Component

```tsx
import { Icon, SearchIcon, PlusIcon, createHeroIcon } from '@/components/ui';

// Using built-in icons
<SearchIcon size="md" color="primary.500" />
<PlusIcon size="lg" />

// Custom icon from design tokens
<Icon path="customPath" size="sm" />

// Wrapping external icon libraries
const CustomIcon = createHeroIcon(HeroIconComponent, 'Custom Icon');
<CustomIcon size="md" />
```

## Hooks

### useColors

Get theme-aware colors:

```tsx
import { useColors } from '@/hooks';

function ThemedComponent() {
  const colors = useColors();
  
  return (
    <Box bg={colors.background.canvas}>
      <Text color={colors.text.primary}>Primary text</Text>
      <Text color={colors.text.muted}>Muted text</Text>
    </Box>
  );
}
```

### useResponsive

Handle responsive design:

```tsx
import { useResponsive } from '@/hooks';

function ResponsiveComponent() {
  const { isMobile, isTablet, componentSize } = useResponsive();
  
  return (
    <Button size={componentSize}>
      {isMobile ? 'Mobile' : 'Desktop'}
    </Button>
  );
}
```

### useComponentStyles

Get pre-configured component styles:

```tsx
import { useComponentStyles } from '@/hooks';

function StyledComponent() {
  const styles = useComponentStyles();
  
  return <Box {...styles.card.base}>Card content</Box>;
}
```

## Theming

### Theme Switching

```tsx
import { ThemeToggle } from '@/components/ui';

// Icon button that cycles themes
<ThemeToggle variant="icon" />

// Dropdown menu with all options
<ThemeToggle variant="menu" showLabel />
```

### Language Switching

```tsx
import { LanguageToggle } from '@/components/ui';

// Compact language selector
<LanguageToggle variant="compact" />

// Full menu with flags and names
<LanguageToggle variant="menu" showNativeName />
```

## Tailwind Integration

The design system is fully integrated with Tailwind CSS:

```tsx
// Use design system classes
<div className="btn btn-primary btn-md">
  Tailwind button using design system
</div>

// Custom utilities
<div className="flex-center glass-effect">
  Centered content with glass effect
</div>

// Responsive utilities
<div className="layout-sidebar md:layout-sidebar-collapsed">
  Responsive sidebar
</div>
```

## Best Practices

### 1. Use Semantic Tokens

```tsx
// ✅ Good - adapts to theme
const colors = useColors();
<Text color={colors.text.primary} />

// ❌ Avoid - hardcoded values
<Text color="gray.800" />
```

### 2. Leverage Component Variants

```tsx
// ✅ Good - use provided variants
<Button variant="solid" size="md">Submit</Button>
<PrimaryButton>Submit</PrimaryButton>

// ❌ Avoid - custom styling
<Button bg="blue.500" color="white">Submit</Button>
```

### 3. Use Responsive Hooks

```tsx
// ✅ Good - responsive aware
const { componentSize } = useResponsive();
<Button size={componentSize}>Responsive</Button>

// ❌ Avoid - fixed sizes
<Button size="md">Fixed</Button>
```

### 4. Follow Accessibility Guidelines

```tsx
// ✅ Good - accessible
<IconButton 
  icon={<DeleteIcon />} 
  aria-label="Delete item"
  onClick={handleDelete}
/>

// ❌ Avoid - missing accessibility
<Box onClick={handleDelete}>
  <DeleteIcon />
</Box>
```

### 5. Use TypeScript Types

```tsx
// ✅ Good - typed props
interface Props {
  variant: ButtonProps['variant'];
  size: IconSize;
}

// ❌ Avoid - any types
interface Props {
  variant: any;
  size: any;
}
```

## Component Architecture

### File Structure

```
src/
├── components/ui/
│   ├── common/          # Foundation components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Icon.tsx
│   ├── layout/          # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MainLayout.tsx
│   ├── knowlex/         # App-specific components
│   │   ├── ChatMessage.tsx
│   │   ├── FileUpload.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── LanguageToggle.tsx
│   └── index.ts         # Main export
├── theme/
│   ├── tokens.ts        # Design tokens
│   ├── chakra-theme.ts  # Chakra UI theme
│   └── index.ts         # Theme exports
└── hooks/
    ├── useDesignSystem.ts  # Design system hooks
    └── index.ts            # Hook exports
```

### Component Patterns

All components follow consistent patterns:

1. **Props Interface**: Well-defined TypeScript interfaces
2. **forwardRef**: Proper ref forwarding for composition
3. **Accessibility**: ARIA attributes and keyboard navigation
4. **Theme Integration**: Uses semantic tokens and design system
5. **Documentation**: JSDoc comments with usage examples

## Migration Guide

If migrating from existing components:

1. Replace hardcoded values with design tokens
2. Use semantic color tokens instead of specific colors
3. Add proper TypeScript types
4. Include accessibility attributes
5. Test in both light and dark themes

## Contributing

When adding new components:

1. Follow existing patterns in `/components/ui/common/`
2. Use design tokens from `/theme/tokens.ts`
3. Include proper TypeScript types
4. Add accessibility support
5. Test responsive behavior
6. Document usage examples

## Resources

- [Chakra UI Documentation](https://chakra-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Aria Documentation](https://react-spectrum.adobe.com/react-aria/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)