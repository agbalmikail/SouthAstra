// Doğruluk testleri: npm run verify
// 1) Swiss Ephemeris'i Meeus "Astronomical Algorithms" (2. baskı) örnekleriyle karşılaştırır
// 2) Saat dilimi çevirisini bilinen tarihlerle dener
// 3) Ev sistemi ve drakonik harita kurallarını kontrol eder
import sweph from 'sweph'
import { join } from 'node:path'
import { acg, eclipses, initEphemeris, natalChart, rectify, transitList, useSettings, view } from '../src/main/engine'
import { DEFAULT_SETTINGS } from '../src/shared/zodiac'
import { loadCities, searchCities } from '../src/main/cities'
import { essentialDignities, faceRuler, termRuler } from '../src/shared/dignities'
import { aspectPatterns } from '../src/shared/patterns'
import type { ChartResult } from '../src/shared/types'
import { toUtc } from '../src/main/time'
import type { ChartInput } from '../src/shared/types'
import { separation } from '../src/shared/zodiac'

initEphemeris(join(process.cwd(), 'resources/ephe'))
const C = sweph.constants
let fail = 0
const ok = (cond: boolean, msg: string) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fail++ }
const arcsec = (a: number, b: number) => separation(a, b) * 3600

console.log('\n— Gezegen konumları (Meeus örnekleri, görünür geosantrik boylam)')
const cases = [
  { what: 'Güneş, 1992-10-13 0h TD (Örnek 25.b, JPL DE200 değeri 199°54\'21.56")', y: 1992, m: 10, d: 13, h: 0, body: C.SE_SUN, lon: 199 + 54 / 60 + 21.56 / 3600, tol: 1 },
  { what: 'Ay, 1992-04-12 0h TD (Örnek 47.a)', y: 1992, m: 4, d: 12, h: 0, body: C.SE_MOON, lon: 133.167265, tol: 10 },
  { what: 'Venüs, 1992-12-20 0h TD (Örnek 33.a)', y: 1992, m: 12, d: 20, h: 0, body: C.SE_VENUS, lon: 313.08102, tol: 10 },
]
for (const c of cases) {
  const jd = sweph.julday(c.y, c.m, c.d, c.h, C.SE_GREG_CAL)
  const r = sweph.calc(jd, c.body, C.SEFLG_SWIEPH)
  const diff = arcsec(r.data[0], c.lon)
  ok(diff <= c.tol && (r.flag & C.SEFLG_SWIEPH) > 0, `${c.what}: ${r.data[0].toFixed(6)}° — referanstan fark ${diff.toFixed(2)}" (sınır ${c.tol}")`)
}

console.log('\n— NASA JPL Horizons (2000-01-01 12:00 UT, geosantrik görünür ekliptik boylam, ekliptik of-date)')
{
  // Değerler ssd.jpl.nasa.gov/api/horizons.api ile alındı (QUANTITIES=31, CENTER=500@399)
  const jplRef: [number, string, number][] = [
    [C.SE_SUN, 'Güneş', 280.3689092], [C.SE_MOON, 'Ay', 223.323786], [C.SE_MERCURY, 'Merkür', 271.8892699], [C.SE_VENUS, 'Venüs', 241.5657794],
    [C.SE_MARS, 'Mars', 327.9632921], [C.SE_JUPITER, 'Jüpiter', 25.2530685], [C.SE_SATURN, 'Satürn', 40.3956366], [C.SE_URANUS, 'Uranüs', 314.809168],
    [C.SE_NEPTUNE, 'Neptün', 303.1930007], [C.SE_PLUTO, 'Plüton', 251.4547644]
  ]
  const jd = sweph.julday(2000, 1, 1, 12, C.SE_GREG_CAL)
  let worst = { d: 0, n: '' }
  for (const [b, n, ref] of jplRef) {
    const d = arcsec(sweph.calc_ut(jd, b, C.SEFLG_SWIEPH).data[0], ref)
    if (d > worst.d) worst = { d, n }
  }
  ok(worst.d < 1, `10 cisim NASA ile karşılaştırıldı: en büyük fark ${worst.d.toFixed(2)}" (${worst.n}); sınır 1"`)
}

console.log('\n— Bağımsız teoriyle çapraz kontrol (Swiss Ephemeris dosyaları ↔ Moshier analitik teorisi)')
{
  const names = ['Güneş', 'Ay', 'Merkür', 'Venüs', 'Mars', 'Jüpiter', 'Satürn', 'Uranüs', 'Neptün', 'Plüton']
  let worst = { d: 0, n: '', y: 0 }
  for (const y of [1850, 1900, 1950, 1975, 2000, 2025, 2050]) {
    const jd = sweph.julday(y, 6, 15, 12, C.SE_GREG_CAL)
    for (let b = 0; b <= 9; b++) {
      const d = arcsec(sweph.calc_ut(jd, b, C.SEFLG_SWIEPH).data[0], sweph.calc_ut(jd, b, C.SEFLG_MOSEPH).data[0])
      if (d > worst.d) worst = { d, n: names[b], y }
    }
  }
  ok(worst.d < 5, `1850–2050 arası 7 tarih × 10 cisim: en büyük fark ${worst.d.toFixed(2)}" (${worst.n}, ${worst.y}); sınır 5"`)
}

console.log('\n— Saat dilimi çevirisi')
const base: ChartInput = { name: 't', date: '2010-07-01', time: '12:00', place: { name: 'Istanbul', region: '', country: 'Turkey', lat: 41.0138, lon: 28.9497, tz: 'Europe/Istanbul' }, timeMode: 'zone', houseSystem: 'P', nodeType: 'true' }
const tz = (date: string, time: string, zone: string) => toUtc({ ...base, date, time, place: { ...base.place, tz: zone } })
ok(tz('2010-07-01', '12:00', 'Europe/Istanbul').offsetMinutes === 180, 'İstanbul, Temmuz 2010 → UTC+3 (yaz saati)')
ok(tz('2010-01-15', '12:00', 'Europe/Istanbul').offsetMinutes === 120, 'İstanbul, Ocak 2010 → UTC+2 (kış saati)')
ok(tz('2020-01-15', '12:00', 'Europe/Istanbul').offsetMinutes === 180, 'İstanbul, Ocak 2020 → UTC+3 (2016 sonrası sabit)')
ok(tz('1990-06-01', '12:00', 'Europe/London').offsetMinutes === 60, 'Londra, Haziran 1990 → UTC+1')
ok(tz('2021-03-14', '02:30', 'America/New_York').warnings.some((w) => w.includes('atlanan')), 'New York, 14.03.2021 02:30 → "atlanan saat" uyarısı')
ok(tz('2021-11-07', '01:30', 'America/New_York').warnings.some((w) => w.includes('iki kez')), 'New York, 07.11.2021 01:30 → "iki kez yaşandı" uyarısı')
ok(tz('1987-06-10', '14:00', 'Europe/Berlin').offsetMinutes === 120 && tz('1987-01-10', '14:00', 'Europe/Berlin').offsetMinutes === 60, 'Almanya 1987: Haziran UTC+2 (yaz), Ocak UTC+1 (kış)')
ok(tz('1975-07-01', '12:00', 'Europe/Berlin').offsetMinutes === 60 && tz('1980-07-01', '12:00', 'Europe/Berlin').offsetMinutes === 120, 'Almanya: 1975 yazında yaz saati yok (UTC+1), 1980\'de yeniden başladı (UTC+2)')
ok(tz('1946-07-01', '12:00', 'Europe/Berlin').warnings.some((w) => w.includes('işgal bölgelerinde')), 'Almanya 1945–1949: işgal bölgeleri uyarısı')
ok(tz('1987-06-10', '14:00', 'Europe/Berlin').dst === true && tz('1987-01-10', '14:00', 'Europe/Berlin').dst === false, 'Yaz saati / standart saat ayrımı doğru')
const lmt = toUtc({ ...base, timeMode: 'lmt' })
ok(Math.abs(lmt.offsetMinutes - 28.9497 * 4) < 0.001, `LMT İstanbul → ${lmt.offsetMinutes.toFixed(2)} dk (boylam × 4 dk)`)

console.log('\n— Harita kuralları')
const natal = natalChart(base)
ok(natal.ephemeris.startsWith('Swiss'), `Efemeris: ${natal.ephemeris}`)
ok(Math.abs(natal.cusps[0] - natal.angles.asc) < 1e-9 && Math.abs(natal.cusps[9] - natal.angles.mc) < 1e-9, 'Placidus: 1. ev = AC, 10. ev = MC')
const eq = natalChart({ ...base, houseSystem: 'E' })
ok(eq.cusps.every((c, i) => Math.abs(separation(c, eq.angles.asc + 30 * i)) < 1e-6), 'Eşit evler: her ev tam 30°')
const drac = view(base, { mode: 'draconic' }).inner
const nn = drac.points.find((p) => p.id === 'northnode')!
ok(separation(nn.lon, 0) < 1e-9, 'Drakonik: Kuzey Düğüm 0° Koç')
const sunN = natal.points.find((p) => p.id === 'sun')!, moonN = natal.points.find((p) => p.id === 'moon')!
const sunD = drac.points.find((p) => p.id === 'sun')!, moonD = drac.points.find((p) => p.id === 'moon')!
ok(Math.abs(separation(sunN.lon, moonN.lon) - separation(sunD.lon, moonD.lon)) < 1e-9, 'Drakonik: gezegenler arası açılar değişmiyor')
const polar = natalChart({ ...base, place: { ...base.place, lat: 69.65, lon: 18.96, tz: 'Europe/Oslo' } })
ok(polar.warnings.some((w) => w.includes('kutup')), 'Tromsø (69.6°K) Placidus → kutup uyarısı ve Porphyry yedeği')

console.log('\n— Öngörü ve dönüş teknikleri')
const pid = (ch: { points: { id: string; lon: number }[] }, id: string) => ch.points.find((p) => p.id === id)!.lon
{
  const sr = view(base, { mode: 'solarreturn', date: '2030-01-01T00:00:00Z' })
  const d = arcsec(pid(sr.inner, 'sun'), pid(natal, 'sun'))
  ok(d < 0.1 && sr.inner.utc.startsWith('2030-07'), `Güneş dönüşü 2030: ${sr.inner.utc} · Güneş farkı ${d.toFixed(3)}"`)
  const lr = view(base, { mode: 'lunarreturn', date: '2030-01-01T00:00:00Z' })
  const d2 = arcsec(pid(lr.inner, 'moon'), pid(natal, 'moon'))
  ok(d2 < 0.5 && lr.inner.utc.startsWith('2030-01'), `Ay dönüşü Ocak 2030: ${lr.inner.utc} · Ay farkı ${d2.toFixed(3)}"`)
  const pr = view(base, { mode: 'progressed', date: '2040-07-01T09:00:00Z' })
  const days = pr.outer!.jdUt - natal.jdUt
  ok(Math.abs(days - 30) < 0.01, `İkincil progresyon: 30 yaş → doğumdan ${days.toFixed(4)} gün sonra`)
  const arc = pid(pr.outer!, 'sun') - pid(natal, 'sun')
  const sa = view(base, { mode: 'solararc', date: '2040-07-01T09:00:00Z' })
  ok(Math.abs(separation(pid(sa.outer!, 'mars'), pid(natal, 'mars') + arc)) < 1e-6, `Solar arc: her nokta aynı yayla (${arc.toFixed(3)}°) ilerliyor`)
  const ev = transitList(base, '2030-01-01T00:00:00Z', '2031-01-01T00:00:00Z', ['sun', 'mars', 'jupiter', 'saturn'])
  const asp = ev.filter((e) => e.natal && e.natal !== 'asc' && e.natal !== 'mc')
  const ANG: Record<string, number> = { conjunction: 0, opposition: 180, trine: 120, square: 90, sextile: 60 }
  const SE: Record<string, number> = { sun: 0, mars: 4, jupiter: 5, saturn: 6 }
  let worst = 0
  for (const e of asp) {
    const t = sweph.calc_ut(e.jd, SE[e.transit], C.SEFLG_SWIEPH).data[0]
    worst = Math.max(worst, Math.abs(separation(t, pid(natal, e.natal!)) - ANG[e.type]) * 3600)
  }
  ok(asp.length > 20 && worst < 1, `Transit listesi 2030: ${ev.length} olay (${asp.length} açı); tam açı anında en büyük sapma ${worst.toFixed(3)}"`)
  ok(ev.some((e) => e.type === 'station-retro' && e.transit === 'saturn'), 'Transit listesi: Satürn geri dönüş duraklaması bulundu')
  const rows = rectify(base, '11:00', '13:00', 10)
  ok(rows.length === 13 && rows.every((r, i) => i === 0 || separation(r.asc, rows[i - 1].asc) > 0), `Saat aralığı tablosu: ${rows.length} satır, yükselen her adımda ilerliyor`)
  const partner: ChartInput = { ...base, name: 'b', date: '1985-03-20', time: '08:00' }
  const comp = view(base, { mode: 'composite', partner })
  const pb = natalChart(partner)
  const mid = (a: number, b: number) => { const d = ((b - a + 540) % 360) - 180; return (a + d / 2 + 360) % 360 }
  ok(separation(pid(comp.inner, 'venus'), mid(pid(natal, 'venus'), pid(pb, 'venus'))) < 1e-9, 'Kompozit: Venüs iki Venüs\'ün kısa yay orta noktası')
  const syn = view(base, { mode: 'synastry', partner })
  ok(syn.cross.length > 0 && syn.outer!.points.length === natal.points.length, `Sinastri: ${syn.cross.length} karşılıklı açı`)
}

console.log('\n— Tersiyer, minör progresyon ve harmonik')
{
  const t = view(base, { mode: 'tertiary', date: '2011-07-01T09:00:00Z' })
  const elapsed = Date.parse('2011-07-01T09:00:00Z') / 86400000 + 2440587.5 - natal.jdUt
  ok(Math.abs(t.outer!.jdUt - natal.jdUt - elapsed / 27.321582) < 1e-6, `Tersiyer: ${elapsed.toFixed(1)} gerçek gün → ${(elapsed / 27.321582).toFixed(3)} progresif gün (1 gün = 1 kameri ay)`)
  const m = view(base, { mode: 'minor', date: '2040-07-01T09:00:00Z' })
  const years = (Date.parse('2040-07-01T09:00:00Z') / 86400000 + 2440587.5 - natal.jdUt) / 365.242199
  ok(Math.abs(m.outer!.jdUt - natal.jdUt - years * 27.321582) < 1e-6, `Minör: ${years.toFixed(2)} yıl → ${(years * 27.321582).toFixed(2)} progresif gün (1 kameri ay = 1 yıl)`)
  const h5 = view(base, { mode: 'harmonic', harmonic: 5 }).inner
  ok(['sun', 'moon', 'mars'].every((id) => separation(pid(h5, id), (pid(natal, id) * 5) % 360) < 1e-9), '5. harmonik: boylamlar × 5 (mod 360°)')
}

console.log('\n— Tutulmalar (NASA tutulma kataloğu, 2026)')
{
  const ev = eclipses(base, '2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z').filter((e) => !e.prenatal)
  const expect = [
    ['solar', '2026-02-17', 'Halkalı'], ['lunar', '2026-03-03', 'Tam'], ['solar', '2026-08-12', 'Tam'], ['lunar', '2026-08-28', 'Parçalı']
  ]
  for (const [k, d, typ] of expect) {
    const e = ev.find((x) => x.kind === k && x.utc.startsWith(d))
    ok(!!e && e.type === typ, `${d} ${k === 'solar' ? 'Güneş' : 'Ay'} tutulması: ${e ? `${e.type}, ${e.utc.slice(11, 16)} UT` : 'bulunamadı'} (beklenen ${typ})`)
  }
  ok(ev.length === 4, `2026'da toplam ${ev.length} tutulma (beklenen 4)`)
  const pre = eclipses(base, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z').filter((e) => e.prenatal)
  ok(pre.length === 2 && pre.every((e) => e.jd < natal.jdUt), `Doğum öncesi tutulmalar: ${pre.map((e) => e.utc.slice(0, 10)).join(', ')}`)
}

console.log('\n— Astrokartografi')
{
  const lines = acg(base)
  const sun = lines.find((l) => l.id === 'sun')!
  const jd = natal.jdUt
  const eq = sweph.calc_ut(jd, C.SE_SUN, C.SEFLG_SWIEPH | C.SEFLG_EQUATORIAL).data
  let worstAlt = 0
  for (const [lat, lon] of [...sun.asc, ...sun.dsc].filter((_, i) => i % 15 === 0)) {
    const alt = sweph.azalt(jd, C.SE_EQU2HOR, [lon, lat, 0], 0, 0, [eq[0], eq[1], eq[2]])[1]
    worstAlt = Math.max(worstAlt, Math.abs(alt))
  }
  ok(worstAlt < 0.01, `Güneş AC/DC çizgileri: çizgi üzerindeki noktalarda Güneş ufukta (en büyük sapma ${worstAlt.toFixed(4)}°)`)
  const lst = (sweph.sidtime(jd) * 15 + sun.mc + 360) % 360
  ok(Math.abs(((lst - eq[0] + 540) % 360) - 180) < 1e-6, 'Güneş MC çizgisi: yerel yıldız zamanı = Güneş\'in sağ açıklığı')
}

console.log('\n— Sideral zodyak')
{
  useSettings({ ...DEFAULT_SETTINGS, zodiac: 'sidereal', ayanamsa: 1 })
  const sid = natalChart({ ...base, date: '2000-01-01', time: '12:00', timeMode: 'manual', manualOffset: 0 })
  useSettings(DEFAULT_SETTINGS)
  const trop = natalChart({ ...base, date: '2000-01-01', time: '12:00', timeMode: 'manual', manualOffset: 0 })
  const aya = sid.ayanamsa!
  ok(Math.abs(aya - 23.857) < 0.01, `Lahiri ayanamsa 1 Ocak 2000: ${aya.toFixed(4)}° (beklenen ≈ 23,857°)`)
  ok(Math.abs(separation(pid(trop, 'sun') - aya, pid(sid, 'sun'))) < 1e-6, 'Sideral Güneş = tropikal Güneş − ayanamsa')
  ok(Math.abs(separation(trop.angles.asc - aya, sid.angles.asc)) < 1e-6, 'Sideral yükselen = tropikal yükselen − ayanamsa')
}

console.log('\n— Geleneksel: esas dignite (Lilly puanlaması) ve açı kalıpları')
{
  const fake = (pts: Record<string, number>, sunAlt = 10, aspects: ChartResult['aspects'] = []): ChartResult => ({
    ...natal, aspects, hasHouses: false,
    points: Object.entries(pts).map(([id, lon]) => ({ id, name: id, glyph: '', lon, lat: 0, speed: 1, retro: false, house: 0, declination: 0, altitude: id === 'sun' ? sunAlt : 0 }))
  })
  const d = essentialDignities(fake({ sun: 15, moon: 220, mars: 295 }))
  const sun = d.find((x) => x.id === 'sun')!
  ok(sun.score === 8 && sun.has.join(',') === 'Yücelim +4,Üçlük +3,Dekan +1', `Güneş 15° Koç (gündüz): ${sun.has.join(', ')} = ${sun.score} (beklenen +8)`)
  const moon = d.find((x) => x.id === 'moon')!
  ok(moon.score === -9, `Ay 10° Akrep: ${moon.has.join(', ')} = ${moon.score} (beklenen −9: düşüş + peregrine)`)
  const mars = d.find((x) => x.id === 'mars')!
  ok(mars.has[0] === 'Yücelim +4' && termRuler(295) === 'saturn' && faceRuler(295) === 'sun', `Mars 25° Oğlak: yücelimde; sınır Satürn, dekan Güneş`)
  ok(termRuler(0) === 'jupiter' && termRuler(29.9) === 'saturn' && termRuler(359.9) === 'saturn' && faceRuler(359) === 'mars', 'Sınır ve dekan tabloları uç değerlerde doğru (Koç başı Jüpiter, Balık sonu Satürn/Mars)')
  const A = (a: string, b: string, type: ChartResult['aspects'][number]['type']) => ({ a, b, type, angle: 0, orb: 1, applying: false })
  const gt = aspectPatterns(fake({ sun: 10, moon: 130, mars: 250, venus: 70 }, 10, [A('sun', 'moon', 'trine'), A('moon', 'mars', 'trine'), A('sun', 'mars', 'trine'), A('venus', 'sun', 'sextile'), A('venus', 'moon', 'sextile'), A('venus', 'mars', 'opposition')]))
  ok(gt.some((p) => p.name === 'Büyük üçgen') && gt.some((p) => p.name === 'Uçurtma'), `Büyük üçgen ve uçurtma bulundu: ${gt.map((p) => p.name).join(', ')}`)
  const ts = aspectPatterns(fake({ sun: 0, moon: 180, mars: 90 }, 10, [A('sun', 'moon', 'opposition'), A('mars', 'sun', 'square'), A('mars', 'moon', 'square')]))
  ok(ts.length === 1 && ts[0].name === 'T-kare' && ts[0].points[2] === 'mars', 'T-kare: odak noktası Mars')
  const yod = aspectPatterns(fake({ sun: 0, moon: 60, mars: 210 }, 10, [A('sun', 'moon', 'sextile'), A('mars', 'sun', 'quincunx'), A('mars', 'moon', 'quincunx')]))
  ok(yod.length === 1 && yod[0].name === 'Yod', 'Yod: altmışlık + iki quincunx')
}

console.log('\n— Yer araması (sıralama)')
{
  loadCities(join(process.cwd(), 'resources/cities.json.gz'))
  const top = (q: string, f = {}, n = 1) => searchCities(q, f, 12).slice(0, n).map((h) => h.name)
  const koln = searchCities('Köln', { country: 'DE', region: 'Nordrhein-Westfalen' }, 12)
  const own = (h: { district: string }) => h.district.includes('Köln')
  const lastOwn = koln.map(own).lastIndexOf(true)
  const firstOther = koln.findIndex((h) => !own(h))
  ok(koln[0].name === 'Köln' && (firstOther === -1 || firstOther > lastOwn), `"Köln": önce Köln, sonra Köln'ün semtleri (${koln.slice(0, 3).map((h) => h.name).join(', ')}); alakasızlar sonda (${koln[firstOther]?.name ?? '—'})`)
  const dus = searchCities('Düsseldorf', { country: 'DE' }, 12)
  ok(dus[0].name === 'Düsseldorf' && dus.slice(0, 3).every((h) => h.district.includes('Düsseldorf')), `"Düsseldorf": önce şehrin kendisi, sonra semtleri (${dus.slice(0, 3).map((h) => h.name).join(', ')})`)
  ok(top('kadikoy', { country: 'TR' })[0] === 'Kadıköy', '"kadikoy" (aksansız) → Kadıköy')
  ok(top('izmir')[0] === 'İzmir', '"izmir" → İzmir')
  ok(top('münchen')[0] === 'Münih' && top('munich')[0] === 'Münih' && searchCities('münih', {}, 1)[0].localName === 'München', '"münchen", "munich" → Münih (yerel adı München)')
  ok(top('wien')[0] === 'Viyana' && top('london')[0] === 'Londra' && top('new york')[0] === 'New York', 'Türkçe adlar: Viyana, Londra; açıklama ekli ad kullanılmıyor (New York)')
  ok(top('koln')[0] === 'Köln', '"koln" → Köln')
  ok(top('berlin kreuzberg')[0] === 'Kreuzberg', '"berlin kreuzberg" → Kreuzberg')
  ok(top('Kurfürstendamm Berlin').length === 0, 'Sokak adı içeren aramada çevrimdışı sonuç yok (arayüz sokak adını atıp yeniden dener)')
}

console.log('\n— Ek noktalar')
{
  const f = natal.points.find((p) => p.id === 'fortune')!
  const sun = pid(natal, 'sun'), moon = pid(natal, 'moon'), asc = natal.angles.asc
  const day = natal.points.find((p) => p.id === 'sun')!.house >= 7
  const exp = (day ? asc + moon - sun : asc + sun - moon + 720) % 360
  ok(separation(f.lon, exp) < 1e-9, `Şans Noktası (${day ? 'gündüz' : 'gece'} formülü)`)
  ok(natal.points.find((p) => p.id === 'sun')!.altitude! > 0 === day, 'Güneş\'in yüksekliği ile gündüz/gece ayrımı tutarlı')
}

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti')
process.exit(fail ? 1 : 0)
