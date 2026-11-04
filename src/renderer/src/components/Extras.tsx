import { useEffect, useMemo, useState } from 'react'
import type { ChartInput, ChartResult, EclipseEvent, Library, LifeEvent, Session } from '@shared/types'
import { ASPECT_BY_TYPE, pad2, SIGNS } from '@shared/zodiac'
import { dispositorChains, essentialDignities, isDayChart, mutualReceptions } from '@shared/dignities'
import { aspectPatterns } from '@shared/patterns'
import { chartFactors, keyTitle, midpointHits, type Factor } from '@shared/factors'
import { fold } from '../search'
import { fmtOrb } from '../format'
import { Lon } from './Tables'

const err = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
const today = () => new Date().toLocaleDateString('sv-SE')
const GROUPS: Factor['group'][] = ['Köşeler', 'Burçlar', 'Evler', 'Açılar']

// ——— Yorum paneli: bu haritanın etkenleri + astrologun kendi metinleri ———

function FactorRow({ f, text, onSave }: { f: Factor; text?: string; onSave: (t: string) => void }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(text ?? '')
  useEffect(() => setDraft(text ?? ''), [text])
  return (
    <div className={text ? 'factor has' : 'factor'}>
      <div className="factor-head">
        <span className="sym factor-g">{f.glyphs}</span>
        <span className="factor-t">{f.title}</span>
        {!edit && <button className="link small" onClick={() => setEdit(true)}>{text ? 'Düzenle' : 'Yorum yaz'}</button>}
      </div>
      {edit ? (
        <div className="factor-edit">
          <textarea autoFocus rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Bu etken için kendi yorumunuz. Kütüphaneye kaydedilir; bu etken başka bir haritada çıktığında da görünür." />
          <div className="actions">
            <button className="btn ghost small-btn" onClick={() => { setDraft(text ?? ''); setEdit(false) }}>Vazgeç</button>
            <button className="btn primary small-btn" onClick={() => { onSave(draft); setEdit(false) }}>Kaydet</button>
          </div>
        </div>
      ) : text ? <p className="factor-text">{text}</p> : null}
    </div>
  )
}

export function InterpretPanel({ chart, library, onSave }: { chart: ChartResult; library: Library; onSave: (key: string, text: string) => void }) {
  const factors = useMemo(() => chartFactors(chart), [chart])
  const [onlyDone, setOnlyDone] = useState(false)
  const done = factors.filter((f) => library[f.key]).length
  return (
    <div>
      <p className="hint">Yorumlar sizin kişisel kütüphanenizdir: bir etken için bir kez yazdığınız metin, aynı etken başka bir haritada çıktığında da burada görünür. PDF'e eklemek isteğe bağlıdır.</p>
      <div className="toolbar">
        <span className="small"><b className="num">{done}</b> / <span className="num">{factors.length}</span> etkenin yorumu var</span>
        <label className="inline small"><input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} /> Sadece yorumlu olanlar</label>
      </div>
      {GROUPS.map((g) => {
        const list = factors.filter((f) => f.group === g && (!onlyDone || library[f.key]))
        if (!list.length) return null
        return (
          <section key={g}>
            <div className="cap">{g}</div>
            {list.map((f) => <FactorRow key={f.key} f={f} text={library[f.key]?.text} onSave={(t) => onSave(f.key, t)} />)}
          </section>
        )
      })}
    </div>
  )
}

// ——— Kütüphane penceresi: tüm yorumlar ———

export function LibraryModal({ library, onSave, onClose }: { library: Library; onSave: (key: string, text: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const entries = Object.entries(library)
    .map(([key, v]) => ({ key, ...v, ...keyTitle(key) }))
    .filter((e) => !q || fold(e.title + ' ' + e.text).includes(fold(q)))
    .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.title.localeCompare(b.title, 'tr'))
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal wide" onKeyDown={(e) => { if (e.key === 'Escape' && !editing) onClose() }}>
        <h2>Yorum kütüphanesi</h2>
        <p className="hint" style={{ marginTop: -6 }}>{Object.keys(library).length} yorum. Yeni yorumları bir haritanın “Yorum” sekmesinden ekleyin.</p>
        <input id="lib-q" className="filter wide-filter" placeholder="Yorumlarda ara…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="lib-list">
          {entries.map((e) => (
            <div key={e.key} className="factor has">
              <div className="factor-head">
                <span className="factor-t">{e.title}</span>
                <span className="muted small">{e.group} · {new Date(e.updatedAt).toLocaleDateString('tr-TR')}</span>
                {editing !== e.key && <button className="link small" onClick={() => { setEditing(e.key); setDraft(e.text) }}>Düzenle</button>}
                {confirmDel === e.key
                  ? <button className="link small danger-text" onClick={() => { onSave(e.key, ''); setConfirmDel(null) }}>Silmeyi onayla</button>
                  : <button className="link small" onClick={() => setConfirmDel(e.key)}>Sil</button>}
              </div>
              {editing === e.key ? (
                <div className="factor-edit">
                  <textarea autoFocus rows={5} value={draft} onChange={(x) => setDraft(x.target.value)} />
                  <div className="actions">
                    <button className="btn ghost small-btn" onClick={() => setEditing(null)}>Vazgeç</button>
                    <button className="btn primary small-btn" onClick={() => { onSave(e.key, draft); setEditing(null) }}>Kaydet</button>
                  </div>
                </div>
              ) : <p className="factor-text">{e.text}</p>}
            </div>
          ))}
          {!entries.length && <p className="empty-note">{q ? 'Aramaya uyan yorum yok.' : 'Kütüphane henüz boş.'}</p>}
        </div>
        <div className="actions"><button className="btn primary" onClick={onClose}>Kapat</button></div>
      </div>
    </div>
  )
}

// ——— Seans notları ———

export function SessionsPanel({ input, canSave, onChange }: { input: ChartInput; canSave: boolean; onChange: (sessions: Session[]) => void }) {
  const sessions = [...(input.sessions ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const [date, setDate] = useState(today())
  const [text, setText] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  if (!canSave) return <p className="empty-note">Seans notu eklemek için önce haritayı arşive kaydedin.</p>
  const add = () => {
    if (!text.trim()) return
    onChange([...(input.sessions ?? []), { id: crypto.randomUUID(), date, text: text.trim() }])
    setText('')
  }
  return (
    <div>
      <div className="session-new">
        <div className="toolbar">
          <label className="inline small">Seans tarihi <input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <textarea id="s-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Görüşmede konuşulanlar, danışanın soruları, takip edilecek transitler…" />
        <div className="actions"><button className="btn primary small-btn" onClick={add} disabled={!text.trim()}>Seansı ekle</button></div>
      </div>
      {sessions.map((s) => (
        <div key={s.id} className="session">
          <div className="factor-head">
            <b className="num">{new Date(s.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</b>
            {editId !== s.id && <button className="link small" onClick={() => { setEditId(s.id); setEditText(s.text) }}>Düzenle</button>}
            <button className="link small" onClick={() => onChange((input.sessions ?? []).filter((x) => x.id !== s.id))}>Sil</button>
          </div>
          {editId === s.id ? (
            <div className="factor-edit">
              <textarea autoFocus rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="actions">
                <button className="btn ghost small-btn" onClick={() => setEditId(null)}>Vazgeç</button>
                <button className="btn primary small-btn" onClick={() => { onChange((input.sessions ?? []).map((x) => x.id === s.id ? { ...x, text: editText.trim() } : x)); setEditId(null) }}>Kaydet</button>
              </div>
            </div>
          ) : <p className="factor-text">{s.text}</p>}
        </div>
      ))}
      {!sessions.length && <p className="empty-note">Henüz seans notu yok.</p>}
    </div>
  )
}

// ——— Orta noktalar ———

export function MidpointsPanel({ chart, initialOrb = 1.5 }: { chart: ChartResult; initialOrb?: number }) {
  const [orb, setOrb] = useState(initialOrb)
  const hits = useMemo(() => midpointHits(chart, orb), [chart, orb])
  const g = (id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.glyph ?? id)
  const cls = (id: string) => (id === 'asc' || id === 'mc' ? 'axis-txt' : 'sym')
  const n = (id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.name ?? id)
  let last = ''
  return (
    <div>
      <p className="hint">“Nokta = A/B”: nokta, A ile B'nin orta noktasına kavuşum, 45°, 90°, 135° veya 180° açıda (90° kadran). Ebertin ve Uranian astrolojisinde kullanılır.</p>
      <div className="toolbar">
        <label className="inline small">Orb <select id="mp-orb" className="compact" value={orb} onChange={(e) => setOrb(Number(e.target.value))}>{[0.5, 1, 1.5, 2].map((o) => <option key={o} value={o}>{o}°</option>)}</select></label>
        <span className="muted small">{hits.length} temas</span>
      </div>
      <table className="data">
        <tbody>
          {hits.map((h, i) => {
            const head = h.point !== last
            last = h.point
            return [
              head && <tr key={'h' + i} className="month-row"><td colSpan={3}>{n(h.point)}</td></tr>,
              <tr key={i}>
                <td><span className={cls(h.point)}>{g(h.point)}</span> = <span className={cls(h.a)}>{g(h.a)}</span>/<span className={cls(h.b)}>{g(h.b)}</span> <span className="muted small">{n(h.a)} / {n(h.b)}</span></td>
                <td className="r muted small num">{h.angle}°</td>
                <td className="r num">{fmtOrb(h.orb)}</td>
              </tr>
            ]
          })}
          {!hits.length && <tr><td className="muted">Bu orbla temas yok.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

// ——— Tutulmalar ———

export function EclipsePanel({ input, chart }: { input: ChartInput; chart: ChartResult }) {
  const y = new Date().getFullYear()
  const [from, setFrom] = useState(`${y}-01-01`)
  const [to, setTo] = useState(`${y + 2}-12-31`)
  const [list, setList] = useState<EclipseEvent[]>([])
  const [onlyContacts, setOnlyContacts] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setError('')
    if (from && to) window.southastra.eclipses(input, `${from}T00:00:00Z`, `${to}T23:59:59Z`).then(setList).catch((e) => setError(err(e)))
  }, [input, from, to])
  const n = (id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.name ?? id)
  const dt = (iso: string) => new Date(iso).toLocaleString('tr-TR', { timeZone: input.place.tz, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const row = (e: EclipseEvent, i: number) => (
    <tr key={i} className={e.contacts.length ? 'hl' : ''}>
      <td className="num small nowrap">{dt(e.utc)}</td>
      <td className="small">{e.kind === 'solar' ? 'Güneş' : 'Ay'} · {e.type}</td>
      <td className="r"><Lon lon={e.lon} /></td>
      <td className="small wrap">{e.contacts.map((c) => `${ASPECT_BY_TYPE[c.type].glyph} ${n(c.point)} ${Math.floor(c.orb)}°${pad2(Math.round((c.orb % 1) * 60) % 60)}'`).join(' · ') || <span className="muted">—</span>}</td>
    </tr>
  )
  const pre = list.filter((e) => e.prenatal)
  const next = list.filter((e) => !e.prenatal && (!onlyContacts || e.contacts.length))
  return (
    <div>
      <div className="cap">Doğum öncesi tutulmalar</div>
      <table className="data"><tbody>{pre.map(row)}</tbody></table>
      <div className="cap">Tutulmalar ve natal temaslar (3° orb · kavuşum, karşıt, kare)</div>
      <div className="toolbar wrap">
        <label className="inline small">Başlangıç <input id="e-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline small">Bitiş <input id="e-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="inline small"><input type="checkbox" checked={onlyContacts} onChange={(e) => setOnlyContacts(e.target.checked)} /> Sadece temas edenler</label>
      </div>
      {error && <p className="error">{error}</p>}
      <table className="data"><tbody>{next.map(row)}</tbody></table>
    </div>
  )
}

// ——— PDF seçenekleri ———

export type PdfSections = { chart: boolean; positions: boolean; aspects: boolean; analysis: boolean; transits: boolean; interpretations: boolean; notes: boolean }
export const DEFAULT_PDF: PdfSections = { chart: true, positions: true, aspects: true, analysis: true, transits: true, interpretations: true, notes: false }

export function PdfDialog({ initial, available, onCancel, onExport }: { initial: PdfSections; available: (keyof PdfSections)[]; onCancel: () => void; onExport: (s: PdfSections) => void }) {
  const [s, setS] = useState(initial)
  const LABELS: Record<keyof PdfSections, string> = {
    chart: 'Harita çarkı ve doğum bilgileri', positions: 'Konumlar (gezegenler, evler)', aspects: 'Açılar',
    analysis: 'Analiz (dağılım, orta noktalar, sabit yıldızlar)', transits: 'Transit listesi (12 ay)',
    interpretations: 'Yorumlarım (kütüphaneden)', notes: 'Notlar ve seans notları (danışana verilecekse kapalı tutun)'
  }
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}>
        <h2>PDF olarak kaydet</h2>
        <p className="hint" style={{ marginTop: -6 }}>Her bölüm yeni sayfada başlar. Sayfalar numaralanır.</p>
        <div className="pdf-opts">
          {available.map((k) => (
            <label key={k} className="inline"><input type="checkbox" checked={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} /> {LABELS[k]}</label>
          ))}
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={onCancel}>Vazgeç</button>
          <button className="btn primary" autoFocus onClick={() => onExport(s)} disabled={!available.some((k) => s[k])}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}

// ——— Geleneksel analiz: esas dignite tablosu, karşılıklı ağırlama, dispozitör zinciri ———


const GL: Record<string, string> = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', asc: 'AC', mc: 'MC' }
const glyphOf = (id: string) => (GL[id] && GL[id].length === 1 ? GL[id] + '︎' : GL[id] ?? id)

export function TraditionalPanel({ chart }: { chart: ChartResult }) {
  const rows = essentialDignities(chart)
  const mr = mutualReceptions(chart)
  const chains = dispositorChains(chart)
  const name = (id: string) => chart.points.find((p) => p.id === id)?.name ?? id
  const cell = (ruler: string | undefined, self: string) => ruler ? <span className={ruler === self ? 'sym self' : 'sym'} title={name(ruler)}>{glyphOf(ruler)}</span> : <span className="muted">—</span>
  return (
    <div>
      <p className="hint">{isDayChart(chart) ? 'Gündüz haritası' : 'Gece haritası'} · Ptolemaios esas digniteleri, Mısır sınırları, Kalde dekanları, Lilly üçlük yöneticileri ve puanlaması. Vurgulu işaret: gezegen kendi dignitesinde.</p>
      <table className="data dign">
        <thead><tr><th>Gezegen</th><th className="c">Ev</th><th className="c">Yüc.</th><th className="c">Üçlük</th><th className="c">Sınır</th><th className="c">Dekan</th><th className="r">Puan</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} title={r.has.join(' · ')}>
              <td><span className="sym">{glyphOf(r.id)}</span> {name(r.id)} <span className="muted small">{SIGNS[r.sign].name}</span></td>
              <td className="c">{cell(r.ruler, r.id)}</td>
              <td className="c">{cell(r.exalt, r.id)}</td>
              <td className="c">{cell(r.trip, r.id)}</td>
              <td className="c">{cell(r.term, r.id)}</td>
              <td className="c">{cell(r.face, r.id)}</td>
              <td className={`r num ${r.score > 0 ? 'pos' : r.score < 0 ? 'neg' : ''}`}>{r.score > 0 ? '+' : ''}{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mini-list dign-notes">
        {rows.map((r) => <li key={r.id}><span className="sym">{glyphOf(r.id)}</span> {r.has.join(' · ')}</li>)}
      </ul>
      <div className="cap">Karşılıklı ağırlama</div>
      {mr.length ? (
        <ul className="mini-list">{mr.map((m, i) => <li key={i}><span className="sym">{glyphOf(m.a)}</span> {name(m.a)} ⇄ <span className="sym">{glyphOf(m.b)}</span> {name(m.b)} <span className="muted">({m.kind})</span></li>)}</ul>
      ) : <p className="empty-note">Karşılıklı ağırlama yok.</p>}
      <div className="cap">Dispozitör zincirleri (geleneksel yöneticiler)</div>
      <ul className="mini-list">
        {chains.map((c) => (
          <li key={c.start}>
            {c.chain.map((id, i) => <span key={i}>{i > 0 && <span className="muted"> → </span>}<span className="sym" title={name(id)}>{glyphOf(id)}</span></span>)}
            <span className="muted small"> {c.end === 'final' ? `· son dispozitör ${name(c.chain[c.chain.length - 1])}` : '· döngü (karşılıklı ağırlama)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PatternsBlock({ chart }: { chart: ChartResult }) {
  const [angles, setAngles] = useState(false)
  const list = useMemo(() => aspectPatterns(chart, angles), [chart, angles])
  const name = (id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.name ?? id)
  return (
    <div>
      <div className="cap">Açı kalıpları</div>
      {chart.hasHouses && <label className="inline small"><input type="checkbox" checked={angles} onChange={(e) => setAngles(e.target.checked)} /> AC ve MC'yi de dahil et</label>}
      {list.length ? (
        <ul className="mini-list patterns">
          {list.map((p, i) => (
            <li key={i}><b>{p.name}</b> <span className="sym">{p.points.map(glyphOf).join(' ')}</span> <span className="muted small">{p.points.map(name).join(', ')} · {p.detail}</span></li>
          ))}
        </ul>
      ) : <p className="empty-note">Majör açı kalıbı yok (büyük üçgen, T-kare, büyük haç, Yod, uçurtma, mistik dikdörtgen, stelyum).</p>}
    </div>
  )
}

// ——— Tarihsel olaylar ———

const EVENT_CATS = ['İlişki', 'Evlilik', 'Ayrılık', 'Çocuk', 'Kariyer', 'Eğitim', 'Taşınma', 'Sağlık', 'Kayıp', 'Kaza', 'Maddi', 'Diğer']

export function EventsPanel({ input, canSave, onChange, onOpen }: {
  input: ChartInput; canSave: boolean; onChange: (events: LifeEvent[]) => void; onOpen: (ev: LifeEvent, mode: 'transit' | 'progressed' | 'solararc') => void
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('Diğer')
  if (!canSave) return <p className="empty-note">Olay eklemek için önce haritayı arşive kaydedin.</p>
  const events = [...(input.events ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const add = () => {
    if (!date || !title.trim()) return
    onChange([...(input.events ?? []), { id: crypto.randomUUID(), date, time: time || undefined, title: title.trim(), category: cat }])
    setTitle(''); setDate(''); setTime('')
  }
  const age = (d: string) => ((Date.parse(d) - Date.parse(input.date)) / (365.2422 * 86400000)).toFixed(1)
  return (
    <div>
      <p className="hint">Hayattaki önemli olayları kaydedin. Bir olaya tıklayınca o tarihin transitlerini, progresyonunu veya solar arc'ını açabilirsiniz; doğum saatini düzeltirken olayların açılarla tutarlılığını kontrol etmek için kullanılır.</p>
      <div className="event-new">
        <input id="ev-title" placeholder="Olay (ör. evlilik, ilk iş)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="toolbar wrap">
          <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} title="Saat (biliniyorsa)" />
          <select id="ev-cat" className="compact" value={cat} onChange={(e) => setCat(e.target.value)}>{EVENT_CATS.map((c) => <option key={c}>{c}</option>)}</select>
          <button className="btn primary small-btn" onClick={add} disabled={!date || !title.trim()}>Ekle</button>
        </div>
      </div>
      <table className="data">
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td className="num small nowrap">{new Date(ev.date + 'T12:00:00').toLocaleDateString('tr-TR')}{ev.time ? ` ${ev.time}` : ''}<div className="muted">yaş {age(ev.date)}</div></td>
              <td><b>{ev.title}</b><div className="muted small">{ev.category}</div></td>
              <td className="r nowrap">
                <button className="link small" onClick={() => onOpen(ev, 'transit')}>Transit</button>{' · '}
                <button className="link small" onClick={() => onOpen(ev, 'progressed')}>Progresyon</button>{' · '}
                <button className="link small" onClick={() => onOpen(ev, 'solararc')}>Solar arc</button>{' · '}
                <button className="link small" onClick={() => onChange((input.events ?? []).filter((x) => x.id !== ev.id))}>Sil</button>
              </td>
            </tr>
          ))}
          {!events.length && <tr><td className="muted">Henüz olay yok.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
