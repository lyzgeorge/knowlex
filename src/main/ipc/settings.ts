import { ipcMain } from 'electron'
import { settingsService } from '@main/services/settings'
import { getErrorMessage } from '@shared/utils/error-handling'

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
        error: getErrorMessage(error, 'Failed to get settings')
      }
    }
  })

  // Update settings
  ipcMain.handle(
    'settings:update',
    async (_, updates: Partial<import('@main/services/settings').AppSettings>) => {
      try {
        settingsService.updateSettings(updates)
        return {
          success: true,
          data: settingsService.getSettings()
        }
      } catch (error) {
        console.error('Failed to update settings:', error)
        return {
          success: false,
          error: getErrorMessage(error, 'Failed to update settings')
        }
      }
    }
  )

  console.log('Settings IPC handlers registered successfully')
}

export function unregisterSettingsIPCHandlers() {
  console.log('Unregistering settings IPC handlers...')
  ipcMain.removeHandler('settings:get')
  ipcMain.removeHandler('settings:update')
  console.log('Settings IPC handlers unregistered successfully')
}
