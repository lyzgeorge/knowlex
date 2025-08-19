import { Menu, MenuItem, BrowserWindow, shell, dialog, app } from 'electron'

/**
 * Sets up the application menu
 */
export function setupApplicationMenu(): void {
  const template = createMenuTemplate()
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Creates the menu template based on platform
 */
function createMenuTemplate(): Electron.MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { label: 'About Knowlex', role: 'about' as const },
              { type: 'separator' as const },
              { label: 'Preferences...', accelerator: 'CmdOrCtrl+,', click: () => openSettings() },
              { type: 'separator' as const },
              { label: 'Services', role: 'services' as const, submenu: [] },
              { type: 'separator' as const },
              { label: 'Hide Knowlex', role: 'hide' as const },
              { label: 'Hide Others', role: 'hideOthers' as const },
              { label: 'Show All', role: 'unhide' as const },
              { type: 'separator' as const },
              { label: 'Quit Knowlex', role: 'quit' as const }
            ]
          }
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => createNewChat()
        },
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => createNewProject()
        },
        { type: 'separator' },
        {
          label: 'Open Project Folder',
          accelerator: 'CmdOrCtrl+O',
          click: () => openProjectFolder()
        },
        { type: 'separator' },
        {
          label: 'Import Files',
          accelerator: 'CmdOrCtrl+I',
          click: () => importFiles()
        },
        {
          label: 'Export Chat',
          accelerator: 'CmdOrCtrl+E',
          click: () => exportChat()
        },
        { type: 'separator' },
        ...(isMac
          ? []
          : [
              {
                label: 'Preferences',
                accelerator: 'CmdOrCtrl+,',
                click: () => openSettings()
              },
              { type: 'separator' as const }
            ]),
        ...(isMac ? [] : [{ label: 'Exit', role: 'quit' as const }])
      ]
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', role: 'undo' },
        { label: 'Redo', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        ...(isMac
          ? [
              { label: 'Paste and Match Style', role: 'pasteAndMatchStyle' as const },
              { label: 'Delete', role: 'delete' as const },
              { label: 'Select All', role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [
                  { label: 'Start Speaking', role: 'startSpeaking' as const },
                  { label: 'Stop Speaking', role: 'stopSpeaking' as const }
                ]
              }
            ]
          : [
              { label: 'Delete', role: 'delete' as const },
              { type: 'separator' as const },
              { label: 'Select All', role: 'selectAll' as const }
            ])
      ]
    },

    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => toggleSidebar()
        },
        { type: 'separator' },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => openSearch()
        },
        {
          label: 'Global Search',
          accelerator: 'CmdOrCtrl+P',
          click: () => openGlobalSearch()
        },
        { type: 'separator' },
        { label: 'Reload', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', role: 'resetZoom' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', role: 'togglefullscreen' }
      ]
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', role: 'minimize' },
        { label: 'Close', role: 'close' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { label: 'Bring All to Front', role: 'front' as const }
            ]
          : [])
      ]
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Knowlex',
          click: () => showAbout()
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => showKeyboardShortcuts()
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/knowlex/desktop/issues')
        },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.knowlex.com')
        }
      ]
    }
  ]

  return template
}

/**
 * Creates a context menu for chat messages
 */
export function createMessageContextMenu(messageId: string): Menu {
  const menu = new Menu()

  menu.append(
    new MenuItem({
      label: 'Copy Message',
      accelerator: 'CmdOrCtrl+C',
      click: () => copyMessage(messageId)
    })
  )

  menu.append(
    new MenuItem({
      label: 'Edit & Retry',
      click: () => editAndRetryMessage(messageId)
    })
  )

  menu.append(
    new MenuItem({
      label: 'Regenerate',
      click: () => regenerateMessage(messageId)
    })
  )

  menu.append(
    new MenuItem({
      label: 'Fork Conversation',
      click: () => forkConversation(messageId)
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  menu.append(
    new MenuItem({
      label: 'Delete Message',
      click: () => deleteMessage(messageId)
    })
  )

  return menu
}

/**
 * Creates a context menu for project files
 */
export function createFileContextMenu(fileId: string): Menu {
  const menu = new Menu()

  menu.append(
    new MenuItem({
      label: 'Open File',
      click: () => openFile(fileId)
    })
  )

  menu.append(
    new MenuItem({
      label: 'Show in Folder',
      click: () => showFileInFolder(fileId)
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  menu.append(
    new MenuItem({
      label: 'Reprocess File',
      click: () => reprocessFile(fileId)
    })
  )

  menu.append(
    new MenuItem({
      label: 'Remove from Project',
      click: () => removeFileFromProject(fileId)
    })
  )

  return menu
}

// Menu action handlers
function createNewChat(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'new-chat' })
  }
}

function createNewProject(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'new-project' })
  }
}

function openProjectFolder(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'open-project-folder' })
  }
}

function importFiles(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'import-files' })
  }
}

function exportChat(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'export-chat' })
  }
}

function openSettings(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'open-settings' })
  }
}

function toggleSidebar(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'toggle-sidebar' })
  }
}

function openSearch(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'open-search' })
  }
}

function openGlobalSearch(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'open-global-search' })
  }
}

function showAbout(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    dialog.showMessageBox(focusedWindow, {
      type: 'info',
      title: 'About Knowlex',
      message: 'Knowlex Desktop',
      detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`
    })
  }
}

function showKeyboardShortcuts(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-action', { type: 'show-keyboard-shortcuts' })
  }
}

// Context menu action handlers
function copyMessage(messageId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'copy-message',
      messageId
    })
  }
}

function editAndRetryMessage(messageId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'edit-and-retry',
      messageId
    })
  }
}

function regenerateMessage(messageId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'regenerate-message',
      messageId
    })
  }
}

function forkConversation(messageId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'fork-conversation',
      messageId
    })
  }
}

function deleteMessage(messageId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'delete-message',
      messageId
    })
  }
}

function openFile(fileId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'open-file',
      fileId
    })
  }
}

function showFileInFolder(fileId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'show-file-in-folder',
      fileId
    })
  }
}

function reprocessFile(fileId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'reprocess-file',
      fileId
    })
  }
}

function removeFileFromProject(fileId: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('context-menu-action', {
      type: 'remove-file-from-project',
      fileId
    })
  }
}
