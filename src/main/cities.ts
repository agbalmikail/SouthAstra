// Çevrimdışı yer araması (GeoNames, CC BY 4.0)
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import type { CityFilter, CityHit, CountryInfo } from '@shared/types'
import { getLang, loc, type Lang } from '@shared/i18n'

// [ad, ascii ad, ilçe/kreis, il/eyalet, ülke kodu, enlem, boylam, saat dilimi, nüfus, alternatif adlar, GeoNames kimliği, yer türü]
type Row = [string, string, string, string, string, number, number, string, number, string, number, string, string]

/** GeoNames yer türü → koordinatın neyi temsil ettiği. Yerle birlikte kaydedilen veridir: Türkçe kalır, arayüz t() ile çevirir. */
export function precisionOf(fcode: string, pop = 0): string {
  if (fcode === 'PPLC') return 'Başkent merkezi'
  if (fcode === 'PPLA') return 'İl/eyalet merkezi'
  // ADM2: GeoNames'te ilçe alanının ortası (idari merkez değil); büyük ilçelerde birkaç km sapabilir
  if (fcode === 'ADM2') return 'İlçe alanının ortası (merkezden birkaç km sapabilir)'
  if (fcode === 'PPLX') return 'Semt / mahalle'
  if (fcode === 'PPLL' || fcode === 'PPLF') return 'Mezra / küçük yerleşim'
  if (pop >= 100000) return 'Şehir merkezi'
  if (fcode === 'PPLA2' || fcode === 'PPLA3' || fcode === 'PPLA4' || fcode === 'PPLA5') return 'İlçe / belde merkezi'
  return 'Yerleşim merkezi'
}

let rows: Row[] = []
let names: string[] = [] // aranabilir ad varyantları (sadeleştirilmiş), " | " ile ayrılmış
let fulls: string[] = [] // adlar + ilçe + il + ülke
let prim: string[][] = [] // asıl adlar, küçük harf, aksanlar korunarak (ör. "bönninghausen")
let primF: string[][] = [] // asıl adlar, sadeleştirilmiş (ör. "bonninghausen")
let altF: string[][] = [] // alternatif adlar, sadeleştirilmiş
let ctxF: string[] = [] // ilçe + il, sadeleştirilmiş
let detailed: string[] = []
let countryBase: CountryInfo[] = [] // ad: veri dosyasındaki yedek ad
const countryLists: Partial<Record<Lang, CountryInfo[]>> = {}
const regionsByCountry = new Map<string, { name: string; count: number }[]>()
const districtsByRegion = new Map<string, { name: string; count: number }[]>() // "TR|İstanbul" → ilçeler

const displayNames: Partial<Record<Lang, Intl.DisplayNames>> = {}
/** Ülke adı seçili dilde (arama dizini her iki dili de içerir) */
const countryName = (cc: string, fallback: string, lang: Lang = getLang()): string => {
  try { return (displayNames[lang] ??= new Intl.DisplayNames([lang], { type: 'region' })).of(cc) ?? fallback } catch { return fallback }
}

/** Türkçe karakterleri ve aksanları sadeleştirir: "İzmir" → "izmir", "Şanlıurfa" → "sanliurfa", "München" → "munchen" */
export function fold(s: string): string {
  return s
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
}

/** Küçük harf, aksanlar korunur; yalnızca I/İ/ı birleştirilir (Türkçe ve diğer diller aynı yazılsın) */
const lower = (s: string): string => s.replace(/[İIı]/g, 'i').toLowerCase()

export function loadCities(path: string): void {
  const data = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8')) as {
    detailed: string[]; countries: Record<string, string>; rows: Row[]
  }
  rows = data.rows
  detailed = data.detailed
  names = rows.map((r) => fold([r[0], r[1], ...(r[9] ? r[9].split('|') : [])].join(' | ')))
  prim = rows.map((r) => [...new Set([lower(r[0]), lower(r[1])])])
  primF = rows.map((r) => [...new Set([fold(r[0]), fold(r[1])])])
  altF = rows.map((r) => (r[9] ? r[9].split('|').map(fold) : []))
  ctxF = rows.map((r) => fold(`${r[2]} ${r[3]}`))
  const ccText = new Map<string, string>()
  const ccIndex = (cc: string): string => {
    let v = ccText.get(cc)
    if (v === undefined) {
      const tr = countryName(cc, '', 'tr'), en = countryName(cc, '', 'en')
      v = `${tr} ${data.countries[cc] ?? ''}${en && en !== tr ? ' ' + en : ''}`
      ccText.set(cc, v)
    }
    return v
  }
  fulls = rows.map((r, i) => names[i] + ' | ' + fold(`${r[2]} ${r[3]} ${ccIndex(r[4])}`))

  const counts = new Map<string, number>()
  const regions = new Map<string, Map<string, number>>()
  for (const r of rows) {
    counts.set(r[4], (counts.get(r[4]) ?? 0) + 1)
    if (!r[3]) continue
    if (!regions.has(r[4])) regions.set(r[4], new Map())
    const m = regions.get(r[4])!
    m.set(r[3], (m.get(r[3]) ?? 0) + 1)
  }
  countryBase = [...counts].map(([code, count]) => ({
    code, count, name: data.countries[code] ?? code, detailed: detailed.includes(code)
  }))
  for (const k of Object.keys(countryLists) as Lang[]) delete countryLists[k]
  const dist = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (!r[3] || !r[2]) continue
    const k = `${r[4]}|${r[3]}`
    if (!dist.has(k)) dist.set(k, new Map())
    dist.get(k)!.set(r[2], (dist.get(k)!.get(r[2]) ?? 0) + 1)
  }
  for (const [k, m] of dist) districtsByRegion.set(k, [...m].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'tr')))
  for (const [cc, m] of regions) {
    regionsByCountry.set(cc, [...m].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'tr')))
  }
}

/** Ülkeler seçili dilde; ayrıntılı ülkeler (Türkiye, Almanya…) en üstte, sonra alfabetik */
export function listCountries(): CountryInfo[] {
  const lang = getLang()
  return (countryLists[lang] ??= countryBase
    .map((c) => ({ ...c, name: countryName(c.code, c.name, lang) }))
    .sort((a, b) => Number(b.detailed) - Number(a.detailed) || detailed.indexOf(a.code) - detailed.indexOf(b.code) || a.name.localeCompare(b.name, loc())))
}
export const listRegions = (cc: string): { name: string; count: number }[] => regionsByCountry.get(cc) ?? []
export const listDistricts = (cc: string, region: string): { name: string; count: number }[] => districtsByRegion.get(`${cc}|${region}`) ?? []

const toHit = (r: Row): CityHit => ({
  geonameId: r[10], name: r[0], localName: r[12] || undefined, district: r[2], region: r[3], countryCode: r[4], country: countryName(r[4], r[4]),
  lat: r[5], lon: r[6], tz: r[7], population: r[8], precision: precisionOf(r[11], r[8])
})

/** Arama yazmadan göz atma: seçilen il/ilçedeki yerleşimler (önce ilçe merkezleri, sonra nüfusa göre, sonra alfabetik) */
export function browsePlaces(filter: CityFilter, limit = 400): CityHit[] {
  if (!filter.country || !filter.region) return []
  const out: Row[] = []
  for (const r of rows) {
    if (r[4] !== filter.country || r[3] !== filter.region) continue
    if (filter.district && r[2] !== filter.district && !(r[11] === 'ADM2' && r[0] === filter.district)) continue
    out.push(r)
  }
  const rank = (r: Row) => (r[11] === 'ADM2' || r[11] === 'PPLA' || r[11] === 'PPLA2' || r[11] === 'PPLC' ? 0 : r[8] > 0 ? 1 : 2)
  out.sort((a, b) => rank(a) - rank(b) || b[8] - a[8] || a[0].localeCompare(b[0], 'tr'))
  return out.slice(0, limit).map(toHit)
}

/**
 * Arama. Bütün kelimeler adda veya ilçe/il/ülke adında geçmeli (sıra önemsiz). Sıralama katmanları:
 *  0 asıl ad tam eşleşme (aksanlar dahil)       → "Bonn"; büyük şehrin alternatif adı birebir → "München"
 *  1 asıl ad tam eşleşme (sadeleştirilmiş) veya alternatif ad tam eşleşme → "kadikoy" → Kadıköy, "münchen" → Munich
 *  2 asıl ad aranan kelimeyle başlayıp boşluk/tire ile devam ediyor, ya da yer o şehrin/ilçenin içinde → "Bonn Hardtberg", Bad Godesberg
 *  3 alternatif ad bu şekilde başlıyor          → "Bonn-Niederholtdorf" (Niederkassel)
 *  4 asıl ad kelime içinde başlıyor (aksanlar dahil)
 *  5 asıl ad sadeleştirilmiş hâliyle başlıyor   → "Bönninghausen"
 *  6 diğer (içinde geçiyor)
 * Aynı katmanda: önce nüfus.
 */
export function searchCities(q: string, filter: CityFilter = {}, limit = 30): CityHit[] {
  const parts = fold(q.trim()).split(/[\s,]+/).filter(Boolean)
  if (!parts.length) return []
  const raw = lower(q.trim()).split(/[\s,]+/).filter(Boolean)
  const phrase = parts.join(' ')
  const rawPhrase = raw.join(' ')
  const boundary = (v: string, p: string) => v.startsWith(p) && (v.length === p.length || /[\s\-/(]/.test(v[p.length]))
  const wordIn = (hay: string, p: string) => new RegExp(`(^|[\\s\\-/(])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s\\-/)])`).test(hay)
  const hits: { i: number; rank: number }[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (filter.country && r[4] !== filter.country) continue
    if (filter.region && r[3] !== filter.region) continue
    if (filter.district && r[2] !== filter.district && !(r[11] === 'ADM2' && r[0] === filter.district)) continue
    const full = fulls[i]
    if (!parts.every((p) => full.includes(p))) continue
    const n = names[i]
    if (!parts.some((p) => n.includes(p))) continue // kelime yalnızca bölge adında geçiyorsa alma
    const P = prim[i]
    const PF = primF[i]
    const A = altF[i]
    let rank = 6
    if (P.some((v) => v === rawPhrase)) rank = 0
    // büyük şehrin bilinen adı birebir yazıldıysa (ör. "München" → Munich, "Wien" → Vienna) şehir de ilk sırada
    else if (r[8] >= 50000 && A.some((v) => v === phrase)) rank = 0
    else if (PF.some((v) => v === phrase) || A.some((v) => v === phrase)) rank = 1
    else if (PF.some((v) => boundary(v, phrase)) || (parts.length === 1 && wordIn(ctxF[i], phrase))) rank = 2
    else if (A.some((v) => boundary(v, phrase))) rank = 3
    else if (P.some((v) => v.startsWith(rawPhrase))) rank = 4
    else if (PF.some((v) => v.startsWith(phrase))) rank = 5
    // çok kelimeli aramada (ör. "berlin kreuzberg") kelimelerden biri adın tamamıysa öne al
    if (rank > 1 && parts.length > 1 && PF.some((v) => parts.includes(v))) rank = 1
    hits.push({ i, rank })
  }
  hits.sort((a, b) => a.rank - b.rank || rows[b.i][8] - rows[a.i][8])
  return hits.slice(0, limit).map(({ i }) => toHit(rows[i]))
}

const distKm = (la1: number, lo1: number, la2: number, lo2: number): number => {
  const rad = Math.PI / 180
  const a = Math.sin(((la2 - la1) * rad) / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(((lo2 - lo1) * rad) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}

/** Elle girilen koordinat için en yakın yerleşim (saat dilimini bulmak için) */
export function nearest(lat: number, lon: number): (CityHit & { distanceKm: number }) | null {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (Math.abs(r[5] - lat) > 3) continue // hızlı ön eleme
    const d = distKm(lat, lon, r[5], r[6])
    if (d < bestD) { bestD = d; best = i }
  }
  if (best < 0) {
    for (let i = 0; i < rows.length; i++) {
      const d = distKm(lat, lon, rows[i][5], rows[i][6])
      if (d < bestD) { bestD = d; best = i }
    }
  }
  if (best < 0) return null
  const r = rows[best]
  return {
    geonameId: r[10], name: r[0], localName: r[12] || undefined, district: r[2], region: r[3], countryCode: r[4], country: countryName(r[4], r[4]),
    lat: r[5], lon: r[6], tz: r[7], population: r[8], precision: precisionOf(r[11], r[8]), distanceKm: bestD
  }
}

/** Her ülke için ilçe ve il bilgisinin doluluk oranı (kontrol amaçlı) */
export function coverage(): { code: string; name: string; places: number; withRegion: number; withDistrict: number }[] {
  const m = new Map<string, { places: number; withRegion: number; withDistrict: number }>()
  for (const r of rows) {
    const c = m.get(r[4]) ?? { places: 0, withRegion: 0, withDistrict: 0 }
    c.places++
    if (r[3]) c.withRegion++
    if (r[2]) c.withDistrict++
    m.set(r[4], c)
  }
  return [...m].map(([code, c]) => ({ code, name: countryName(code, code), ...c }))
}
