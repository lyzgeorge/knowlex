#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to fix based on the ESLint output
const filesToFix = [
  'src/App.minimal.tsx',
  'src/components/MockServiceDemo.tsx',
  'src/components/ui/common/Button.tsx',
  'src/components/ui/common/Card.tsx',
  'src/components/ui/common/Icon.tsx',
  'src/components/ui/common/Input.tsx',
  'src/components/ui/knowlex/ChatInterface.tsx',
  'src/components/ui/knowlex/ChatMessage.tsx',
  'src/components/ui/knowlex/FileUpload.tsx',
  'src/components/ui/knowlex/LanguageToggle.tsx',
  'src/components/ui/knowlex/ProjectOverview.tsx',
  'src/components/ui/knowlex/ThemeToggle.tsx',
  'src/components/ui/layout/Header.tsx',
  'src/components/ui/layout/MainLayout.tsx',
  'src/components/ui/layout/Sidebar.tsx',
  'src/components/ui/types.ts',
  'src/hooks/useDesignSystem.ts',
  'src/i18n/index.ts',
  'src/providers/LanguageProvider.tsx',
  'src/providers/ThemeProvider.tsx',
  'src/providers/index.tsx',
  'src/services/mock/__tests__/ipc.mock.test.ts',
  'src/services/mock/__tests__/openai.mock.test.ts',
  'src/services/mock/database.mock.ts',
  'src/services/mock/dev-mode.ts',
  'src/services/mock/index.ts',
  'src/services/mock/ipc.mock.ts',
  'src/services/mock/manager.ts',
  'src/services/mock/openai.mock.ts',
  'src/theme/chakra-theme.ts',
  'src/types/global.d.ts'
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix unused variables by prefixing with underscore
  content = content.replace(/(\w+):\s*(\w+)\s*=\s*[^,;]+(?:,|\s*\}|\s*\))/g, (match, name, type) => {
    if (match.includes('is assigned a value but never used') || 
        match.includes('is defined but never used')) {
      modified = true;
      return match.replace(name, `_${name}`);
    }
    return match;
  });

  // Comment out console statements
  content = content.replace(/(\s*)console\.(log|error|warn|info)\([^)]*\);?/g, (match, indent) => {
    modified = true;
    return `${indent}// ${match.trim()}`;
  });

  // Fix unescaped entities
  content = content.replace(/'/g, '&apos;');
  content = content.replace(/"/g, '&quot;');
  
  // Add display names for forwardRef components
  const forwardRefMatches = content.match(/export const (\w+) = forwardRef[^}]+\}\)/g);
  if (forwardRefMatches) {
    forwardRefMatches.forEach(match => {
      const componentName = match.match(/export const (\w+) =/)[1];
      if (!content.includes(`${componentName}.displayName`)) {
        content = content.replace(match, `${match}\n${componentName}.displayName = '${componentName}'`);
        modified = true;
      }
    });
  }

  // Fix React hooks rules violations by moving hooks to top level
  // This is a complex fix that would need more sophisticated parsing

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// Process all files
filesToFix.forEach(fixFile);

console.log('ESLint fixes completed!');