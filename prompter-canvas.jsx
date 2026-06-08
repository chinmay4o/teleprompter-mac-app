/* global React */
// PrompterCanvas — the scrolling reading engine, shared by the on-screen
// prompter and the recording overlay.
//
// Continuous pixel-smooth scroll driven by a rAF loop (transform mutated
// directly, not via React state). Word highlighting tracks the focus line.
// Voice mode simulates speech tracking: the scroll speeds, drifts and pauses
// like a real speaker, with a live mic-level meter reflecting the envelope.

const { useRef, useState, useEffect, useLayoutEffect, useImperativeHandle, forwardRef } = React;

const PrompterCanvas = forwardRef(function PrompterCanvas(props, ref) {
  const {
    tokens, totalWords, cues,
    wpm = 130, mode = 'voice', playing = false,
    mirrorH = false, mirrorV = false,
    fontSize = 52, lineHeight = 1.45, weight = 600,
    align = 'left', maxWidth = 18, // maxWidth in em
    focusStyle = 'line', focusColor = 'var(--accent)', focusPct = 0.42,
    variant = 'screen',
    onProgress, onActiveCue, onEnd,
  } = props;

  const viewportRef = useRef(null);
  const scrollerRef = useRef(null);
  const wordEls = useRef([]);
  const topsRef = useRef([]);        // natural top of each word within scroller content (excl. padding)
  const rangeRef = useRef(1);        // scroll range in px
  const posRef = useRef(0);          // current scroll position px
  const lastActiveRef = useRef(-1);
  const lastCueRef = useRef(-1);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const micRef = useRef(0.4);
  const envRef = useRef({ pauseUntil: 0, nextPauseAt: 1.5, drift: 1, t: 0 });
  const meterBars = useRef([]);
  const lastProgressRef = useRef(0);
  const wordRefCbs = useRef({});
  function wordRef(i) {
    if (!wordRefCbs.current[i]) wordRefCbs.current[i] = (el) => { wordEls.current[i] = el; };
    return wordRefCbs.current[i];
  }

  const playingRef = useRef(playing);
  const modeRef = useRef(mode);
  const wpmRef = useRef(wpm);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);

  const isCamera = variant === 'camera';

  // ---- measure word tops ----
  function measure() {
    const vp = viewportRef.current;
    if (!vp) return;
    const focusY = vp.clientHeight * focusPct;
    const padTop = focusY;
    const sc = scrollerRef.current;
    if (sc) sc.style.paddingTop = padTop + 'px';
    const tops = [];
    const els = wordEls.current;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      tops[i] = el ? el.offsetTop - padTop : 0; // natural top (relative to first line)
    }
    topsRef.current = tops;
    rangeRef.current = Math.max(1, tops[tops.length - 1] || 1);
    applyTransform();
  }

  function applyTransform() {
    const sc = scrollerRef.current;
    if (!sc) return;
    sc.style.transform = `translateY(${-posRef.current}px)`;
  }

  function findActive(pos, focusY) {
    const tops = topsRef.current;
    const target = pos; // word natural top that is at the focus line
    // largest i with tops[i] <= target
    let lo = 0, hi = tops.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (tops[mid] <= target) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }

  function applyActive(active) {
    const last = lastActiveRef.current;
    if (active === last) return;
    const els = wordEls.current;
    const a = Math.min(last < 0 ? active : last, active);
    const b = Math.max(last < 0 ? active : last, active);
    for (let i = a; i <= b; i++) {
      const el = els[i];
      if (!el) continue;
      el.className = 'prompt-word' + (i < active ? ' is-read' : i === active ? ' is-active' : '');
    }
    // ensure the boundary words always correct
    if (els[active]) els[active].className = 'prompt-word is-active';
    lastActiveRef.current = active;

    // cue tracking
    if (cues && cues.length && onActiveCue) {
      let ci = -1;
      for (let k = 0; k < cues.length; k++) { if (cues[k].wordIndex <= active) ci = k; else break; }
      if (ci !== lastCueRef.current) { lastCueRef.current = ci; onActiveCue(ci); }
    }
  }

  function updateMeter() {
    const bars = meterBars.current;
    const base = micRef.current;
    for (let i = 0; i < bars.length; i++) {
      const el = bars[i];
      if (!el) continue;
      const jitter = 0.35 + 0.65 * Math.abs(Math.sin(Date.now() / (90 + i * 37) + i));
      const h = Math.max(0.12, base * jitter);
      el.style.transform = `scaleY(${h.toFixed(3)})`;
    }
  }

  function loop(ts) {
    const vp = viewportRef.current;
    if (!vp) return;
    if (!lastTsRef.current) lastTsRef.current = ts;
    let dt = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;
    if (dt > 0.1) dt = 0.1;

    const focusY = vp.clientHeight * focusPct;
    const range = rangeRef.current;
    const totalSecs = Math.max(1, (totalWords / Math.max(40, wpmRef.current)) * 60);
    const baseV = range / totalSecs; // px/s for steady reading

    const env = envRef.current;
    env.t += dt;
    let factor = 0;
    if (playingRef.current && modeRef.current !== 'manual') {
      if (modeRef.current === 'voice') {
        // organic speech envelope: drift + occasional pauses
        if (env.t >= env.nextPauseAt && env.t > env.pauseUntil) {
          env.pauseUntil = env.t + 0.3 + Math.random() * 0.6;
          env.nextPauseAt = env.t + 2.5 + Math.random() * 3.5;
        }
        const paused = env.t < env.pauseUntil;
        // smooth drift between 0.8 and 1.25
        env.drift += (((Math.sin(env.t * 0.9) + Math.sin(env.t * 2.3) * 0.4) * 0.18 + 1) - env.drift) * Math.min(1, dt * 4);
        factor = paused ? 0.03 : Math.max(0.4, env.drift);
        const targetMic = paused ? 0.12 : Math.min(1, 0.55 + (factor - 0.9) * 0.7 + Math.random() * 0.2);
        micRef.current += (targetMic - micRef.current) * Math.min(1, dt * 12);
      } else {
        factor = 1;
        micRef.current += (0 - micRef.current) * Math.min(1, dt * 8);
      }
      posRef.current += baseV * factor * dt;
      if (posRef.current >= range) {
        posRef.current = range;
        if (onEnd) onEnd();
      }
    } else {
      micRef.current += ((modeRef.current === 'voice' && playingRef.current ? 0.2 : 0) - micRef.current) * Math.min(1, dt * 8);
    }

    applyTransform();
    const active = findActive(posRef.current, focusY);
    applyActive(active);
    if (modeRef.current === 'voice') updateMeter();

    // throttled progress callback (~8/s)
    if (ts - lastProgressRef.current > 120 && onProgress) {
      lastProgressRef.current = ts;
      const frac = Math.min(1, posRef.current / range);
      onProgress(frac, frac * totalSecs, totalSecs, active);
    }
  }

  useEffect(() => {
    // Timer-driven tick (works even where rAF is suspended). performance.now()
    // keeps motion time-correct regardless of tick cadence.
    let alive = true;
    const id = setInterval(() => { if (alive) loop(performance.now()); }, 1000 / 60);
    rafRef.current = id;
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line
  }, [totalWords, focusPct]);

  // re-measure on layout-affecting prop changes
  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line
  }, [tokens, fontSize, lineHeight, weight, align, maxWidth, mirrorH, mirrorV, variant, focusPct]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return;
    let w = vp.clientWidth;
    const ro = new ResizeObserver(() => {
      // remeasure on width change (wrapping changes tops)
      if (Math.abs(vp.clientWidth - w) > 1) { w = vp.clientWidth; measure(); }
      else measure(); // height change → focusY only, cheap
    });
    ro.observe(vp);
    return () => ro.disconnect();
    // eslint-disable-next-line
  }, []);

  // wheel scrub in manual mode
  function onWheel(e) {
    if (modeRef.current !== 'manual') return;
    e.preventDefault();
    posRef.current = Math.max(0, Math.min(rangeRef.current, posRef.current + e.deltaY));
    applyTransform();
    const focusY = (viewportRef.current.clientHeight) * focusPct;
    applyActive(findActive(posRef.current, focusY));
  }

  useImperativeHandle(ref, () => ({
    seekWord(i) {
      const tops = topsRef.current;
      if (tops[i] == null) return;
      posRef.current = Math.max(0, Math.min(rangeRef.current, tops[i]));
      applyTransform();
      const focusY = viewportRef.current.clientHeight * focusPct;
      applyActive(findActive(posRef.current, focusY));
    },
    restart() {
      posRef.current = 0; lastActiveRef.current = -1; lastCueRef.current = -1;
      envRef.current = { pauseUntil: 0, nextPauseAt: 1.5, drift: 1, t: 0 };
      applyTransform();
      applyActive(0);
    },
    nudge(dPx) {
      posRef.current = Math.max(0, Math.min(rangeRef.current, posRef.current + dPx));
      applyTransform();
      const focusY = viewportRef.current.clientHeight * focusPct;
      applyActive(findActive(posRef.current, focusY));
    },
    getFraction() { return Math.min(1, posRef.current / rangeRef.current); },
  }));

  // color vars
  const colorVars = isCamera
    ? { '--up': 'rgba(255,255,255,0.92)', '--read': 'rgba(255,255,255,0.34)', '--act': '#ffffff' }
    : { '--up': 'color-mix(in srgb, var(--ink-1) 88%, transparent)', '--read': 'var(--ink-3)', '--act': 'var(--ink-1)' };

  let wi = -1;
  const content = tokens.map((tk, idx) => {
    if (tk.type === 'space') return ' ';
    if (tk.type === 'break') return <div key={'b' + idx} style={{ height: '0.7em' }} />;
    if (tk.type === 'cue') {
      return (
        <div key={'c' + idx} style={{
          display: 'flex', alignItems: 'center', gap: 10, margin: '0.15em 0 0.35em',
          opacity: 0.9,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.34em', fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '0.25em 0.7em', borderRadius: 999,
            color: isCamera ? '#fff' : 'var(--accent)',
            background: isCamera ? 'rgba(255,255,255,0.14)' : 'var(--accent-soft)',
            border: isCamera ? '1px solid rgba(255,255,255,0.22)' : '1px solid transparent',
          }}>{tk.label}</span>
          <span style={{ flex: 1, height: 1, background: isCamera ? 'rgba(255,255,255,0.18)' : 'var(--border)' }} />
        </div>
      );
    }
    // word
    wi = tk.wi;
    const myIndex = tk.wi;
    return (
      <span key={'w' + idx} ref={wordRef(myIndex)} className="prompt-word">{tk.text}</span>
    );
  });

  return (
    <div
      ref={viewportRef}
      onWheel={onWheel}
      style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        ...colorVars,
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 11%, #000 84%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, #000 11%, #000 84%, transparent 100%)',
      }}>
      {/* scroller */}
      <div
        ref={scrollerRef}
        style={{
          willChange: 'transform',
          paddingBottom: '60vh',
          margin: '0 auto',
          maxWidth: maxWidth + 'em',
          fontFamily: 'var(--font-mono)',
          fontSize: fontSize + 'px',
          lineHeight: lineHeight,
          fontWeight: weight,
          textAlign: align,
          letterSpacing: '-0.01em',
          textWrap: 'pretty',
          transform: `scaleX(${mirrorH ? -1 : 1}) scaleY(${mirrorV ? -1 : 1})`,
          transformOrigin: 'center',
        }}>
        {content}
      </div>

      {/* focus indicator */}
      <FocusIndicator style={focusStyle} color={focusColor} pct={focusPct} isCamera={isCamera} />

      {/* voice meter — "listening" indicator */}
      {mode === 'voice' && (
        <div style={{
          position: 'absolute', top: 14, right: 18,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 11px 5px 10px', borderRadius: 999,
          background: isCamera ? 'rgba(0,0,0,0.4)' : 'var(--surface-2)',
          border: isCamera ? '1px solid rgba(255,255,255,0.16)' : '1px solid var(--border)',
          pointerEvents: 'none', opacity: playing ? 1 : 0.5, transition: 'opacity 200ms',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 16 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} ref={(el) => { meterBars.current[i] = el; }} style={{
                width: 2.5, height: 16, borderRadius: 2, transformOrigin: 'center',
                transform: 'scaleY(0.2)',
                background: isCamera ? 'rgba(255,255,255,0.9)' : 'var(--accent)',
              }} />
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: isCamera ? 'rgba(255,255,255,0.85)' : 'var(--accent)' }}>
            {playing ? 'Listening' : 'Voice'}
          </span>
        </div>
      )}
    </div>
  );
});

function FocusIndicator({ style, color, pct, isCamera }) {
  if (style === 'off') return null;
  const top = `calc(${pct * 100}% )`;
  const lineColor = isCamera ? 'rgba(255,255,255,0.5)' : color;
  if (style === 'bar') {
    return <div style={{
      position: 'absolute', left: 0, right: 0, top,
      transform: 'translateY(-50%)', height: '1.5em',
      background: isCamera ? 'rgba(255,255,255,0.07)' : 'var(--accent-faint)',
      borderTop: `1px solid ${lineColor}`, borderBottom: `1px solid ${lineColor}`,
      pointerEvents: 'none',
    }} />;
  }
  if (style === 'arrows') {
    const tri = (dir) => (
      <span style={{
        width: 0, height: 0,
        borderTop: '9px solid transparent', borderBottom: '9px solid transparent',
        [dir === 'l' ? 'borderLeft' : 'borderRight']: `13px solid ${lineColor}`,
      }} />
    );
    return <div style={{
      position: 'absolute', left: 0, right: 0, top, transform: 'translateY(-50%)',
      display: 'flex', justifyContent: 'space-between', padding: '0 10px', pointerEvents: 'none',
    }}>{tri('r')}{tri('l')}</div>;
  }
  // line
  return <div style={{
    position: 'absolute', left: '6%', right: '6%', top, height: 2,
    transform: 'translateY(-50%)', background: lineColor, borderRadius: 2,
    pointerEvents: 'none', opacity: 0.85,
  }} />;
}

Object.assign(window, { PrompterCanvas });
