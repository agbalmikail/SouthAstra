import { useEffect, useMemo, useState } from 'react'
import type { ChartInput, ChartResult, EclipseEvent, Library, LifeEvent, Session } from '@shared/types'
import { ASPECT_BY_TYPE, pad2, SIGNS } from '@shared/zodiac'
import { dispositorChains, essentialDignities, isDayChart, mutualReceptions, sectUnknown } from '@shared/dignities'
import { aspectPatterns } from '@shared/patterns'
import { chartFactors, keyTitle, midpointHits, type Factor } from '@shared/factors'
import { fold } from '../search'
import { feedbackStats, fitShare, GENERIC_MIN_N, GENERIC_SHARE, looksGeneric, RATING_NAME, type FeedbackEntry, type Rating, type Tally } from '@shared/feedback'
import { fmtOrb } from '../format'
import { Lon } from './Tables'
import { usePanelParam } from '../panelParams'
import { t, loc } from '@shared/i18n'

const err = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
const today = () => new Date().toLocaleDateString('sv-SE')
const GROUPS: Factor['group'][] = ['Köşeler', 'Burçlar', 'Evler', 'Açılar']
/** Çevrilmiş metinde **kalın** ve _italik_ işaretlerini öğeye çevirir */
const rich = (s: string) => s.split(/(\*\*[^*]+\*\*|_[^_]+_)/).map((x, i) => x.startsWith('**') ? <b key={i}>{x.slice(2, -2)}</b> : x.startsWith('_') && x.length > 2 ? <i key={i}>{x.slice(1, -1)}</i> : x)

// ——— Yorum paneli: bu haritanın etkenleri + astrologun kendi metinleri ———

function FactorRow({ f, text, onSave, last }: { f: Factor; text?: string; onSave: (t: string) => void; last?: Rating }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(text ?? '')
  useEffect(() => setDraft(text ?? ''), [text])
  return (
    <div className={text ? 'factor has' : 'factor'}>
      <div className="factor-head">
        <span className="sym factor-g">{f.glyphs}</span>
        <span className="factor-t">{f.title}</span>
        {last && <span className={`tag rate-${last}`} title={t('Bu danışanın son seans geri bildirimi')}>{RATING_NAME[last]}</span>}
        {!edit && <button className="link small" onClick={() => setEdit(true)}>{text ? t('Düzenle') : t('Yorum yaz')}</button>}
      </div>
      {edit ? (
        <div className="factor-edit">
          <textarea autoFocus rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Bu etken için kendi yorumunuz. Kütüphaneye kaydedilir; bu etken başka bir haritada çıktığında da görünür.')} />
          <div className="actions">
            <button className="btn ghost small-btn" onClick={() => { setDraft(text ?? ''); setEdit(false) }}>{t('Vazgeç')}</button>
            <button className="btn primary small-btn" onClick={() => { onSave(draft); setEdit(false) }}>{t('Kaydet')}</button>
          </div>
        </div>
      ) : text ? <p className="factor-text">{text}</p> : null}
    </div>
  )
}

export function InterpretPanel({ chart, library, onSave, feedback, onFeedback, onBlind }: { chart: ChartResult; library: Library; onSave: (key: string, text: string) => void; feedback?: FeedbackEntry[]; onFeedback?: () => void; onBlind?: () => void }) {
  const factors = useMemo(() => chartFactors(chart), [chart])
  const [onlyDone, setOnlyDone] = useState(false)
  const done = factors.filter((f) => library[f.key]).length
  return (
    <div>
      <p className="hint">{t("Yorumlar sizin kişisel kütüphanenizdir: bir etken için bir kez yazdığınız metin, aynı etken başka bir haritada çıktığında da burada görünür. PDF'e eklemek isteğe bağlıdır.")}</p>
      <div className="toolbar">
        <span className="small"><b className="num">{done}</b> / <span className="num">{factors.length}</span> {t('etkenin yorumu var')}</span>
        <label className="inline small"><input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} /> {t('Sadece yorumlu olanlar')}</label>
        {onFeedback && <button className="btn ghost small" disabled={done === 0} title={done === 0 ? t('Önce bu haritanın etkenleri için yorum yazın') : t('Danışana metinleri etken adları olmadan, kontrol metinleriyle karışık gösterir')} onClick={onFeedback}>{t('Seans geri bildirimi al')}</button>}
        {onBlind && <button className="btn ghost small" onClick={onBlind} title={t('Yorumlarınızın haritaları ayırt edip etmediğini kör denemeyle ölçün')}>{t('Kör karşılaştırma')}</button>}
      </div>
      {GROUPS.map((g) => {
        const list = factors.filter((f) => f.group === g && (!onlyDone || library[f.key]))
        if (!list.length) return null
        return (
          <section key={g}>
            <div className="cap">{t(g)}</div>
            {list.map((f) => <FactorRow key={f.key} f={f} text={library[f.key]?.text} onSave={(t) => onSave(f.key, t)} last={[...(feedback ?? [])].reverse().find((x) => x.key === f.key && !x.control)?.rating} />)}
          </section>
        )
      })}
    </div>
  )
}

const tallyText = (x: Tally) => t('{fit} uyuyor · {partial} kısmen · {nofit} uymuyor', { fit: x.fit, partial: x.partial, nofit: x.nofit })

// ——— Kütüphane penceresi: tüm yorumlar ———

export function LibraryModal({ library, onSave, onClose, feedback = [] }: { library: Library; onSave: (key: string, text: string) => void; onClose: () => void; feedback?: FeedbackEntry[] }) {
  const fst = useMemo(() => feedbackStats(feedback), [feedback])
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
        <h2>{t('Yorum kütüphanesi')}</h2>
        <p className="hint" style={{ marginTop: -6 }}>{t('{n} yorum. Yeni yorumları bir haritanın “Yorum” sekmesinden ekleyin.', { n: Object.keys(library).length })}</p>
        {fst.real.n + fst.control.n > 0 && (
          <div className="fb-summary">
            <b>{t('Seans geri bildirimi (tüm danışanlar):')}</b> {t('haritada olan etkenlerin metinleri {n} kez işaretlendi, uyum %{p} · kontrol metinleri {cn} kez, uyum %{cp}.', { n: fst.real.n, p: Math.round(fitShare(fst.real) * 100), cn: fst.control.n, cp: Math.round(fitShare(fst.control) * 100) })}
            <span className="muted small"> {fst.control.n < 10 ? t('Karşılaştırma için henüz az veri var.') : fitShare(fst.control) >= fitShare(fst.real) - 0.05 ? t('Kontrol metinleri neredeyse gerçekler kadar uyuyor: metinler kişileri yeterince ayırt etmiyor olabilir.') : t('Gerçek metinler kontrollerden belirgin biçimde daha çok uyuyor.')} {t('Bu bir bilimsel kanıt değil, metinlerinizin ayırt ediciliğinin ölçüsüdür.')}</span>
          </div>
        )}
        <input id="lib-q" className="filter wide-filter" placeholder={t('Yorumlarda ara…')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="lib-list">
          {entries.map((e) => (
            <div key={e.key} className="factor has">
              <div className="factor-head">
                <span className="factor-t">{e.title}</span>
                <span className="muted small">{t(e.group)} · {new Date(e.updatedAt).toLocaleDateString(loc())}</span>
                {fst.byKey[e.key] && <span className="muted small" title={t('Haritada olduğunda / kontrol metni olarak gösterildiğinde')}>· {[fst.byKey[e.key].real.n ? tallyText(fst.byKey[e.key].real) : '', fst.byKey[e.key].control.n ? t('kontrol olarak: {tally}', { tally: tallyText(fst.byKey[e.key].control) }) : ''].filter(Boolean).join(' · ')}</span>}
                {looksGeneric(fst.byKey[e.key]) && <span className="tag cert-saate-bagli" title={t('Bu metin, etkene sahip olmayan kişilerde de (kontrol olarak) çoğunlukla uydu: en az {n} kontrol, uyum %{p}+. Daha somut ve ayırt edici yazmayı düşünün.', { n: GENERIC_MIN_N, p: Math.round(GENERIC_SHARE * 100) })}>{t('fazla genel olabilir')}</span>}
                {editing !== e.key && <button className="link small" onClick={() => { setEditing(e.key); setDraft(e.text) }}>{t('Düzenle')}</button>}
                {confirmDel === e.key
                  ? <button className="link small danger-text" onClick={() => { onSave(e.key, ''); setConfirmDel(null) }}>{t('Silmeyi onayla')}</button>
                  : <button className="link small" onClick={() => setConfirmDel(e.key)}>{t('Sil')}</button>}
              </div>
              {editing === e.key ? (
                <div className="factor-edit">
                  <textarea autoFocus rows={5} value={draft} onChange={(x) => setDraft(x.target.value)} />
                  <div className="actions">
                    <button className="btn ghost small-btn" onClick={() => setEditing(null)}>{t('Vazgeç')}</button>
                    <button className="btn primary small-btn" onClick={() => { onSave(e.key, draft); setEditing(null) }}>{t('Kaydet')}</button>
                  </div>
                </div>
              ) : <p className="factor-text">{e.text}</p>}
            </div>
          ))}
          {!entries.length && <p className="empty-note">{q ? t('Aramaya uyan yorum yok.') : t('Kütüphane henüz boş.')}</p>}
        </div>
        <div className="actions"><button className="btn primary" onClick={onClose}>{t('Kapat')}</button></div>
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
  if (!canSave) return <p className="empty-note">{t('Seans notu eklemek için önce haritayı arşive kaydedin.')}</p>
  const add = () => {
    if (!text.trim()) return
    onChange([...(input.sessions ?? []), { id: crypto.randomUUID(), date, text: text.trim() }])
    setText('')
  }
  return (
    <div>
      <div className="session-new">
        <div className="toolbar">
          <label className="inline small">{t('Seans tarihi')} <input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <textarea id="s-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Görüşmede konuşulanlar, danışanın soruları, takip edilecek transitler…')} />
        <div className="actions"><button className="btn primary small-btn" onClick={add} disabled={!text.trim()}>{t('Seansı ekle')}</button></div>
      </div>
      {sessions.map((s) => (
        <div key={s.id} className="session">
          <div className="factor-head">
            <b className="num">{new Date(s.date + 'T12:00:00').toLocaleDateString(loc(), { day: '2-digit', month: 'long', year: 'numeric' })}</b>
            {editId !== s.id && <button className="link small" onClick={() => { setEditId(s.id); setEditText(s.text) }}>{t('Düzenle')}</button>}
            <button className="link small" onClick={() => onChange((input.sessions ?? []).filter((x) => x.id !== s.id))}>{t('Sil')}</button>
          </div>
          {editId === s.id ? (
            <div className="factor-edit">
              <textarea autoFocus rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="actions">
                <button className="btn ghost small-btn" onClick={() => setEditId(null)}>{t('Vazgeç')}</button>
                <button className="btn primary small-btn" onClick={() => { onChange((input.sessions ?? []).map((x) => x.id === s.id ? { ...x, text: editText.trim() } : x)); setEditId(null) }}>{t('Kaydet')}</button>
              </div>
            </div>
          ) : <p className="factor-text">{s.text}</p>}
        </div>
      ))}
      {!sessions.length && <p className="empty-note">{t('Henüz seans notu yok.')}</p>}
    </div>
  )
}

// ——— Orta noktalar ———

export function MidpointsPanel({ chart, print }: { chart: ChartResult; print?: boolean }) {
  const [mp, setMp] = usePanelParam('midpoints')
  const orb = mp.orb
  const setOrb = (o: number) => setMp({ orb: o })
  const hits = useMemo(() => midpointHits(chart, orb), [chart, orb])
  const g = (id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.glyph ?? id)
  const cls = (id: string) => (id === 'asc' || id === 'mc' ? 'axis-txt' : 'sym')
  const n = (id: string) => (id === 'asc' ? t('Yükselen') : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.name ?? id)
  let last = ''
  return (
    <div>
      <p className="hint">{t("“Nokta = A/B”: nokta, A ile B'nin orta noktasına kavuşum, 45°, 90°, 135° veya 180° açıda (90° kadran). Ebertin ve Uranian astrolojisinde kullanılır.")}</p>
      {print ? <p className="hint">Orb ±{String(orb).replace('.', ',')}° · {t('{n} temas', { n: hits.length })}</p> : <div className="toolbar">
        <label className="inline small">Orb <select id="mp-orb" className="compact" value={orb} onChange={(e) => setOrb(Number(e.target.value))}>{[0.5, 1, 1.5, 2].map((o) => <option key={o} value={o}>{o}°</option>)}</select></label>
        <span className="muted small">{t('{n} temas', { n: hits.length })}</span>
      </div>}
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
          {!hits.length && <tr><td className="muted">{t('Bu orbla temas yok.')}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

// ——— Tutulmalar ———

export function EclipsePanel({ input, chart, print, preloaded }: { input: ChartInput; chart: ChartResult; print?: boolean; preloaded?: EclipseEvent[] }) {
  const [ep, setEp] = usePanelParam('eclipses')
  const { from, to, onlyContacts } = ep
  const setFrom = (v: string) => setEp({ ...ep, from: v })
  const setTo = (v: string) => setEp({ ...ep, to: v })
  const setOnlyContacts = (v: boolean) => setEp({ ...ep, onlyContacts: v })
  const [fetched, setList] = useState<EclipseEvent[]>([])
  const list = preloaded ?? fetched
  const [error, setError] = useState('')
  useEffect(() => {
    setError('')
    if (preloaded) return
    if (from && to) window.southastra.eclipses(input, `${from}T00:00:00Z`, `${to}T23:59:59Z`).then(setList).catch((e) => setError(err(e)))
  }, [input, from, to])
  const n = (id: string) => (id === 'asc' ? t('Yükselen') : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.name ?? id)
  const dt = (iso: string) => new Date(iso).toLocaleString(loc(), { timeZone: input.place.tz, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const row = (e: EclipseEvent, i: number) => (
    <tr key={i} className={e.contacts.length ? 'hl' : ''}>
      <td className="num small nowrap">{dt(e.utc)}</td>
      <td className="small">{e.kind === 'solar' ? t('Güneş') : t('Ay')} · {e.type}</td>
      <td className="r"><Lon lon={e.lon} /></td>
      <td className="small wrap">{e.contacts.map((c) => `${ASPECT_BY_TYPE[c.type].glyph} ${n(c.point)} ${Math.floor(c.orb)}°${pad2(Math.round((c.orb % 1) * 60) % 60)}'`).join(' · ') || <span className="muted">—</span>}</td>
    </tr>
  )
  const pre = list.filter((e) => e.prenatal)
  const next = list.filter((e) => !e.prenatal && (!onlyContacts || e.contacts.length))
  return (
    <div>
      <div className="cap">{t('Doğum öncesi tutulmalar')}</div>
      <table className="data"><tbody>{pre.map(row)}</tbody></table>
      <div className="cap">{t('Tutulmalar ve natal temaslar (3° orb · kavuşum, karşıt, kare)')}</div>
      {print ? <p className="hint">{from.split('-').reverse().join('.')} – {to.split('-').reverse().join('.')}{onlyContacts ? ` · ${t('yalnız natal teması olanlar')}` : ''} · {t('saatler {tz} saatiyle', { tz: input.place.tz })}</p> : <div className="toolbar wrap">
        <label className="inline small">{t('Başlangıç')} <input id="e-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline small">{t('Bitiş')} <input id="e-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="inline small"><input type="checkbox" checked={onlyContacts} onChange={(e) => setOnlyContacts(e.target.checked)} /> {t('Sadece temas edenler')}</label>
      </div>}
      {error && <p className="error">{error}</p>}
      <table className="data"><tbody>{next.map(row)}</tbody></table>
    </div>
  )
}

// ——— PDF seçenekleri ———

export type PdfSections = { chart: boolean; positions: boolean; aspects: boolean; analysis: boolean; timelords: boolean; eclipses: boolean; rectify: boolean; transits: boolean; technical: boolean; learning: boolean; highlights: boolean; compact: boolean; interpretations: boolean; notes: boolean }
export const DEFAULT_PDF: PdfSections = { chart: true, positions: true, aspects: true, analysis: true, timelords: false, eclipses: false, rectify: false, transits: true, technical: true, learning: false, highlights: true, compact: true, interpretations: true, notes: false }

const PDF_PRESETS: Record<string, { name: string; hint: string; on: (keyof PdfSections)[] }> = {
  basic: { name: 'Temel', hint: 'Harita, konumlar, ana açılar ve kısa açıklamalar', on: ['chart', 'highlights', 'positions', 'aspects', 'learning'] },
  pro: { name: 'Profesyonel', hint: 'Ayrıntılı tablolar, analiz, geleneksel teknikler, transit raporu ve teknik ek', on: ['chart', 'highlights', 'positions', 'aspects', 'analysis', 'timelords', 'eclipses', 'transits', 'interpretations', 'technical'] },
  learn: { name: 'Öğrenme', hint: 'Temel teknik veriler, sembol açıklamaları, kendi yorumlarınız, belirsizlik ve yöntem notları', on: ['chart', 'highlights', 'positions', 'learning', 'interpretations', 'technical'] }
}

export function PdfDialog({ initial, available, onCancel, onExport, details }: { initial: PdfSections; available: (keyof PdfSections)[]; onCancel: () => void; onExport: (s: PdfSections) => void; details?: Partial<Record<keyof PdfSections, string>> }) {
  const [s, setS] = useState(initial)
  const LABELS: Record<keyof PdfSections, string> = {
    chart: 'Harita çarkı ve doğum bilgileri', positions: 'Konumlar (gezegenler, evler)', aspects: 'Açılar',
    analysis: 'Analiz (dağılım, orta noktalar, sabit yıldızlar)', timelords: 'Profeksiyon ve firdaria (paneldeki ayarlarla)', eclipses: 'Tutulmalar (paneldeki tarih aralığıyla)', rectify: 'Doğum saati aralığı (paneldeki saatlerle)', transits: 'Transit raporu: öne çıkanlar, zaman çizelgesi, liste (paneldeki aralık ve filtrelerle)', technical: 'Teknik ek (efemeris, saat dilimi, orblar, sürüm)', learning: 'Öğrenme: sembollerin geleneksel anlamları (yeni başlayanlar için)', highlights: 'Öne çıkanlar: kural tabanlı özet (düz dille)', compact: 'Kısa bölümleri aynı sayfada sürdür (daha az boş sayfa)',
    interpretations: 'Yorumlarım (kütüphaneden)', notes: 'Notlar ve seans notları (danışana verilecekse kapalı tutun)'
  }
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}>
        <h2>{t('PDF olarak kaydet')}</h2>
        <p className="hint" style={{ marginTop: -6 }}>{t('Kapak, konumlar ve açı tablosu kendi sayfasında başlar; diğer bölümler “kısa bölümler” seçeneği açıksa kaldığı yerden sürer. Sayfalar numaralanır.')}</p>
        <div className="pdf-presets">
          <span className="muted small">{t('Rapor türü')}</span>
          {(Object.keys(PDF_PRESETS) as (keyof typeof PDF_PRESETS)[]).map((k) => (
            <button key={k} className="btn ghost small" title={t(PDF_PRESETS[k].hint)} onClick={() => setS(Object.fromEntries(Object.keys(s).map((x) => [x, x === 'compact' ? s.compact : PDF_PRESETS[k].on.includes(x as keyof PdfSections)])) as PdfSections)}>{t(PDF_PRESETS[k].name)}</button>
          ))}
        </div>
        <div className="pdf-opts">
          {available.map((k) => (
            <label key={k} className="inline"><input type="checkbox" checked={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} /> {t(LABELS[k])}{details?.[k] && <span className="muted small pdf-detail"> · {details[k]}</span>}</label>
          ))}
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={onCancel}>{t('Vazgeç')}</button>
          <button className="btn primary" autoFocus onClick={() => onExport(s)} disabled={!available.some((k) => s[k])}>{t('Kaydet')}</button>
        </div>
      </div>
    </div>
  )
}

// ——— Geleneksel analiz: esas dignite tablosu, karşılıklı ağırlama, dispozitör zinciri ———


const GL: Record<string, string> = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', asc: 'AC', mc: 'MC' }
const glyphOf = (id: string) => (GL[id] && GL[id].length === 1 ? GL[id] + '︎' : GL[id] ?? id)

/** Zincir döngüyle bitiyorsa: iki gezegenli döngü burç yöneticiliğiyle karşılıklı ağırlamadır; üç ve fazlası dispozitör döngüsüdür */
function loopText(chain: string[]): string {
  const last = chain[chain.length - 1]
  const size = chain.length - 1 - chain.indexOf(last)
  return size === 2 ? t('· döngü: iki gezegen birbirinin burcunda (ev ile karşılıklı ağırlama)') : t('· dispozitör döngüsü ({n} gezegen; karşılıklı ağırlama değildir)', { n: size })
}

export function TraditionalPanel({ chart }: { chart: ChartResult }) {
  const unknown = sectUnknown(chart)
  const [assume, setAssume] = usePanelParam('sectAssume')
  const rows = essentialDignities(chart, unknown ? assume === 'day' : undefined)
  const mr = mutualReceptions(chart)
  const [sys, setSys] = useState<'traditional' | 'modern'>('traditional')
  const chains = dispositorChains(chart, sys)
  const name = (id: string) => chart.points.find((p) => p.id === id)?.name ?? id
  const cell = (ruler: string | undefined, self: string) => ruler ? <span className={ruler === self ? 'sym self' : 'sym'} title={name(ruler)}>{glyphOf(ruler)}</span> : <span className="muted">—</span>
  return (
    <div>
      {unknown ? (
        <div className="sect-unknown">
          <p className="hint warn-inline">{rich(t('Doğum saati bilinmiyor: gündüz/gece haritası belirlenemez. Üçlük yöneticileri ve puanlar seçilen **varsayıma** göre hesaplanır; kesin değildir.'))}</p>
          <div className="seg-btn small"><button className={assume === 'day' ? 'on' : ''} onClick={() => setAssume('day')}>{t('Varsayım: gündüz')}</button><button className={assume === 'night' ? 'on' : ''} onClick={() => setAssume('night')}>{t('Varsayım: gece')}</button></div>
        </div>
      ) : <p className="hint">{isDayChart(chart) ? t('Gündüz haritası (Güneş ufkun üstünde)') : t('Gece haritası (Güneş ufkun altında)')}. {t('Vurgulu işaret: gezegen o satırda kendi dignitesinde.')}</p>}
      <table className="data dign">
        <thead><tr><th>{t('Gezegen')}</th><th className="c">{t('Ev')}</th><th className="c">{t('Yüc.')}</th><th className="c">{t('Üçlük')}</th><th className="c">{t('Sınır')}</th><th className="c">{t('Dekan')}</th><th className="r">{t('Puan')}</th></tr></thead>
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
      <p className="hint dign-rules">{rich(t("**Kurallar:** William Lilly, _Christian Astrology_ (1647) puanlaması. Ev (burç yöneticisi) +5, yücelim +4, üçlük +3 (Lilly'nin üçlük yöneticileri; gündüz/gece haritasına göre), sınır +2 (Mısır sınırları), dekan +1 (Kalde sırası). Zarar −5, düşüş −4; hiçbir olumlu esas dignitesi olmayan gezegen peregrine −5. Yalnızca yedi geleneksel gezegen puanlanır; araz (accidental) dignite ve karşılıklı ağırlama puana dahil değildir. Dispozitör zinciri varsayılan olarak geleneksel burç yöneticileriyle izlenir; modern seçenekte Akrep Plüton, Kova Uranüs, Balık Neptün tarafından yönetilir."))}</p>
      <div className="cap">{t('Karşılıklı ağırlama')}</div>
      {mr.length ? (
        <ul className="mini-list">{mr.map((m, i) => <li key={i}><span className="sym">{glyphOf(m.a)}</span> {name(m.a)} ⇄ <span className="sym">{glyphOf(m.b)}</span> {name(m.b)} <span className="muted">({m.kind})</span></li>)}</ul>
      ) : <p className="empty-note">{t('Karşılıklı ağırlama yok.')}</p>}
      <div className="cap">{t('Dispozitör zincirleri')} · {sys === 'traditional' ? t('geleneksel yöneticiler') : t('modern yöneticiler')}</div>
      <div className="seg-btn small" style={{ marginBottom: 6 }}><button className={sys === 'traditional' ? 'on' : ''} onClick={() => setSys('traditional')}>{t('Geleneksel (7 gezegen)')}</button><button className={sys === 'modern' ? 'on' : ''} onClick={() => setSys('modern')}>{t('Modern (♇ Akrep, ♅ Kova, ♆ Balık)')}</button></div>
      <ul className="mini-list">
        {chains.map((c) => (
          <li key={c.start}>
            {c.chain.map((id, i) => <span key={i}>{i > 0 && <span className="muted"> → </span>}<span className="sym" title={name(id)}>{glyphOf(id)}</span></span>)}
            <span className="muted small"> {c.end === 'final' ? t('· son dispozitör {name}', { name: name(c.chain[c.chain.length - 1]) }) : loopText(c.chain)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PatternsBlock({ chart }: { chart: ChartResult }) {
  const [angles, setAngles] = useState(false)
  const list = useMemo(() => aspectPatterns(chart, angles), [chart, angles])
  const name = (id: string) => (id === 'asc' ? t('Yükselen') : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.name ?? id)
  return (
    <div>
      <div className="cap">{t('Açı kalıpları')}</div>
      {chart.hasHouses && <label className="inline small"><input type="checkbox" checked={angles} onChange={(e) => setAngles(e.target.checked)} /> {t("AC ve MC'yi de dahil et")}</label>}
      {list.length ? (
        <ul className="mini-list patterns">
          {list.map((p, i) => (
            <li key={i}><b>{t(p.name)}</b> <span className="sym">{p.points.map(glyphOf).join(' ')}</span> <span className="muted small">{p.points.map(name).join(', ')} · {p.detail}</span></li>
          ))}
        </ul>
      ) : <p className="empty-note">{t('Majör açı kalıbı yok (büyük üçgen, T-kare, büyük haç, Yod, uçurtma, mistik dikdörtgen, stelyum).')}</p>}
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
  if (!canSave) return <p className="empty-note">{t('Olay eklemek için önce haritayı arşive kaydedin.')}</p>
  const events = [...(input.events ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const add = () => {
    if (!date || !title.trim()) return
    onChange([...(input.events ?? []), { id: crypto.randomUUID(), date, time: time || undefined, title: title.trim(), category: cat }])
    setTitle(''); setDate(''); setTime('')
  }
  const age = (d: string) => ((Date.parse(d) - Date.parse(input.date)) / (365.2422 * 86400000)).toFixed(1)
  return (
    <div>
      <p className="hint">{t("Hayattaki önemli olayları kaydedin. Bir olaya tıklayınca o tarihin transitlerini, progresyonunu veya solar arc'ını açabilirsiniz; doğum saatini düzeltirken olayların açılarla tutarlılığını kontrol etmek için kullanılır.")}</p>
      <div className="event-new">
        <input id="ev-title" placeholder={t('Olay (ör. evlilik, ilk iş)')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="toolbar wrap">
          <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} title={t('Saat (biliniyorsa)')} />
          <select id="ev-cat" className="compact" value={cat} onChange={(e) => setCat(e.target.value)}>{EVENT_CATS.map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>
          <button className="btn primary small-btn" onClick={add} disabled={!date || !title.trim()}>{t('Ekle')}</button>
        </div>
      </div>
      <table className="data">
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td className="num small nowrap">{new Date(ev.date + 'T12:00:00').toLocaleDateString(loc())}{ev.time ? ` ${ev.time}` : ''}<div className="muted">{t('yaş {n}', { n: age(ev.date) })}</div></td>
              <td><b>{ev.title}</b><div className="muted small">{t(ev.category)}</div></td>
              <td className="r nowrap">
                <button className="link small" onClick={() => onOpen(ev, 'transit')}>Transit</button>{' · '}
                <button className="link small" onClick={() => onOpen(ev, 'progressed')}>{t('Progresyon')}</button>{' · '}
                <button className="link small" onClick={() => onOpen(ev, 'solararc')}>Solar arc</button>{' · '}
                <button className="link small" onClick={() => onChange((input.events ?? []).filter((x) => x.id !== ev.id))}>{t('Sil')}</button>
              </td>
            </tr>
          ))}
          {!events.length && <tr><td className="muted">{t('Henüz olay yok.')}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
