/* global React, Icon, IconButton, Button, Pill, PrompterCanvas, TransportHUD, tokenize, fmtTime */
// ReaderScreen — full-window on-screen teleprompter. Follows the app theme
// (warm paper in light, near-black in dark). Floating transport HUD.

const { useState: useStateRd, useEffect: useEffectRd, useRef: useRefRd, useMemo: useMemoRd } = React;

function useKeyboard(session, setSession, canvasRef) {
  useEffectRd(() => {
    const onKey = (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); setSession(s => ({ ...s, playing: !s.playing })); }
      else if (e.code === 'KeyR') { canvasRef.current && canvasRef.current.restart(); setSession(s => ({ ...s, playing: false })); }
      else if (e.code === 'KeyM') { setSession(s => ({ ...s, mirrorH: !s.mirrorH })); }
      else if (e.code === 'ArrowDown') { e.preventDefault(); canvasRef.current && canvasRef.current.nudge(60); }
      else if (e.code === 'ArrowUp') { e.preventDefault(); canvasRef.current && canvasRef.current.nudge(-60); }
      else if (e.code === 'ArrowRight') { setSession(s => ({ ...s, wpm: Math.min(260, s.wpm + 10) })); }
      else if (e.code === 'ArrowLeft') { setSession(s => ({ ...s, wpm: Math.max(60, s.wpm - 10) })); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSession, canvasRef]);
}

function ReaderScreen({ script, session, setSession, tweaks, onBack, onRecord }) {
  const canvasRef = useRefRd(null);
  const data = useMemoRd(() => tokenize(script.body), [script]);
  const [prog, setProg] = useStateRd({ frac: 0, elapsed: 0, total: 1, cue: -1 });
  useKeyboard(session, setSession, canvasRef);

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--paper)', minHeight: 0 }}>
      {/* top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', zIndex: 10,
        borderBottom: '1px solid var(--border-faint)',
      }}>
        <IconButton name="back" title="Back to library" onClick={onBack} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Pill tone={script.accent} size="sm">{script.folder}</Pill>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--ink-1)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{script.title}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'inline-flex', padding: 3, borderRadius: 'var(--r-pill)', gap: 2,
          background: 'var(--surface-3)', border: '1px solid var(--border-faint)' }}>
          {[{ id: 'reader', label: 'Prompter', icon: 'eye' }, { id: 'record', label: 'Record', icon: 'record' }].map(t => {
            const active = t.id === 'reader';
            return <button key={t.id} onClick={() => { if (t.id === 'record') onRecord(); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
              padding: '5px 13px', borderRadius: 'var(--r-pill)', fontFamily: 'var(--font-mono)', fontSize: 12.5,
              fontWeight: active ? 600 : 500,
              background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--ink-1)' : 'var(--ink-2)',
              boxShadow: active ? 'var(--shadow-float)' : 'none',
            }}><Icon name={t.icon} size={13} />{t.label}</button>;
          })}
        </div>
        <IconButton name="mirror" title="Mirror (M)" active={session.mirrorH} onClick={() => setSession(s => ({ ...s, mirrorH: !s.mirrorH }))} />
      </div>

      {/* prompter */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <PrompterCanvas
          ref={canvasRef}
          tokens={data.tokens} totalWords={data.totalWords} cues={data.cues}
          wpm={session.wpm} mode={session.mode} playing={session.playing}
          mirrorH={session.mirrorH} mirrorV={session.mirrorV}
          fontSize={session.fontSize} lineHeight={tweaks.lineHeight}
          align={tweaks.align} maxWidth={tweaks.maxWidth}
          focusStyle={tweaks.focusStyle} focusColor={tweaks.focusColor} focusPct={tweaks.focusPct}
          variant="screen"
          onProgress={(frac, el, tot, active) => setProg(p => ({ ...p, frac, elapsed: el, total: tot }))}
          onActiveCue={(ci) => setProg(p => ({ ...p, cue: ci }))}
          onEnd={() => setSession(s => ({ ...s, playing: false }))}
        />
      </div>

      {/* transport */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'center', zIndex: 20 }}>
        <TransportHUD
          mode={session.mode} onMode={(m) => setSession(s => ({ ...s, mode: m }))}
          playing={session.playing} onPlay={() => setSession(s => ({ ...s, playing: !s.playing }))}
          onRestart={() => { canvasRef.current && canvasRef.current.restart(); setSession(s => ({ ...s, playing: false })); }}
          wpm={session.wpm} onWpm={(w) => setSession(s => ({ ...s, wpm: w }))}
          fontSize={session.fontSize} onFont={(f) => setSession(s => ({ ...s, fontSize: f }))}
          elapsed={prog.elapsed} total={prog.total} fraction={prog.frac} fmt={fmtTime}
          cues={data.cues} activeCue={prog.cue}
          onJumpCue={(wi) => canvasRef.current && canvasRef.current.seekWord(wi)}
          dark={false}
        />
      </div>
    </div>
  );
}

Object.assign(window, { ReaderScreen, useKeyboard });
