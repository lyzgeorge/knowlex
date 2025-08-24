import { ipcMain } from 'electron'
import { settingsService } from '@main/services/settings'

/**
 * Settings IPC handlers
 *
 * Handles communication between renderer and main processes for settings management
 */

export function registerSettingsIPCHandlers() {
  console.log('Registering settings IPC handlers...')

  // Get settings
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = settingsService.getSettings()
      return {
        success: true,
        data: settings
      }
    } catch (error) {
      console.error('Failed to get settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings'
      }
    }
  })

  // Update settings (if needed in the future)
  ipcMain.handle('settings:update', async (_, updates) => {
    try {
      // For now, settings are read-only from environment
      // This could be extended to support runtime updates
      console.log('Settings update requested:', updates)
      return {
        success: true,
        data: settingsService.getSettings()
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings'
      }
    }
  })

  console.log('Settings IPC handlers registered successfully')
}

export function unregisterSettingsIPCHandlers() {
  console.log('Unregistering settings IPC handlers...')
  ipcMain.removeHandler('settings:get')
  ipcMain.removeHandler('settings:update')
  console.log('Settings IPC handlers unregistered successfully')
}
