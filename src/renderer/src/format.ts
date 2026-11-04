import { dms, pad2, SIGNS } from '@shared/zodiac'
import { getLang, t } from '@shared/i18n'

/** Ondalık ayırıcı: Türkçede virgül, İngilizcede nokta */
export const decComma = (s: string): string => (getLang() === 'en' ? s : s.replace('.', ','))

export const ELEMENT_VAR: Record<string, string> = {
  fire: 'var(--fire)', earth: 'var(--earth)', air: 'var(--air)', water: 'var(--water)'
}

export function lonParts(lon: number) {
  const p = dms(lon)
  return { ...p, glyph: SIGNS[p.sign].glyph, signName: SIGNS[p.sign].name, color: ELEMENT_VAR[SIGNS[p.sign].element] }
}

export const fmtDegMin = (lon: number): string => {
  const p = dms(lon)
  return `${p.deg}°${pad2(p.min)}'`
}

export const fmtDecl = (d: number): string => {
  const a = Math.abs(d)
  const deg = Math.floor(a)
  const min = Math.round((a - deg) * 60)
  return `${d < 0 ? t('G') : t('K')} ${deg}°${pad2(min === 60 ? 59 : min)}'`
}

export const fmtOrb = (orb: number): string => {
  const deg = Math.floor(orb)
  const min = Math.round((orb - deg) * 60)
  return `${deg}°${pad2(min === 60 ? 59 : min)}'`
}

export const fmtOffset = (min: number): string => {
  const sign = min < 0 ? '−' : '+'
  const a = Math.abs(min)
  const h = Math.floor(a / 60)
  const m = Math.floor(a % 60)
  const s = Math.round((a * 60) % 60)
  return `UTC${sign}${pad2(h)}:${pad2(m)}${s ? ':' + pad2(s) : ''}`
}

export const fmtDateTr = (date: string): string => {
  const [y, m, d] = date.split('-')
  return getLang() === 'en' ? `${d}/${m}/${y}` : `${d}.${m}.${y}`
}

/** Jülyen günü gösterimi: UT1 (hesap) ve UTC (saat dilimi dönüşümü); fark saniye olarak */
export function jdText(c: { jdUt: number; jdUtc?: number }): string {
  if (c.jdUtc === undefined) return `${c.jdUt.toFixed(6)} UT`
  const d = (c.jdUt - c.jdUtc) * 86400
  // 8 ondalık (≈ 0,9 ms): gösterilen iki değerin farkı, yazılan UT1−UTC ile yuvarlama hatası olmadan uyuşsun
  return `${c.jdUt.toFixed(8)} UT1 · ${c.jdUtc.toFixed(8)} UTC (UT1−UTC ${d >= 0 ? '+' : '−'}${decComma(Math.abs(d).toFixed(3))} s)`
}

/** Eski kayıtlardaki doğruluk etiketlerini güncel adıyla göster */
export const precisionText = (p?: string) => (p === 'İlçe merkezi' ? t('İlçe alanının ortası (merkezden birkaç km sapabilir)') : p ? t(p) : p)
