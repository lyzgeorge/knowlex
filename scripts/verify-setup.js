#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔍 Verifying Knowlex Desktop App Development Environment...\n')

const checks = [
  {
    name: 'Package.json exists',
    check: () => fs.existsSync('package.json'),
  },
  {
    name: 'Node modules installed',
    check: () => fs.existsSync('node_modules'),
  },
  {
    name: 'TypeScript configuration',
    check: () => fs.existsSync('tsconfig.json'),
  },
  {
    name: 'ESLint configuration',
    check: () => fs.existsSync('.eslintrc.js'),
  },
  {
    name: 'Prettier configuration',
    check: () => fs.existsSync('.prettierrc'),
  },
  {
    name: 'Jest configuration',
    check: () => fs.existsSync('jest.config.js'),
  },
  {
    name: 'Husky hooks',
    check: () => fs.existsSync('.husky/pre-commit'),
  },
  {
    name: 'Vite configuration',
    check: () => fs.existsSync('vite.config.ts'),
  },
  {
    name: 'Electron main process',
    check: () => fs.existsSync('src-electron/main/index.ts'),
  },
  {
    name: 'Electron preload script',
    check: () => fs.existsSync('src-electron/preload/index.ts'),
  },
  {
    name: 'React app entry',
    check: () => fs.existsSync('src/main.tsx'),
  },
  {
    name: 'CI configuration',
    check: () => fs.existsSync('.github/workflows/ci.yml'),
  },
]

let passed = 0
let failed = 0

checks.forEach(({ name, check }) => {
  try {
    if (check()) {
      console.log(`✅ ${name}`)
      passed++
    } else {
      console.log(`❌ ${name}`)
      failed++
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`)
    failed++
  }
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n🎉 Development environment setup is complete!')
  console.log('\n📝 Next steps:')
  console.log('   • Run `pnpm run electron:dev` to start development')
  console.log('   • Run `pnpm test` to run tests')
  console.log('   • Run `pnpm run build` to build the application')
} else {
  console.log('\n⚠️  Some checks failed. Please review the setup.')
  process.exit(1)
}
