/* global React, useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakColor,
          LibraryScreen, ReaderScreen, RecordingScreen, Icon, DEFAULT_SCRIPTS, readTime */

const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = {
  dark: false,
  accent: '#2B6CFF',
  focusStyle: 'line',
  focusColor: '#2B6CFF',
  focusPct: 0.42,
  lineHeight: 1.45,
  maxWidth: 18,
  align: 'left',
};

// localStorage helpers for user-created scripts
function loadUserScripts() {
  try { return JSON.parse(localStorage.getItem('cue-user-scripts') || '[]'); }
  catch (e) { return []; }
}
function saveUserScripts(list) {
  localStorage.setItem('cue-user-scripts', JSON.stringify(list));
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useStateApp('library');
  const [script, setScript] = useStateApp(null);
  const [userScripts, setUserScripts] = useStateApp(loadUserScripts);
  const [session, setSession] = useStateApp({
    mode: 'voice', playing: false, wpm: 130, fontSize: 52, mirrorH: false, mirrorV: false,
  });
  const [tweakOpen, setTweakOpen] = useStateApp(false);

  const allScripts = [...DEFAULT_SCRIPTS, ...userScripts];

  // Sync theme
  useEffectApp(() => {
    document.documentElement.dataset.theme = t.dark ? 'dark' : 'light';
    document.body.style.background = t.dark ? '#0F1117' : '#F0EBE2';
  }, [t.dark]);

  // Sync accent
  useEffectApp(() => {
    const r = document.documentElement.style;
    r.setProperty('--accent', t.accent);
    r.setProperty('--accent-hover', `color-mix(in srgb, ${t.accent} 82%, #000)`);
    r.setProperty('--accent-soft', `color-mix(in srgb, ${t.accent} 12%, transparent)`);
    r.setProperty('--accent-faint', `color-mix(in srgb, ${t.accent} 6%, transparent)`);
  }, [t.accent]);

  // Listen for tweaks panel close events
  useEffectApp(() => {
    const h = (e) => {
      if (e.data?.type === '__edit_mode_dismissed') setTweakOpen(false);
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);

  const toggleTweaks = () => {
    const next = !tweakOpen;
    setTweakOpen(next);
    window.postMessage({ type: next ? '__activate_edit_mode' : '__deactivate_edit_mode' }, '*');
  };

  const go = (v, s) => {
    setSession(prev => ({ ...prev, playing: false }));
    if (s) setScript(s);
    setView(v);
  };

  const addScript = (newScript) => {
    const updated = [...userScripts, newScript];
    setUserScripts(updated);
    saveUserScripts(updated);
  };

  const deleteScript = (id) => {
    // Only allow deleting user-created scripts
    const updated = userScripts.filter(s => s.id !== id);
    setUserScripts(updated);
    saveUserScripts(updated);
  };

  const tweaks = {
    focusStyle: t.focusStyle, focusColor: t.focusColor, focusPct: t.focusPct,
    lineHeight: t.lineHeight, maxWidth: t.maxWidth, align: t.align,
  };

  const titleText = view === 'library' ? null : (script ? script.title : null);
  const isRecord = view === 'record';

  const titleBarStyle = {
    height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14,
    padding: '0 16px 0 80px', // 80px left = room for macOS traffic lights
    borderBottom: `1px solid ${isRecord ? 'rgba(255,255,255,0.06)' : 'var(--border-faint)'}`,
    background: isRecord ? '#0b0d12' : 'var(--paper)',
    position: 'relative', zIndex: 5,
    WebkitAppRegion: 'drag',
  };

  const toolbarBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
    background: 'transparent', padding: '4px 9px', borderRadius: 999,
    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
    color: isRecord ? 'rgba(255,255,255,0.75)' : 'var(--ink-2)',
    WebkitAppRegion: 'no-drag',
    transition: 'background var(--dur-fast)',
  };

  return (
    <div style={{
      height: '100vh', width: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      background: 'var(--paper)',
      overflow: 'hidden',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* ── Title bar ── */}
      <div style={titleBarStyle}>
        {/* Centered wordmark + script title */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          WebkitAppRegion: 'no-drag',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13.5,
            color: isRecord ? '#fff' : 'var(--ink-1)',
          }}>
            Cue<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
          {titleText && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 12.5, maxWidth: 320,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              color: isRecord ? 'rgba(255,255,255,0.5)' : 'var(--ink-3)',
            }}>
              — {titleText}
            </span>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => setTweak('dark', !t.dark)}
            title="Toggle theme"
            style={toolbarBtnStyle}>
            <Icon name={t.dark ? 'moon' : 'sun'} size={14} />
            {t.dark ? 'Dark' : 'Light'}
          </button>
          <button
            onClick={toggleTweaks}
            title="Tweaks"
            style={{
              ...toolbarBtnStyle,
              background: tweakOpen
                ? (isRecord ? 'rgba(255,255,255,0.12)' : 'var(--accent-soft)')
                : 'transparent',
              color: tweakOpen
                ? (isRecord ? '#fff' : 'var(--accent)')
                : (isRecord ? 'rgba(255,255,255,0.75)' : 'var(--ink-2)'),
            }}>
            <Icon name="gear" size={14} /> Tweaks
          </button>
        </div>
      </div>

      {/* ── Screen content ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {view === 'library' && (
          <LibraryScreen
            scripts={allScripts}
            wpm={session.wpm}
            onOpen={(s) => go('reader', s)}
            onRecord={(s) => go('record', s)}
            onAddScript={addScript}
            onDeleteScript={deleteScript}
          />
        )}
        {view === 'reader' && script && (
          <ReaderScreen
            script={script} session={session} setSession={setSession} tweaks={tweaks}
            onBack={() => go('library')} onRecord={() => go('record')}
          />
        )}
        {view === 'record' && script && (
          <RecordingScreen
            script={script} session={session} setSession={setSession} tweaks={tweaks}
            onBack={() => go('library')} onPrompter={() => go('reader')}
          />
        )}
      </div>

      {/* ── Tweaks panel (floating, toggled via title bar button) ── */}
      <TweaksPanel title="Tweaks" isOpen={tweakOpen} onClose={() => setTweakOpen(false)}>
        <TweakSection label="Theme" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakColor label="Accent color" value={t.accent}
          options={['#2B6CFF', '#E0463B', '#1F8A5B', '#7A5AE0', '#E8902A']}
          onChange={(v) => setTweak('accent', v)} />

        <TweakSection label="Reading view" />
        <TweakRadio label="Focus marker" value={t.focusStyle}
          options={['line', 'arrows', 'bar', 'off']} onChange={(v) => setTweak('focusStyle', v)} />
        <TweakColor label="Marker color" value={t.focusColor}
          options={['#2B6CFF', '#E0463B', '#1F8A5B', '#E8B23A', '#9A958C']}
          onChange={(v) => setTweak('focusColor', v)} />
        <TweakSlider label="Focus position" value={t.focusPct} min={0.2} max={0.6} step={0.02}
          onChange={(v) => setTweak('focusPct', v)} />
        <TweakSlider label="Line height" value={t.lineHeight} min={1.2} max={2} step={0.05}
          onChange={(v) => setTweak('lineHeight', v)} />
        <TweakSlider label="Column width" value={t.maxWidth} min={12} max={28} step={1} unit="em"
          onChange={(v) => setTweak('maxWidth', v)} />
        <TweakRadio label="Alignment" value={t.align}
          options={['left', 'center']} onChange={(v) => setTweak('align', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
