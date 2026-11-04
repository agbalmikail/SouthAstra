// Yerel doğum saatini UTC'ye çevirir. Saat dilimi geçmişi IANA tz veritabanından gelir
// (Electron/Chromium'un ICU verisi). Yaz saati geçişlerindeki belirsizlikleri uyarı olarak bildirir.
import { IANAZone } from 'luxon'
import type { ChartInput } from '@shared/types'

export interface UtcResult {
  utcMs: number
  offsetMinutes: number
  source: string
  warnings: string[]
  dst?: boolean // o tarihte yaz saati uygulanıyor muydu
}

function parseLocal(date: string, time: string): number {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi, s = 0] = time.split(':').map(Number)
  if ([y, mo, d, h, mi, s].some((n) => !Number.isFinite(n))) throw new Error('Tarih veya saat okunamadı')
  // Yerel saati "UTC gibi" sayıya çevir; ofset ayrıca çıkarılacak
  const dt = new Date(0)
  dt.setUTCFullYear(y, mo - 1, d)
  dt.setUTCHours(h, mi, Math.floor(s), Math.round((s % 1) * 1000))
  return dt.getTime()
}

const fmtOffset = (min: number): string => {
  const sign = min < 0 ? '−' : '+'
  const a = Math.abs(min)
  const h = Math.floor(a / 60)
  const m = Math.floor(a % 60)
  const s = Math.round((a * 60) % 60)
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${s ? ':' + String(s).padStart(2, '0') : ''}`
}

export function toUtc(input: ChartInput): UtcResult {
  const local = parseLocal(input.date, input.time)
  const warnings: string[] = []

  if (input.timeMode === 'manual') {
    const off = Math.round((input.manualOffset ?? 0) * 60 * 60) / 60
    return { utcMs: local - off * 60000, offsetMinutes: off, source: `Elle girilen ofset (${fmtOffset(off)})`, warnings }
  }

  if (input.timeMode === 'lmt') {
    // Yerel ortalama saat: boylamın her 15°'si 1 saat
    const off = (input.place.lon / 15) * 60
    return { utcMs: local - off * 60000, offsetMinutes: off, source: `Yerel ortalama saat (LMT, ${fmtOffset(off)})`, warnings }
  }

  const zone = IANAZone.create(input.place.tz)
  if (!zone.isValid) throw new Error(`Saat dilimi tanınmadı: ${input.place.tz}`)

  // Yerel saate karşılık gelebilecek tüm UTC anlarını bul (yaz saati geçişleri için)
  const candidates = new Set<number>()
  for (const probe of [-26, -14, -6, -3, 0, 3, 6, 14, 26]) candidates.add(zone.offset(local + probe * 3600000))
  const valid = [...candidates].filter((o) => zone.offset(local - o * 60000) === o).sort((a, b) => b - a)

  let off: number
  if (valid.length === 0) {
    // Yaz saatine geçişte "atlanan" saat (ör. 02:30 hiç yaşanmadı)
    off = zone.offset(local - [...candidates][0] * 60000)
    warnings.push(`Bu yerel saat, yaz saatine geçiş sırasında atlanan aralığa düşüyor. ${fmtOffset(off)} varsayıldı; doğum kaydını kontrol edin.`)
  } else {
    off = valid[0]
    if (valid.length > 1) {
      warnings.push(`Bu yerel saat yaz saatinden dönüşte iki kez yaşandı (${valid.map(fmtOffset).join(' ve ')}). İlki (${fmtOffset(off)}) kullanıldı; gerekirse ofseti elle girin.`)
    }
  }

  // Ofset 15 dakikanın katı değilse o tarihte standart saat yoktu: tz veritabanı bölgenin
  // referans şehrinin (ör. İstanbul, Berlin) yerel ortalama saatini kullanır, doğum yerininkini değil.
  if (Math.abs(off % 15) > 0.01) {
    const lmtHere = (input.place.lon / 15) * 60
    warnings.push(`Bu tarihte bölgede standart saat yoktu. Saat dilimi veritabanı ${input.place.tz.split('/').pop()?.replace(/_/g, ' ')} şehrinin yerel saatini (${fmtOffset(off)}) veriyor; doğum yerinin kendi yerel ortalama saati ${fmtOffset(lmtHere)}. Doğum kaydı yerel saatle tutulduysa "Yerel ortalama (LMT)" seçeneğini kullanın.`)
  }

  const year = Number(input.date.slice(0, 4))
  if (input.place.tz === 'Europe/Berlin' && year >= 1945 && year <= 1949) {
    warnings.push('1945–1949 Almanya: işgal bölgelerinde saat uygulaması farklıydı. Saat dilimi veritabanı Berlin\'in (Sovyet bölgesi) kuralını kullanır; batı bölgelerinde (ör. Bonn, Köln, Münih) doğanlar için ofseti doğum kaydından doğrulayın, gerekirse "Elle ofset" seçin.')
  } else if (input.place.tz === 'Europe/Istanbul' && year < 1985) {
    warnings.push('1985 öncesi Türkiye\'de yaz saati uygulaması sık değişti ve bazı yıllarda kayıtlar tartışmalı. Hesaplanan ofseti doğum yılı için doğrulayın.')
  } else if (year < 1970) {
    warnings.push('1970 öncesi saat dilimi kayıtları bazı bölgelerde eksik olabilir. Hesaplanan ofseti doğrulayın.')
  }

  // yaz saati mi? O yılın kış ve yaz ortasındaki ofsetlerin küçüğü standart saattir
  const y = Number(input.date.slice(0, 4))
  const jan = zone.offset(Date.UTC(y, 0, 15))
  const jul = zone.offset(Date.UTC(y, 6, 15))
  const dst = off > Math.min(jan, jul)
  return {
    utcMs: local - off * 60000,
    offsetMinutes: off,
    source: `${input.place.tz} saat dilimi, o tarihteki kurala göre (${fmtOffset(off)})`,
    warnings,
    dst
  }
}

export { fmtOffset }
