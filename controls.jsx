/* global React, Icon */
// Shared playback controls: segmented mode toggle, transport HUD, cue menu.

const { useState: useStateCtrl, useRef: useRefCtrl, useEffect: useEffectCtrl } = React;

// Segmented control (Voice / Auto / Manual)
function Segmented({ value, options, onChange, dark }) {
  return (
    <div style={{
      display: 'inline-flex', padding: 3, borderRadius: 'var(--r-pill)', gap: 2,
      background: dark ? 'rgba(255,255,255,0.08)' : 'var(--surface-3)',
      border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--border-faint)',
    }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
            padding: '5px 13px', borderRadius: 'var(--r-pill)', fontFamily: 'var(--font-mono)',
            fontSize: 12.5, fontWeight: active ? 600 : 500,
            background: active ? (dark ? 'rgba(255,255,255,0.92)' : 'var(--surface)') : 'transparent',
            color: active ? (dark ? '#13151c' : 'var(--ink-1)') : (dark ? 'rgba(255,255,255,0.7)' : 'var(--ink-2)'),
            boxShadow: active ? 'var(--shadow-float)' : 'none',
            transition: 'background var(--dur-fast) var(--ease)',
          }}>
            {o.icon && <Icon name={o.icon} size={14} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

// Stepper:  −  value  +
function Stepper({ icon, label, onDec, onInc, dark }) {
  const btn = {
    width: 26, height: 26, borderRadius: 'var(--r-input)', border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: dark ? 'rgba(255,255,255,0.08)' : 'var(--surface-2)',
    color: dark ? 'rgba(255,255,255,0.85)' : 'var(--ink-1)',
  };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <button style={btn} onClick={onDec}><Icon name="minus-sm" size={15} /></button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, minWidth: 44, textAlign: 'center', whiteSpace: 'nowrap',
        color: dark ? '#fff' : 'var(--ink-1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        {icon && <Icon name={icon} size={13} />}{label}
      </span>
      <button style={btn} onClick={onInc}><Icon name="plus-sm" size={15} /></button>
    </div>
  );
}

function Divider({ dark }) {
  return <span style={{ width: 1, height: 26, background: dark ? 'rgba(255,255,255,0.12)' : 'var(--border)' }} />;
}

// Cue jump menu
function CueMenu({ cues, activeCue, onJump, dark }) {
  const [open, setOpen] = useStateCtrl(false);
  const ref = useRefCtrl(null);
  useEffectCtrl(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (!cues || !cues.length) return null;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title="Cue points" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', cursor: 'pointer',
        borderRadius: 'var(--r-input)', border: 'none', fontFamily: 'var(--font-mono)', fontSize: 12.5,
        background: dark ? 'rgba(255,255,255,0.08)' : 'var(--surface-2)',
        color: dark ? 'rgba(255,255,255,0.85)' : 'var(--ink-1)',
      }}>
        <Icon name="flag" size={14} />{activeCue >= 0 ? cues[activeCue].label : 'Cues'}
        <Icon name="chevron" size={13} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, minWidth: 200, zIndex: 50,
          background: dark ? '#1b1e28' : 'var(--surface)', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border)',
          borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-pop)', padding: 6,
        }}>
          {cues.map((c, i) => (
            <button key={i} onClick={() => { onJump(c.wordIndex); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
              border: 'none', cursor: 'pointer', padding: '7px 10px', borderRadius: 'var(--r-input)',
              background: i === activeCue ? (dark ? 'rgba(255,255,255,0.08)' : 'var(--accent-soft)') : 'transparent',
              color: i === activeCue ? (dark ? '#fff' : 'var(--accent)') : (dark ? 'rgba(255,255,255,0.8)' : 'var(--ink-1)'),
              fontFamily: 'var(--font-mono)', fontSize: 12.5,
            }}>
              <span style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'var(--ink-3)', fontSize: 11, minWidth: 16 }}>{String(i + 1).padStart(2, '0')}</span>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The transport HUD — floating control bar.
function TransportHUD({
  mode, onMode, playing, onPlay, onRestart,
  wpm, onWpm, fontSize, onFont,
  elapsed, total, fraction, fmt,
  cues, activeCue, onJumpCue, dark,
}) {
  const playBtn = {
    width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--accent)', color: '#fff', flexShrink: 0,
    transition: 'transform var(--dur-fast) var(--ease)',
  };
  const iconBtn = {
    width: 32, height: 32, borderRadius: 'var(--r-input)', border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: dark ? 'rgba(255,255,255,0.08)' : 'var(--surface-2)',
    color: dark ? 'rgba(255,255,255,0.85)' : 'var(--ink-1)',
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '9px 13px',
      borderRadius: 18, flexWrap: 'wrap', maxWidth: '100%', rowGap: 8,
      background: dark ? 'rgba(22,25,34,0.86)' : 'var(--surface)',
      border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border)',
      boxShadow: 'var(--shadow-pop)',
      backdropFilter: dark ? 'blur(12px)' : 'none', WebkitBackdropFilter: dark ? 'blur(12px)' : 'none',
    }}>
      <Segmented value={mode} onChange={onMode} dark={dark}
        options={[
          { value: 'voice', label: 'Voice', icon: 'mic' },
          { value: 'auto', label: 'Auto', icon: 'gauge' },
          { value: 'manual', label: 'Manual', icon: 'list' },
        ]} />

      <Divider dark={dark} />

      <button style={iconBtn} onClick={onRestart} title="Restart (R)"><Icon name="restart" size={16} /></button>
      <button style={playBtn} onClick={onPlay} title="Play / pause (Space)"
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.94)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
        <Icon name={playing ? 'pause' : 'play'} size={20} />
      </button>

      <Divider dark={dark} />

      {mode === 'manual'
        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: dark ? 'rgba(255,255,255,0.55)' : 'var(--ink-3)', minWidth: 120, textAlign: 'center' }}>scroll / ↑ ↓ to move</span>
        : <Stepper icon="gauge" label={`${wpm}`} dark={dark}
            onDec={() => onWpm(Math.max(60, wpm - 10))} onInc={() => onWpm(Math.min(260, wpm + 10))} />
      }

      <Stepper icon="type" label={`${fontSize}`} dark={dark}
        onDec={() => onFont(Math.max(28, fontSize - 4))} onInc={() => onFont(Math.min(96, fontSize + 4))} />

      <Divider dark={dark} />

      {/* time + progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 116 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)',
          fontSize: 11.5, color: dark ? 'rgba(255,255,255,0.7)' : 'var(--ink-2)' }}>
          <span style={{ color: dark ? '#fff' : 'var(--ink-1)' }}>{fmt(elapsed)}</span>
          <span>{fmt(total)}</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: dark ? 'rgba(255,255,255,0.14)' : 'var(--surface-3)' }}>
          <div style={{ width: `${Math.round(fraction * 100)}%`, height: '100%', borderRadius: 2, background: 'var(--accent)' }} />
        </div>
      </div>

      <CueMenu cues={cues} activeCue={activeCue} onJump={onJumpCue} dark={dark} />
    </div>
  );
}

Object.assign(window, { Segmented, Stepper, CueMenu, TransportHUD });
