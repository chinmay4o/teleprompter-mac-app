// Renders tools/icon.html offscreen in Electron, captures a 1024×1024 PNG,
// then builds an .icns iconset from it. Run with:  npx electron tools/make-icon.js
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    useContentSize: true,
    webPreferences: { offscreen: false },
  })

  await win.loadFile(path.join(__dirname, 'icon.html'))
  // give the web font a moment to load and paint
  await new Promise(r => setTimeout(r, 600))

  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 })
  const out = path.join(__dirname, '..', 'build', 'icon-1024.png')
  fs.writeFileSync(out, image.toPNG())
  console.log('wrote ' + out)
  app.quit()
})
