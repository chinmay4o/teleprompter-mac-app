/* global React */
// Shared primitives + icon set for the Cue teleprompter app.
// Stroke-1.5 line icons (Lucide-flavored) to match the design system's spare feel.

const { useState } = React;

/* ---------- Icon ---------- */
function Icon({ name, size = 16, stroke, sw = 1.5, style }) {
  const s = size;
  const wrap = (children) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke={stroke || 'currentColor'} strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block', ...style }}>{children}</svg>
  );
  switch (name) {
    case 'play':     return wrap(<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" />);
    case 'pause':    return wrap(<><rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/></>);
    case 'mic':      return wrap(<><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></>);
    case 'mic-off':  return wrap(<><path d="M9 9v-4a3 3 0 0 1 5.5-1.7M15 9.3V5M5 11a7 7 0 0 0 11.3 5.5M12 18v3M8 21h8M3 3l18 18"/></>);
    case 'gauge':    return wrap(<><path d="M12 14l4-4"/><path d="M4 18a8 8 0 1 1 16 0"/><circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none"/></>);
    case 'mirror':   return wrap(<><path d="M12 3v18"/><path d="M9 7L4 12l5 5z"/><path d="M15 7l5 5-5 5z" fill="currentColor" fillOpacity="0.18"/></>);
    case 'gear':     return wrap(<><circle cx="12" cy="12" r="3"/><path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4L5.6 5.6"/></>);
    case 'back':     return wrap(<path d="M15 6l-6 6 6 6"/>);
    case 'search':   return wrap(<><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>);
    case 'plus':     return wrap(<path d="M12 5v14M5 12h14"/>);
    case 'star':     return wrap(<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.6 1-5.8-4.2-4.1 5.9-.9z"/>);
    case 'star-fill':return wrap(<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.6 1-5.8-4.2-4.1 5.9-.9z" fill="currentColor"/>);
    case 'clock':    return wrap(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>);
    case 'doc':      return wrap(<><path d="M6 2.5h8L19 7v14.5H6z"/><path d="M14 2.5V7h5M9 12h6M9 15.5h6"/></>);
    case 'record':   return wrap(<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>);
    case 'square':   return wrap(<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>);
    case 'camera':   return wrap(<><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.2-2h7.6L17 7h2.5A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/><circle cx="12" cy="12.5" r="3.2"/></>);
    case 'flag':     return wrap(<><path d="M6 3v18"/><path d="M6 4h11l-2 3 2 3H6"/></>);
    case 'chevron':  return wrap(<path d="M6 9l6 6 6-6"/>);
    case 'sun':      return wrap(<><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4L5.6 5.6"/></>);
    case 'moon':     return wrap(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>);
    case 'aspect':   return wrap(<><rect x="3" y="6" width="18" height="12" rx="1.5"/></>);
    case 'plus-sm':  return wrap(<path d="M12 6v12M6 12h12"/>);
    case 'minus-sm': return wrap(<path d="M6 12h12"/>);
    case 'type':     return wrap(<><path d="M4 7V5h16v2M12 5v14M9 19h6"/></>);
    case 'list':     return wrap(<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>);
    case 'eye':      return wrap(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.8"/></>);
    case 'restart':  return wrap(<><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 3.5V8h4.5"/></>);
    case 'check':    return wrap(<path d="M5 12.5l4.5 4.5L19 7"/>);
    case 'download': return wrap(<><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/></>);
    default:         return wrap(<circle cx="12" cy="12" r="3"/>);
  }
}

/* ---------- Button ---------- */
function Button({ children, variant = 'primary', size = 'md', onClick, style, title, ...rest }) {
  const [hover, setHover] = useState(false);
  const sizes = {
    sm: { fontSize: 12,   padding: '5px 11px', gap: 6 },
    md: { fontSize: 13,   padding: '7px 15px', gap: 7 },
    lg: { fontSize: 14,   padding: '9px 19px', gap: 8 },
  };
  const variants = {
    primary: { background: hover ? 'var(--accent-hover)' : 'var(--accent)', color: '#fff', borderColor: 'transparent' },
    ghost:   { background: hover ? 'var(--surface-2)' : 'var(--surface)', color: 'var(--accent)', borderColor: 'var(--border)' },
    quiet:   { background: hover ? 'var(--accent-faint)' : 'transparent', color: 'var(--ink-2)', borderColor: 'transparent' },
    danger:  { background: hover ? '#d8392f' : '#E0463B', color: '#fff', borderColor: 'transparent' },
  };
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: sizes[size].gap, fontFamily: 'var(--font-mono)', fontWeight: 600,
        fontSize: sizes[size].fontSize, padding: sizes[size].padding,
        borderRadius: 'var(--r-pill)', border: '1px solid transparent', cursor: 'pointer',
        whiteSpace: 'nowrap', transition: 'background var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease)',
        ...variants[variant], ...style,
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      {...rest}>{children}</button>
  );
}

/* ---------- IconButton ---------- */
function IconButton({ name, size = 18, onClick, title, active, style, tone = 'ink' }) {
  const [hover, setHover] = useState(false);
  const color = active ? 'var(--accent)' : (tone === 'inverse' ? 'var(--ink-inverse)' : 'var(--ink-2)');
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 'var(--r-input)', cursor: 'pointer',
        border: '1px solid transparent',
        background: active ? 'var(--accent-soft)' : (hover ? 'var(--accent-faint)' : 'transparent'),
        color, transition: 'background var(--dur-fast) var(--ease)', ...style,
      }}>
      <Icon name={name} size={size} />
    </button>
  );
}

/* ---------- Pill / Tag ---------- */
function Pill({ children, tone = 'accent', size = 'md', style }) {
  const tones = {
    accent:   { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    lavender: { bg: 'var(--pill-lavender)', fg: 'var(--ink-1)' },
    peach:    { bg: 'var(--pill-peach)', fg: 'var(--ink-1)' },
    butter:   { bg: 'var(--pill-butter)', fg: 'var(--ink-1)' },
    sage:     { bg: 'var(--pill-sage)', fg: 'var(--ink-1)' },
    sky:      { bg: 'var(--pill-sky)', fg: 'var(--ink-1)' },
    rose:     { bg: 'var(--pill-rose)', fg: 'var(--ink-1)' },
    mute:     { bg: 'transparent', fg: 'var(--ink-2)' },
  };
  const t = tones[tone] || tones.accent;
  const sizes = {
    sm: { fontSize: 11, padding: '1px 8px', borderRadius: 'var(--r-tag)' },
    md: { fontSize: 12.5, padding: '3px 11px', borderRadius: 'var(--r-pill)' },
  };
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    fontFamily: 'var(--font-mono)', fontWeight: 500, background: t.bg, color: t.fg,
    border: tone === 'mute' ? '1px solid var(--border)' : '1px solid transparent',
    ...sizes[size], ...style,
  }}>{children}</span>;
}

function StatusTag({ status }) {
  const map = {
    ready:   { tone: 'sage',   label: 'ready' },
    draft:   { tone: 'butter', label: 'draft' },
    archived:{ tone: 'rose',   label: 'archived' },
  };
  const s = map[status] || { tone: 'lavender', label: status };
  return <Pill tone={s.tone} size="sm">{s.label}</Pill>;
}

/* ---------- Eyebrow ---------- */
function Eyebrow({ children, style }) {
  return <div style={{
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
    letterSpacing: 'var(--track-mega)', textTransform: 'uppercase', color: 'var(--ink-3)',
    ...style,
  }}>{children}</div>;
}

Object.assign(window, { Icon, Button, IconButton, Pill, StatusTag, Eyebrow });
