import type { Aspect, ChartResult, PointPos } from '@shared/types'
import { ASPECT_BY_TYPE, pad2, SIGNS } from '@shared/zodiac'
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

export function stationText(st: NonNullable<PointPos['station']>): string {
  const d = Math.abs(st.days)
  const when = d < 1 ? `${Math.round(d * 24)} saat` : `${d.toFixed(1).replace('.', ',')} gün`
  return `${st.kind === 'retro' ? 'Geri harekete' : 'Düz harekete'} dönüş (duraklama) doğumdan ${when} ${st.days >= 0 ? 'sonra' : 'önce'}: ${new Date(st.utc).toISOString().slice(0, 16).replace('T', ' ')} UT`
}

const lonTxt = (lon: number) => { const s = Math.floor(lon / 30); const d = lon - s * 30; return `${Math.floor(d)}°${pad2(Math.floor((d % 1) * 60))}′ ${SIGNS[s].name}` }

export const PLANET_LEGEND = 'Hız: ekliptik boylamda günlük hareket (°/gün); eksi değer geri harekettir (R). DR / DD: duraklama, yani gezegen yön değiştiriyor (DR: geri harekete dönüyor, DD: düz harekete dönüyor). Kesin duraklama anı doğuma şu kadar gün yakınsa gösterilir: Merkür 1, Venüs 2, Mars 3, Jüpiter 5, Satürn 6, Uranüs ve Chiron 8, Neptün 9, Plüton 10, asteroitler 4. Düz harekete dönmeden önce gezegen hem R hem DD görünür. Dekl.: deklinasyon (K kuzey, G güney). Evinde / Yücelimde / Zararda / Düşüşte: geleneksel esas dignite. Ay düğümü türü adında belirtilir (gerçek veya ortalama).'

export function PlanetTable({ chart, hovered, onHover, onSelect, prefix = '', compact = false, innerLabel }: { chart: ChartResult; prefix?: string; compact?: boolean; innerLabel?: string } & HoverProps) {
  const showInner = !!innerLabel && chart.points.some((p) => p.innerHouse)
  return (
    <table className="data">
      <thead>
        <tr><th></th><th>Nokta</th><th className="r">Boylam</th><th className="r">Ev</th>{showInner && <th className="r" title={`Noktanın ${innerLabel} evlerindeki yeri (ekliptik boylama göre)`}>{innerLabel} evi</th>}{!compact && <><th className="r" title="Ekliptik boylamda günlük hareket">Hız °/gün</th><th className="r" title="Deklinasyon: K kuzey, G güney">Dekl.</th></>}</tr>
      </thead>
      <tbody>
        {chart.points.map((p) => (
          <tr key={p.id} className={[hovered === prefix + p.id ? 'hl' : '', onSelect ? 'click' : ''].join(' ')} onMouseEnter={() => onHover(prefix + p.id)} onMouseLeave={() => onHover(null)} onClick={() => onSelect?.(prefix + p.id)}>
            <td className={p.glyph.length > 2 ? 'g axis-txt' : 'sym g'}>{p.glyph}</td>
            <td>
              {p.name}
              {p.id === 'moon' && chart.moonRange && <span className="tag cert-saate-bagli" title={`Doğum saati bilinmiyor: boylam 12:00 referansına göredir. Ay doğum gününde ${lonTxt(chart.moonRange.from)} ile ${lonTxt(chart.moonRange.to)} arasındadır.`}>12:00 ref. · gün içi {lonTxt(chart.moonRange.from)}–{lonTxt(chart.moonRange.to)}</span>}
              {p.retro && !NO_RETRO.has(p.id) && <span className="tag retro" title="Geri hareket (retro)">R</span>}
              {p.station && <span className="tag stat" title={stationText(p.station)}>{p.station.kind === 'retro' ? 'DR' : 'DD'}</span>}
              {p.dignity && <span className={`tag ${DIGNITY_CLS[p.dignity]}`} title="Esas dignite">{p.dignity}</span>}
            </td>
            <td className="r"><Lon lon={p.lon} seconds /></td>
            <td className="r num">{chart.hasHouses && p.house ? p.house : '—'}</td>
            {showInner && <td className="r num"><b>{p.innerHouse ?? '—'}</b></td>}
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
            <td></td>{showInner && <td></td>}{!compact && <><td></td><td></td></>}
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

const ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'ceres', 'pallas', 'juno', 'vesta', 'northnode', 'asc', 'mc']

export function AspectGrid({ chart, showMinor, hovered, onHover, legend }: { chart: ChartResult; showMinor: boolean; legend?: React.ReactNode } & HoverProps) {
  const glyphOf = (id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.glyph ?? '?')
  const ids = ORDER.filter((id) => (id === 'asc' || id === 'mc') ? chart.hasHouses : chart.points.some((p) => p.id === id))
  const find = (a: string, b: string) => {
    const l = chart.aspects.filter((x) => x.type !== 'parallel' && x.type !== 'contraparallel' && ((x.a === a && x.b === b) || (x.a === b && x.b === a)))
    return l.find((x) => x.certainty !== 'olasi') ?? l[0]
  }
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
                  <td key={col} className={[on ? 'on' : '', a?.certainty && a.certainty !== 'kesin' ? 'uncertain' : ''].join(' ')} title={show && a && def ? `${def.name} · ${a.certainty && a.certainty !== 'kesin' ? `${CERT[a.certainty]} (doğum saati bilinmiyor) · 12:00'de orb ${fmtOrb(a.orb)}` : `orb ${fmtOrb(a.orb)} · ${a.applying ? 'yaklaşan' : 'ayrılan'}`}` : ''}>
                    {show && a && def && (<><span className={`asp-g ${a.type}`}>{def.glyph}</span><span className="asp-orb">{a.certainty && a.certainty !== 'kesin' ? '?' : <>{a.applying ? 'A' : 'S'}{Math.floor(a.orb)}°{pad2(Math.round((a.orb % 1) * 60) % 60)}</>}</span></>)}
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
      {legend ?? <p className="hint">A: yaklaşan, S: ayrılan. Hücrenin üstüne gelince açının adı ve tam orbu görünür.</p>}
    </div>
  )
}

function nameOf(chart: ChartResult | undefined, id: string): { glyph: string; name: string } {
  if (id === 'asc') return { glyph: 'AC', name: 'Yükselen' }
  if (id === 'mc') return { glyph: 'MC', name: 'MC' }
  const p = chart?.points.find((x) => x.id === id)
  return { glyph: p?.glyph ?? '?', name: p?.name ?? id }
}

const CERT: Record<string, string> = { kesin: 'kesin', 'saate-bagli': 'saate bağlı', olasi: 'olası' }
const CERT_HINT: Record<string, string> = {
  kesin: 'Doğum saati bilinmiyor; Ay bu açıyı doğum gününün her saatinde orb içinde yapıyor.',
  'saate-bagli': 'Doğum saati bilinmiyor; açı 12:00 referans saatinde var ama günün bir kısmında orb dışında kalıyor.',
  olasi: "Doğum saati bilinmiyor; açı 12:00'de yok ama gün içinde başka bir saatte oluşabiliyor. Parantezdeki değer gün içindeki en dar orb."
}
export const MOON_UNCERTAINTY_NOTE = "Doğum saati bilinmiyor: Ay'ın açıları doğum günü boyunca (00:00–24:00) tarandı. Kesin: her saatte orb içinde · Saate bağlı: 12:00 referansında var, günün bir kısmında yok · Olası: 12:00'de yok, başka bir saatte oluşabilir. Orb değerleri 12:00 referans saatine göredir; gerçek orb bilinmiyor."

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
              <td className="r num">{x.certainty === 'olasi' ? <span className="muted" title="12:00'de açı yok; gün içindeki en dar orb">({fmtOrb(x.minOrb ?? x.orb)})</span> : fmtOrb(x.orb)}</td>
              <td className="r muted small">
                {x.certainty && <span className={`tag cert-${x.certainty}`} title={CERT_HINT[x.certainty]}>{CERT[x.certainty]}</span>}{' '}
                {x.type === 'parallel' || x.type === 'contraparallel' ? 'deklinasyon' : x.applyingUnknown ? 'yön saate bağlı' : x.certainty && x.certainty !== 'kesin' ? '' : x.applying ? 'yaklaşan' : 'ayrılan'}
              </td>
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
  return <>{chart.moonRange && <p className="hint">{MOON_UNCERTAINTY_NOTE}</p>}<AspectRows list={list} a={chart} b={chart} prefixA="" hovered={hovered} onHover={onHover} /></>
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
