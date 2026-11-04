import { useEffect, useMemo, useState } from 'react'
import type { Ephemeris, EphemerisEvent, VoidPeriod } from '@shared/types'
import { ASPECT_BY_TYPE, pad2, SIGNS } from '@shared/zodiac'

const err = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const PHASES = ['Yeni ay', 'İlk dördün', 'Dolunay', 'Son dördün']
const NAMES: Record<string, string> = { sun: 'Güneş', moon: 'Ay', mercury: 'Merkür', venus: 'Venüs', mars: 'Mars', jupiter: 'Jüpiter', saturn: 'Satürn', uranus: 'Uranüs', neptune: 'Neptün', pluto: 'Plüton', chiron: 'Chiron', northnode: 'K. Düğüm' }
const GL: Record<string, string> = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', chiron: '⚷', northnode: '☊' }
const g = (id: string) => (GL[id] ?? id) + '︎'
const sg = (i: number) => SIGNS[i].glyph + '︎'

export type EphemTab = 'positions' | 'moon' | 'events'

/** Yerel saat biçimi: seçili saat dilimine göre "gg.aa ss:dd" */
export function fmtIn(iso: string, tz: string, withDate = true): string {
  const d = new Date(iso)
  const parts = Object.fromEntries(new Intl.DateTimeFormat('tr-TR', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((p) => [p.type, p.value]))
  return withDate ? `${parts.day}.${parts.month} ${parts.hour}:${parts.minute}` : `${parts.hour}:${parts.minute}`
}
const fmtDur = (ms: number) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa ${pad2(m % 60)} dk` }

/** Boylam hücresi: 21°♋55' (Ay için saniyesiz dakika yeterli) */
function cell(lon: number): string {
  const s = Math.floor(lon / 30)
  const inSign = lon - s * 30
  let d = Math.floor(inSign)
  let m = Math.round((inSign - d) * 60)
  if (m === 60) { m = 0; d += 1 }
  return `${pad2(d)}${sg(s)}${pad2(m)}`
}
const fmtSid = (h: number) => { const t = Math.round(h * 3600); return `${pad2(Math.floor(t / 3600) % 24)}:${pad2(Math.floor(t / 60) % 60)}:${pad2(t % 60)}` }

export function eventText(e: EphemerisEvent): string {
  if (e.type === 'phase') return `${PHASES[e.phase!]} · ${SIGNS[e.sign!].name}`
  if (e.type === 'ingress') return `${NAMES[e.body]} ${SIGNS[e.sign!].name}${e.retro ? ' (geri)' : ''}`
  return `${NAMES[e.body]} ${e.type === 'station-retro' ? 'geri harekete döner' : 'düz harekete döner'} · ${SIGNS[e.sign!].name}`
}
const eventGlyph = (e: EphemerisEvent) => e.type === 'phase' ? ['●', '◐', '○', '◑'][e.phase!] : e.type === 'ingress' ? `${g(e.body)}→${sg(e.sign!)}` : `${g(e.body)} ${e.type === 'station-retro' ? 'DR' : 'DD'}`

/** Günlük konum tablosu: her gün 0h UT; geçiş ve duraklama günleri vurgulu */
export function PositionsTable({ data, today }: { data: Ephemeris; today?: string }) {
  const stationDays = useMemo(() => {
    const m = new Map<string, 'DR' | 'DD'>()
    for (const e of data.events) if (e.type === 'station-retro' || e.type === 'station-direct') m.set(`${e.body}|${e.utc.slice(0, 10)}`, e.type === 'station-retro' ? 'DR' : 'DD')
    return m
  }, [data])
  return (
    <table className="data ephem">
      <thead>
        <tr>
          <th>Gün</th><th className="r">YZ</th>
          {data.bodies.map((b) => <th key={b.id} className="c" title={b.name}><span className="sym">{b.glyph}</span></th>)}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((r, i) => {
          const day = r.utc.slice(0, 10)
          const prev = data.rows[i - 1]
          const wd = new Date(r.utc).toLocaleDateString('tr-TR', { weekday: 'short', timeZone: 'UTC' })
          return (
            <tr key={r.utc} className={day === today ? 'hl' : ''}>
              <td className="num">{day.slice(8)} <span className="muted">{wd}</span></td>
              <td className="r num muted">{fmtSid(r.sidTime)}</td>
              {data.bodies.map((b) => {
                const p = r.pos[b.id]
                const ing = prev && Math.floor(prev.pos[b.id].lon / 30) !== Math.floor(p.lon / 30)
                const st = stationDays.get(`${b.id}|${day}`)
                const retro = p.speed < 0 && b.id !== 'northnode'
                return (
                  <td key={b.id} className={`c num${ing ? ' ing' : ''}${st ? ' st' : ''}${retro ? ' rx' : ''}`} title={st ? (st === 'DR' ? 'Bu gün geri harekete dönüyor' : 'Bu gün düz harekete dönüyor') : ing ? 'Burç değiştirdi' : undefined}>
                    {cell(p.lon)}{st ? <sup>{st}</sup> : retro && (!prev || prev.pos[b.id].speed >= 0) ? <sup>R</sup> : null}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function VoidTable({ data, tz, now }: { data: Ephemeris; tz: string; now?: number }) {
  const ing = data.events.filter((e) => e.type === 'ingress' && e.body === 'moon')
  return (
    <table className="data">
      <thead><tr><th>Boşluk başlar</th><th>Son açı</th><th>Biter (Ay burca girer)</th><th className="r">Süre</th></tr></thead>
      <tbody>
        {data.voids.map((v: VoidPeriod) => {
          const cur = now !== undefined && Date.parse(v.start) <= now && now < Date.parse(v.end)
          const a = v.last ? ASPECT_BY_TYPE[v.last.type] : null
          return (
            <tr key={v.end} className={cur ? 'hl' : ''}>
              <td className="num">{fmtIn(v.start, tz)}{cur && <span className="tag stat" style={{ marginLeft: 6 }}>şu an</span>}</td>
              <td>{v.last && a ? <><span className="sym">☽︎</span> <span className="sym">{a.glyph}</span> <span className="sym">{g(v.last.planet)}</span> <span className="muted small">{a.name.toLowerCase()} {NAMES[v.last.planet]}</span></> : <span className="muted">burçta açı yok</span>}</td>
              <td className="num">{fmtIn(v.end, tz)} <span className="sym">{sg(v.sign)}→{sg(v.nextSign)}</span> <span className="muted small">{SIGNS[v.nextSign].name}</span></td>
              <td className="r num">{fmtDur(Date.parse(v.end) - Date.parse(v.start))}</td>
            </tr>
          )
        })}
        {!data.voids.length && <tr><td colSpan={4} className="muted">Bu aralıkta boşluk dönemi yok.</td></tr>}
      </tbody>
      {ing.length > 0 && <caption className="muted small" style={{ captionSide: 'bottom', textAlign: 'left', paddingTop: 6 }}>Bu ay Ay {ing.length} kez burç değiştiriyor.</caption>}
    </table>
  )
}

export function EventsTable({ data, tz, moon = true }: { data: Ephemeris; tz: string; moon?: boolean }) {
  const list = data.events.filter((e) => moon || e.body !== 'moon' || e.type === 'phase')
  return (
    <table className="data">
      <thead><tr><th>Zaman</th><th></th><th>Olay</th></tr></thead>
      <tbody>
        {list.map((e, i) => (
          <tr key={i} className={e.type === 'phase' ? 'phase' : ''}>
            <td className="num">{fmtIn(e.utc, tz)}</td>
            <td className="sym c">{eventGlyph(e)}</td>
            <td>{eventText(e)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const ephemNote = (data: Ephemeris, tz: string) =>
  `${data.zodiac} · geosantrik görünür konumlar · Swiss Ephemeris. Günlük konumlar her gün 0h UT içindir; YZ: Greenwich yıldız zamanı. Olay ve boşluk saatleri ${tz === 'UTC' ? 'UT' : tz} saatiyle.`
export const voidNote = (vp: 'modern' | 'traditional') =>
  `Boşluktaki Ay: Ay'ın bulunduğu burçta ${vp === 'modern' ? 'Güneş–Plüton' : 'Güneş–Satürn (yalnız geleneksel gezegenler)'} ile yaptığı son tam Ptolemaik açıdan (kavuşum, altmışlık, kare, üçgen, karşıt) bir sonraki burca girişine kadar geçen süre.`

export default function EphemerisView({ tzChoices, onClose, onPdf }: {
  tzChoices: { tz: string; label: string }[]
  onClose: () => void
  onPdf: (data: Ephemeris, tz: string, title: string) => void
}) {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [tab, setTab] = useState<EphemTab>(() => { try { return (localStorage.getItem('sa.ephem.tab') as EphemTab) || 'positions' } catch { return 'positions' } })
  const [tz, setTz] = useState(tzChoices[0]?.tz ?? 'UTC')
  const [vp, setVp] = useState<'modern' | 'traditional'>('modern')
  const [data, setData] = useState<Ephemeris | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const from = new Date(Date.UTC(ym.y, ym.m, 1)).toISOString()
    const to = new Date(Date.UTC(ym.y, ym.m + 1, 1)).toISOString()
    setError('')
    window.southastra.ephemeris(from, to, vp).then(setData).catch((e) => setError(err(e)))
  }, [ym, vp])
  useEffect(() => { try { localStorage.setItem('sa.ephem.tab', tab) } catch { /* yok */ } }, [tab])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() } })
  const title = `${MONTHS[ym.m]} ${ym.y}`
  const isThisMonth = ym.y === now.getFullYear() && ym.m === now.getMonth()

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal ephem-modal">
        <div className="ephem-head">
          <h2>Efemeris</h2>
          <div className="tb-group">
            <button className="tb" onClick={() => shift(-12)} title="Bir yıl geri">«</button>
            <button className="tb" onClick={() => shift(-1)} title="Önceki ay">‹</button>
            <span className="ephem-month">{title}</span>
            <button className="tb" onClick={() => shift(1)} title="Sonraki ay">›</button>
            <button className="tb" onClick={() => shift(12)} title="Bir yıl ileri">»</button>
            {!isThisMonth && <button className="tb" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>Bu ay</button>}
          </div>
          <div className="seg-btn">
            <button className={tab === 'positions' ? 'on' : ''} onClick={() => setTab('positions')}>Günlük konumlar</button>
            <button className={tab === 'moon' ? 'on' : ''} onClick={() => setTab('moon')}>Ay: boşluk ve geçişler</button>
            <button className={tab === 'events' ? 'on' : ''} onClick={() => setTab('events')}>Olaylar</button>
          </div>
          <label className="ephem-tz"><span className="muted small">Saat</span>
            <select id="ephem-tz" value={tz} onChange={(e) => setTz(e.target.value)}>
              {tzChoices.map((c) => <option key={c.tz + c.label} value={c.tz}>{c.label}</option>)}
            </select>
          </label>
          <div className="ephem-actions">
            <button className="btn ghost" disabled={!data} onClick={() => data && onPdf(data, tz, title)}>PDF</button>
            <button className="btn ghost" onClick={onClose}>Kapat</button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        {data && (
          <div className="ephem-body">
            <p className="hint">{ephemNote(data, tz)}{tab === 'positions' && ' Vurgulu hücre: o gün burç değiştirdi. R: geri harekete geçti; DR / DD: o gün duraklıyor. Geri hareketteki değerler kırmızı.'}</p>
            {tab === 'positions' && <PositionsTable data={data} today={isThisMonth ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10) : undefined} />}
            {tab === 'moon' && (
              <>
                <div className="tl-opt">
                  <span className="muted small">Hesaba katılan gezegenler</span>
                  <div className="seg-btn">
                    <button className={vp === 'modern' ? 'on' : ''} onClick={() => setVp('modern')}>Güneş–Plüton</button>
                    <button className={vp === 'traditional' ? 'on' : ''} onClick={() => setVp('traditional')}>Güneş–Satürn</button>
                  </div>
                </div>
                <p className="hint">{voidNote(vp)}</p>
                <VoidTable data={data} tz={tz} now={Date.now()} />
              </>
            )}
            {tab === 'events' && <EventsTable data={data} tz={tz} />}
          </div>
        )}
      </div>
    </div>
  )
}

/** PDF: yatay A4; 1. sayfa günlük konumlar, 2. sayfa boşluktaki Ay ve olaylar */
export function EphemerisPrint({ data, tz, title, logo }: { data: Ephemeris; tz: string; title: string; logo: string }) {
  return (
    <div className="print-page ephem-print">
      <style>{'@page { size: A4 landscape; margin: 10mm 10mm 12mm; }'}</style>
      <section className="p-sec">
        <div className="p-h"><h2><img src={logo} alt="" className="logo-mark" /> Efemeris · {title}</h2><span>{data.zodiac}</span></div>
        <p className="hint">{ephemNote(data, tz)} Vurgulu hücre: o gün burç değiştirdi. R: geri harekete geçti; DR / DD: o gün duraklıyor.</p>
        <PositionsTable data={data} />
      </section>
      <section className="p-sec">
        <div className="p-h"><h2>Ay: boşluk ve geçişler · {title}</h2><span>{tz === 'UTC' ? 'UT' : tz}</span></div>
        <p className="hint">{voidNote(data.voidPlanets)}</p>
        <div className="p-two">
          <div><VoidTable data={data} tz={tz} /></div>
          <div><h3>Olaylar</h3><EventsTable data={data} tz={tz} moon={false} /></div>
        </div>
      </section>
    </div>
  )
}
