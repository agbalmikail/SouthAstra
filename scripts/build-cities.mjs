// GeoNames verisinden (CC BY 4.0, geonames.org) çevrimdışı yer veritabanı üretir.
//
// Kaynak klasörde şu dosyalar olmalı (https://download.geonames.org/export/dump/):
//   cities1000.txt                    – dünyada nüfusu 1000'den fazla yerleşimler
//   admin1CodesASCII.txt, admin2Codes.txt, countryInfo.txt
//   <ÜLKE>.txt (ör. TR.txt, DE.txt)   – ayrıntılı eklenecek ülkelerin tüm yer adları (köy, semt dahil)
//
// Kullanım: node scripts/build-cities.mjs <klasör> [ayrıntılı ülkeler, varsayılan TR,DE]
// Örnek:    node scripts/build-cities.mjs ~/geonames TR,DE,AT,NL
//
// Ülkeye özel ayarlar (ilçe düzeyi, il/eyalet adlarının yerel yazılışı): scripts/countries.json
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dir = process.argv[2]
if (!dir) { console.error('Kaynak klasörü verin'); process.exit(1) }
const detailed = (process.argv[3] ?? 'TR,DE').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)
const settings = JSON.parse(readFileSync(new URL('./countries.json', import.meta.url), 'utf8'))

const lines = (f) => readFileSync(join(dir, f), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'))
const admin1 = new Map(lines('admin1CodesASCII.txt').map((l) => { const c = l.split('\t'); return [c[0], c[1]] }))
const admin2 = new Map(lines('admin2Codes.txt').map((l) => { const c = l.split('\t'); return [c[0], c[1]] }))
const countries = new Map(lines('countryInfo.txt').map((l) => { const c = l.split('\t'); return [c[0], c[4]] }))

// Ayrıntılı ülkelerde il/eyalet adını o ülkenin kendi dosyasından (yerel yazılışla) al
const detailedFiles = new Map(detailed.map((cc) => [cc, lines(`${cc}.txt`).map((l) => l.split('\t'))]))
const admin3 = new Map() // ör. Almanya'da Landkreis
for (const [cc, rows] of detailedFiles) {
  for (const c of rows) {
    if (c[6] === 'A' && c[7] === 'ADM1') admin1.set(`${cc}.${c[10]}`, c[1])
    if (c[6] === 'A' && c[7] === 'ADM3') admin3.set(`${cc}.${c[10]}.${c[11]}.${c[12]}`, c[1])
  }
}
for (const [cc, conf] of Object.entries(settings)) {
  if (cc.startsWith('_')) continue
  for (const [code, name] of Object.entries(conf.admin1 ?? {})) admin1.set(`${cc}.${code}`, name)
}
const clean2 = (s) => s.replace(/ İlçesi$/, '').replace(/^Regierungsbezirk /, '')
const districtLevel = (cc) => settings[cc]?.districtLevel ?? 2
const fold = (x) => x.replace(/[İIı]/g, 'i').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
const fix2 = (cc, n) => settings[cc]?.admin2Fix?.[n] ?? n

// Ayrıntılı ülkelerde il başına ilçe adları (ilçe merkezlerini doğru ilçeye bağlamak için)
const districtsOf = new Map() // "TR.34" → Map(sadeleştirilmiş ad → doğru ad)
for (const [cc, rowsF] of detailedFiles) {
  if (districtLevel(cc) !== 2) continue
  for (const c of rowsF) {
    if (c[6] !== 'A' || c[7] !== 'ADM2') continue
    const n = fix2(cc, clean2(admin2.get(`${cc}.${c[10]}.${c[11]}`) ?? c[1]))
    if (settings[cc]?.skipAdmin2?.includes(n)) continue
    const k = `${cc}.${c[10]}`
    if (!districtsOf.has(k)) districtsOf.set(k, new Map())
    districtsOf.get(k).set(fold(n), n)
  }
}

const SKIP = new Set(['PPLH', 'PPLQ', 'PPLW', 'PPLCH'])

const seen = new Set()
const rows = []
function add(c) {
  const [id, name, ascii, alts, lat, lon, , fcode, cc, , a1, a2, a3, , pop, , , tz] = c
  if (seen.has(id) || !tz || SKIP.has(fcode) || /^Regierungsbezirk /.test(name)) return
  seen.add(id)
  const p1 = admin1.get(`${cc}.${a1}`) ?? ''
  let p2 = fcode === 'ADM2' || fcode === 'ADM3' ? '' : clean2(
    (districtLevel(cc) === 3 ? admin3.get(`${cc}.${a1}.${a2}.${a3}`) : undefined) ?? admin2.get(`${cc}.${a1}.${a2}`) ?? '')
  p2 = fix2(cc, p2)
  let nm = name
  const known = districtsOf.get(`${cc}.${a1}`)
  if (known) {
    if (fcode === 'ADM2') {
      nm = fix2(cc, clean2(name.replace(/ İlçesi$/, '')))
      if (settings[cc]?.skipAdmin2?.includes(nm)) return
      p2 = nm
    }
    // ilçe merkezi (PPLA2/PPLA3) adı bir ilçe adıyla aynıysa o ilçeye bağla (GeoNames'te bazıları yanlış ilçede)
    const match = known.get(fold(nm))
    if (match && /^PPLA[2-4]?$/.test(fcode)) p2 = match
    // aksansız yazılmış ad (ör. "Uzumlu") ilçenin doğru yazılışını alsın
    if (match && fold(nm) === fold(match) && nm !== match && !/[^\x00-\x7f]/.test(nm)) nm = match
  }
  // Büyük yerler için Latin alfabeli alternatif adlar (ör. Munich → München, Münih)
  const alt = +pop >= 15000 && alts
    ? [...new Set(alts.split(',').filter((a) => /^[\p{Script=Latin}\s'’.-]+$/u.test(a) && a !== name && a !== ascii))].join('|')
    : ''
  // [ad, ascii ad, ilçe/kreis, il/eyalet, ülke kodu, enlem, boylam, saat dilimi, nüfus, alternatif adlar, GeoNames kimliği, yer türü]
  rows.push([nm, ascii, p2, p1, cc, +(+lat).toFixed(4), +(+lon).toFixed(4), tz, +pop || 0, alt, +id, fcode])
}

for (const l of lines('cities1000.txt')) add(l.split('\t'))
const extra = {}
for (const [cc, file] of detailedFiles) {
  const n = rows.length
  for (const c of file) if (c[6] === 'P' || (c[6] === 'A' && c[7] === 'ADM2')) add(c)
  extra[cc] = rows.length - n
}
rows.sort((a, b) => b[8] - a[8])

const data = { version: 4, detailed, countries: Object.fromEntries(countries), rows }
writeFileSync('resources/cities.json.gz', gzipSync(JSON.stringify(data), { level: 9 }))
console.log(`${rows.length} yer yazıldı; ayrıntılı ülke ekleri: ${Object.entries(extra).map(([k, v]) => `${k} +${v}`).join(', ')}`)
