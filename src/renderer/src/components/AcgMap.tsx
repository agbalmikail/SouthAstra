import { useEffect, useMemo, useState } from 'react'
import type { AcgLine, ChartInput, CityHit } from '@shared/types'
import { placeLabel } from '@shared/types'
import world from '../assets/world.json'

const err = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

/** Gezegen başına çizgi rengi (her iki temada da okunur orta doygunlukta) */
export const PLANET_COLOR: Record<string, string> = {
  sun: '#e0a43a', moon: '#8f9bb0', mercury: '#3fa99a', venus: '#4caf7d', mars: '#e0503f', jupiter: '#3d8fd6',
  saturn: '#8e72c9', uranus: '#2fb3c9', neptune: '#5f6fd6', pluto: '#c4476a', chiron: '#a08a5c'
}

const X = (lon: number) => lon + 180
const Y = (lat: number) => 90 - lat
const R = 6371

/** Çizgiyi tarih değiştirme hattında böl (180° sıçramalarında) */
function polyPath(pts: [number, number][]): string {
  let d = ''
  let prev: [number, number] | null = null
  for (const p of pts) {
    const jump = prev && Math.abs(p[1] - prev[1]) > 90
    d += `${!prev || jump ? 'M' : 'L'}${X(p[1]).toFixed(2)} ${Y(p[0]).toFixed(2)}`
    prev = p
  }
  return d
}

const rad = Math.PI / 180
const hav = (la1: number, lo1: number, la2: number, lo2: number) => {
  const a = Math.sin(((la2 - la1) * rad) / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(((lo2 - lo1) * rad) / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}
/** Noktanın bir boylam çizgisine (meridyen) en kısa uzaklığı */
const toMeridian = (lat: number, lon: number, m: number) => R * Math.asin(Math.min(1, Math.abs(Math.cos(lat * rad) * Math.sin((lon - m) * rad))))
const toCurve = (lat: number, lon: number, pts: [number, number][]) => pts.reduce((best, p) => Math.min(best, hav(lat, lon, p[0], p[1])), Infinity)

export function distancesFor(lines: AcgLine[], lat: number, lon: number) {
  const out: { id: string; glyph: string; name: string; kind: 'MC' | 'IC' | 'AC' | 'DC'; km: number }[] = []
  for (const l of lines) {
    // meridyen uzaklığı yalnızca meridyenin aynı yarısındaysak anlamlı (MC: Δλ < 90°)
    const dMc = Math.abs(((lon - l.mc + 540) % 360) - 180) < 90 ? toMeridian(lat, lon, l.mc) : Infinity
    const dIc = Math.abs(((lon - l.ic + 540) % 360) - 180) < 90 ? toMeridian(lat, lon, l.ic) : Infinity
    out.push({ id: l.id, glyph: l.glyph, name: l.name, kind: 'MC', km: dMc })
    out.push({ id: l.id, glyph: l.glyph, name: l.name, kind: 'IC', km: dIc })
    out.push({ id: l.id, glyph: l.glyph, name: l.name, kind: 'AC', km: toCurve(lat, lon, l.asc) })
    out.push({ id: l.id, glyph: l.glyph, name: l.name, kind: 'DC', km: toCurve(lat, lon, l.dsc) })
  }
  return out.filter((d) => Number.isFinite(d.km)).sort((a, b) => a.km - b.km)
}

export function AcgMap({ input, lines, hidden, hovered, onHover, marker }: {
  input: ChartInput; lines: AcgLine[]; hidden: Set<string>; hovered: string | null; onHover: (id: string | null) => void; marker?: CityHit | null
}) {
  const shown = lines.filter((l) => !hidden.has(l.id))
  const grid = []
  for (let lon = -150; lon <= 150; lon += 30) grid.push(<line key={'o' + lon} x1={X(lon)} y1={0} x2={X(lon)} y2={180} className="acg-grid" />)
  for (let lat = -60; lat <= 60; lat += 30) grid.push(<line key={'a' + lat} x1={0} y1={Y(lat)} x2={360} y2={Y(lat)} className={lat === 0 ? 'acg-grid eq' : 'acg-grid'} />)
  return (
    <svg className="acg" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Astrokartografi haritası">
      <rect x={0} y={0} width={360} height={180} className="acg-sea" />
      <path d={world.land} className="acg-land" />
      <path d={world.borders} className="acg-border" />
      {grid}
      {shown.map((l) => {
        const c = PLANET_COLOR[l.id]
        const dim = hovered && hovered !== l.id
        return (
          <g key={l.id} style={{ opacity: dim ? 0.15 : 1 }} onMouseEnter={() => onHover(l.id)} onMouseLeave={() => onHover(null)}>
            <line x1={X(l.mc)} y1={0} x2={X(l.mc)} y2={180} stroke={c} className="acg-line" />
            <line x1={X(l.ic)} y1={0} x2={X(l.ic)} y2={180} stroke={c} className="acg-line dash" />
            <path d={polyPath(l.asc)} stroke={c} className="acg-line" fill="none" />
            <path d={polyPath(l.dsc)} stroke={c} className="acg-line dash" fill="none" />
            <text x={X(l.mc)} y={6} fill={c} className="acg-label">{l.glyph}MC</text>
            <text x={X(l.ic)} y={177} fill={c} className="acg-label">{l.glyph}IC</text>
          </g>
        )
      })}
      <g className="acg-birth">
        <circle cx={X(input.place.lon)} cy={Y(input.place.lat)} r={1.8} />
        <text x={X(input.place.lon) + 2.5} y={Y(input.place.lat) - 2} className="acg-place">Doğum yeri</text>
      </g>
      {marker && (
        <g className="acg-marker">
          <circle cx={X(marker.lon)} cy={Y(marker.lat)} r={1.8} />
          <text x={X(marker.lon) + 2.5} y={Y(marker.lat) - 2} className="acg-place">{marker.name}</text>
        </g>
      )}
    </svg>
  )
}

export function AcgPanel({ input, lines, hidden, setHidden, hovered, onHover, marker, setMarker }: {
  input: ChartInput; lines: AcgLine[]; hidden: Set<string>; setHidden: (s: Set<string>) => void; hovered: string | null; onHover: (id: string | null) => void
  marker: CityHit | null; setMarker: (c: CityHit | null) => void
}) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<CityHit[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return }
    const t = setTimeout(() => window.southastra.searchCities(q).then((r) => setHits(r.slice(0, 8))).catch((e) => setError(err(e))), 150)
    return () => clearTimeout(t)
  }, [q])
  const at = marker ?? input.place
  const dist = useMemo(() => distancesFor(lines.filter((l) => !hidden.has(l.id)), at.lat, at.lon).filter((d) => d.km <= 1200), [lines, hidden, at])
  const toggle = (id: string) => { const s = new Set(hidden); if (s.has(id)) s.delete(id); else s.add(id); setHidden(s) }
  return (
    <div>
      <p className="hint">Düz çizgi: MC (üst) ve yükselen (AC); kesikli çizgi: IC ve batan (DC). Doğum anında gezegenin o yerde köşede olduğu çizgilerdir.</p>
      <div className="chips">
        {lines.map((l) => (
          <button key={l.id} className={hidden.has(l.id) ? 'chip sym' : 'chip on sym'} style={{ borderColor: hidden.has(l.id) ? undefined : PLANET_COLOR[l.id], color: PLANET_COLOR[l.id] }} onClick={() => toggle(l.id)} onMouseEnter={() => onHover(l.id)} onMouseLeave={() => onHover(null)} title={l.name}>{l.glyph}</button>
        ))}
      </div>
      <div className="cap">Bir şehri kontrol et</div>
      <div className="city acg-city">
        <input id="acg-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Şehir adı yazın (taşınma, seyahat)…" />
        {hits.length > 0 && (
          <ul className="suggest">
            {hits.map((c) => <li key={c.geonameId} onMouseDown={() => { setMarker(c); setQ(''); setHits([]) }}><div className="s-main"><b>{c.name}</b>{c.localName && <span className="local-name"> ({c.localName})</span>} <span className="muted">— {[c.district, c.region, c.country].filter((x) => x && x !== c.name).join(', ')}</span></div></li>)}
          </ul>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="cap">{marker ? placeLabel(marker) : `Doğum yeri · ${placeLabel(input.place)}`}{marker && <button className="link small" style={{ marginLeft: 8 }} onClick={() => setMarker(null)}>Doğum yerine dön</button>}</div>
      <table className="data">
        <thead><tr><th>Çizgi</th><th className="r">Uzaklık</th></tr></thead>
        <tbody>
          {dist.map((d, i) => (
            <tr key={i} className={hovered === d.id ? 'hl' : ''} onMouseEnter={() => onHover(d.id)} onMouseLeave={() => onHover(null)}>
              <td><span className="sym" style={{ color: PLANET_COLOR[d.id] }}>{d.glyph}</span> {d.name} {d.kind}</td>
              <td className="r num">{d.km < 10 ? '< 10' : Math.round(d.km).toLocaleString('tr-TR')} km</td>
            </tr>
          ))}
          {!dist.length && <tr><td colSpan={2} className="muted">1200 km içinde çizgi yok.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

const lonTxt = (lon: number) => `${Math.abs(lon).toFixed(2).replace('.', ',')}° ${lon >= 0 ? 'D' : 'B'}`

function DistTable({ lines, lat, lon }: { lines: AcgLine[]; lat: number; lon: number }) {
  const d = distancesFor(lines, lat, lon).filter((x) => x.km <= 1200)
  return (
    <table className="data">
      <thead><tr><th>Çizgi</th><th className="r">Uzaklık</th></tr></thead>
      <tbody>
        {d.map((x, i) => <tr key={i}><td><span className="sym" style={{ color: PLANET_COLOR[x.id] }}>{x.glyph}</span> {x.name} {x.kind}</td><td className="r num">{x.km < 10 ? '< 10' : Math.round(x.km).toLocaleString('tr-TR')} km</td></tr>)}
        {!d.length && <tr><td colSpan={2} className="muted">1200 km içinde çizgi yok.</td></tr>}
      </tbody>
    </table>
  )
}

/** PDF: yatay A4; 1. sayfa harita ve açıklama, 2. sayfa uzaklıklar ve MC/IC boylamları */
export function AcgPrint({ input, lines, hidden, marker, utc, logo }: { input: ChartInput; lines: AcgLine[]; hidden: Set<string>; marker: CityHit | null; utc?: string; logo: string }) {
  const shown = lines.filter((l) => !hidden.has(l.id))
  return (
    <div className="print-page acg-print">
      <style>{'@page { size: A4 landscape; margin: 10mm 10mm 12mm; }'}</style>
      <section className="p-sec">
        <div className="p-h"><h2><img src={logo} alt="" className="logo-mark" /> Astrokartografi · {input.name}</h2><span>{input.date.split('-').reverse().join('.')} · {input.timeUnknown ? 'saat bilinmiyor' : input.time} · {placeLabel(input.place)}</span></div>
        <AcgMap input={input} lines={lines} hidden={hidden} hovered={null} onHover={() => undefined} marker={marker} />
        <div className="acg-legend">
          {shown.map((l) => <span key={l.id}><i style={{ background: PLANET_COLOR[l.id] }} /> <span className="sym">{l.glyph}</span> {l.name}</span>)}
        </div>
        <p className="hint">Düz çizgi: MC (gezegen tepe noktasında) ve AC (doğuyor); kesikli çizgi: IC (alt noktada) ve DC (batıyor). Çizgiler doğum anında ({utc ? utc.replace('T', ' ').replace(/(\.\d+)?Z$/, ' UT') : ''}) gezegenin o coğrafi konumda köşede olduğu yerleri gösterir; ekliptik boylam yerine gezegenin gerçek konumu (sağ açıklık ve deklinasyon) kullanılır. Harita eşit dikdörtgen izdüşümdür.</p>
      </section>
      <section className="p-sec">
        <div className="p-h"><h2>Çizgilere uzaklık</h2><span>{input.name}</span></div>
        <div className="p-two">
          <div><h3>Doğum yeri · {placeLabel(input.place)}</h3><DistTable lines={shown} lat={input.place.lat} lon={input.place.lon} /></div>
          <div>
            {marker && <><h3>{placeLabel(marker)}</h3><DistTable lines={shown} lat={marker.lat} lon={marker.lon} /></>}
            <h3>MC ve IC çizgilerinin boylamları</h3>
            <table className="data">
              <thead><tr><th>Gezegen</th><th className="r">MC</th><th className="r">IC</th></tr></thead>
              <tbody>{shown.map((l) => <tr key={l.id}><td><span className="sym" style={{ color: PLANET_COLOR[l.id] }}>{l.glyph}</span> {l.name}</td><td className="r num">{lonTxt(((l.mc + 540) % 360) - 180)}</td><td className="r num">{lonTxt(((l.ic + 540) % 360) - 180)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <p className="hint">Uzaklık: noktadan çizgiye en kısa yer yüzeyi uzaklığı (küresel Dünya, R = 6371 km). Yalnızca 1200 km içindeki çizgiler listelenir.</p>
      </section>
    </div>
  )
}
