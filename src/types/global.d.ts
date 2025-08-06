/**
 * Global type declarations for Knowlex Desktop Application
 */

// Note: Window.electronAPI is declared in src/types/ipc.types.ts

// Module declarations for JSON imports
declare module '*.json' {
  const value: any
  export default value
}

// CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.module.scss' {
  const classes: { [key: string]: string }
  export default classes
}

// SVG imports
declare module '*.svg' {
  import React from 'react'
  const SVG: React.VFC<React.SVGProps<SVGSVGElement>>
  export default SVG
}

// Image imports
declare module '*.png' {
  const value: string
  export default value
}

declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.jpeg' {
  const value: string
  export default value
}

declare module '*.gif' {
  const value: string
  export default value
}

declare module '*.webp' {
  const value: string
  export default value
}

// Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    REACT_APP_VERSION?: string
    REACT_APP_BUILD_DATE?: string
    REACT_APP_API_URL?: string
  }
}

export {}
