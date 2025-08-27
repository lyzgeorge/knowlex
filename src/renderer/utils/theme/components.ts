/**
 * Component theme overrides for Knowlex Desktop Application
 * Customizes Chakra UI components for consistent design
 */

export const components = {
  // Button component
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'md',
      transition: 'all 0.2s ease-in-out',
      _focus: {
        boxShadow: 'none'
      }
    },
    sizes: {
      sm: {
        h: '32px',
        minW: '32px',
        fontSize: 'sm',
        px: 3
      },
      md: {
        h: '40px',
        minW: '40px',
        fontSize: 'sm',
        px: 4
      },
      lg: {
        h: '48px',
        minW: '48px',
        fontSize: 'lg',
        px: 6
      }
    },
    variants: {
      solid: (props: any) => ({
        bg: props.colorScheme === 'primary' ? 'primary.500' : `${props.colorScheme}.500`,
        color: 'white',
        _hover: {
          bg: props.colorScheme === 'primary' ? 'primary.600' : `${props.colorScheme}.600`,
          shadow: 'button-hover'
        },
        _active: {
          bg: props.colorScheme === 'primary' ? 'primary.700' : `${props.colorScheme}.700`,
          transform: 'translateY(1px)'
        }
      }),
      outline: (props: any) => ({
        border: '1px solid',
        borderColor: props.colorScheme === 'primary' ? 'primary.500' : `${props.colorScheme}.500`,
        color: props.colorScheme === 'primary' ? 'primary.500' : `${props.colorScheme}.500`,
        _hover: {
          bg: props.colorScheme === 'primary' ? 'primary.50' : `${props.colorScheme}.50`,
          _dark: {
            bg: props.colorScheme === 'primary' ? 'primary.900' : `${props.colorScheme}.900`
          }
        }
      }),
      ghost: (props: any) => ({
        color: props.colorScheme === 'primary' ? 'primary.500' : `${props.colorScheme}.500`,
        _hover: {
          bg: props.colorScheme === 'primary' ? 'primary.50' : `${props.colorScheme}.50`,
          _dark: {
            bg: props.colorScheme === 'primary' ? 'primary.900' : `${props.colorScheme}.900`
          }
        }
      })
    },
    defaultProps: {
      colorScheme: 'primary',
      size: 'md'
    }
  },

  // Input component
  Input: {
    baseStyle: {
      field: {
        borderRadius: 'md',
        transition: 'all 0.2s ease-in-out',
        _focus: {
          borderColor: 'primary.500',
          boxShadow: 'input-focus'
        },
        _invalid: {
          borderColor: 'error.500',
          boxShadow: 'input-error'
        }
      }
    },
    variants: {
      outline: {
        field: {
          border: '1px solid',
          borderColor: 'border.primary',
          bg: 'background.primary',
          _hover: {
            borderColor: 'border.primary'
          }
        }
      },
      filled: {
        field: {
          bg: 'surface.secondary',
          border: 'none',
          _hover: {
            bg: 'surface.hover'
          },
          _focus: {
            bg: 'background.primary',
            borderColor: 'primary.500'
          }
        }
      }
    },
    sizes: {
      sm: {
        field: {
          h: '32px',
          fontSize: 'sm',
          px: 3
        }
      },
      md: {
        field: {
          h: '40px',
          fontSize: 'sm',
          px: 4
        }
      },
      lg: {
        field: {
          h: '48px',
          fontSize: 'lg',
          px: 6
        }
      }
    },
    defaultProps: {
      variant: 'outline',
      size: 'md'
    }
  },

  // Textarea component
  Textarea: {
    baseStyle: {
      borderRadius: 'md',
      transition: 'all 0.2s ease-in-out',
      _focus: {
        borderColor: 'primary.500',
        boxShadow: 'input-focus'
      },
      _invalid: {
        borderColor: 'error.500',
        boxShadow: 'input-error'
      }
    },
    variants: {
      outline: {
        border: '1px solid',
        borderColor: 'border.primary',
        bg: 'background.primary',
        _hover: {
          borderColor: 'border.primary'
        }
      }
    },
    defaultProps: {
      variant: 'outline'
    }
  },

  // Card component
  Card: {
    parts: ['container'],
    baseStyle: {
      container: {
        borderRadius: 'lg',
        shadow: 'sm',
        border: '1px solid',
        borderColor: 'border.primary',
        bg: 'surface.primary',
        transition: 'all 0.2s ease-in-out'
      }
    },
    variants: {
      elevated: {
        container: {
          shadow: 'md',
          _hover: {
            shadow: 'lg',
            transform: 'translateY(-2px)'
          }
        }
      },
      outline: {
        container: {
          shadow: 'none',
          border: '1px solid',
          borderColor: 'border.primary'
        }
      },
      file: {
        container: {
          shadow: 'file-card',
          _hover: {
            shadow: 'file-card-hover',
            transform: 'translateY(-1px)'
          },
          _active: {
            shadow: 'file-card-active',
            transform: 'translateY(0px)'
          }
        }
      },
      project: {
        container: {
          shadow: 'project-card',
          _hover: {
            shadow: 'project-card-hover',
            transform: 'translateY(-2px)'
          }
        }
      }
    },
    defaultProps: {
      variant: 'elevated'
    }
  },

  // Modal component
  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: 'lg',
        shadow: 'modal',
        bg: 'background.primary'
      },
      overlay: {
        backdropFilter: 'blur(4px)',
        bg: 'blackAlpha.600'
      }
    },
    sizes: {
      sm: { dialog: { maxW: 'md' } },
      md: { dialog: { maxW: 'lg' } },
      lg: { dialog: { maxW: '2xl' } },
      xl: { dialog: { maxW: '4xl' } },
      full: {
        dialog: {
          maxW: '100vw',
          maxH: '100vh',
          h: '100vh',
          m: 0,
          borderRadius: 0
        }
      }
    },
    defaultProps: {
      size: 'md',
      isCentered: true
    }
  },

  // Tabs component
  Tabs: {
    baseStyle: {
      tab: {
        fontWeight: 'medium',
        transition: 'all 0.2s ease-in-out',
        _focus: {
          boxShadow: 'none'
        }
      },
      tabpanel: {
        p: 0
      }
    },
    variants: {
      line: {
        tab: {
          borderBottom: '2px solid',
          borderColor: 'transparent',
          _selected: {
            color: 'primary.500',
            borderColor: 'primary.500'
          },
          _hover: {
            color: 'primary.400'
          }
        },
        tablist: {
          borderBottom: '1px solid',
          borderColor: 'border.primary'
        }
      },
      enclosed: {
        tab: {
          border: '1px solid',
          borderColor: 'transparent',
          borderBottom: 'none',
          borderTopRadius: 'md',
          _selected: {
            color: 'primary.500',
            borderColor: 'border.primary',
            borderBottom: '1px solid',
            borderBottomColor: 'background.primary',
            mb: '-1px'
          }
        },
        tablist: {
          borderBottom: '1px solid',
          borderColor: 'border.primary'
        }
      }
    },
    defaultProps: {
      variant: 'line',
      colorScheme: 'primary'
    }
  },

  // Menu component
  Menu: {
    baseStyle: {
      list: {
        borderRadius: 'md',
        shadow: 'dropdown',
        border: '0px',
        borderColor: 'border.primary',
        bg: 'surface.primary',
        py: 1
      },
      item: {
        transition: 'all 0.2s ease-in-out',
        _hover: {
          bg: 'surface.hover'
        },
        _focus: {
          bg: 'surface.hover'
        }
      }
    }
  },

  // Tooltip component
  Tooltip: {
    baseStyle: {
      borderRadius: 'md',
      bg: 'gray.800',
      color: 'white',
      fontSize: 'sm',
      px: 2,
      py: 1,
      maxW: '320px'
    }
  },

  // Alert component - controls Toast appearance since Toast uses Alert internally
  Alert: {
    parts: ['container', 'title', 'description', 'icon'],
    baseStyle: {
      container: {
        px: 4,
        py: 3,
        borderRadius: 'md'
      }
    },
    variants: {
      solid: (props: any) => {
        // Map Chakra's default status->colorScheme mappings to our custom colors
        const statusColorMap: Record<string, string> = {
          success: 'success', // Maps to our custom success colors
          error: 'error', // Maps to our custom error colors
          warning: 'warning', // Maps to our custom warning colors
          info: 'info' // Maps to our custom info colors
        }

        const colorScheme =
          (props.status && statusColorMap[props.status]) || props.colorScheme || 'info'

        return {
          container: {
            bg: `${colorScheme}.500`,
            color: 'white'
          }
        }
      },
      subtle: (props: any) => {
        const statusColorMap: Record<string, string> = {
          success: 'success',
          error: 'error',
          warning: 'warning',
          info: 'info'
        }

        const colorScheme =
          (props.status && statusColorMap[props.status]) || props.colorScheme || 'info'

        return {
          container: {
            bg: `${colorScheme}.50`,
            color: `${colorScheme}.800`,
            _dark: {
              bg: `${colorScheme}.900`,
              color: `${colorScheme}.200`
            }
          }
        }
      }
    }
  },

  // Badge component
  Badge: {
    baseStyle: {
      borderRadius: 'full',
      fontWeight: 'medium',
      fontSize: 'xs',
      px: 2,
      py: 1
    },
    variants: {
      solid: (props: any) => ({
        bg: `${props.colorScheme}.500`,
        color: 'white'
      }),
      subtle: (props: any) => ({
        bg: `${props.colorScheme}.100`,
        color: `${props.colorScheme}.800`,
        _dark: {
          bg: `${props.colorScheme}.800`,
          color: `${props.colorScheme}.200`
        }
      }),
      outline: (props: any) => ({
        border: '1px solid',
        borderColor: `${props.colorScheme}.500`,
        color: `${props.colorScheme}.500`
      })
    }
  },

  // Progress component
  Progress: {
    baseStyle: {
      track: {
        borderRadius: 'full',
        bg: 'surface.secondary'
      },
      filledTrack: {
        borderRadius: 'full',
        transition: 'all 0.3s ease'
      }
    },
    defaultProps: {
      colorScheme: 'primary'
    }
  },

  // Switch component
  Switch: {
    baseStyle: {
      track: {
        transition: 'all 0.2s ease-in-out',
        _focus: {
          boxShadow: 'none'
        }
      }
    },
    defaultProps: {
      colorScheme: 'primary'
    }
  },

  // Checkbox component
  Checkbox: {
    baseStyle: {
      control: {
        borderRadius: 'sm',
        transition: 'all 0.2s ease-in-out',
        _focus: {
          boxShadow: 'none'
        }
      }
    },
    defaultProps: {
      colorScheme: 'primary'
    }
  },

  // Radio component
  Radio: {
    baseStyle: {
      control: {
        transition: 'all 0.2s ease-in-out',
        _focus: {
          boxShadow: 'none'
        }
      }
    },
    defaultProps: {
      colorScheme: 'primary'
    }
  },

  // Text component with timestamp variant
  Text: {
    variants: {
      timestamp: {
        fontSize: 'xs',
        color: 'text.tertiary',
        lineHeight: '1rem',
        px: 1,
        py: 1
      }
    }
  }
}

export default components
