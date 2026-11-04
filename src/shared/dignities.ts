// Geleneksel astroloji: esas dignite (Ptolemaios / Lilly), karşılıklı ağırlama, dispozitör zinciri
import type { ChartResult } from './types'
import { signOf } from './zodiac'
import { t } from './i18n'

export const TRAD = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const
type P = (typeof TRAD)[number]

const SIGN_RULER: P[] = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter']
const EXALT_SIGN: Partial<Record<P, number>> = { sun: 0, moon: 1, mercury: 5, venus: 11, mars: 9, jupiter: 3, saturn: 6 }
// Üçlük yöneticileri (Lilly): [gündüz, gece] — Ateş, Toprak, Hava, Su
const TRIPLICITY: [P, P][] = [['sun', 'jupiter'], ['venus', 'moon'], ['saturn', 'mercury'], ['mars', 'mars']]
// Mısır sınırları (terms): her burç için [yönetici, bitiş derecesi]
const TERMS: [P, number][][] = [
  [['jupiter', 6], ['venus', 12], ['mercury', 20], ['mars', 25], ['saturn', 30]],
  [['venus', 8], ['mercury', 14], ['jupiter', 22], ['saturn', 27], ['mars', 30]],
  [['mercury', 6], ['jupiter', 12], ['venus', 17], ['mars', 24], ['saturn', 30]],
  [['mars', 7], ['venus', 13], ['mercury', 19], ['jupiter', 26], ['saturn', 30]],
  [['jupiter', 6], ['venus', 11], ['saturn', 18], ['mercury', 24], ['mars', 30]],
  [['mercury', 7], ['venus', 17], ['jupiter', 21], ['mars', 28], ['saturn', 30]],
  [['saturn', 6], ['mercury', 14], ['jupiter', 21], ['venus', 28], ['mars', 30]],
  [['mars', 7], ['venus', 11], ['mercury', 19], ['jupiter', 24], ['saturn', 30]],
  [['jupiter', 12], ['venus', 17], ['mercury', 21], ['saturn', 26], ['mars', 30]],
  [['mercury', 7], ['jupiter', 14], ['venus', 22], ['saturn', 26], ['mars', 30]],
  [['mercury', 7], ['venus', 13], ['jupiter', 20], ['mars', 25], ['saturn', 30]],
  [['venus', 12], ['jupiter', 16], ['mercury', 19], ['mars', 28], ['saturn', 30]]
]
// Kalde sırası: dekan (yüz) yöneticileri Koç'un ilk dekanı Mars'tan başlayarak bu sırayla döner
const CHALDEAN: P[] = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon']

export const signRuler = (lon: number): P => SIGN_RULER[signOf(lon)]
export const exaltRuler = (lon: number): P | undefined => (Object.entries(EXALT_SIGN) as [P, number][]).find(([, s]) => s === signOf(lon))?.[0]
export const tripRuler = (lon: number, day: boolean): P => TRIPLICITY[signOf(lon) % 4][day ? 0 : 1]
export function termRuler(lon: number): P {
  const s = signOf(lon)
  const d = ((lon % 30) + 30) % 30
  return TERMS[s].find(([, end]) => d < end)![0]
}
export const faceRuler = (lon: number): P => CHALDEAN[(2 + signOf(lon) * 3 + Math.floor((((lon % 30) + 30) % 30) / 10)) % 7]

export interface DignityRow {
  id: P
  sign: number
  ruler: P
  exalt?: P
  trip: P
  term: P
  face: P
  has: string[] // bu gezegenin kendi konumunda sahip olduğu dignite/debilite adları
  score: number
}

/** Gündüz haritası: Güneş ufkun üstünde */
/** Doğum saati bilinmiyorsa gündüz/gece (sect) belirlenemez: 12:00 yalnızca hesap referansıdır */
export const sectUnknown = (c: ChartResult): boolean => !!c.input.timeUnknown && ['natal', 'draconic', 'relocated', 'harmonic'].includes(c.kind)

export const isDayChart = (c: ChartResult): boolean => {
  const sun = c.points.find((p) => p.id === 'sun')
  if (sun?.altitude !== undefined) return sun.altitude > 0
  return (sun?.house ?? 0) >= 7
}

export function essentialDignities(c: ChartResult, dayOverride?: boolean): DignityRow[] {
  const day = dayOverride ?? isDayChart(c)
  const rows: DignityRow[] = []
  for (const id of TRAD) {
    const p = c.points.find((x) => x.id === id)
    if (!p) continue
    const s = signOf(p.lon)
    const row: DignityRow = { id, sign: s, ruler: signRuler(p.lon), exalt: exaltRuler(p.lon), trip: tripRuler(p.lon, day), term: termRuler(p.lon), face: faceRuler(p.lon), has: [], score: 0 }
    if (row.ruler === id) { row.has.push(t('Ev +5')); row.score += 5 }
    if (row.exalt === id) { row.has.push(t('Yücelim +4')); row.score += 4 }
    if (row.trip === id) { row.has.push(t('Üçlük +3')); row.score += 3 }
    if (row.term === id) { row.has.push(t('Sınır +2')); row.score += 2 }
    if (row.face === id) { row.has.push(t('Dekan +1')); row.score += 1 }
    if (SIGN_RULER[(s + 6) % 12] === id) { row.has.push(t('Zarar −5')); row.score -= 5 }
    if (EXALT_SIGN[id] !== undefined && (EXALT_SIGN[id]! + 6) % 12 === s) { row.has.push(t('Düşüş −4')); row.score -= 4 }
    if (!row.has.some((h) => h.includes('+'))) { row.has.push(t('Peregrine −5')); row.score -= 5 }
    rows.push(row)
  }
  return rows
}

/** Karşılıklı ağırlama: iki gezegen birbirinin evindeki (veya yücelimindeki) burçta */
export function mutualReceptions(c: ChartResult): { a: P; b: P; kind: string }[] {
  const pos = Object.fromEntries(TRAD.map((id) => [id, c.points.find((p) => p.id === id)?.lon])) as Record<P, number | undefined>
  const out: { a: P; b: P; kind: string }[] = []
  for (let i = 0; i < TRAD.length; i++) {
    for (let j = i + 1; j < TRAD.length; j++) {
      const a = TRAD[i]
      const b = TRAD[j]
      const la = pos[a]
      const lb = pos[b]
      if (la === undefined || lb === undefined) continue
      if (signRuler(la) === b && signRuler(lb) === a) out.push({ a, b, kind: t('ev ile') })
      else if (exaltRuler(la) === b && exaltRuler(lb) === a) out.push({ a, b, kind: t('yücelim ile') })
      else if ((signRuler(la) === b && exaltRuler(lb) === a) || (exaltRuler(la) === b && signRuler(lb) === a)) out.push({ a, b, kind: t('karma (ev / yücelim)') })
    }
  }
  return out
}

// Modern yöneticiler: Akrep Plüton, Kova Uranüs, Balık Neptün (diğerleri geleneksel)
const MODERN_RULER = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'pluto', 'jupiter', 'saturn', 'uranus', 'neptune']

/** Her gezegenden başlayarak burç yöneticisi zinciri: geleneksel (7 gezegen) veya modern (10 gezegen) */
export function dispositorChains(c: ChartResult, system: 'traditional' | 'modern' = 'traditional'): { start: P; chain: P[]; end: 'final' | 'loop' }[] {
  const ids = (system === 'modern' ? [...TRAD, 'uranus', 'neptune', 'pluto'] : [...TRAD]) as P[]
  const rulerOf = (lon: number) => (system === 'modern' ? MODERN_RULER[signOf(lon)] : signRuler(lon)) as P
  const pos = Object.fromEntries(ids.map((id) => [id, c.points.find((p) => p.id === id)?.lon])) as Record<P, number | undefined>
  const out: { start: P; chain: P[]; end: 'final' | 'loop' }[] = []
  for (const start of ids) {
    if (pos[start] === undefined) continue
    const chain: P[] = [start]
    let cur: P = start
    for (let k = 0; k < 12; k++) {
      const next = rulerOf(pos[cur]!)
      if (next === cur) { out.push({ start, chain, end: 'final' }); break }
      if (chain.includes(next)) { chain.push(next); out.push({ start, chain, end: 'loop' }); break }
      chain.push(next)
      cur = next
    }
  }
  return out
}
