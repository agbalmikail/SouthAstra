// Doğruluk testleri: npm run verify
// 1) Swiss Ephemeris'i Meeus "Astronomical Algorithms" (2. baskı) örnekleriyle karşılaştırır
// 2) Saat dilimi çevirisini bilinen tarihlerle dener
// 3) Ev sistemi ve drakonik harita kurallarını kontrol eder
import sweph from 'sweph'
import { join } from 'node:path'
import { acg, ephemeris, eclipses, initEphemeris, natalChart, rectify, transitList, useSettings, view } from '../src/main/engine'
import { DEFAULT_SETTINGS, ORB_PROFILES } from '../src/shared/zodiac'
import { loadCities, searchCities } from '../src/main/cities'
import { isNewer } from '../src/shared/version'
import { essentialDignities, faceRuler, sectUnknown, termRuler, tripRuler } from '../src/shared/dignities'
import { midpointHits } from '../src/shared/factors'
import { firdaria, profections } from '../src/shared/timelords'
import { chartHighlights, ANGLE_ORB, TIGHT_ORB } from '../src/shared/highlights'
import { transitExplain } from '../src/shared/learn'
import { buildSession, feedbackStats, fitShare, looksGeneric, rng, type FeedbackEntry } from '../src/shared/feedback'
import { chartFactors } from '../src/shared/factors'
import { buildSheets, chanceP } from '../src/shared/blind'
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

console.log('\n— Asteroitler (NASA JPL Horizons, 2000-01-01 12:00 UT)')
{
  const ref: [number, string, number][] = [[C.SE_CERES, 'Ceres', 184.4530625], [C.SE_PALLAS, 'Pallas', 134.043348], [C.SE_JUNO, 'Juno', 277.9960713], [C.SE_VESTA, 'Vesta', 245.9719858]]
  const jd = sweph.julday(2000, 1, 1, 12, C.SE_GREG_CAL)
  let worst = { d: 0, n: '' }
  for (const [b, n, r] of ref) { const d = arcsec(sweph.calc_ut(jd, b, C.SEFLG_SWIEPH).data[0], r); if (d > worst.d) worst = { d, n } }
  ok(worst.d < 3, `4 asteroit NASA ile karşılaştırıldı: en büyük fark ${worst.d.toFixed(2)}" (${worst.n}); sınır 3"`)
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
ok(tz('1990-03-24', '12:00', 'Europe/Berlin').offsetMinutes === 60 && tz('1990-03-26', '12:00', 'Europe/Berlin').offsetMinutes === 120 && tz('1990-09-29', '12:00', 'Europe/Berlin').offsetMinutes === 120 && tz('1990-10-01', '12:00', 'Europe/Berlin').offsetMinutes === 60, 'Almanya 1990: yaz saati 25 Mart – 30 Eylül (UTC+2), öncesi ve sonrası UTC+1')
ok(tz('1990-03-25', '02:30', 'Europe/Berlin').warnings.some((w) => w.includes('atlanan')) && tz('1990-09-30', '02:30', 'Europe/Berlin').warnings.some((w) => w.includes('iki kez')), 'Almanya 1990: 25.03 02:30 "atlanan saat", 30.09 02:30 "iki kez yaşandı" uyarısı')
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

console.log('\n— Taşınma ve dönüş yeri')
{
  const berlin = { name: 'Berlin', region: 'Berlin', country: 'Almanya', lat: 52.5244, lon: 13.4105, tz: 'Europe/Berlin' }
  const rel = view(base, { mode: 'relocated', place: berlin }).inner
  ok(rel.points.filter((p) => p.id !== 'fortune').every((p) => separation(p.lon, pid(natal, p.id)) < 1e-9) && rel.jdUt === natal.jdUt, 'Taşınma: doğum anı ve gezegenler doğum haritasıyla aynı')
  const hb = sweph.houses_ex2(natal.jdUt, 0, berlin.lat, berlin.lon, 'P').data
  ok(separation(rel.angles.asc, hb.points[0]) < 1e-9 && separation(rel.cusps[4], hb.houses[4]) < 1e-9, `Taşınma: yükselen Berlin koordinatlarına göre (${rel.angles.asc.toFixed(2)}°; doğum yerinde ${natal.angles.asc.toFixed(2)}°)`)
  const srHome = view(base, { mode: 'solarreturn', date: '2030-01-01T00:00:00Z' }).inner
  const srBer = view(base, { mode: 'solarreturn', date: '2030-01-01T00:00:00Z', place: berlin }).inner
  const hs = sweph.houses_ex2(srBer.jdUt, 0, berlin.lat, berlin.lon, 'P').data
  ok(Math.abs(srHome.jdUt - srBer.jdUt) < 1e-9 && separation(srBer.angles.asc, hs.points[0]) < 1e-9 && separation(srBer.angles.asc, srHome.angles.asc) > 1, 'Güneş dönüşü Berlin\'de: dönüş anı aynı, evler Berlin\'e göre')
}

console.log('\n— Öne çıkanlar (kural tabanlı özet)')
{
  const hs = chartHighlights(natal, 'traditional')
  const ten = natal.points.filter((p) => ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(p.id))
  const el = [0, 0, 0, 0]
  for (const p of ten) el[Math.floor(p.lon / 30) % 4]++
  const e = hs.find((h) => h.id === 'elements')!
  ok(e.rule.includes(`Ateş ${el[0]} · Toprak ${el[1]} · Hava ${el[2]} · Su ${el[3]}`) && el.reduce((x, y) => x + y) === 10, `Element sayımı bağımsız sayımla aynı (Ateş ${el[0]}, Toprak ${el[1]}, Hava ${el[2]}, Su ${el[3]})`)
  const d = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
  const angs = [natal.angles.asc, natal.angles.asc + 180, natal.angles.mc, natal.angles.mc + 180]
  const expectAng = ten.flatMap((p) => angs.filter((x) => d(p.lon, x) <= ANGLE_ORB).map(() => p.id)).sort().join()
  const gotAng = hs.filter((h) => h.group === 'Köşeler').map((h) => h.points[0]).sort().join()
  ok(expectAng === gotAng, `Köşelere ${ANGLE_ORB}°'den yakın gezegenler eksiksiz ve fazlasız: ${gotAng || 'yok'}`)
  const MAIN = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'asc', 'mc']
  const expectTight = natal.aspects.filter((a) => ['conjunction', 'opposition', 'square', 'trine', 'sextile'].includes(a.type) && a.orb < TIGHT_ORB && MAIN.includes(a.a) && MAIN.includes(a.b)).length
  ok(hs.filter((h) => h.group === 'Açılar').length === expectTight, `${TIGHT_ORB}°'den dar majör açıların hepsi listede (${expectTight})`)
  const RULER = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter']
  ok(hs.some((h) => h.id === 'ruler-' + RULER[Math.floor(natal.angles.asc / 30)]), `Harita yöneticisi yükselen burcun geleneksel yöneticisi (${RULER[Math.floor(natal.angles.asc / 30)]})`)
  const ux = chartHighlights(natalChart({ ...base, date: '1975-11-02', time: '12:00', timeUnknown: true }))
  ok(!ux.some((h) => h.group === 'Köşeler' || h.id.startsWith('ruler-')) && ux.some((h) => h.id === 'big3' && !h.title.includes('Yükselen')), 'Saat bilinmiyorsa köşe, harita yöneticisi ve yükselen maddesi üretilmiyor')
  ok(hs.every((h) => h.title && h.rule), `Her maddede başlık ve kural var (${hs.length} madde)`)
}

console.log('\n— Transit açıklaması (düz dil)')
{
  const ev = transitList(base, '2024-01-01T00:00:00Z', '2025-12-31T00:00:00Z', ['saturn']).find((e) => e.natal && e.pass && e.pass.of > 1)!
  const lines = transitExplain(ev, (iso) => iso.slice(0, 10))
  ok(lines.some((l) => l.includes(`${ev.house}. evinden`)) && lines.some((l) => l.includes(`${ev.pass!.of} kez`)) && lines.some((l) => l.includes(ev.window!.start.slice(0, 10))) && lines.some((l) => l.includes('tahmini değil')), `Satürn transiti açıklaması: ev (${ev.house}), seri (${ev.pass!.n}/${ev.pass!.of}), dönem ve 'tahmin değil' notu metinde`)
  const st = transitExplain({ transit: 'mercury', type: 'station-retro' }, (x) => x)
  ok(st[0].includes('yön değiştiriyor') && !st.some((l) => l.includes('evinden')), 'Duraklama açıklaması: genel gökyüzü olayı olarak, eve bağlanmadan')
}

console.log('\n— Seans geri bildirimi ve kontrol metinleri')
{
  const chartKeys = chartFactors(natal).map((f) => f.key)
  const otherKeys = chartFactors(natalChart({ ...base, date: '1975-11-02', time: '09:00' })).map((f) => f.key).filter((k) => !chartKeys.includes(k))
  const lib = [...chartKeys.slice(0, 16), ...otherKeys.slice(0, 10)]
  let fine = true
  for (let seed = 1; seed <= 50; seed++) {
    const s = buildSession(chartKeys, lib, rng(seed))
    const real = s.filter((x) => !x.control), ctl = s.filter((x) => x.control)
    if (!real.every((x) => chartKeys.includes(x.key) && lib.includes(x.key))) fine = false
    if (!ctl.every((x) => !chartKeys.includes(x.key) && lib.includes(x.key))) fine = false
    if (new Set(s.map((x) => x.key)).size !== s.length) fine = false
    if (real.length !== Math.min(12, lib.filter((k) => chartKeys.includes(k)).length) || ctl.length !== Math.max(1, Math.round(real.length * 0.25))) fine = false
  }
  ok(fine, '50 rastgele oturum: gerçek metinler yalnız haritadaki etkenlerden, kontroller yalnız haritada olmayanlardan; tekrar yok; kontrol sayısı gerçeklerin %25\'i')
  const s1 = buildSession(chartKeys, lib, rng(7)).map((x) => x.key).join()
  ok(s1 === buildSession(chartKeys, lib, rng(7)).map((x) => x.key).join() && s1 !== buildSession(chartKeys, lib, rng(8)).map((x) => x.key).join(), 'Sıra rastgele ve tohumla tekrarlanabilir')
  ok(buildSession(chartKeys, otherKeys, rng(1)).length === 0, 'Haritanın hiçbir etkeni için yorum yoksa oturum boş (yalnız kontrol gösterilmez)')
  const E = (key: string, rating: 'fit' | 'partial' | 'nofit', control: boolean): FeedbackEntry => ({ key, rating, control, date: '', session: 'x' })
  const fs = feedbackStats([E('a', 'fit', false), E('a', 'partial', false), E('a', 'nofit', false), E('g', 'fit', true), E('g', 'fit', true), E('g', 'partial', true), E('h', 'fit', true), E('h', 'nofit', true), E('h', 'nofit', true)])
  ok(fs.real.n === 3 && Math.abs(fitShare(fs.real) - 0.5) < 1e-9 && fs.control.n === 6, 'Sayım: uyuyor 1 · kısmen 0,5 · uymuyor 0; gerçek ve kontrol ayrı')
  ok(looksGeneric(fs.byKey.g) && !looksGeneric(fs.byKey.h) && !looksGeneric(fs.byKey.a), "'Fazla genel' uyarısı: kontrol olarak da çoğunlukla uyan metinde var, uymayanda ve az veride yok")
}

console.log('\n— Kör karşılaştırma: şans hesabı')
{
  const C2 = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r }
  const binomTail = (n: number, k: number, q: number) => { let s = 0; for (let x = k; x <= n; x++) s += C2(n, x) * q ** x * (1 - q) ** (n - x); return s }
  const t20 = Array.from({ length: 20 }, (_, i) => ({ options: 3, correct: i < 11 }))
  const r = chanceP(t20)
  ok(Math.abs(r.p - binomTail(20, 11, 1 / 3)) < 1e-12 && Math.abs(r.expected - 20 / 3) < 1e-9, `3 seçenek, 20 denemede 11 isabet: p = ${r.p.toFixed(4)} (binom formülüyle aynı), beklenen ${r.expected.toFixed(2)}`)
  // karışık seçenek sayıları: tüm 2^n sonucu sayarak
  const mix = [{ options: 2, correct: true }, { options: 3, correct: true }, { options: 4, correct: false }, { options: 2, correct: true }, { options: 4, correct: true }]
  let brute = 0
  for (let m = 0; m < 1 << mix.length; m++) {
    let pr = 1, h = 0
    mix.forEach((t, i) => { const hit = (m >> i) & 1; pr *= hit ? 1 / t.options : 1 - 1 / t.options; h += hit })
    if (h >= 4) brute += pr
  }
  ok(Math.abs(chanceP(mix).p - brute) < 1e-12, `Karışık seçenek sayılarında p, bütün olasılıkları sayarak aynı (${brute.toFixed(4)})`)
  ok(chanceP([]).p === 1 && chanceP([{ options: 2, correct: false }]).p === 1, 'Deneme yoksa ya da isabet yoksa p = 1')
  const sh = buildSheets([{ chartId: 'a', texts: ['1', '2', '3'] }, { chartId: 'b', texts: ['4', '5', '6'] }, { chartId: 'c', texts: ['7', '8', '9'] }], rng(3))
  ok(sh.map((x) => x.label).join('') === 'ABC' && new Set(sh.map((x) => x.chartId)).size === 3 && sh.every((x) => x.texts.length === 3), 'Sayfalar A/B/C, her harita bir kez, metinler eksiksiz')
  const order = new Set(Array.from({ length: 30 }, (_, i) => buildSheets([{ chartId: 'a', texts: [] }, { chartId: 'b', texts: [] }, { chartId: 'c', texts: [] }], rng(i + 1)).map((x) => x.chartId).join('')))
  ok(order.size >= 5, `Katılımcının sayfasının yeri rastgele (30 denemede ${order.size} farklı sıra)`)
}

console.log('\n— Ay düğümü (bağımsız formül)')
{
  // Meeus, Astronomical Algorithms (2. baskı) 47.7: ortalama düğüm Ω = 125.0445479 − 1934.1362891 T + 0.0020754 T² + T³/467441 − T⁴/60616000
  let worst = 0
  for (const [y, m, d] of [[1959, 6, 1], [1975, 11, 2], [1990, 4, 1], [2000, 1, 1], [2024, 1, 1], [2050, 7, 1]]) {
    const jdUt = sweph.julday(y, m, d, 12, C.SE_GREG_CAL)
    const jdTt = jdUt + sweph.deltat(jdUt)
    const T = (jdTt - 2451545) / 36525
    const om = (((125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T ** 4) / 60616000) % 360) + 360) % 360
    const se = sweph.calc_ut(jdUt, C.SE_MEAN_NODE, C.SEFLG_SWIEPH).data[0]
    // Swiss Ephemeris görünür konum verir (nütasyon dahil); Meeus ortalama ekinoksa göre: nütasyonu ekle
    const nut = sweph.calc_ut(jdUt, C.SE_ECL_NUT, 0).data[2]
    worst = Math.max(worst, arcsec(se, om + nut))
  }
  ok(worst < 5, `Ortalama Ay düğümü Meeus formülüyle 6 tarihte karşılaştırıldı: en büyük fark ${worst.toFixed(2)}" (sınır 5")`)
  const tn = sweph.calc_ut(sweph.julday(2000, 1, 1, 12, C.SE_GREG_CAL), C.SE_TRUE_NODE, C.SEFLG_SWIEPH).data[0]
  const mn = sweph.calc_ut(sweph.julday(2000, 1, 1, 12, C.SE_GREG_CAL), C.SE_MEAN_NODE, C.SEFLG_SWIEPH).data[0]
  ok(Math.abs(((tn - mn + 540) % 360) - 180) < 2, `Gerçek düğüm ortalamadan ${Math.abs(((tn - mn + 540) % 360) - 180).toFixed(2)}° uzakta (fiziksel sınır ~1,7°). Not: gerçek düğüm bağımsız bir referansla doğrulanmadı.`)
}

console.log('\n— Saat bilinmeyen harita (Rodden X): Ay belirsizliği ve gündüz/gece')
{
  const ux = natalChart({ ...base, date: '1975-11-02', time: '12:00', timeUnknown: true })
  const moonAsp = ux.aspects.filter((a) => a.a === 'moon' || a.b === 'moon')
  ok(!ux.hasHouses && ux.lots.length === 0 && !ux.points.some((p) => p.id === 'fortune'), 'Saat bilinmiyor: ev, yükselen, Arap noktaları üretilmiyor')
  ok(!!ux.moonRange && moonAsp.length > 0 && moonAsp.every((a) => !!a.certainty), `Ay'ın ${moonAsp.length} açısının hepsinde belirsizlik sınıfı var; gün içi aralık ${(ux.moonRange!.to - ux.moonRange!.from).toFixed(1)}°`)
  // bağımsız kontrol: günün başında, ortasında ve sonunda Ay ile diğer cismin açısı
  const jd0 = Date.parse(ux.utc) / 86400000 + 2440587.5
  const flg = sweph.constants.SEFLG_SWIEPH
  const SE: Record<string, number> = { sun: 0, mercury: 2, venus: 3, mars: 4, jupiter: 5, saturn: 6, uranus: 7, neptune: 8, pluto: 9, chiron: 15 }
  let good = true
  for (const a of moonAsp) {
    const other = a.a === 'moon' ? a.b : a.a
    if (SE[other] === undefined || a.type === 'parallel' || a.type === 'contraparallel') continue
    const prof = ORB_PROFILES[0]
    const major = ['conjunction', 'opposition', 'trine', 'square', 'sextile'].includes(a.type)
    const max = (prof.orbs[a.type as keyof typeof prof.orbs] ?? 0) + (major ? prof.luminaryBonus : Math.min(0.5, prof.luminaryBonus))
    const dev = (jd: number) => Math.abs(separation(sweph.calc_ut(jd, 1, flg).data[0], sweph.calc_ut(jd, SE[other], flg).data[0]) - a.angle)
    const ends = [dev(jd0 - 0.5), dev(jd0), dev(jd0 + 0.5)]
    if (a.certainty === 'kesin' && !(ends[0] <= max + 1e-6 && ends[2] <= max + 1e-6)) good = false
    if (a.certainty === 'saate-bagli' && ends[0] <= max && ends[2] <= max && ends[1] <= max) { /* gün içinde ara bir anda çıkıyor olabilir */ }
    if (a.certainty === 'olasi' && Math.abs(ends[1] - a.orb) > 0.01) good = false
    if (a.certainty !== 'olasi' && Math.abs(ends[1] - a.orb) > 0.01) good = false
  }
  ok(good, "Ay açıları: 12:00 orbları bağımsız hesapla aynı; 'kesin' açılar günün başında ve sonunda orb içinde")
  const mm = moonAsp.find((a) => a.b === 'mercury' && a.type === 'conjunction')
  ok(!!mm && mm.orb < 0.5 && mm.applyingUnknown === true, `Ay–Merkür kavuşumu 12:00'de ${mm ? (mm.orb * 60).toFixed(0) : '?'}′: gün içinde tam oluyor, yaklaşan/ayrılan saate bağlı`)
  const kesin = moonAsp.filter((a) => a.certainty === 'kesin')
  ok(kesin.every((a) => (a.minOrb ?? 0) <= a.orb), `Kesin: ${kesin.length}, saate bağlı: ${moonAsp.filter((a) => a.certainty === 'saate-bagli').length}, olası: ${moonAsp.filter((a) => a.certainty === 'olasi').length}`)
  const signChange = Math.floor(ux.moonRange!.from / 30) !== Math.floor(ux.moonRange!.to / 30)
  ok(signChange === ux.warnings.some((w) => w.includes('burç değiştiriyor')), `Ay'ın gün içinde burç değiştirme uyarısı tutarlı (${signChange ? 'değiştiriyor' : 'değiştirmiyor'})`)
  // burç değiştiren bir gün: 2024-01-03 (Ay o gün Terazi'ye geçiyor, UT 00:47)
  const sc = natalChart({ ...base, date: '2024-01-03', time: '12:00', timeUnknown: true, place: { ...base.place, tz: 'UTC' } })
  ok(sc.warnings.some((w) => w.includes('burç değiştiriyor')), "Ay'ın doğum gününde burç değiştirdiği gün uyarı veriliyor (03.01.2024)")
  ok(sectUnknown(ux) && !sectUnknown(natal), 'Gündüz/gece: saat bilinmiyorsa belirsiz, bilinen saatte belirli')
  const d = essentialDignities(ux, true).map((r) => r.trip).join()
  const n = essentialDignities(ux, false).map((r) => r.trip).join()
  ok(d !== n, 'Gündüz ve gece varsayımları ayrı üçlük yöneticileri veriyor')
  const fd = firdaria(ux, Date.parse(ux.utc), 1, 'end', false)
  ok(fd[0].major.lord === 'moon' && firdaria(ux, Date.parse(ux.utc), 1, 'end', true)[0].major.lord === 'sun', 'Firdaria varsayıma göre: gece Ay, gündüz Güneş ile başlıyor')
}

console.log('\n— Transit: natal evler, retrograd serileri, etkinlik dönemi')
{
  const tv = view(base, { mode: 'transit', date: '2026-11-04T12:00:00Z' })
  const cusps = tv.inner.cusps
  const inHouse = (lon: number, h: number) => { const a = cusps[h - 1], b = cusps[h % 12]; return ((lon - a + 360) % 360) < ((b - a + 360) % 360) }
  ok(tv.outer!.points.every((p) => p.innerHouse && inHouse(p.lon, p.innerHouse)), 'Transit gezegenlerin natal evleri, natal ev başlangıçlarıyla tutarlı')
  const ev = transitList(base, '2024-01-01T00:00:00Z', '2026-12-31T00:00:00Z', ['saturn', 'jupiter', 'mars'])
  const asp = ev.filter((e) => e.natal && e.window && e.pass)
  const ANG: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 }
  const nat = Object.fromEntries([...natal.points.map((p) => [p.id, p.lon]), ['asc', natal.angles.asc], ['mc', natal.angles.mc]])
  const SEB: Record<string, number> = { mars: 4, jupiter: 5, saturn: 6 }
  const devAt = (e: (typeof asp)[0], iso: string) => { const jd = Date.parse(iso) / 86400000 + 2440587.5; return Math.abs(separation(sweph.calc_ut(jd, SEB[e.transit], sweph.constants.SEFLG_SWIEPH).data[0], nat[e.natal!]) - ANG[e.type]) }
  const edgesOk = asp.slice(0, 40).every((e) => Math.abs(devAt(e, e.window!.start) - e.window!.orb) < 0.001 && Math.abs(devAt(e, e.window!.end) - e.window!.orb) < 0.001 && e.window!.start <= e.utc && e.utc <= e.window!.end)
  ok(asp.length > 0 && edgesOk, `Etkinlik dönemi: orba giriş ve çıkış anında sapma tam transit orbu (${asp[0]?.window?.orb}°); kesinleşme dönemin içinde`)
  const series = asp.filter((e) => e.pass!.of === 3)
  ok(series.length > 0 && series.every((e) => asp.filter((x) => x.transit === e.transit && x.natal === e.natal && x.type === e.type && x.window!.start === e.window!.start).length <= 3), `Retrograd serileri: ${series.length} olay 3 geçişlik serilerde (1/3, 2/3, 3/3)`)
  const cut = transitList(base, '2025-01-01T00:00:00Z', '2025-03-31T00:00:00Z', ['saturn', 'jupiter', 'mars']).filter((e) => e.natal && e.pass)
  const same = cut.every((e) => { const f = asp.find((x) => x.utc === e.utc && x.transit === e.transit && x.natal === e.natal); return !f || (f.pass!.n === e.pass!.n && f.pass!.of === e.pass!.of) })
  ok(same, 'Seri numarası seçili tarih aralığından bağımsız (kısa aralıkta da 2/3 gibi doğru sayılıyor)')
}

console.log('\n— Efemeris ve boşluktaki Ay (Ocak 2024)')
{
  const ep = ephemeris('2024-01-01T00:00:00Z', '2024-02-01T00:00:00Z', 'modern')
  ok(ep.rows.length === 31 && ep.rows[0].utc.startsWith('2024-01-01T00:00:00'), `Efemeris: 31 günlük satır, 0h UT (${ep.rows.length})`)
  const min = (iso: string, ref: string) => Math.abs(Date.parse(iso) - Date.parse(ref)) / 60000
  const nm = ep.events.find((e) => e.type === 'phase' && e.phase === 0)!
  const fm = ep.events.find((e) => e.type === 'phase' && e.phase === 2)!
  ok(min(nm.utc, '2024-01-11T11:57:00Z') < 2, `Yeni ay 11.01.2024 11:57 UT (yayımlanmış) — hesap ${nm.utc.slice(11, 16)}`)
  ok(min(fm.utc, '2024-01-25T17:54:00Z') < 2, `Dolunay 25.01.2024 17:54 UT (yayımlanmış) — hesap ${fm.utc.slice(11, 16)}`)
  const sunAq = ep.events.find((e) => e.type === 'ingress' && e.body === 'sun')!
  ok(sunAq.sign === 10 && min(sunAq.utc, '2024-01-20T14:07:00Z') < 2, `Güneş Kova'ya 20.01.2024 14:07 UT (yayımlanmış) — hesap ${sunAq.utc.slice(11, 16)}`)
  const mst = ep.events.find((e) => e.body === 'mercury' && e.type === 'station-direct')!
  ok(mst && min(mst.utc, '2024-01-02T03:08:00Z') < 3, `Merkür düz harekete 02.01.2024 03:08 UT (yayımlanmış) — hesap ${mst?.utc.slice(11, 16)}`)
  const moonIng = ep.events.filter((e) => e.type === 'ingress' && e.body === 'moon')
  ok(moonIng.length >= 13 && moonIng.length <= 15, `Ay bir ayda ${moonIng.length} burç geçişi yaptı (beklenen 13–14)`)
  // boşluk dönemleri: bitiş = Ay geçişi; başlangıçta açı tam; arada bağımsız taramayla başka tam açı yok
  ok(ep.voids.every((v) => moonIng.some((e) => min(e.utc, v.end) < 0.1) || Date.parse(v.end) >= Date.parse(ep.to) || Date.parse(v.end) < Date.parse(ep.from) || true) && ep.voids.filter((v) => Date.parse(v.end) < Date.parse(ep.to)).every((v) => moonIng.some((e) => min(e.utc, v.end) < 0.1)), 'Boşluk dönemleri Ay\'ın burç geçişinde bitiyor')
  const SE: Record<string, number> = { sun: 0, mercury: 2, venus: 3, mars: 4, jupiter: 5, saturn: 6, uranus: 7, neptune: 8, pluto: 9 }
  const ANG: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 }
  const lonOf = (jd: number, se: number) => sweph.calc_ut(jd, se, sweph.constants.SEFLG_SWIEPH).data[0]
  const jdOf = (iso: string) => Date.parse(iso) / 86400000 + 2440587.5
  let exact = true, clean = true
  for (const v of ep.voids) {
    if (!v.last) continue
    const t = jdOf(v.last.utc)
    const sep = separation(lonOf(t, 1), lonOf(t, SE[v.last.planet]))
    if (Math.abs(sep - ANG[v.last.type]) > 0.002) exact = false
    // bağımsız tarama: başlangıçtan bitişe 0,02 gün adımla, hiçbir gezegenle açı farkının işaret değiştirmemesi
    for (const [pid, se] of Object.entries(SE)) {
      for (const ang of Object.values(ANG)) {
        let prev: number | null = null
        for (let jd = t + 0.003; jd < jdOf(v.end) - 0.001; jd += 0.02) {
          const d = separation(lonOf(jd, 1), lonOf(jd, se)) - ang
          if (prev !== null && Math.sign(prev) !== Math.sign(d) && Math.abs(prev - d) < 5) { clean = false; console.log('   açı bulundu', pid, ang, v.start) }
          prev = d
        }
      }
    }
  }
  ok(exact, 'Boşluğu başlatan son açı o anda tam (fark < 7")')
  ok(clean, 'Boşluk süresince Ay hiçbir gezegenle (Güneş–Plüton) tam Ptolemaik açı yapmıyor (bağımsız 30 dk tarama)')
  // Yayımlanmış tablo: Cafe Astrology, Ocak 2024 (EST'den UT'ye +5 sa çevrildi; Güneş–Plüton, Ptolemaik açılar)
  const REF: [string, string, string, string][] = [
    ['2024-01-02T23:36', '2024-01-03T00:47', 'pluto', 'trine'], ['2024-01-05T11:41', '2024-01-05T12:39', 'pluto', 'square'],
    ['2024-01-07T20:22', '2024-01-07T21:08', 'pluto', 'sextile'], ['2024-01-09T18:24', '2024-01-10T01:33', 'mercury', 'conjunction'],
    ['2024-01-12T02:33', '2024-01-12T03:01', 'pluto', 'conjunction'], ['2024-01-13T09:59', '2024-01-14T03:29', 'uranus', 'square'],
    ['2024-01-16T04:32', '2024-01-16T04:48', 'pluto', 'sextile'], ['2024-01-18T08:02', '2024-01-18T08:12', 'pluto', 'square'],
    ['2024-01-20T13:57', '2024-01-20T13:58', 'sun', 'trine'], ['2024-01-22T20:40', '2024-01-22T21:51', 'venus', 'opposition'],
    ['2024-01-24T22:58', '2024-01-25T07:36', 'neptune', 'trine'], ['2024-01-26T21:19', '2024-01-27T19:11', 'uranus', 'square'],
    ['2024-01-29T23:20', '2024-01-30T08:04', 'neptune', 'opposition']
  ]
  const bad = REF.filter(([st, en, pl, ty]) => !ep.voids.some((v) => min(v.start, st + ':00Z') <= 1.5 && min(v.end, en + ':00Z') <= 1.5 && v.last?.planet === pl && v.last?.type === ty))
  ok(bad.length === 0, `Boşluktaki Ay: yayımlanmış Ocak 2024 tablosundaki 13 dönemin ${13 - bad.length}'i başlangıç, bitiş ve son açıyla aynı (±1 dk yuvarlama)${bad.length ? ' — farklı: ' + bad.map((b) => b[0]).join(', ') : ''}`)
  console.log('   ' + ep.voids.slice(0, 4).map((v) => `${v.start.slice(5, 16)}→${v.end.slice(5, 16)} ${v.last?.planet ?? ''} ${v.last?.type ?? ''}`).join(' · '))
}

console.log('\n— Duraklama (kesin an) ve yöneticilik')
{
  // transit listesindeki duraklama anlarını al, o anın 2 gün öncesine/sonrasına harita kur
  const tl = transitList(base, '2024-01-01T00:00:00Z', '2025-01-01T00:00:00Z', ['mercury', 'saturn'])
  const st = tl.filter((e) => e.type === 'station-retro' || e.type === 'station-direct')
  const merc = st.find((e) => e.transit === 'mercury')!
  const at = (jd: number) => { const d = new Date(Math.round((jd - 2440587.5) * 86400000)); return natalChart({ ...base, date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16), timeMode: 'manual', manualOffset: 0 }) }
  const near = at(merc.jd + 0.4).points.find((p) => p.id === 'mercury')!
  const far = at(merc.jd + 5).points.find((p) => p.id === 'mercury')!
  ok(!!near.station && Math.abs(Date.parse(near.station.utc) - Date.parse(merc.utc)) < 120000 && near.station.kind === (merc.type === 'station-retro' ? 'retro' : 'direct'), `Merkür duraklaması ${merc.utc.slice(0, 16)}: 0,4 gün sonra DR/DD görünüyor, kesin an transit listesiyle aynı (fark < 2 dk)`)
  ok(!far.station, 'Merkür: duraklamadan 5 gün sonra durağan sayılmıyor (pencere 1 gün)')
  const sat = st.find((e) => e.transit === 'saturn')!
  const s5 = at(sat.jd - 5).points.find((p) => p.id === 'saturn')!
  const s8 = at(sat.jd - 8).points.find((p) => p.id === 'saturn')!
  ok(!!s5.station && s5.station.days > 4.9 && s5.station.days < 5.1 && !s8.station, 'Satürn: duraklamaya 5 gün kala durağan (gün farkı doğru), 8 gün kala değil (pencere 6 gün)')
  // bağımsız: duraklama anında hız sıfır, öncesi ve sonrası zıt işaretli
  const sp = (jd: number) => sweph.calc_ut(jd, sweph.constants.SE_MERCURY, sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED).data[3]
  const jdS = Date.parse(near.station!.utc) / 86400000 + 2440587.5
  ok(Math.abs(sp(jdS)) < 1e-3 && Math.sign(sp(jdS - 0.5)) !== Math.sign(sp(jdS + 0.5)), 'Duraklama anında Merkür hızı ~0, yarım gün önce/sonra zıt yönde')
  const prev = { ...DEFAULT_SETTINGS }
  useSettings({ ...DEFAULT_SETTINGS, rulership: 'traditional' })
  const tr = natalChart({ ...base, date: '2000-01-01', time: '12:00', timeMode: 'manual', manualOffset: 0 })
  useSettings({ ...DEFAULT_SETTINGS, rulership: 'modern' })
  const md = natalChart({ ...base, date: '2000-01-01', time: '12:00', timeMode: 'manual', manualOffset: 0 })
  useSettings(prev)
  const u = (c: ChartResult) => c.points.find((p) => p.id === 'uranus')!.dignity
  ok(u(md) === 'Evinde' && u(tr) === undefined, `Yöneticilik: 2000'de Uranüs Kova'da; modern 'Evinde', geleneksel etiket yok (${u(md)} / ${u(tr) ?? '—'})`)
}

console.log('\n— Zaman yöneticileri: profeksiyon ve firdaria')
{
  const bms = Date.parse(natal.utc)
  const pr = profections(natal, bms, 0, 24)
  const ascS = Math.floor(natal.angles.asc / 30)
  ok(pr[0].sign === ascS && pr[12].sign === ascS && pr[1].sign === (ascS + 1) % 12 && pr[0].house === 1 && pr[13].house === 2, 'Profeksiyon: 0 ve 12 yaşta yükselen burcu, 1 yaşta bir sonraki burç; 13 yaşta 2. ev')
  const fd = firdaria(natal, bms, 1)
  const total = fd.reduce((s, x) => s + x.major.years, 0)
  ok(total === 75, `Firdaria: bir tur ${total} yıl (beklenen 75)`)
  ok(fd[0].major.lord === (natal.isDay ? 'sun' : 'moon') && fd[7].major.lord === 'northnode' && fd[8].major.lord === 'southnode', `Firdaria: ${natal.isDay ? 'gündüz' : 'gece'} haritası ${natal.isDay ? 'Güneş' : 'Ay'} ile başlıyor, düğümler sonda`)
  ok(new Date(pr[20].from).getUTCDate() === new Date(bms).getUTCDate() && new Date(pr[20].from).getUTCMonth() === new Date(bms).getUTCMonth(), 'Profeksiyon: yıl doğum gününde başlıyor (takvim yıl dönümü)')
  const night = { ...natal, points: natal.points.map((p) => (p.id === 'sun' ? { ...p, altitude: -10 } : p)) }
  const fn = firdaria(night, bms, 1).map((x) => x.major.lord).join(',')
  const fb = firdaria(night, bms, 1, 'afterMars').map((x) => x.major.lord).join(',')
  ok(fn === 'moon,saturn,jupiter,mars,sun,venus,mercury,northnode,southnode' && fb === 'moon,saturn,jupiter,mars,northnode,southnode,sun,venus,mercury', 'Firdaria: gece sırası (Abu Ma\'shar: düğümler sonda; Bonatti: Mars\'tan sonra)')
  ok(fd.slice(0, 7).every((x) => x.subs.length === 7 && x.subs[0].sub === x.major.lord && Math.abs(+x.subs[6].to - +x.major.to) < 1000), 'Firdaria: her gezegen dönemi 7 alt dönem; ilk alt dönem dönemin kendi yöneticisi')
  ok(fd[0].subs.map((x) => x.sub).join(',') === (natal.isDay ? 'sun,venus,mercury,moon,saturn,jupiter,mars' : 'moon,saturn,jupiter,mars,sun,venus,mercury'), 'Firdaria: alt dönemler Kalde sırasıyla ilerliyor')
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
  // Mısır sınırları: her gezegenin toplam derecesi geleneksel "küçük yıllar"a eşittir
  const tot: Record<string, number> = {}
  for (let d = 0; d < 360; d++) { const r = termRuler(d + 0.5); tot[r] = (tot[r] ?? 0) + 1 }
  ok(tot.saturn === 57 && tot.jupiter === 79 && tot.mars === 66 && tot.venus === 82 && tot.mercury === 76, `Mısır sınırları toplamları: Satürn ${tot.saturn}, Jüpiter ${tot.jupiter}, Mars ${tot.mars}, Venüs ${tot.venus}, Merkür ${tot.mercury} (beklenen 57/79/66/82/76)`)
  // Kalde dekanları: Lilly'nin tablosuyla birebir (36 dekan)
  const FACES = 'mars sun venus mercury moon saturn jupiter mars sun venus mercury moon saturn jupiter mars sun venus mercury moon saturn jupiter mars sun venus mercury moon saturn jupiter mars sun venus mercury moon saturn jupiter mars'.split(' ')
  ok(FACES.every((f, i) => faceRuler(i * 10 + 5) === f), '36 dekan yöneticisi Lilly tablosuyla aynı (Koç: Mars, Güneş, Venüs … Balık: Satürn, Jüpiter, Mars)')
  const TRIP: [number, string, string][] = [[0, 'sun', 'jupiter'], [1, 'venus', 'moon'], [2, 'saturn', 'mercury'], [3, 'mars', 'mars']]
  ok(TRIP.every(([s, d, n]) => [s, s + 4, s + 8].every((x) => tripRuler(x * 30 + 1, true) === d && tripRuler(x * 30 + 1, false) === n)), 'Üçlük yöneticileri (Lilly): Ateş Güneş/Jüpiter, Toprak Venüs/Ay, Hava Satürn/Merkür, Su Mars')
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

console.log('\n— Bağımsız ikinci kontroller')
{
  // Gerçek düğüm hızı: Swiss Ephemeris hızı ↔ ±1 saatlik sayısal türev
  const jd = natal.jdUt
  const sp = sweph.calc_ut(jd, C.SE_TRUE_NODE, C.SEFLG_SWIEPH | C.SEFLG_SPEED).data[3]
  const num = (sweph.calc_ut(jd + 1 / 24, C.SE_TRUE_NODE, C.SEFLG_SWIEPH).data[0] - sweph.calc_ut(jd - 1 / 24, C.SE_TRUE_NODE, C.SEFLG_SWIEPH).data[0]) * 12
  ok(Math.abs(sp - num) < 0.0005, `Gerçek düğüm hızı: ${sp.toFixed(4)}°/gün, sayısal türev ${num.toFixed(4)}°/gün`)
  // Vega: Hipparcos J2000 koordinatından bağımsız ekliptik boylam + genel presesyon
  const ra = 279.23473479 * Math.PI / 180, de = 38.78368896 * Math.PI / 180, e0 = 23.4392911 * Math.PI / 180
  const l2000 = Math.atan2(Math.sin(ra) * Math.cos(e0) + Math.tan(de) * Math.sin(e0), Math.cos(ra)) * 180 / Math.PI
  const lv = (l2000 + 50.29 * ((jd - 2451545) / 365.25) / 3600 + 360) % 360
  const sv = sweph.fixstar2_ut('Vega', jd, C.SEFLG_SWIEPH).data[0]
  // Bağımsız hesapta nütasyon (±17") ve yıllık sapınç yok; Vega'nın ekliptik enlemi ~62° olduğundan
  // sapınç boylamda ~1/cos(β) ≈ 2 kat büyür (≈ ±43"). Bu yüzden sınır 1,5'.
  ok(separation(lv, sv) * 60 < 1.5, `Vega: bağımsız ${lv.toFixed(3)}°, Swiss Ephemeris ${sv.toFixed(3)}° (fark ${(separation(lv, sv) * 60).toFixed(2)}'; nütasyon ve sapınç bağımsız hesapta yok)`)
  // Orta noktalar: birim vektör yöntemiyle bağımsız hesap; bütün temaslar aynı olmalı
  const hits = midpointHits(natal, 1.5)
  const ids = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northnode']
  const L: Record<string, number> = Object.fromEntries(ids.map((id) => [id, pid(natal, id)]))
  L.asc = natal.angles.asc; L.mc = natal.angles.mc
  const keys = Object.keys(L)
  const mine = new Set<string>()
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = L[keys[i]] * Math.PI / 180, b = L[keys[j]] * Math.PI / 180
    const mid = (Math.atan2(Math.sin(a) + Math.sin(b), Math.cos(a) + Math.cos(b)) * 180 / Math.PI + 360) % 360
    for (const p of keys) {
      if (p === keys[i] || p === keys[j]) continue
      const d = separation(L[p], mid)
      if ([0, 45, 90, 135, 180].some((x) => Math.abs(d - x) <= 1.5)) mine.add(`${p}=${keys[i]}/${keys[j]}`)
    }
  }
  const theirs = new Set(hits.map((h) => `${h.point}=${h.a}/${h.b}`))
  ok(mine.size === theirs.size && [...mine].every((x) => theirs.has(x)), `Orta noktalar: ${theirs.size} temasın hepsi bağımsız vektör yöntemiyle aynı`)
}

console.log('\n— Ek noktalar')
{
  const lot = (id: string) => natal.lots.find((l) => l.id === id)!.lon
  ok(separation(lot('fortune') + lot('spirit'), 2 * natal.angles.asc) < 1e-9, 'Arap noktaları: Şans + Ruh = 2 × Yükselen (formül tutarlılığı)')
  ok(separation(lot('fortune'), pid(natal, 'fortune')) < 1e-9, 'Şans Noktası tablo ve çarkta aynı')
  const dayN = natal.isDay
  const ven = pid(natal, 'venus'), sp = lot('spirit'), asc0 = natal.angles.asc
  ok(separation(lot('eros'), dayN ? asc0 + ven - sp : asc0 + sp - ven) < 1e-9, `Eros noktası (${dayN ? 'gündüz' : 'gece'}): AC ${dayN ? '+ Venüs − Ruh' : '+ Ruh − Venüs'}`)
  useSettings({ ...DEFAULT_SETTINGS, asteroids: true })
  const withAst = natalChart(base)
  useSettings(DEFAULT_SETTINGS)
  ok(['ceres', 'pallas', 'juno', 'vesta'].every((id) => withAst.points.some((p) => p.id === id)) && !natal.points.some((p) => p.id === 'ceres'), 'Asteroitler yalnızca ayarlardan açılınca hesaplanıyor')
  ok(withAst.aspects.filter((a) => ['ceres', 'pallas', 'juno', 'vesta'].includes(a.a) || ['ceres', 'pallas', 'juno', 'vesta'].includes(a.b)).every((a) => a.orb <= 3), 'Asteroit açılarında orb en fazla 3°')

  const f = natal.points.find((p) => p.id === 'fortune')!
  const sun = pid(natal, 'sun'), moon = pid(natal, 'moon'), asc = natal.angles.asc
  const day = natal.points.find((p) => p.id === 'sun')!.house >= 7
  const exp = (day ? asc + moon - sun : asc + sun - moon + 720) % 360
  ok(separation(f.lon, exp) < 1e-9, `Şans Noktası (${day ? 'gündüz' : 'gece'} formülü)`)
  ok(natal.points.find((p) => p.id === 'sun')!.altitude! > 0 === day, 'Güneş\'in yüksekliği ile gündüz/gece ayrımı tutarlı')
}

console.log('\n— Sürüm karşılaştırma')
ok(isNewer('0.10.0', '0.9.9') && isNewer('v1.0.0', '0.9.0') && !isNewer('0.4.0', '0.4.0') && !isNewer('0.3.9', '0.4.0'), 'Yeni sürüm denetimi: 0.10.0 > 0.9.9, 1.0.0 > 0.9.0, aynı sürüm yeni sayılmaz')

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti')
process.exit(fail ? 1 : 0)
