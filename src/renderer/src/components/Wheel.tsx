import { useMemo } from 'react'
import type { Appearance, Aspect, ChartResult } from '@shared/types'
import { ASPECT_BY_TYPE, norm360, SIGNS } from '@shared/zodiac'
import { ELEMENT_VAR, fmtDegMin } from '../format'
import { t } from '@shared/i18n'

const C = 200

/** Tek çark ve çift çark (dış halkada ikinci harita) ölçüleri */
const GEO = {
  single: { R0: 188, R1: 158, RG: 139, RD: 119, RH: 96, RA: 89, ROUT: 188, OG: 0, OD: 0, gap: 7.5 },
  bi: { R0: 160, R1: 134, RG: 118, RD: 101, RH: 80, RA: 74, ROUT: 198, OG: 186, OD: 171, gap: 9 }
}

export const NO_RETRO = new Set(['northnode', 'southnode', 'lilith', 'fortune', 'sa-asc', 'sa-mc'])

/**
 * Gezegen işaretlerini çakışmayacak şekilde dağıtır.
 * Birbirine `gap` dereceden yakın gezegenler bir küme sayılır; küme, gerçek konumların
 * ortalaması etrafında eşit aralıkla dizilir. Kümeler birleşmeye devam ettikçe tekrarlanır.
 */
export function spread(items: { id: string; lon: number }[], gap: number) {
  const n = items.length
  if (n < 2) return items.map((p) => ({ ...p, disp: p.lon }))
  const sorted = [...items].sort((a, b) => a.lon - b.lon)
  // Çemberi en büyük boşluktan kes; böylece kümeler 0° Koç sınırında bölünmez
  let cut = 0
  let maxGap = -1
  for (let i = 0; i < n; i++) {
    const g = norm360(sorted[(i + 1) % n].lon - sorted[i].lon)
    if (g > maxGap) { maxGap = g; cut = (i + 1) % n }
  }
  const lin = Array.from({ length: n }, (_, k) => sorted[(cut + k) % n])
  const base = lin[0].lon
  const pos = lin.map((p) => base + norm360(p.lon - base))
  if (gap * n > 360) gap = 360 / n

  type Cluster = { start: number; end: number; center: number }
  const clusters: Cluster[] = pos.map((x, i) => ({ start: i, end: i, center: x }))
  const first = (c: Cluster) => c.center - ((c.end - c.start) * gap) / 2
  const last = (c: Cluster) => c.center + ((c.end - c.start) * gap) / 2
  for (let changed = true; changed;) {
    changed = false
    for (let i = 0; i < clusters.length - 1; i++) {
      const a = clusters[i]
      const b = clusters[i + 1]
      if (first(b) - last(a) < gap - 1e-9) {
        let sum = 0
        for (let k = a.start; k <= b.end; k++) sum += pos[k]
        clusters.splice(i, 2, { start: a.start, end: b.end, center: sum / (b.end - a.start + 1) })
        changed = true
        break
      }
    }
  }
  const out: { id: string; lon: number; disp: number }[] = []
  for (const c of clusters) for (let k = c.start; k <= c.end; k++) out.push({ ...lin[k], disp: norm360(first(c) + (k - c.start) * gap) })
  return out
}

interface Props {
  inner: ChartResult
  outer?: ChartResult
  cross: Aspect[]
  hovered: string | null // iç: "sun", dış: "o:sun"
  selected?: string | null
  onHover: (id: string | null) => void
  onSelect?: (id: string) => void
  showMinor: boolean
  print?: boolean
  appearance?: Appearance
}

const DEFAULT_LOOK: Appearance = { glyphScale: 1, showDegrees: true, showAspectLines: true, showHouseNumbers: true, coloredSigns: true, aspectLineWidth: 0.9, focusOthers: 'dim' }

export default function Wheel({ inner, outer, cross, hovered, selected, onHover, onSelect, showMinor, print, appearance }: Props) {
  const look = appearance ?? DEFAULT_LOOK
  const gs = look.glyphScale
  const g0 = outer ? GEO.bi : GEO.single
  const g = { ...g0, gap: g0.gap * Math.max(1, gs) }
  const { R0, R1, RG, RD, RH, RA, ROUT } = g
  const houses = inner.hasHouses
  // Ev yoksa (saat bilinmiyor) doğal çark: 0° Koç solda
  const asc = houses ? inner.angles.asc : 0
  const pt = (lon: number, r: number): [number, number] => {
    const th = Math.PI + (norm360(lon - asc) * Math.PI) / 180
    return [C + r * Math.cos(th), C - r * Math.sin(th)]
  }
  const L = (lon: number, r1: number, r2: number) => {
    const [x1, y1] = pt(lon, r1)
    const [x2, y2] = pt(lon, r2)
    return { x1, y1, x2, y2 }
  }
  // Derece yazısını yarıçap boyunca döndür; sol yarıda ters dönmesin
  const radialRot = (lon: number): number => {
    let r = norm360(-(180 + norm360(lon - asc)))
    if (r > 90 && r < 270) r -= 180
    return r
  }

  const innerPlaced = useMemo(() => spread(inner.points.map((p) => ({ id: p.id, lon: p.lon })), g.gap), [inner, g.gap])
  const outerPlaced = useMemo(() => (outer ? spread(outer.points.map((p) => ({ id: p.id, lon: p.lon })), g.gap) : []), [outer, g.gap])
  const ib = useMemo(() => Object.fromEntries(inner.points.map((p) => [p.id, p])), [inner])
  const ob = useMemo(() => Object.fromEntries((outer?.points ?? []).map((p) => [p.id, p])), [outer])
  const lonIn = (id: string): number => (id === 'asc' ? inner.angles.asc : id === 'mc' ? inner.angles.mc : ib[id]?.lon ?? 0)

  // Çift çarkta çizgiler dış→iç açılarını, tek çarkta haritanın kendi açılarını gösterir
  const lines = outer
    ? cross.filter((a) => a.type !== 'conjunction' && (showMinor || ASPECT_BY_TYPE[a.type]?.major)).map((a) => ({ a: 'o:' + a.a, b: a.b, la: ob[a.a]?.lon ?? 0, lb: lonIn(a.b), type: a.type, orb: a.orb }))
    : inner.aspects.filter((a) => a.certainty !== 'olasi' && a.type !== 'conjunction' && a.type !== 'parallel' && a.type !== 'contraparallel' && (showMinor || ASPECT_BY_TYPE[a.type]?.major)).map((a) => ({ a: a.a, b: a.b, la: lonIn(a.a), lb: lonIn(a.b), type: a.type, orb: a.orb }))

  // odak: üstüne gelinen gezegen; yoksa tıklanıp seçilen gezegen (kalıcı)
  const focus = hovered ?? (print ? null : selected ?? null)
  const pinned = !hovered && !!focus
  const relatedSet = useMemo(() => {
    if (!focus) return null
    const s = new Set<string>([focus])
    for (const l of lines) { if (l.a === focus) s.add(l.b); if (l.b === focus) s.add(l.a) }
    if (!outer) for (const a of inner.aspects) { if (a.a === focus) s.add(a.b); if (a.b === focus) s.add(a.a) }
    return s
  }, [focus, lines, outer, inner])

  const ticks = []
  for (let d = 0; d < 360; d++) {
    const len = d % 10 === 0 ? 7 : d % 5 === 0 ? 4.5 : 2.2
    ticks.push(<line key={d} {...L(d, R1, R1 - len)} className={d % 5 === 0 ? 'tick major' : 'tick'} />)
  }

  const planet = (p: { id: string; lon: number; disp: number }, which: 'in' | 'out') => {
    const pos = which === 'in' ? ib[p.id] : ob[p.id]
    const key = which === 'in' ? p.id : 'o:' + p.id
    const rg = which === 'in' ? RG : g.OG
    const rd = which === 'in' ? RD : g.OD
    const tickFrom = which === 'in' ? R1 : R0
    const tickTo = which === 'in' ? R1 - 8 : R0 + 7
    const leadTo = which === 'in' ? RG + 10 : g.OG - 10
    const [gx, gy] = pt(p.disp, rg)
    const [dx, dy] = pt(p.disp, rd)
    const moved = Math.abs(((p.disp - p.lon + 540) % 360) - 180) > 1
    const cls = ['planet', which === 'out' ? 'outer' : '', hovered === key ? 'hover' : '', selected === key ? 'sel' : '', relatedSet && !relatedSet.has(key) ? 'faded' : ''].join(' ')
    const isText = pos.glyph === 'AC' || pos.glyph === 'MC'
    return (
      <g key={key} className={cls} onMouseEnter={() => onHover(key)} onMouseLeave={() => onHover(null)} onClick={() => onSelect?.(key)}>
        <line {...L(p.lon, tickFrom, tickTo)} className="p-tick" />
        {moved && <line x1={pt(p.lon, tickTo)[0]} y1={pt(p.lon, tickTo)[1]} x2={pt(p.disp, leadTo)[0]} y2={pt(p.disp, leadTo)[1]} className="p-leader" />}
        {which === 'in' && <circle cx={pt(p.lon, RA)[0]} cy={pt(p.lon, RA)[1]} r={1.7} className="p-dot" />}
        <circle cx={gx} cy={gy} r={11} className="p-hit" />
        <text x={gx} y={gy} className={isText ? 'p-glyph txt' : 'p-glyph'} style={{ fontSize: (isText ? 8.5 : 16) * gs }}>{pos.glyph}</text>
        {look.showDegrees && <text x={dx} y={dy} className="p-deg" transform={`rotate(${radialRot(p.disp)} ${dx} ${dy})`}>{fmtDegMin(p.lon).replace("'", '')}{pos.retro && !NO_RETRO.has(p.id) ? 'R' : ''}</text>}
      </g>
    )
  }

  return (
    <svg className={print ? 'wheel print' : 'wheel'} viewBox="-24 -24 448 448" role="img" aria-label={t('Harita çarkı')}>
      {outer && (
        <>
          <circle cx={C} cy={C} r={ROUT} className="outer-band" />
          <text x={C} y={C - ROUT - 9} className="ring-label">{outer.label}</text>
        </>
      )}
      {/* burç halkası */}
      {SIGNS.map((s, i) => {
        const a = i * 30
        const b = a + 30
        const [x1, y1] = pt(a, R0)
        const [x2, y2] = pt(b, R0)
        const [x3, y3] = pt(b, R1)
        const [x4, y4] = pt(a, R1)
        const [gx, gy] = pt(a + 15, (R0 + R1) / 2)
        return (
          <g key={i}>
            <path d={`M${x1} ${y1}A${R0} ${R0} 0 0 0 ${x2} ${y2}L${x3} ${y3}A${R1} ${R1} 0 0 1 ${x4} ${y4}Z`} className={`wedge ${s.element}`} />
            <text x={gx} y={gy} className="sign-glyph" style={{ fill: look.coloredSigns ? ELEMENT_VAR[s.element] : 'var(--muted)', fontSize: (outer ? 14 : 17) * Math.min(gs, 1.2) }}>{s.glyph}</text>
            {outer && <line {...L(a, R0, ROUT)} className="cusp faint" />}
          </g>
        )
      })}
      {ticks}
      <circle cx={C} cy={C} r={RA} className="ring" />

      {/* evler */}
      {houses && inner.cusps.map((c, i) => {
        const axis = i % 3 === 0
        const next = inner.cusps[(i + 1) % 12]
        const mid = c + norm360(next - c) / 2
        const [hx, hy] = pt(mid, RH)
        return (
          <g key={i}>
            <line {...L(c, RA, axis ? ROUT + 5 : R1)} className={axis ? 'cusp axis' : 'cusp'} />
            {look.showHouseNumbers && <text x={hx} y={hy} className="house-num">{i + 1}</text>}
          </g>
        )
      })}
      {houses && ([['AC', inner.angles.asc], ['MC', inner.angles.mc], ['DC', inner.angles.dsc], ['IC', inner.angles.ic]] as const).map(([l, lon]) => {
        const [x, y] = pt(lon, ROUT + 14)
        return <text key={l} x={x} y={y} className="axis-label">{l}</text>
      })}

      {/* saat bilinmiyorsa Ay'ın gün içindeki olası aralığı */}
      {inner.input.timeUnknown && inner.kind !== 'composite' && ib.moon && (() => {
        const half = Math.abs(ib.moon.speed) / 2
        const r = R1 - 3
        const [x1, y1] = pt(ib.moon.lon - half, r)
        const [x2, y2] = pt(ib.moon.lon + half, r)
        return <path d={`M${x1} ${y1}A${r} ${r} 0 0 0 ${x2} ${y2}`} className="moon-range"><title>{t("Ay'ın gün içindeki olası aralığı")}</title></path>
      })()}

      {/* açı çizgileri */}
      <g className={focus ? `aspects dim${pinned && look.focusOthers === 'hide' ? ' hide' : ''}` : 'aspects'}>
        {look.showAspectLines && lines.map((l, i) => {
          const [x1, y1] = pt(l.la, RA)
          const [x2, y2] = pt(l.lb, RA)
          const on = focus && (l.a === focus || l.b === focus)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={`asp ${l.type}${on ? ' on' : ''}`} style={{ opacity: on ? 1 : Math.max(0.3, 1 - l.orb / 9), strokeWidth: on ? look.aspectLineWidth * 1.6 : look.aspectLineWidth }} />
        })}
      </g>

      {innerPlaced.map((p) => planet(p, 'in'))}
      {outerPlaced.map((p) => planet(p, 'out'))}
    </svg>
  )
}
