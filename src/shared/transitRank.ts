// Transit sunumu: süre sınıfı ve kural tabanlı astrolojik önem sıralaması (hesaplama değil, sunum katmanı)
import type { TransitEvent } from './types'
import { getLang, t } from './i18n'

export type DurationClass = 'short' | 'medium' | 'long'
export const DURATION_NAME: Record<DurationClass, string> = { get short() { return t('Kısa') }, get medium() { return t('Orta') }, get long() { return t('Uzun') } }

/** Süre sınıfı: etkinlik döneminin (orba girişten çıkışa, tekrarlar dahil) uzunluğuna göre */
export function durationClass(e: TransitEvent): DurationClass | undefined {
  if (!e.window) return undefined
  const days = (Date.parse(e.window.end) - Date.parse(e.window.start)) / 86400000
  return days < 14 ? 'short' : days <= 90 ? 'medium' : 'long'
}
export const windowDays = (e: TransitEvent) => (e.window ? (Date.parse(e.window.end) - Date.parse(e.window.start)) / 86400000 : 0)

/** Önem ağırlıkları (Ayarlar'dan değiştirilebilir) */
export interface RankWeights { long: number; medium: number; short: number; conjunction: number; hard: number; soft: number; lights: number; personal: number; social: number; other: number; series: number }
export const DEFAULT_RANK: RankWeights = { long: 3, medium: 2, short: 1, conjunction: 3, hard: 2.5, soft: 1.5, lights: 3, personal: 1.5, social: 1, other: 0.5, series: 0.5 }
let W: RankWeights = { ...DEFAULT_RANK }
export function setRankWeights(w?: Partial<RankWeights>) { W = { ...DEFAULT_RANK, ...(w ?? {}) } }
export const getRankWeights = () => W

const target = (id: string) => (['sun', 'moon', 'asc', 'mc'].includes(id) ? W.lights : ['mercury', 'venus', 'mars'].includes(id) ? W.personal : ['jupiter', 'saturn'].includes(id) ? W.social : W.other)
const aspectW = (t: string) => (t === 'conjunction' ? W.conjunction : t === 'opposition' || t === 'square' ? W.hard : t === 'trine' ? W.soft : t === 'sextile' ? W.soft * 2 / 3 : W.other)

/** Puan = süre + açı türü + natal hedef + (retrograd serisi ise ek) — ağırlıklar Ayarlar'dan */
export function importance(e: TransitEvent): number {
  if (!e.natal) return 0
  const c = durationClass(e) ?? 'short'
  return W[c] + aspectW(e.type) + target(e.natal) + ((e.pass?.of ?? 1) > 1 ? W.series : 0)
}

const n = (x: number) => { const s = String(Math.round(x * 100) / 100); return getLang() === 'en' ? s : s.replace('.', ',') }
export function rankRule(): string {
  return t("Astrolojik önem sıralaması kural tabanlıdır ve yalnızca sunum içindir; bilimsel bir olasılık değildir. Puan = süre (uzun {long} · orta {medium} · kısa {short}) + açı türü (kavuşum {conj} · karşıt ve kare {hard} · üçgen {soft} · altmışlık {sext}) + natal hedef (Güneş, Ay, Yükselen, MC {lights} · Merkür, Venüs, Mars {personal} · Jüpiter, Satürn {social} · diğerleri {other}) + retrograd serisi ise {series}. Ağırlıklar Ayarlar'dan değiştirilebilir. Süre sınıfı, orba giriş ile çıkış arası (tekrarlar dahil): kısa < 14 gün · orta 14–90 gün · uzun > 90 gün. Etkinlik dönemi Ayarlar'daki transit orbuna göre hesaplanır; fiziksel olarak kanıtlanmış bir etki süresi değildir.", { long: n(W.long), medium: n(W.medium), short: n(W.short), conj: n(W.conjunction), hard: n(W.hard), soft: n(W.soft), sext: n(W.soft * 2 / 3), lights: n(W.lights), personal: n(W.personal), social: n(W.social), other: n(W.other), series: n(W.series) })
}
/** Eski adla uyumluluk */
export const RANK_RULE_DEFAULT = rankRule()

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
