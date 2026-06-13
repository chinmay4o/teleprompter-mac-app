const { app, BrowserWindow, ipcMain, session, systemPreferences } = require('electron')
const path = require('path')

let win = null

// Ask macOS for camera + microphone access up front so the native TCC prompt
// appears on first launch. Without this, getUserMedia can silently hang waiting
// on a permission decision the OS never surfaces.
async function ensureMediaAccess() {
  if (process.platform !== 'darwin') return
  for (const type of ['camera', 'microphone']) {
    try {
      const status = systemPreferences.getMediaAccessStatus(type)
      if (status !== 'granted') await systemPreferences.askForMediaAccess(type)
    } catch (e) { /* not fatal — renderer will fall back gracefully */ }
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: '#F0EBE2',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Grant camera/mic access to the renderer (both the request and the check path)
  const allow = (permission) => ['media', 'microphone', 'audioCapture', 'videoCapture'].includes(permission)
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => callback(allow(permission)))
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allow(permission))

  win.loadFile('index.html')
  win.on('closed', () => { win = null })
}

app.whenReady().then(async () => {
  // Dev-mode dock icon (packaged builds use build/icon.icns automatically)
  if (process.platform === 'darwin' && app.dock) {
    try { app.dock.setIcon(path.join(__dirname, 'build', 'icon-1024.png')) } catch (e) {}
  }
  await ensureMediaAccess()
  createWindow()
  app.on('activate', () => { if (!win) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('set-always-on-top', (_, flag) => {
  win?.setAlwaysOnTop(flag, 'floating')
})
