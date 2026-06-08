/* global React, Icon, IconButton, Button, Pill, PrompterCanvas, TransportHUD, useKeyboard, tokenize, fmtTime */
// RecordingScreen — camera preview with the prompter overlaid near the lens.

const { useState: useStateRec, useEffect: useEffectRec, useRef: useRefRec, useMemo: useMemoRec } = React;

const ASPECTS = [
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '1:1', label: '1:1', ratio: 1 },
];

function RecordingScreen({ script, session, setSession, tweaks, onBack, onPrompter }) {
  const canvasRef = useRefRec(null);
  const videoRef = useRefRec(null);
  const data = useMemoRec(() => tokenize(script.body), [script]);
  const [prog, setProg] = useStateRec({ frac: 0, elapsed: 0, total: 1, cue: -1 });
  const [cam, setCam] = useStateRec('pending'); // pending | live | off
  const [aspect, setAspect] = useStateRec('16:9');
  const [grid, setGrid] = useStateRec(true);
  const [recState, setRecState] = useStateRec('idle'); // idle | countdown | recording
  const [count, setCount] = useStateRec(3);
  const [recSecs, setRecSecs] = useStateRec(0);
  const [takes, setTakes] = useStateRec([]);
  const recTimer = useRefRec(null);
  const cdTimer = useRefRec(null);

  // device lists + selections
  const [videoDevices, setVideoDevices] = useStateRec([]);
  const [audioDevices, setAudioDevices] = useStateRec([]);
  const [videoDev, setVideoDev] = useStateRec(''); // deviceId of selected camera
  const [audioDev, setAudioDev] = useStateRec(''); // deviceId of selected mic

  useKeyboard(session, setSession, canvasRef);

  // Enumerate devices — called after getUserMedia so labels are populated
  async function refreshDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(all.filter(d => d.kind === 'videoinput'));
      setAudioDevices(all.filter(d => d.kind === 'audioinput'));
    } catch (_) {}
  }

  // webcam — re-runs when the user picks a different camera
  useEffectRec(() => {
    let stream;
    let cancelled = false;
    setCam('pending');
    // If getUserMedia hangs (macOS permission not granted), fall back after 2 s
    const timeout = setTimeout(() => {
      if (!cancelled) { setCam('off'); refreshDevices(); }
    }, 2000);
    (async () => {
      try {
        const videoConstraint = videoDev
          ? { deviceId: { exact: videoDev } }
          : { facingMode: 'user' };
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false });
        clearTimeout(timeout);
        await refreshDevices(); // labels now available
        if (!cancelled && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCam('live');
        }
      } catch (e) {
        clearTimeout(timeout);
        if (!cancelled) { setCam('off'); refreshDevices(); }
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [videoDev]);

  function startCountdown() {
    canvasRef.current && canvasRef.current.restart();
    setRecState('countdown');
    let c = 3; setCount(c);
    cdTimer.current = setInterval(() => {
      c -= 1;
      if (c <= 0) { clearInterval(cdTimer.current); setCount(0); beginRecording(); }
      else setCount(c);
    }, 800);
  }
  function beginRecording() {
    setRecState('recording'); setRecSecs(0);
    setSession(s => ({ ...s, playing: true }));
    recTimer.current = setInterval(() => setRecSecs(s => s + 1), 1000);
  }
  function stopRecording() {
    clearInterval(recTimer.current);
    setSession(s => ({ ...s, playing: false }));
    setTakes(t => [{ id: Date.now(), dur: recSecs, accent: script.accent }, ...t].slice(0, 6));
    setRecState('idle');
  }
  function onRecButton() {
    if (recState === 'idle') startCountdown();
    else if (recState === 'recording') stopRecording();
    else { clearInterval(cdTimer.current); setRecState('idle'); }
  }
  useEffectRec(() => () => { clearInterval(recTimer.current); clearInterval(cdTimer.current); }, []);

  const ratio = ASPECTS.find(a => a.id === aspect).ratio;

  return (
    <div style={{ position: 'relative', height: '100%', background: '#0b0d12', overflow: 'hidden', minHeight: 0 }}>
      {/* camera layer */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {cam === 'live'
          ? <video ref={videoRef} muted playsInline style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: `scaleX(${session.mirrorH ? 1 : -1})`,
            }} />
          : <CameraPlaceholder state={cam} ref={videoRef} mirror={session.mirrorH} />
        }
      </div>

      {/* aspect framing mask + grid */}
      <FramingMask ratio={ratio} grid={grid} />

      {/* prompter overlay near top (lens) */}
      <div style={{
        position: 'absolute', top: 60, left: 0, right: 0, height: '50%',
        padding: '0 7%', pointerEvents: session.mode === 'manual' ? 'auto' : 'none',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.12))' }} />
        <div style={{ position: 'relative', height: '100%' }}>
          <PrompterCanvas
            ref={canvasRef}
            tokens={data.tokens} totalWords={data.totalWords} cues={data.cues}
            wpm={session.wpm} mode={session.mode} playing={session.playing}
            mirrorH={false} mirrorV={false}
            fontSize={Math.round(session.fontSize * 0.82)} lineHeight={tweaks.lineHeight}
            align="center" maxWidth={tweaks.maxWidth}
            focusStyle={tweaks.focusStyle} focusColor={tweaks.focusColor} focusPct={0.46}
            variant="camera"
            onProgress={(frac, el, tot) => setProg(p => ({ ...p, frac, elapsed: el, total: tot }))}
            onActiveCue={(ci) => setProg(p => ({ ...p, cue: ci }))}
            onEnd={() => { if (recState === 'recording') stopRecording(); }}
          />
        </div>
      </div>

      {/* top toolbar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
      }}>
        <button onClick={onBack} title="Back to library" style={glassBtn()}>
          <Icon name="back" size={18} />
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{script.title}</span>
        <div style={{ flex: 1 }} />

        {/* mode toggle */}
        <div style={{ display: 'inline-flex', padding: 3, borderRadius: 999, gap: 2,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {[{ id: 'reader', label: 'Prompter', icon: 'eye' }, { id: 'record', label: 'Record', icon: 'record' }].map(t => {
            const active = t.id === 'record';
            return <button key={t.id} onClick={() => { if (t.id === 'reader') onPrompter(); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
              padding: '5px 13px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 12.5,
              fontWeight: active ? 600 : 500,
              background: active ? '#fff' : 'transparent', color: active ? '#13151c' : 'rgba(255,255,255,0.75)',
            }}><Icon name={t.icon} size={13} />{t.label}</button>;
          })}
        </div>

        {/* aspect */}
        <div style={{ display: 'inline-flex', padding: 3, borderRadius: 999, gap: 2,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {ASPECTS.map(a => (
            <button key={a.id} onClick={() => setAspect(a.id)} style={{
              border: 'none', cursor: 'pointer', padding: '5px 11px', borderRadius: 999,
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: aspect === a.id ? 600 : 500,
              background: aspect === a.id ? '#fff' : 'transparent', color: aspect === a.id ? '#13151c' : 'rgba(255,255,255,0.75)',
            }}>{a.label}</button>
          ))}
        </div>
        <button onClick={() => setGrid(g => !g)} title="Rule-of-thirds grid"
          style={glassBtn(grid)}><Icon name="aspect" size={17} /></button>
        <button onClick={() => setSession(s => ({ ...s, mirrorH: !s.mirrorH }))} title="Mirror camera"
          style={glassBtn(session.mirrorH)}><Icon name="mirror" size={17} /></button>
      </div>

      {/* device + status row (top under toolbar, left) */}
      <div style={{ position: 'absolute', top: 56, left: 16, zIndex: 25, display: 'flex', gap: 8, alignItems: 'center' }}>
        <DeviceSelect
          icon="camera"
          devices={videoDevices}
          value={videoDev}
          onChange={(id) => setVideoDev(id)}
          fallback={cam === 'live' ? 'Camera' : cam === 'off' ? 'No camera' : 'Connecting…'}
        />
        <DeviceSelect
          icon="mic"
          devices={audioDevices}
          value={audioDev}
          onChange={(id) => setAudioDev(id)}
          fallback="Microphone"
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.65)',
          background: 'rgba(0,0,0,0.4)', padding: '4px 9px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)' }}>1080p · 30fps</span>
      </div>

      {/* takes tray */}
      {takes.length > 0 && (
        <div style={{ position: 'absolute', top: 96, right: 16, zIndex: 25, width: 132,
          display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Takes · {takes.length}</div>
          {takes.map((tk, i) => (
            <div key={tk.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 56, height: 34, borderRadius: 5, flexShrink: 0,
                background: `linear-gradient(135deg, var(--pill-${tk.accent}), rgba(0,0,0,0.5))`,
                border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="play" size={13} style={{ color: 'rgba(255,255,255,0.9)' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#fff', lineHeight: 1.3 }}>
                <div>Take {takes.length - i}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)' }}>{fmtTime(tk.dur)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* countdown */}
      {recState === 'countdown' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
          <div key={count} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 140, color: '#fff',
            animation: 'cuePop 0.8s var(--ease)' }}>{count}</div>
        </div>
      )}

      {/* recording indicator */}
      {recState === 'recording' && (
        <div style={{ position: 'absolute', top: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 35,
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999,
          background: 'rgba(224,70,59,0.92)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', animation: 'cueBlink 1s infinite' }} />
          REC {fmtTime(recSecs)}
        </div>
      )}

      {/* bottom controls */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 18, zIndex: 30,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, flexWrap: 'nowrap' }}>
        <button onClick={onRecButton} title={recState === 'recording' ? 'Stop' : 'Record'} style={{
          width: 54, height: 54, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
          border: '3px solid rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.35)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            width: recState === 'recording' ? 18 : 38, height: recState === 'recording' ? 18 : 38,
            borderRadius: recState === 'recording' ? 4 : '50%', background: '#E0463B',
            transition: 'all var(--dur-base) var(--ease)',
          }} />
        </button>
        <div style={{ flex: '0 1 auto', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <TransportHUD
          mode={session.mode} onMode={(m) => setSession(s => ({ ...s, mode: m }))}
          playing={session.playing} onPlay={() => setSession(s => ({ ...s, playing: !s.playing }))}
          onRestart={() => { canvasRef.current && canvasRef.current.restart(); setSession(s => ({ ...s, playing: false })); }}
          wpm={session.wpm} onWpm={(w) => setSession(s => ({ ...s, wpm: w }))}
          fontSize={session.fontSize} onFont={(f) => setSession(s => ({ ...s, fontSize: f }))}
          elapsed={prog.elapsed} total={prog.total} fraction={prog.frac} fmt={fmtTime}
          cues={data.cues} activeCue={prog.cue}
          onJumpCue={(wi) => canvasRef.current && canvasRef.current.seekWord(wi)}
          dark={true}
        />
        </div>
      </div>
    </div>
  );
}

function glassBtn(active) {
  return {
    width: 32, height: 32, borderRadius: 'var(--r-input)', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)'}`,
    background: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
    color: '#fff',
  };
}

function DeviceSelect({ icon, devices, value, onChange, fallback }) {
  const [open, setOpen] = useStateRec(false);
  const wrapRef = useRefRec(null);

  // close on outside click
  useEffectRec(() => {
    if (!open) return;
    function away(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const current = devices.find(d => d.deviceId === value);
  // trim long device labels (e.g. "FaceTime HD Camera (Built-in)") to fit the pill
  const shortLabel = (current?.label || fallback).replace(/ \(.*\)$/, '').replace(/^Default - /, '') || fallback;
  const hasChoice = devices.length > 1;

  const pillStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.45)',
    padding: '4px 9px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)',
    cursor: hasChoice ? 'pointer' : 'default', userSelect: 'none',
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div onClick={() => hasChoice && setOpen(o => !o)} style={pillStyle}>
        <Icon name={icon} size={13} />
        {shortLabel}
        {hasChoice && <Icon name="chevron" size={11} style={{ opacity: 0.55, marginLeft: 1 }} />}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: '#1c1f2b', border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 10, padding: 4, minWidth: 210,
          boxShadow: '0 10px 36px rgba(0,0,0,0.7)',
        }}>
          {devices.map(d => {
            const lbl = d.label.replace(/ \(.*\)$/, '').replace(/^Default - /, '') || `Device ${d.deviceId.slice(0, 6)}`;
            const active = d.deviceId === value || (!value && d.deviceId === devices[0]?.deviceId);
            return (
              <button key={d.deviceId} onClick={() => { onChange(d.deviceId); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
              }}>
                {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                {!active && <span style={{ width: 6, flexShrink: 0 }} />}
                {lbl}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CameraPlaceholder = React.forwardRef(function CameraPlaceholder({ state, mirror }, ref) {
  return (
    <div style={{ position: 'absolute', inset: 0, background:
      'radial-gradient(120% 90% at 50% 28%, #2a2f3d 0%, #161a24 55%, #0b0d12 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* hidden video kept for ref consistency */}
      <video ref={ref} style={{ display: 'none' }} />
      {/* subject framing guide */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        transform: 'translateY(6%)' }}>
        <div style={{ width: 150, height: 188, borderRadius: '50% 50% 48% 48% / 56% 56% 44% 44%',
          border: '2px dashed rgba(255,255,255,0.22)' }} />
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
            {state === 'off' ? 'Camera unavailable' : 'Connecting to camera…'}
          </div>
          <div style={{ fontSize: 11.5 }}>
            {state === 'off' ? 'Allow camera access to see your framing.' : 'One moment.'}
          </div>
        </div>
      </div>
    </div>
  );
});

function FramingMask({ ratio, grid }) {
  const ref = useRefRec(null);
  const [box, setBox] = useStateRec(null);
  useEffectRec(() => {
    function compute() {
      const el = ref.current; if (!el) return;
      const W = el.clientWidth, H = el.clientHeight;
      let w = W, h = W / ratio;
      if (h > H) { h = H; w = H * ratio; }
      // leave a margin
      const scale = 0.9; w *= scale; h *= scale;
      setBox({ w, h, left: (W - w) / 2, top: (H - h) / 2 });
    }
    compute();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(compute) : null;
    if (ro && ref.current) ro.observe(ref.current);
    window.addEventListener('resize', compute);
    return () => { ro && ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [ratio]);
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }}>
      {box && (
        <div style={{ position: 'absolute', left: box.left, top: box.top, width: box.w, height: box.h,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 2 }}>
          {grid && <>
            {[1, 2].map(i => <div key={'v' + i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i * 100) / 3}%`, width: 1, background: 'rgba(255,255,255,0.22)' }} />)}
            {[1, 2].map(i => <div key={'h' + i} style={{ position: 'absolute', left: 0, right: 0, top: `${(i * 100) / 3}%`, height: 1, background: 'rgba(255,255,255,0.22)' }} />)}
          </>}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RecordingScreen });
