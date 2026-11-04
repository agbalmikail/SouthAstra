import type { Aspect, ChartResult } from '@shared/types'
import { ASPECT_BY_TYPE, pad2 } from '@shared/zodiac'
import { fmtDecl, fmtOrb, lonParts } from '../format'
import { NO_RETRO } from './Wheel'

export function Lon({ lon, seconds = false }: { lon: number; seconds?: boolean }) {
  const p = lonParts(lon)
  return (
    <span className="lon">
      <span className="num">{String(p.deg).padStart(2, ' ')}°</span>
      <span className="sym" style={{ color: p.color }} title={p.signName}>{p.glyph}</span>
      <span className="num">{pad2(p.min)}'{seconds ? `${pad2(p.sec)}"` : ''}</span>
    </span>
  )
}

interface HoverProps { hovered: string | null; onHover: (id: string | null) => void; onSelect?: (id: string) => void }

const DIGNITY_CLS: Record<string, string> = { Evinde: 'dg-good', Yücelimde: 'dg-good', Zararda: 'dg-bad', Düşüşte: 'dg-bad' }

export function PlanetTable({ chart, hovered, onHover, onSelect, prefix = '', compact = false }: { chart: ChartResult; prefix?: string; compact?: boolean } & HoverProps) {
  return (
    <table className="data">
      <thead>
        <tr><th></th><th>Nokta</th><th className="r">Boylam</th><th className="r">Ev</th>{!compact && <><th className="r">Hız</th><th className="r">Dekl.</th></>}</tr>
      </thead>
      <tbody>
        {chart.points.map((p) => (
          <tr key={p.id} className={[hovered === prefix + p.id ? 'hl' : '', onSelect ? 'click' : ''].join(' ')} onMouseEnter={() => onHover(prefix + p.id)} onMouseLeave={() => onHover(null)} onClick={() => onSelect?.(prefix + p.id)}>
            <td className={p.glyph.length > 2 ? 'g axis-txt' : 'sym g'}>{p.glyph}</td>
            <td>
              {p.name}
              {p.retro && !NO_RETRO.has(p.id) && <span className="tag retro" title="Geri hareket (retro)">R</span>}
              {p.stationary && <span className="tag stat" title="Duraklama: gezegen yön değiştirmek üzere">D</span>}
              {p.dignity && <span className={`tag ${DIGNITY_CLS[p.dignity]}`} title="Esas dignite">{p.dignity}</span>}
            </td>
            <td className="r"><Lon lon={p.lon} seconds /></td>
            <td className="r num">{chart.hasHouses && p.house ? p.house : '—'}</td>
            {!compact && <>
              <td className="r num muted">{p.speed ? p.speed.toFixed(3) : '—'}</td>
              <td className="r num muted">{p.declination ? fmtDecl(p.declination) : '—'}</td>
            </>}
          </tr>
        ))}
        {chart.hasHouses && ([['AC', 'Yükselen', chart.angles.asc], ['MC', 'Gökyüzü ortası', chart.angles.mc], ['Vx', 'Vertex', chart.angles.vertex]] as const).map(([k, n, lon]) => (
          <tr key={k} className="angle-row">
            <td className="g axis-txt">{k}</td>
            <td>{n}</td>
            <td className="r"><Lon lon={lon} seconds /></td>
            <td></td>{!compact && <><td></td><td></td></>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HouseTable({ chart }: { chart: ChartResult }) {
  if (!chart.hasHouses) return <p className="empty-note">Doğum saati bilinmediği için evler hesaplanmadı.</p>
  return (
    <table className="data">
      <thead><tr><th>Ev</th><th className="r">Başlangıç</th><th className="r">Genişlik</th><th className="r">İçindekiler</th></tr></thead>
      <tbody>
        {chart.cusps.map((c, i) => {
          const next = chart.cusps[(i + 1) % 12]
          const w = (next - c + 360) % 360
          const inside = chart.points.filter((p) => p.house === i + 1 && p.id !== 'southnode')
          return (
            <tr key={i}>
              <td className="num">{i + 1}{i === 0 ? ' · AC' : i === 9 ? ' · MC' : i === 3 ? ' · IC' : i === 6 ? ' · DC' : ''}</td>
              <td className="r"><Lon lon={c} seconds /></td>
              <td className="r num muted">{fmtOrb(w)}</td>
              <td className="r sym">{inside.map((p) => p.glyph).join(' ')}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'northnode', 'asc', 'mc']

export function AspectGrid({ chart, showMinor, hovered, onHover }: { chart: ChartResult; showMinor: boolean } & HoverProps) {
  const glyphOf = (id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.glyph ?? '?')
  const ids = ORDER.filter((id) => (id === 'asc' || id === 'mc') ? chart.hasHouses : chart.points.some((p) => p.id === id))
  const find = (a: string, b: string) => chart.aspects.find((x) => x.type !== 'parallel' && x.type !== 'contraparallel' && ((x.a === a && x.b === b) || (x.a === b && x.b === a)))
  return (
    <div className="grid-wrap">
      <table className="asp-grid">
        <tbody>
          {ids.map((row, ri) => (
            <tr key={row}>
              {ids.slice(0, ri).map((col) => {
                const a = find(row, col)
                const def = a ? ASPECT_BY_TYPE[a.type] : undefined
                const show = a && def && (showMinor || def.major)
                const on = hovered && (hovered === row || hovered === col)
                return (
                  <td key={col} className={on ? 'on' : ''} title={show && a && def ? `${def.name} · orb ${fmtOrb(a.orb)} · ${a.applying ? 'yaklaşan' : 'ayrılan'}` : ''}>
                    {show && a && def && (<><span className={`asp-g ${a.type}`}>{def.glyph}</span><span className="asp-orb">{a.applying ? 'A' : 'S'}{Math.floor(a.orb)}°{pad2(Math.round((a.orb % 1) * 60) % 60)}</span></>)}
                  </td>
                )
              })}
              <th className={`diag ${hovered === row ? 'on' : ''}`} onMouseEnter={() => onHover(row === 'asc' || row === 'mc' ? null : row)} onMouseLeave={() => onHover(null)}>
                <span className={row === 'asc' || row === 'mc' ? 'axis-txt' : 'sym'}>{glyphOf(row)}</span>
              </th>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">A: yaklaşan, S: ayrılan. Hücrenin üstüne gelince açının adı ve tam orbu görünür.</p>
    </div>
  )
}

function nameOf(chart: ChartResult | undefined, id: string): { glyph: string; name: string } {
  if (id === 'asc') return { glyph: 'AC', name: 'Yükselen' }
  if (id === 'mc') return { glyph: 'MC', name: 'MC' }
  const p = chart?.points.find((x) => x.id === id)
  return { glyph: p?.glyph ?? '?', name: p?.name ?? id }
}

function AspectRows({ list, a, b, prefixA, hovered, onHover }: { list: Aspect[]; a: ChartResult | undefined; b: ChartResult } & HoverProps & { prefixA: string }) {
  return (
    <table className="data">
      <thead><tr><th>Açı</th><th className="r">Orb</th><th className="r">Durum</th></tr></thead>
      <tbody>
        {list.map((x, i) => {
          const def = ASPECT_BY_TYPE[x.type]
          const A = nameOf(a, x.a)
          const B = nameOf(b, x.b)
          const on = hovered && (prefixA + x.a === hovered || x.b === hovered)
          const txt = (g: string) => (g.length > 2 ? 'axis-txt' : 'sym')
          return (
            <tr key={i} className={on ? 'hl' : ''} onMouseEnter={() => onHover(x.a === 'asc' || x.a === 'mc' ? x.b : prefixA + x.a)} onMouseLeave={() => onHover(null)}>
              <td>
                <span className={txt(A.glyph)}>{A.glyph}</span> <span className={`asp-g ${x.type}`}>{def.glyph}</span> <span className={txt(B.glyph)}>{B.glyph}</span>
                <span className="muted small"> {A.name} {def.name.toLowerCase()} {B.name}</span>
              </td>
              <td className="r num">{fmtOrb(x.orb)}</td>
              <td className="r muted small">{x.type === 'parallel' || x.type === 'contraparallel' ? 'deklinasyon' : x.applying ? 'yaklaşan' : 'ayrılan'}</td>
            </tr>
          )
        })}
        {!list.length && <tr><td colSpan={3} className="muted">Bu ayarlarla açı bulunmadı.</td></tr>}
      </tbody>
    </table>
  )
}

export function AspectList({ chart, showMinor, hovered, onHover }: { chart: ChartResult; showMinor: boolean } & HoverProps) {
  const list = chart.aspects.filter((a) => showMinor || ASPECT_BY_TYPE[a.type].major)
  return <AspectRows list={list} a={chart} b={chart} prefixA="" hovered={hovered} onHover={onHover} />
}

export function CrossList({ outer, inner, cross, showMinor, hovered, onHover }: { outer: ChartResult; inner: ChartResult; cross: Aspect[]; showMinor: boolean } & HoverProps) {
  const list = cross.filter((a) => showMinor || ASPECT_BY_TYPE[a.type].major)
  return (
    <>
      <p className="hint">Sol: {outer.label} (dış çark) · Sağ: {inner.label} (iç çark)</p>
      <AspectRows list={list} a={outer} b={inner} prefixA="o:" hovered={hovered} onHover={onHover} />
    </>
  )
}
