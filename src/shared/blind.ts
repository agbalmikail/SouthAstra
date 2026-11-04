// Kör karşılaştırma: yorumlar haritaları gerçekten ayırt ediyor mu? (yorum katmanı; hesaplama yapmaz)
// Katılımcıya kimlik bilgisi olmayan 2–4 metin sayfası gösterilir; biri kendi haritasınındır. Seçim sonrası açıklanır.
import { shuffle } from './feedback'
import { getLang, t } from './i18n'

const dec = (x: string) => (getLang() === 'en' ? x : x.replace('.', ','))

export interface BlindTrial {
  date: string
  options: number // seçenek sayısı (2–4)
  correct: boolean
  source: string // içerik kaynağı açıklaması
}

export interface SheetSource { chartId: string; texts: string[] }
export interface Sheet { label: string; chartId: string; texts: string[] }

/** Sayfalar A, B, C, D olarak karıştırılır; aynı metin birden çok sayfadaysa (ortak etken) hepsinde kalır */
export function buildSheets(sources: SheetSource[], rand: () => number): Sheet[] {
  return shuffle(sources, rand).map((s, i) => ({ label: 'ABCD'[i], chartId: s.chartId, texts: shuffle(s.texts, rand) }))
}

/** Güneş burcu etkenleri (çoğu kişinin bildiği bilgi) varsayılan olarak dışarıda bırakılır */
export const isSunSignKey = (key: string) => key.startsWith('ps:sun:')

/**
 * Şansla en az bu kadar isabet olasılığı (tek yönlü p-değeri). Denemelerin seçenek sayısı farklı olabileceği için
 * Poisson-binom dağılımı tam olarak (dinamik programlama) hesaplanır: her deneme için isabet olasılığı 1/seçenek.
 */
export function chanceP(trials: { options: number; correct: boolean }[]): { hits: number; expected: number; p: number } {
  let dist = [1]
  for (const t of trials) {
    const q = 1 / t.options
    const next = new Array(dist.length + 1).fill(0)
    dist.forEach((v, k) => { next[k] += v * (1 - q); next[k + 1] += v * q })
    dist = next
  }
  const hits = trials.filter((t) => t.correct).length
  const p = dist.slice(hits).reduce((a, b) => a + b, 0)
  return { hits, expected: trials.reduce((a, t) => a + 1 / t.options, 0), p: Math.min(1, p) }
}

export const blindMethod = (): string =>
  t('Kör karşılaştırma: katılımcıya her biri farklı bir haritanın yorumlarından oluşan 2–4 sayfa gösterilir; sayfalarda ad, tarih, yer ya da etken adı yoktur. Katılımcı kendisini en iyi anlatan sayfayı seçer; hangisinin kendisine ait olduğu seçimden sonra açıklanır. Güneş burcu metinleri, çoğu kişi Güneş burcunu bildiği için varsayılan olarak çıkarılır. Çok sayıda denemenin isabet oranı şans düzeyiyle (1/seçenek sayısı) karşılaştırılır. Bu, yazdığınız yorumların haritaları ayırt edip etmediğini ölçer; az sayıda deneme güvenilir bir sonuç vermez.')

export function chanceText(r: { hits: number; expected: number; p: number }, n: number): string {
  if (!n) return t('Henüz deneme yok.')
  const pTxt = r.p < 0.001 ? '< ' + dec('0.001') : dec(r.p.toFixed(3))
  const verdict = n < 10 ? t('Sonuç için en az 10–20 deneme gerekir.') : r.p < 0.05 ? t('İsabet şans düzeyinin belirgin biçimde üstünde (p < 0,05).') : t('İsabet şans düzeyinden belirgin biçimde farklı değil.')
  return t('{n} denemede {hits} isabet; şansla beklenen {expected}. Şansla en az bu kadar isabet olasılığı p = {p}.', { n, hits: r.hits, expected: dec(r.expected.toFixed(1)), p: pTxt }) + ' ' + verdict
}
