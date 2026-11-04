// Haritadaki yorumlanabilir etkenler ve orta noktalar (kişisel yorum kütüphanesi için)
import type { ChartResult } from './types'
import { ASPECT_BY_TYPE, norm360, separation, SIGNS, signOf } from './zodiac'

export interface Factor {
  key: string // kütüphane anahtarı, ör. "ps:sun:4" (Güneş Aslan'da)
  group: 'Burçlar' | 'Evler' | 'Açılar' | 'Köşeler'
  title: string
  glyphs: string
}

const ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'ceres', 'pallas', 'juno', 'vesta', 'northnode', 'asc', 'mc']
const MAJOR = new Set(['conjunction', 'opposition', 'trine', 'square', 'sextile', 'quincunx'])

/** Natal haritadaki gezegen-burç, gezegen-ev, köşe-burç ve majör açı etkenleri */
export function chartFactors(c: ChartResult): Factor[] {
  const out: Factor[] = []
  const pts = c.points.filter((p) => ORDER.includes(p.id))
  const name = (id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : c.points.find((p) => p.id === id)?.name ?? id)
  const glyph = (id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : c.points.find((p) => p.id === id)?.glyph ?? '')
  if (c.hasHouses) {
    out.push({ key: `ang:asc:${signOf(c.angles.asc)}`, group: 'Köşeler', title: `Yükselen ${SIGNS[signOf(c.angles.asc)].name}`, glyphs: `AC ${SIGNS[signOf(c.angles.asc)].glyph}` })
    out.push({ key: `ang:mc:${signOf(c.angles.mc)}`, group: 'Köşeler', title: `MC ${SIGNS[signOf(c.angles.mc)].name}`, glyphs: `MC ${SIGNS[signOf(c.angles.mc)].glyph}` })
  }
  for (const p of pts) {
    const s = signOf(p.lon)
    out.push({ key: `ps:${p.id}:${s}`, group: 'Burçlar', title: `${p.name} ${SIGNS[s].name} burcunda`, glyphs: `${p.glyph} ${SIGNS[s].glyph}` })
  }
  if (c.hasHouses) {
    for (const p of pts) out.push({ key: `ph:${p.id}:${p.house}`, group: 'Evler', title: `${p.name} ${p.house}. evde`, glyphs: `${p.glyph} ${p.house}` })
  }
  for (const a of c.aspects) {
    if (!MAJOR.has(a.type)) continue
    const [x, y] = [a.a, a.b].sort((m, n) => ORDER.indexOf(m) - ORDER.indexOf(n))
    if (!ORDER.includes(x) || !ORDER.includes(y)) continue
    const def = ASPECT_BY_TYPE[a.type]
    out.push({ key: `as:${x}:${y}:${a.type}`, group: 'Açılar', title: `${name(x)} ${def.name.toLowerCase()} ${name(y)}`, glyphs: `${glyph(x)} ${def.glyph} ${glyph(y)}` })
  }
  return out
}

export interface MidpointHit {
  a: string
  b: string
  mid: number
  point: string
  angle: number // 0, 45, 90, 135, 180 (90° kadranda ilişki)
  orb: number
}

/**
 * Orta nokta temasları (Ebertin / Uranian yöntemi): bir nokta, iki noktanın orta noktasına
 * 0°, 45°, 90°, 135° veya 180° açıdaysa "Nokta = A/B" yazılır. 90° kadranda bu, kavuşum demektir.
 */
export function midpointHits(c: ChartResult, orb = 1.5): MidpointHit[] {
  const ids = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northnode']
  const items = [
    ...c.points.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, lon: p.lon })),
    ...(c.hasHouses ? [{ id: 'asc', lon: c.angles.asc }, { id: 'mc', lon: c.angles.mc }] : [])
  ]
  const hits: MidpointHit[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i]
      const B = items[j]
      const d = ((B.lon - A.lon + 540) % 360) - 180
      const mid = norm360(A.lon + d / 2)
      for (const P of items) {
        if (P.id === A.id || P.id === B.id) continue
        const sep = separation(P.lon, mid)
        for (const ang of [0, 45, 90, 135, 180]) {
          const o = Math.abs(sep - ang)
          if (o <= orb) { hits.push({ a: A.id, b: B.id, mid, point: P.id, angle: ang, orb: o }); break }
        }
      }
    }
  }
  return hits.sort((x, y) => ORDER.indexOf(x.point) - ORDER.indexOf(y.point) || x.orb - y.orb)
}

const NAMES: Record<string, string> = {
  sun: 'Güneş', moon: 'Ay', mercury: 'Merkür', venus: 'Venüs', mars: 'Mars', jupiter: 'Jüpiter', saturn: 'Satürn',
  uranus: 'Uranüs', neptune: 'Neptün', pluto: 'Plüton', chiron: 'Chiron', ceres: 'Ceres', pallas: 'Pallas', juno: 'Juno', vesta: 'Vesta', northnode: 'K. Ay Düğümü', asc: 'Yükselen', mc: 'MC'
}

/** Kütüphane anahtarını okunur başlığa çevirir (harita açık olmadan da) */
export function keyTitle(key: string): { title: string; group: Factor['group'] } {
  const [kind, a, b, c] = key.split(':')
  if (kind === 'ps') return { title: `${NAMES[a] ?? a} ${SIGNS[Number(b)]?.name} burcunda`, group: 'Burçlar' }
  if (kind === 'ph') return { title: `${NAMES[a] ?? a} ${b}. evde`, group: 'Evler' }
  if (kind === 'ang') return { title: `${NAMES[a] ?? a} ${SIGNS[Number(b)]?.name}`, group: 'Köşeler' }
  if (kind === 'as') return { title: `${NAMES[a] ?? a} ${(ASPECT_BY_TYPE[c as keyof typeof ASPECT_BY_TYPE]?.name ?? c).toLowerCase()} ${NAMES[b] ?? b}`, group: 'Açılar' }
  return { title: key, group: 'Açılar' }
}
