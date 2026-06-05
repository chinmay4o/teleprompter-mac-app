const { app, BrowserWindow, ipcMain, session } = require('electron')
const path = require('path')

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 860,
    height: 540,
    minWidth: 440,
    minHeight: 320,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 13 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Grant microphone access to the renderer
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(['media', 'microphone'].includes(permission))
  })

  win.loadFile('index.html')
  win.on('closed', () => { win = null })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (!win) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('set-always-on-top', (_, flag) => {
  win?.setAlwaysOnTop(flag, 'floating')
})
