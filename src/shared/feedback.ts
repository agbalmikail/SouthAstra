// Seans geri bildirimi ve genel geçerlik ölçümü (yorum katmanı; hesaplama yapmaz).
// Yöntem: danışana yalnızca metinler gösterilir; araya bu haritada OLMAYAN etkenlerin metinleri (kontrol) karıştırılır.
// Kontrol metinleri gerçekler kadar "uyuyor" alıyorsa metinler kişiyi ayırt etmiyor demektir (genel geçer / Barnum etkisi).

export type Rating = 'fit' | 'partial' | 'nofit'
export const RATING_NAME: Record<Rating, string> = { fit: 'Uyuyor', partial: 'Kısmen', nofit: 'Uymuyor' }

export interface FeedbackEntry {
  key: string // kütüphane anahtarı (etken)
  rating: Rating
  control: boolean // true: bu haritada olmayan bir etkenin metni (kontrol)
  date: string // ISO
  session: string // aynı oturumun kimliği
  note?: string
}

export interface SessionItem { key: string; control: boolean }

/** Basit, tohumlu sözde rastgele (aynı tohum → aynı sıra; testler için) */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
}
export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/**
 * Oturum: haritadaki yorumlu etkenlerden en çok `max` tanesi + kontrol metinleri (gerçeklerin ~%25'i, en az 1).
 * Kontrol metni: kütüphanede olan ama bu haritanın etkenleri arasında OLMAYAN bir anahtar. Aynı grup (ör. 'ps:' burç) tercih edilir.
 */
export function buildSession(chartKeys: string[], libraryKeys: string[], rand: () => number, max = 12): SessionItem[] {
  const inChart = new Set(chartKeys)
  const real = shuffle(chartKeys.filter((k) => libraryKeys.includes(k)), rand).slice(0, max)
  const pool = libraryKeys.filter((k) => !inChart.has(k))
  const want = Math.min(pool.length, Math.max(1, Math.round(real.length * 0.25)))
  const prefer = new Set(real.map((k) => k.split(':')[0]))
  const sorted = shuffle(pool, rand).sort((a, b) => Number(prefer.has(b.split(':')[0])) - Number(prefer.has(a.split(':')[0])))
  const controls = real.length ? sorted.slice(0, want) : []
  return shuffle([...real.map((key) => ({ key, control: false })), ...controls.map((key) => ({ key, control: true }))], rand)
}

export interface Tally { fit: number; partial: number; nofit: number; n: number }
const empty = (): Tally => ({ fit: 0, partial: 0, nofit: 0, n: 0 })
const add = (t: Tally, r: Rating) => { t[r]++; t.n++ }
/** Uyum payı: uyuyor = 1, kısmen = 0,5, uymuyor = 0 */
export const fitShare = (t: Tally) => (t.n ? (t.fit + 0.5 * t.partial) / t.n : 0)

export interface FeedbackStats {
  real: Tally
  control: Tally
  byKey: Record<string, { real: Tally; control: Tally }>
}

export function feedbackStats(all: FeedbackEntry[]): FeedbackStats {
  const out: FeedbackStats = { real: empty(), control: empty(), byKey: {} }
  for (const e of all) {
    const k = (out.byKey[e.key] ??= { real: empty(), control: empty() })
    add(e.control ? out.control : out.real, e.rating)
    add(e.control ? k.control : k.real, e.rating)
  }
  return out
}

/** Metin, kontrol olarak (o etkene sahip olmayan kişilerde) de çoğunlukla uyuyorsa "fazla genel olabilir" */
export const GENERIC_MIN_N = 3
export const GENERIC_SHARE = 0.6
export function looksGeneric(k: { real: Tally; control: Tally } | undefined): boolean {
  return !!k && k.control.n >= GENERIC_MIN_N && fitShare(k.control) >= GENERIC_SHARE
}

export const FEEDBACK_METHOD =
  'Yöntem: Danışana yalnızca yorum metinleri gösterilir (etken adları gizli). Araya, kütüphanenizden bu haritada olmayan etkenlere ait kontrol metinleri karışık sırayla eklenir. Danışan her metni Uyuyor / Kısmen / Uymuyor olarak işaretler; hangilerinin kontrol olduğu sonunda açıklanır. Kontrol metinleri gerçek metinler kadar "uyuyor" alıyorsa, metinler kişiyi ayırt etmiyor (genel geçer) demektir. Sonuçlar yazdığınız metinlerin ayırt ediciliğini ölçer; astrolojinin doğruluğunun bilimsel kanıtı değildir.'
