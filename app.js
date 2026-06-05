'use strict'

/* ══════════════════════════════════════════════
   Constants
══════════════════════════════════════════════ */
const READING_LINE_FRAC = 0.35   // 35% from top — eye-level under camera
const SILENCE_MS        = 380    // ms of silence before "paused"
const SPEECH_THRESHOLD  = 14     // avg amplitude 0–255 in voice band
const BASE_WPM          = 130    // baseline words-per-minute for speed calc

/* ══════════════════════════════════════════════
   State
══════════════════════════════════════════════ */
const state = {
  // Settings (persisted)
  fontSize:        48,
  speedMultiplier: 1.0,
  isDark:          true,
  isPinned:        true,

  // Runtime
  script:        '',
  isRunning:     false,
  isSpeaking:    false,
  scrollY:       0,
  maxScroll:     0,
  lastTs:        null,
  animFrame:     null,
  silenceTimer:  null,

  // Audio
  audioCtx:      null,
  analyser:      null,
  micStream:     null,
  audioData:     null,
  audioFrame:    null,
  voiceLow:      0,
  voiceHigh:     0,
}

/* ══════════════════════════════════════════════
   Element refs
══════════════════════════════════════════════ */
const el = id => document.getElementById(id)

const setupScreen   = el('setup-screen')
const promptScreen  = el('teleprompter-screen')
const scriptInput   = el('script-input')
const wordCountEl   = el('word-count')
const fontLabel     = el('font-size-label')
const speedSlider   = el('speed-slider')
const speedLabel    = el('speed-label')
const startBtn      = el('start-btn')
const themeBtn      = el('theme-btn')
const pinBtn        = el('pin-btn')
const fontDownBtn   = el('font-down-btn')
const fontUpBtn     = el('font-up-btn')
const readingLine   = el('reading-line')
const scrollWrapper = el('scroll-wrapper')
const scriptText    = el('script-text')
const micDot        = el('mic-dot')
const overlaySpeed  = el('overlay-speed')
const overlayLabel  = el('overlay-speed-label')
const resetBtn      = el('reset-btn')
const stopBtn       = el('stop-btn')
const kbHint        = el('kb-hint')

/* ══════════════════════════════════════════════
   Setup screen — init
══════════════════════════════════════════════ */
function initSetup() {
  loadSettings()
  applyTheme()
  applyFontSize()
  syncSpeedUI()
  pinBtn.classList.toggle('active', state.isPinned)
  window.electron?.setAlwaysOnTop(state.isPinned)

  // Script input
  scriptInput.addEventListener('input', () => {
    state.script = scriptInput.value
    const words = state.script.trim().split(/\s+/).filter(Boolean).length
    wordCountEl.textContent = words ? `${words} words` : '0 words'
    startBtn.disabled = !state.script.trim()
  })

  // Theme
  themeBtn.addEventListener('click', () => {
    state.isDark = !state.isDark
    applyTheme()
    save()
  })

  // Pin
  pinBtn.addEventListener('click', () => {
    state.isPinned = !state.isPinned
    pinBtn.classList.toggle('active', state.isPinned)
    window.electron?.setAlwaysOnTop(state.isPinned)
    save()
  })

  // Font size
  fontDownBtn.addEventListener('click', () => {
    state.fontSize = Math.max(24, state.fontSize - 4)
    applyFontSize(); save()
  })
  fontUpBtn.addEventListener('click', () => {
    state.fontSize = Math.min(96, state.fontSize + 4)
    applyFontSize(); save()
  })

  // Speed slider (setup)
  speedSlider.addEventListener('input', () => {
    state.speedMultiplier = parseFloat(speedSlider.value)
    syncSpeedUI(); save()
  })

  // Start
  startBtn.addEventListener('click', startTeleprompter)
}

function applyTheme() {
  document.body.classList.toggle('light', !state.isDark)
  themeBtn.textContent = state.isDark ? '☀️' : '🌙'
  themeBtn.title = state.isDark ? 'Switch to light' : 'Switch to dark'
}

function applyFontSize() {
  fontLabel.textContent = state.fontSize
  // Editor textarea — scaled preview font
  scriptInput.style.fontSize = Math.max(13, state.fontSize * 0.37) + 'px'
  // Teleprompter text updated when launched
  if (state.isRunning) {
    scriptText.style.fontSize = state.fontSize + 'px'
    updateLayout()
  }
}

function syncSpeedUI() {
  speedSlider.value  = state.speedMultiplier
  speedLabel.textContent = state.speedMultiplier.toFixed(1) + '×'
  overlaySpeed.value = state.speedMultiplier
  overlayLabel.textContent = speedLabel.textContent
}

/* ══════════════════════════════════════════════
   Teleprompter — start / stop
══════════════════════════════════════════════ */
async function startTeleprompter() {
  if (!state.script.trim()) return
  if (state.isRunning) return   // guard against rapid double-click

  // Switch screen
  setupScreen.classList.remove('active')
  promptScreen.classList.add('active')
  state.isRunning = true
  state.scrollY   = 0
  state.lastTs    = null

  // Populate
  scriptText.textContent  = state.script
  scriptText.style.fontSize = state.fontSize + 'px'
  syncSpeedUI()

  // Layout needs one paint cycle first
  await waitFrame()
  updateLayout()

  // Keyboard hint — fade out after 3 s
  kbHint.classList.remove('hidden')
  setTimeout(() => kbHint.classList.add('hidden'), 3000)

  // Start microphone
  try {
    await startMic()
  } catch (err) {
    console.error('[mic]', err)
    alert(
      'Microphone access denied.\n\n' +
      'Go to: System Settings → Privacy & Security → Microphone\n' +
      'and allow access for Electron (or this app).'
    )
    stopTeleprompter()
    return
  }

  // Scroll animation
  state.animFrame = requestAnimationFrame(scrollLoop)
}

function stopTeleprompter() {
  state.isRunning  = false
  state.isSpeaking = false
  clearTimeout(state.silenceTimer)

  cancelAnimationFrame(state.animFrame)
  cancelAnimationFrame(state.audioFrame)
  state.animFrame = null
  state.audioFrame = null

  // Tear down audio
  state.micStream?.getTracks().forEach(t => t.stop())
  state.micStream = null
  state.audioCtx?.close()
  state.audioCtx  = null
  state.analyser  = null
  state.audioData = null

  // Reset indicators
  readingLine.classList.remove('speaking')
  micDot.classList.remove('speaking')

  // Back to setup
  promptScreen.classList.remove('active')
  setupScreen.classList.add('active')
}

/* ══════════════════════════════════════════════
   Layout & scroll
══════════════════════════════════════════════ */
function updateLayout() {
  const containerH    = el('scroll-container').offsetHeight
  const readingOffset = containerH * READING_LINE_FRAC

  // Push text down so line 1 aligns with the reading line
  scrollWrapper.style.paddingTop    = readingOffset + 'px'
  // Allow one full viewport of overscroll past the last word
  scrollWrapper.style.paddingBottom = containerH + 'px'

  state.maxScroll = scriptText.offsetHeight

  // Clamp if already past new max (e.g. after resize)
  if (state.scrollY > state.maxScroll) {
    state.scrollY = state.maxScroll
    applyScroll()
  }
}

function applyScroll() {
  scrollWrapper.style.transform = `translateY(-${state.scrollY}px)`
}

function scrollLoop(ts) {
  if (!state.isRunning) return

  if (state.isSpeaking && state.scrollY < state.maxScroll) {
    const elapsed = state.lastTs ? (ts - state.lastTs) / 1000 : 0
    state.scrollY = Math.min(
      state.scrollY + pixelsPerSecond() * elapsed,
      state.maxScroll
    )
    applyScroll()
  }

  state.lastTs    = ts
  state.animFrame = requestAnimationFrame(scrollLoop)
}

/**
 * Calculate scroll speed in px/s from font size, container width and WPM.
 * Base is 130 WPM; user's speed multiplier scales linearly.
 */
function pixelsPerSecond() {
  // offsetWidth includes padding (52px left + 52px right = 104px).
  // Subtract it to get the real usable text width for char-per-line math.
  const w            = scriptText.offsetWidth - 104    // usable text width
  const fs           = state.fontSize
  const charsPerLine = w / (fs * 0.52)                 // ~0.52× fontSize per char
  const wordsPerLine = charsPerLine / 5                 // 5 chars/word average
  const lineH        = fs * 1.7
  const linesPerSec  = BASE_WPM / 60 / wordsPerLine
  return linesPerSec * lineH * state.speedMultiplier
}

/* ══════════════════════════════════════════════
   Microphone / Voice Activity Detection
   Uses Web Audio API — no cloud service, fully offline.
   Detects energy in the 80–3000 Hz voice band.
══════════════════════════════════════════════ */
async function startMic() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl:  false,
    },
    video: false,
  })

  state.micStream = stream
  state.audioCtx  = new AudioContext()

  const source     = state.audioCtx.createMediaStreamSource(stream)
  state.analyser   = state.audioCtx.createAnalyser()
  state.analyser.fftSize               = 2048
  state.analyser.smoothingTimeConstant = 0.85
  source.connect(state.analyser)

  const bufLen      = state.analyser.frequencyBinCount
  state.audioData   = new Uint8Array(bufLen)

  // Voice-frequency bin range
  const nyquist    = state.audioCtx.sampleRate / 2
  state.voiceLow   = Math.floor(80   / nyquist * bufLen)
  state.voiceHigh  = Math.floor(3000 / nyquist * bufLen)

  state.audioFrame = requestAnimationFrame(checkAudio)
}

function checkAudio() {
  if (!state.analyser || !state.isRunning) return

  state.analyser.getByteFrequencyData(state.audioData)

  // Average amplitude across voice band
  const count = state.voiceHigh - state.voiceLow + 1
  let sum = 0
  for (let i = state.voiceLow; i <= state.voiceHigh; i++) sum += state.audioData[i]
  const avg = sum / count

  if (avg > SPEECH_THRESHOLD) {
    if (!state.isSpeaking) {
      state.isSpeaking = true
      readingLine.classList.add('speaking')
      micDot.classList.add('speaking')
    }
    clearTimeout(state.silenceTimer)
    state.silenceTimer = setTimeout(() => {
      state.isSpeaking = false
      readingLine.classList.remove('speaking')
      micDot.classList.remove('speaking')
    }, SILENCE_MS)
  }

  state.audioFrame = requestAnimationFrame(checkAudio)
}

/* ══════════════════════════════════════════════
   Overlay controls
══════════════════════════════════════════════ */
overlaySpeed.addEventListener('input', () => {
  state.speedMultiplier = parseFloat(overlaySpeed.value)
  overlayLabel.textContent  = state.speedMultiplier.toFixed(1) + '×'
  speedSlider.value         = state.speedMultiplier
  speedLabel.textContent    = overlayLabel.textContent
  save()
})

resetBtn.addEventListener('click', () => {
  state.scrollY = 0
  state.lastTs  = null
  applyScroll()
})

stopBtn.addEventListener('click', stopTeleprompter)

/* ══════════════════════════════════════════════
   Keyboard shortcuts (teleprompter mode only)
══════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (!state.isRunning) return
  if (e.key === 'Escape')       stopTeleprompter()
  if (e.key === 'r' || e.key === 'R') {
    state.scrollY = 0
    state.lastTs  = null
    applyScroll()
  }
})

/* ══════════════════════════════════════════════
   Window resize & visibility
══════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  if (state.isRunning) updateLayout()
})

// When the user tabs away, rAF pauses. On return the first elapsed value
// would be "time away" seconds, causing a giant scroll jump. Resetting
// lastTs to null makes the first frame back treat elapsed as 0.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) state.lastTs = null
})

/* ══════════════════════════════════════════════
   Settings persistence (localStorage)
══════════════════════════════════════════════ */
function save() {
  localStorage.setItem('tp', JSON.stringify({
    fontSize:        state.fontSize,
    speedMultiplier: state.speedMultiplier,
    isDark:          state.isDark,
    isPinned:        state.isPinned,
  }))
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('tp') || '{}')
    if (s.fontSize        != null) state.fontSize        = s.fontSize
    if (s.speedMultiplier != null) state.speedMultiplier = s.speedMultiplier
    if (s.isDark          != null) state.isDark          = s.isDark
    if (s.isPinned        != null) state.isPinned        = s.isPinned
  } catch { /* ignore corrupt data */ }
}

/* ══════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════ */
function waitFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve))
}

/* ══════════════════════════════════════════════
   Boot
══════════════════════════════════════════════ */
initSetup()
