// Burçlar, gezegen işaretleri ve açı tanımları (arayüz ve hesaplama ortak kullanır)
import type { AspectType, OrbProfile, Settings } from './types'

const VS = '︎' // emoji yerine metin biçiminde çizilsin

export const SIGNS = [
  { name: 'Koç', glyph: '♈', element: 'fire' },
  { name: 'Boğa', glyph: '♉', element: 'earth' },
  { name: 'İkizler', glyph: '♊', element: 'air' },
  { name: 'Yengeç', glyph: '♋', element: 'water' },
  { name: 'Aslan', glyph: '♌', element: 'fire' },
  { name: 'Başak', glyph: '♍', element: 'earth' },
  { name: 'Terazi', glyph: '♎', element: 'air' },
  { name: 'Akrep', glyph: '♏', element: 'water' },
  { name: 'Yay', glyph: '♐', element: 'fire' },
  { name: 'Oğlak', glyph: '♑', element: 'earth' },
  { name: 'Kova', glyph: '♒', element: 'air' },
  { name: 'Balık', glyph: '♓', element: 'water' }
].map((s) => ({ ...s, glyph: s.glyph + VS })) as { name: string; glyph: string; element: Element }[]

export type Element = 'fire' | 'earth' | 'air' | 'water'

export interface AspectDef { type: AspectType; angle: number; name: string; glyph: string; orb: number; major: boolean }

const RAW_ASPECTS: AspectDef[] = [
  { type: 'conjunction', angle: 0, name: 'Kavuşum', glyph: '☌', orb: 8, major: true },
  { type: 'opposition', angle: 180, name: 'Karşıt', glyph: '☍', orb: 8, major: true },
  { type: 'trine', angle: 120, name: 'Üçgen', glyph: '△', orb: 7, major: true },
  { type: 'square', angle: 90, name: 'Kare', glyph: '□', orb: 7, major: true },
  { type: 'sextile', angle: 60, name: 'Altmışlık', glyph: '⚹', orb: 5, major: true },
  { type: 'quincunx', angle: 150, name: 'Quincunx', glyph: '⚻', orb: 3, major: false },
  { type: 'semisextile', angle: 30, name: 'Yarım altmışlık', glyph: '⚺', orb: 2, major: false },
  { type: 'semisquare', angle: 45, name: 'Yarım kare', glyph: '∠', orb: 2, major: false },
  { type: 'sesquiquadrate', angle: 135, name: 'Bir buçuk kare', glyph: '⚼', orb: 2, major: false },
  { type: 'quintile', angle: 72, name: 'Quintile', glyph: 'Q', orb: 1.5, major: false },
  { type: 'biquintile', angle: 144, name: 'Biquintile', glyph: 'bQ', orb: 1.5, major: false }
]

export const ASPECTS: AspectDef[] = RAW_ASPECTS.map((a) => ({ ...a, glyph: a.glyph.length === 1 ? a.glyph + VS : a.glyph }))

export const ASPECT_BY_TYPE = Object.fromEntries(ASPECTS.map((a) => [a.type, a])) as Record<AspectType, AspectDef>

export const norm360 = (a: number): number => ((a % 360) + 360) % 360

/** 0–180 arası açısal mesafe */
export const separation = (a: number, b: number): number => {
  const d = Math.abs(norm360(a) - norm360(b))
  return d > 180 ? 360 - d : d
}

export const signOf = (lon: number): number => Math.floor(norm360(lon) / 30)

/** 12°♏34' biçiminde parçalar */
export function dms(lon: number): { deg: number; sign: number; min: number; sec: number } {
  const l = norm360(lon)
  let totalSec = Math.round((l % 30) * 3600)
  let sign = Math.floor(l / 30)
  if (totalSec >= 30 * 3600) { totalSec -= 30 * 3600; sign = (sign + 1) % 12 }
  return { deg: Math.floor(totalSec / 3600), min: Math.floor((totalSec % 3600) / 60), sec: totalSec % 60, sign }
}

export const pad2 = (n: number): string => String(n).padStart(2, '0')

// ——— Paraleller (deklinasyon açıları) ———
export const DECL_ASPECTS: AspectDef[] = [
  { type: 'parallel', angle: 0, name: 'Paralel', glyph: '∥', orb: 1, major: false },
  { type: 'contraparallel', angle: 0, name: 'Kontraparalel', glyph: '⋕', orb: 1, major: false }
]
for (const d of DECL_ASPECTS) (ASPECT_BY_TYPE as Record<string, AspectDef>)[d.type] = d

// ——— Orb profilleri ———

export const ORB_PROFILES: OrbProfile[] = [
  {
    id: 'standard', name: 'Standart', luminaryBonus: 2,
    orbs: { conjunction: 8, opposition: 8, trine: 7, square: 7, sextile: 5, quincunx: 3, semisextile: 2, semisquare: 2, sesquiquadrate: 2, quintile: 1.5, biquintile: 1.5 }
  },
  {
    id: 'tight', name: 'Dar', luminaryBonus: 1,
    orbs: { conjunction: 6, opposition: 6, trine: 5, square: 5, sextile: 4, quincunx: 2, semisextile: 1, semisquare: 1, sesquiquadrate: 1, quintile: 1, biquintile: 1 }
  },
  {
    id: 'wide', name: 'Geniş', luminaryBonus: 2,
    orbs: { conjunction: 10, opposition: 10, trine: 8, square: 8, sextile: 6, quincunx: 3, semisextile: 2, semisquare: 2, sesquiquadrate: 2, quintile: 2, biquintile: 2 }
  }
]

export const DEFAULT_SETTINGS: Settings = {
  zodiac: 'tropical',
  ayanamsa: 1, // Lahiri
  orbProfileId: 'standard',
  customOrbs: { ...ORB_PROFILES[0], id: 'custom', name: 'Özel' },
  transitOrb: 2,
  progressionOrb: 1,
  showParallels: true,
  fixedStarOrb: 1,
  hiddenPoints: [],
  defaultHouseSystem: 'P',
  defaultNodeType: 'true',
  asteroids: false,
  rulership: 'modern',
  appearance: { glyphScale: 1, showDegrees: true, showAspectLines: true, showHouseNumbers: true, coloredSigns: true, aspectLineWidth: 0.9 },
  updateCheck: true
}

export function activeOrbs(s: Settings): OrbProfile {
  return s.orbProfileId === 'custom' ? s.customOrbs : ORB_PROFILES.find((p) => p.id === s.orbProfileId) ?? ORB_PROFILES[0]
}

// ——— Ayanamsa (sideral zodyak) ———
export const AYANAMSAS: { id: number; name: string }[] = [
  { id: 1, name: 'Lahiri (Chitrapaksha)' },
  { id: 0, name: 'Fagan/Bradley' },
  { id: 3, name: 'Raman' },
  { id: 5, name: 'Krishnamurti (KP)' },
  { id: 7, name: 'Yukteshwar' },
  { id: 27, name: 'True Chitra' },
  { id: 17, name: 'Galaktik merkez 0° Yay' }
]

// ——— Dignite (geleneksel yöneticiler + modern dış gezegenler) ———
const DOMICILE: Record<string, number[]> = {
  sun: [4], moon: [3], mercury: [2, 5], venus: [1, 6], mars: [0, 7], jupiter: [8, 11], saturn: [9, 10],
  uranus: [10], neptune: [11], pluto: [7]
}
// Geleneksel: Akrep Mars'ın, Kova Satürn'ün, Balık Jüpiter'in (modernde Plüton, Uranüs, Neptün eklenir; eski yöneticiler de korunur)
const TRAD_DOMICILE: Record<string, number[]> = { sun: [4], moon: [3], mercury: [2, 5], venus: [1, 6], mars: [0, 7], jupiter: [8, 11], saturn: [9, 10] }
const EXALT: Record<string, number> = { sun: 0, moon: 1, mercury: 5, venus: 11, mars: 9, jupiter: 3, saturn: 6 }

/** Esas dignite etiketi. Geleneksel yöneticilikte dış gezegenlere burç yöneticiliği verilmez. */
export function dignityOf(id: string, lon: number, rulership: 'modern' | 'traditional' = 'modern'): string | undefined {
  const s = signOf(lon)
  if (rulership === 'traditional' && (id === 'uranus' || id === 'neptune' || id === 'pluto')) return undefined
  const dom = rulership === 'traditional' ? TRAD_DOMICILE[id] : DOMICILE[id]
  if (!dom) return undefined
  if (dom.includes(s)) return 'Evinde'
  if (EXALT[id] === s) return 'Yücelimde'
  if (dom.some((d) => (d + 6) % 12 === s)) return 'Zararda'
  if (EXALT[id] !== undefined && (EXALT[id] + 6) % 12 === s) return 'Düşüşte'
  return undefined
}

/** Burç yöneticisi (geleneksel) — dispozitör için */
export const TRAD_RULER = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter']

// ——— Ay evresi ———
export function moonPhase(sunLon: number, moonLon: number): { name: string; angle: number } {
  const a = norm360(moonLon - sunLon)
  const names = ['Yeni Ay', 'Hilal', 'İlk dördün', 'Şişkin Ay', 'Dolunay', 'Yayılan Ay', 'Son dördün', 'Balsamik Ay']
  return { name: names[Math.floor(a / 45) % 8], angle: a }
}

export const MODALITY = ['Öncü', 'Sabit', 'Değişken'] as const
export const ELEMENT_TR: Record<Element, string> = { fire: 'Ateş', earth: 'Toprak', air: 'Hava', water: 'Su' }
