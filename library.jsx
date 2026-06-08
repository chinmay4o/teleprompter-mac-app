/* global React, Icon, Button, IconButton, Pill, StatusTag, Eyebrow, wordCount, readTime */
// LibraryScreen — script home. Sidebar of folders + grid of script cards.

const { useState: useStateLib, useMemo: useMemoLib } = React;

const ACCENT_OPTIONS = ['lavender', 'sky', 'sage', 'peach', 'butter', 'rose'];

function snippet(body) {
  const text = body.split('\n').map(l => l.trim()).filter(l => l && !/^\[\[.+\]\]$/.test(l)).join(' ');
  return text.length > 132 ? text.slice(0, 132).trimEnd() + '…' : text;
}

function NewScriptModal({ onSave, onCancel }) {
  const { useState: useStateNS } = React;
  const [title, setTitle] = useStateNS('');
  const [folder, setFolder] = useStateNS('');
  const [body, setBody] = useStateNS('');
  const [accent, setAccent] = useStateNS('lavender');

  const handleSave = () => {
    if (!title.trim() || !body.trim()) return;
    onSave({ title: title.trim(), folder: folder.trim() || 'My Scripts', body: body.trim(), accent });
  };

  const inputStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 13.5, padding: '9px 12px',
    borderRadius: 'var(--r-input)', border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--ink-1)', outline: 'none', width: '100%',
    boxSizing: 'border-box', transition: 'border-color var(--dur-fast)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
    }}>
      <div style={{
        width: 580, background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)', padding: 28, boxShadow: 'var(--shadow-pop)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--ink-1)' }}>New script</h2>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-3)' }}>
            Use <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>[[Cue label]]</code> on its own line to add jump points.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>TITLE</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Product launch script"
              style={inputStyle} autoFocus />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>FOLDER</label>
            <input value={folder} onChange={e => setFolder(e.target.value)}
              placeholder="e.g. YouTube"
              style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>SCRIPT</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder={'[[Intro]]\nYour script goes here...\n\n[[Section 2]]\nKeep each paragraph on its own line for best results.'}
            style={{ ...inputStyle, height: 200, resize: 'vertical', lineHeight: 1.7 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)' }}>COLOR</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {ACCENT_OPTIONS.map(a => (
              <button key={a} onClick={() => setAccent(a)} style={{
                width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                background: `var(--pill-${a})`, border: accent === a ? '2px solid var(--ink-1)' : '2px solid transparent',
                outline: 'none',
              }} title={a} />
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}
            style={{ opacity: (!title.trim() || !body.trim()) ? 0.45 : 1, cursor: (!title.trim() || !body.trim()) ? 'default' : 'pointer' }}>
            <Icon name="check" size={14} /> Save script
          </Button>
        </div>
      </div>
    </div>
  );
}

function LibraryScreen({ scripts, wpm, onOpen, onRecord, onAddScript, onDeleteScript }) {
  const [filter, setFilter] = useStateLib('all');
  const [query, setQuery] = useStateLib('');
  const [favs, setFavs] = useStateLib(() => Object.fromEntries(scripts.map(s => [s.id, s.favorite])));
  const [newOpen, setNewOpen] = useStateLib(false);

  // sync favs when scripts list changes (e.g. new script added)
  React.useEffect(() => {
    setFavs(prev => {
      const next = { ...prev };
      scripts.forEach(s => { if (!(s.id in next)) next[s.id] = s.favorite || false; });
      return next;
    });
  }, [scripts]);

  const folders = useMemoLib(() => {
    const set = [];
    scripts.forEach(s => { if (!set.includes(s.folder)) set.push(s.folder); });
    return set;
  }, [scripts]);

  const counts = useMemoLib(() => {
    const c = { all: scripts.length, fav: scripts.filter(s => favs[s.id]).length };
    folders.forEach(f => c[f] = scripts.filter(s => s.folder === f).length);
    return c;
  }, [favs, folders, scripts]);

  const list = scripts.filter(s => {
    if (filter === 'fav' && !favs[s.id]) return false;
    if (filter !== 'all' && filter !== 'fav' && s.folder !== filter) return false;
    if (query && !(s.title + ' ' + s.body + ' ' + s.folder).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const navItem = (id, label, count) => {
    const active = filter === id;
    return (
      <button key={id} onClick={() => setFilter(id)} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        border: 'none', borderRadius: 'var(--r-input)', padding: '7px 11px', cursor: 'pointer',
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--ink-1)',
        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: active ? 600 : 500,
        transition: 'background var(--dur-fast) var(--ease)',
      }}>
        <span style={{ flex: 1 }}>{label}</span>
        <span style={{ color: active ? 'var(--accent)' : 'var(--ink-3)', fontSize: 12 }}>{count}</span>
      </button>
    );
  };

  const handleNewScript = (data) => {
    const newScript = {
      id: 'user-' + Date.now(),
      title: data.title,
      folder: data.folder,
      body: data.body,
      accent: data.accent,
      status: 'draft',
      favorite: false,
      updated: 'Just now',
    };
    onAddScript(newScript);
    setNewOpen(false);
    // Switch filter to show the new script's folder
    setFilter(data.folder || 'My Scripts');
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* sidebar */}
      <aside style={{
        width: 208, flexShrink: 0, borderRight: '1px solid var(--border)',
        padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 4,
        background: 'var(--paper)', overflowY: 'auto',
      }}>
        <Eyebrow style={{ padding: '4px 11px 8px' }}>Library</Eyebrow>
        {navItem('all', 'All scripts', counts.all)}
        {navItem('fav', '★ Favorites', counts.fav)}
        <Eyebrow style={{ padding: '18px 11px 8px' }}>Folders</Eyebrow>
        {folders.map(f => navItem(f, f, counts[f]))}
        <div style={{ flex: 1 }} />
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none',
          color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5, cursor: 'pointer',
          padding: '7px 11px', textAlign: 'left',
        }} onClick={() => setNewOpen(true)}>
          <Icon name="plus" size={14} /> New folder
        </button>
      </aside>

      {/* main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 28px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 19, color: 'var(--ink-1)' }}>
              {filter === 'all' ? 'All scripts' : filter === 'fav' ? 'Favorites' : filter}
            </h1>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              {list.length} {list.length === 1 ? 'script' : 'scripts'}
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 360, marginLeft: 'auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', borderRadius: 'var(--r-input)', padding: '7px 12px',
            }}>
              <Icon name="search" size={15} style={{ color: 'var(--ink-3)' }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search scripts…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-1)' }} />
            </div>
          </div>
          <Button onClick={() => setNewOpen(true)}><Icon name="plus" size={15} /> New script</Button>
        </div>

        {/* grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 40px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(296px, 1fr))', gap: 16,
          }}>
            {list.map(s => (
              <ScriptCard key={s.id} s={s} wpm={wpm}
                fav={!!favs[s.id]}
                onFav={() => setFavs(f => ({ ...f, [s.id]: !f[s.id] }))}
                onOpen={() => onOpen(s)} onRecord={() => onRecord(s)}
                onDelete={onDeleteScript ? () => onDeleteScript(s.id) : null} />
            ))}
          </div>
          {list.length === 0 && (
            <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)',
              fontFamily: 'var(--font-mono)', fontSize: 14 }}>
              {query ? `No scripts match "${query}".` : 'No scripts here yet.'}
            </div>
          )}
        </div>
      </div>

      {newOpen && <NewScriptModal onSave={handleNewScript} onCancel={() => setNewOpen(false)} />}
    </div>
  );
}

function ScriptCard({ s, wpm, fav, onFav, onOpen, onRecord, onDelete }) {
  const [hover, setHover] = useStateLib(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      style={{
        position: 'relative', background: 'var(--surface)',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 'var(--r-card)', padding: 20, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 12, minHeight: 184,
        transition: 'border-color var(--dur-fast) var(--ease)',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Pill tone={s.accent} size="sm">{s.folder}</Pill>
        <div style={{ flex: 1 }} />
        <button onClick={(e) => { e.stopPropagation(); onFav(); }} style={{
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 2,
          color: fav ? 'var(--accent)' : 'var(--ink-3)', display: 'flex',
        }} title={fav ? 'Unfavorite' : 'Favorite'}>
          <Icon name={fav ? 'star-fill' : 'star'} size={17} />
        </button>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, lineHeight: 1.35,
        color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{s.title}</div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.65, color: 'var(--ink-2)',
        flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {snippet(s.body)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)',
        fontSize: 11.5, color: 'var(--ink-3)', borderTop: '1px solid var(--border-faint)', paddingTop: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon name="type" size={13} /> {wordCount(s.body)} words
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon name="clock" size={13} /> {readTime(s.body, wpm)}
        </span>
        <div style={{ flex: 1 }} />
        <StatusTag status={s.status} />
      </div>

      {/* hover actions */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'var(--r-card)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 8, padding: 16,
        opacity: hover ? 1 : 0, pointerEvents: hover ? 'auto' : 'none',
        background: 'linear-gradient(to top, color-mix(in srgb, var(--surface) 82%, transparent), transparent 46%)',
        transition: 'opacity var(--dur-base) var(--ease)',
      }}>
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px',
            color: 'var(--ink-3)', display: 'flex', borderRadius: 'var(--r-input)',
            marginRight: 'auto',
          }} title="Delete script">
            <Icon name="square" size={15} />
          </button>
        )}
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <Icon name="eye" size={14} /> Prompter
        </Button>
        <Button size="sm" onClick={(e) => { e.stopPropagation(); onRecord(); }}>
          <Icon name="record" size={12} /> Record
        </Button>
      </div>
    </div>
  );
}

Object.assign(window, { LibraryScreen });
