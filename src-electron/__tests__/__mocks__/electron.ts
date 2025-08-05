/**
 * Electron Mock for Testing
 *
 * Provides mock implementations of Electron APIs for unit testing.
 */

export const ipcMain = {
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  handle: jest.fn(),
  removeHandler: jest.fn(),
}

export const ipcRenderer = {
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  invoke: jest.fn(),
}

export const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadURL: jest.fn(),
  loadFile: jest.fn(),
  on: jest.fn(),
  webContents: {
    send: jest.fn(),
    setWindowOpenHandler: jest.fn(),
  },
  show: jest.fn(),
  hide: jest.fn(),
  close: jest.fn(),
}))

export const app = {
  whenReady: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  quit: jest.fn(),
  getPath: jest.fn().mockReturnValue('/mock/path'),
}

export const contextBridge = {
  exposeInMainWorld: jest.fn(),
}

export const shell = {
  openExternal: jest.fn(),
}

export const dialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
}

// Mock WebContents for testing
export const mockWebContents = {
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  id: 1,
}

// Mock IpcMainEvent for testing
export const mockIpcMainEvent = {
  reply: jest.fn(),
  sender: mockWebContents,
  processId: 1234,
  frameId: 5678,
}
