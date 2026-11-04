// Arayüz dili. Türkçe metin kaynak ve anahtardır; İngilizce karşılıklar src/shared/i18n/en/*.ts sözlüklerindedir.
// Sözlükte olmayan metin Türkçe kalır (eksik çeviri hiçbir şeyi bozmaz).
export type Lang = 'tr' | 'en'

let lang: Lang = 'tr'
const EN: Record<string, string> = {}

export function setLang(l: Lang | undefined): void { lang = l === 'en' ? 'en' : 'tr' }
export const getLang = (): Lang => lang
/** Tarih/sayı biçimi için yerel ayar */
export const loc = (): string => (lang === 'en' ? 'en-GB' : 'tr-TR')

export function registerEn(d: Record<string, string>): void { Object.assign(EN, d) }

/**
 * Çeviri: t('Gezegenler'), t('{n} olay', { n: 5 }).
 * Anahtar her zaman Türkçe metindir; değişkenler {ad} biçiminde yazılır.
 */
export function t(s: string, vars?: Record<string, string | number>): string {
  let out = lang === 'en' ? (EN[s] ?? s) : s
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
  return out
}

/** Testler ve eksik çeviri taraması için */
export const enKeys = (): string[] => Object.keys(EN)
