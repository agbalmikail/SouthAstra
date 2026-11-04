// Geleneksel zaman yöneticileri: yıllık profeksiyon ve firdaria
import type { ChartResult } from './types'
import { signOf } from './zodiac'
import { isDayChart, signRuler, TRAD } from './dignities'

const YEAR = 365.2422 // gün

/** Doğum anına yıl ekle: tam yıllar takvim yıl dönümü (doğum günü), kesirli kısım tropikal yıl oranıyla */
export function addYears(ms: number, years: number): number {
  const whole = Math.floor(years)
  const d = new Date(ms)
  d.setUTCFullYear(d.getUTCFullYear() + whole)
  // 29 Şubat doğumlu: artık olmayan yılda 1 Mart'a kayar (JS davranışı), bu kabul edilen uygulamadır
  return d.getTime() + (years - whole) * YEAR * 86400000
}

export interface Profection {
  age: number // tamamlanan yaş
  from: Date
  to: Date
  sign: number // profekte burç
  house: number // natal yükselenden sayılan ev (1–12)
  lord: string // yılın yöneticisi (geleneksel)
}

/** Yıllık profeksiyon: her doğum gününde yükselen bir burç ilerler; burcun yöneticisi yılın yöneticisidir */
export function profections(c: ChartResult, birthMs: number, fromAge: number, toAge: number): Profection[] {
  if (!c.hasHouses) return []
  const ascSign = signOf(c.angles.asc)
  const out: Profection[] = []
  for (let age = Math.max(0, fromAge); age <= toAge; age++) {
    const sign = (ascSign + age) % 12
    out.push({ age, from: new Date(addYears(birthMs, age)), to: new Date(addYears(birthMs, age + 1)), sign, house: (age % 12) + 1, lord: signRuler(sign * 30 + 1) })
  }
  return out
}

export interface FirdarPeriod {
  lord: string
  sub?: string
  from: Date
  to: Date
  years: number
}

// Abu Ma'shar: gezegen yılları; düğümler (3 + 2 yıl) yedi gezegenden sonra
const YEARS: Record<string, number> = { sun: 10, venus: 8, mercury: 13, moon: 9, saturn: 11, jupiter: 12, mars: 7, northnode: 3, southnode: 2 }
const DAY_ORDER = ['sun', 'venus', 'mercury', 'moon', 'saturn', 'jupiter', 'mars', 'northnode', 'southnode']
const NIGHT_ORDER = ['moon', 'saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'northnode', 'southnode']
// Bonatti geleneği: gece haritasında düğümler Mars'tan sonra gelir
const NIGHT_ORDER_BONATTI = ['moon', 'saturn', 'jupiter', 'mars', 'northnode', 'southnode', 'sun', 'venus', 'mercury']
export type NightNodes = 'end' | 'afterMars'
const CHALDEAN = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon']

/** Firdaria: 75 yıllık ana dönemler; gezegen dönemleri 7 eşit alt döneme bölünür (Kalde sırası, dönem yöneticisinden başlar) */
export function firdaria(c: ChartResult, birthMs: number, cycles = 2, nightNodes: NightNodes = 'end'): { major: FirdarPeriod; subs: FirdarPeriod[] }[] {
  const order = isDayChart(c) ? DAY_ORDER : nightNodes === 'afterMars' ? NIGHT_ORDER_BONATTI : NIGHT_ORDER
  const out: { major: FirdarPeriod; subs: FirdarPeriod[] }[] = []
  let acc = 0 // doğumdan beri geçen yıl
  for (let cy = 0; cy < cycles; cy++) {
    for (const lord of order) {
      const yrs = YEARS[lord]
      const t = addYears(birthMs, acc)
      const end = addYears(birthMs, acc + yrs)
      const major: FirdarPeriod = { lord, from: new Date(t), to: new Date(end), years: yrs }
      const subs: FirdarPeriod[] = []
      if (TRAD.includes(lord as (typeof TRAD)[number])) {
        const start = CHALDEAN.indexOf(lord)
        for (let k = 0; k < 7; k++) subs.push({ lord, sub: CHALDEAN[(start + k) % 7], from: new Date(addYears(birthMs, acc + (k * yrs) / 7)), to: new Date(addYears(birthMs, acc + ((k + 1) * yrs) / 7)), years: yrs / 7 })
      }
      out.push({ major, subs })
      acc += yrs
    }
  }
  return out
}
