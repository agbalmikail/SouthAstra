// Transit sunumu: süre sınıfı ve kural tabanlı astrolojik önem sıralaması (hesaplama değil, sunum katmanı)
import type { TransitEvent } from './types'

export type DurationClass = 'short' | 'medium' | 'long'
export const DURATION_NAME: Record<DurationClass, string> = { short: 'Kısa', medium: 'Orta', long: 'Uzun' }

/** Süre sınıfı: etkinlik döneminin (orba girişten çıkışa, tekrarlar dahil) uzunluğuna göre */
export function durationClass(e: TransitEvent): DurationClass | undefined {
  if (!e.window) return undefined
  const days = (Date.parse(e.window.end) - Date.parse(e.window.start)) / 86400000
  return days < 14 ? 'short' : days <= 90 ? 'medium' : 'long'
}
export const windowDays = (e: TransitEvent) => (e.window ? (Date.parse(e.window.end) - Date.parse(e.window.start)) / 86400000 : 0)

const ASPECT_W: Record<string, number> = { conjunction: 3, opposition: 2.5, square: 2.5, trine: 1.5, sextile: 1 }
const TARGET_W: Record<string, number> = { sun: 3, moon: 3, asc: 3, mc: 3, mercury: 1.5, venus: 1.5, mars: 1.5, jupiter: 1, saturn: 1, uranus: 0.5, neptune: 0.5, pluto: 0.5, chiron: 0.5, northnode: 0.5 }
const CLASS_W: Record<DurationClass, number> = { long: 3, medium: 2, short: 1 }

/** Puan = süre (uzun 3 · orta 2 · kısa 1) + açı (kavuşum 3 · karşıt/kare 2,5 · üçgen 1,5 · altmışlık 1) + natal hedef (☉ ☽ AC MC 3 · ☿ ♀ ♂ 1,5 · ♃ ♄ 1 · diğerleri 0,5) + retrograd serisi ise 0,5 */
export function importance(e: TransitEvent): number {
  if (!e.natal) return 0
  const c = durationClass(e) ?? 'short'
  return CLASS_W[c] + (ASPECT_W[e.type] ?? 0.5) + (TARGET_W[e.natal] ?? 0.5) + ((e.pass?.of ?? 1) > 1 ? 0.5 : 0)
}

export const RANK_RULE =
  'Astrolojik önem sıralaması kural tabanlıdır ve yalnızca sunum içindir; bilimsel bir olasılık değildir. Puan = süre (uzun 3 · orta 2 · kısa 1) + açı türü (kavuşum 3 · karşıt ve kare 2,5 · üçgen 1,5 · altmışlık 1) + natal hedef (Güneş, Ay, Yükselen, MC 3 · Merkür, Venüs, Mars 1,5 · Jüpiter, Satürn 1 · diğerleri 0,5) + retrograd serisi ise 0,5. Süre sınıfı, orba giriş ile çıkış arası (tekrarlar dahil): kısa < 14 gün · orta 14–90 gün · uzun > 90 gün. Etkinlik dönemi Ayarlar\'daki transit orbuna göre hesaplanır; fiziksel olarak kanıtlanmış bir etki süresi değildir.'

/** Seriler tekilleştirilmiş en önemli transitler (her seriden bir satır) */
export function topTransits(events: TransitEvent[], n = 5): TransitEvent[] {
  const seen = new Set<string>()
  const out: TransitEvent[] = []
  for (const e of [...events].filter((x) => x.natal).sort((a, b) => importance(b) - importance(a) || Date.parse(a.utc) - Date.parse(b.utc))) {
    const key = `${e.transit}|${e.natal}|${e.type}|${e.window?.start ?? e.utc}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
    if (out.length >= n) break
  }
  return out
}
