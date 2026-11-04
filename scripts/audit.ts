// Ayrıntılı veri denetimi: örnek haritadaki her değeri bağımsız bir kaynakla karşılaştırır.
// Örnek A (uydurma kişi): 14.07.1988 06:45, Kadıköy (40.9823 K, 29.0903 D) → 03:45 UT
// Kaynaklar: NASA JPL Horizons (boylam, enlem, RA, Dec); sayısal türev (hız); ders kitabı ev formülleri.
// Kullanım: npm run denetim
import sweph from 'sweph'
import { join } from 'node:path'
import { initEphemeris, natalChart, transitList, useSettings } from '../src/main/engine'
import { DEFAULT_SETTINGS, ASPECTS, separation, norm360, signOf } from '../src/shared/zodiac'
import type { ChartInput, HouseSystem } from '../src/shared/types'

initEphemeris(join(process.cwd(), 'resources/ephe'))
useSettings({ ...DEFAULT_SETTINGS, asteroids: true, showParallels: false })
const C = sweph.constants
const R = Math.PI / 180
const D = 180 / Math.PI
let fail = 0
const row = (ok: boolean, txt: string) => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${txt}`) }
const s1 = (a: number, b: number) => (separation(a, b) * 3600)

const input: ChartInput = {
  name: 'Örnek A', date: '1988-07-14', time: '06:45', timeMode: 'zone', houseSystem: 'P', nodeType: 'true',
  place: { name: 'Kadıköy', region: 'İstanbul', country: 'Türkiye', lat: 40.9823, lon: 29.0903, tz: 'Europe/Istanbul' }
}
const c = natalChart(input)
console.log(`Harita: ${c.utc} · JD ${c.jdUt.toFixed(6)} UT · ε ${c.obliquity.toFixed(6)}°`)

// ——— 1. Konumlar: NASA JPL Horizons (1988-07-14 03:45 UT; RA/Dec görünür, ekliptik boylam/enlem of-date) ———
const JPL: Record<string, [number, number, number, number]> = { // ra, dec, lon, lat
  sun: [113.685908638, 21.658251501, 111.9230891, 0.0000371], moon: [117.391257803, 25.070886936, 114.6900302, 3.9454811],
  mercury: [92.838571996, 22.029218028, 92.6319567, -1.3879631], venus: [74.901061846, 17.782272824, 75.5843446, -4.9083117],
  mars: [1.732569172, -3.616259503, 0.1487803, -4.0066248], jupiter: [56.580933452, 18.956874044, 58.6037338, -0.9173704],
  saturn: [267.384903113, -22.323187489, 267.5805655, 1.0979641], uranus: [267.942261287, -23.644590584, 268.1150586, -0.2149405],
  neptune: [279.125184346, -22.184561699, 278.4458053, 0.9913751], pluto: [222.420672963, 0.647820426, 219.7694483, 16.1841406],
  chiron: [92.192147112, 17.778377685, 92.0976035, -5.6487747], ceres: [6.208822592, -11.151473104, 1.1986683, -12.6887043]
}
console.log('\n1) Konumlar — NASA JPL ile (fark yay saniyesi)')
console.log('   Cisim      boylam   enlem    RA      Dec')
for (const [id, [ra, dec, lon, lat]] of Object.entries(JPL)) {
  const p = c.points.find((x) => x.id === id)!
  const d = [s1(p.lon, lon), Math.abs(p.lat - lat) * 3600, s1(p.ra!, ra), Math.abs(p.declination - dec) * 3600]
  const lim = id === 'chiron' || id === 'ceres' ? 3 : 1
  row(d.every((x) => x < lim), `${p.name.padEnd(10)} ${d.map((x) => x.toFixed(2).padStart(6)).join('  ')}   (sınır ${lim}")`)
}

// ——— 2. Hız ve geri hareket: ±1 saatlik sayısal türev ———
console.log('\n2) Hız ve retro — sayısal türevle')
const SE: Record<string, number> = { sun: 0, moon: 1, mercury: 2, venus: 3, mars: 4, jupiter: 5, saturn: 6, uranus: 7, neptune: 8, pluto: 9, chiron: C.SE_CHIRON, ceres: C.SE_CERES, lilith: C.SE_MEAN_APOG, northnode: C.SE_TRUE_NODE }
for (const [id, se] of Object.entries(SE)) {
  const p = c.points.find((x) => x.id === id)!
  const l = (t: number) => sweph.calc_ut(c.jdUt + t, se, C.SEFLG_SWIEPH).data[0]
  let num = (l(1 / 24) - l(-1 / 24)) * 12
  if (num > 180) num -= 360 * 12
  if (num < -180) num += 360 * 12
  const tol = id === 'moon' ? 0.002 : 0.0005
  row(Math.abs(num - p.speed) < tol && p.retro === p.speed < 0, `${p.name.padEnd(22)} hız ${p.speed.toFixed(5).padStart(9)} · türev ${num.toFixed(5).padStart(9)} · retro ${p.retro ? 'evet' : 'hayır'}`)
}

// ——— 3. Ev sistemleri: bağımsız formüller (RAMC ve ε Swiss Ephemeris'ten; ev formülleri ayrı) ———
console.log('\n3) Ev başlangıçları — bağımsız formüllerle (en büyük fark, yay saniyesi)')
const th = c.angles.armc
const ph = input.place.lat
const ep = c.obliquity
const atan2d = (y: number, x: number) => norm360(Math.atan2(y, x) * D)
/** Kutup yüksekliği p olan ev dairesinin, ekvatorda RA = r noktasından geçerken ekliptiği kestiği boylam */
const cuspAt = (r: number, p: number) => atan2d(Math.sin(r * R), Math.cos(r * R) * Math.cos(ep * R) - Math.tan(p * R) * Math.sin(ep * R))
const raToLon = (a: number) => atan2d(Math.sin(a * R), Math.cos(a * R) * Math.cos(ep * R))
const decOf = (l: number) => Math.asin(Math.sin(ep * R) * Math.sin(l * R)) * D
const adOf = (l: number) => { const x = Math.tan(ph * R) * Math.tan(decOf(l) * R); return Math.abs(x) >= 1 ? NaN : Math.asin(x) * D }
const MC = raToLon(th)
const ASC = cuspAt(th + 90, ph)
const fill = (c10: number, c11: number, c12: number, c1: number, c2: number, c3: number) => [c1, c2, c3, norm360(c10 + 180), norm360(c11 + 180), norm360(c12 + 180), norm360(c1 + 180), norm360(c2 + 180), norm360(c3 + 180), c10, c11, c12]
const sys: Record<string, () => number[]> = {
  E: () => Array.from({ length: 12 }, (_, i) => norm360(ASC + 30 * i)),
  W: () => Array.from({ length: 12 }, (_, i) => norm360(signOf(ASC) * 30 + 30 * i)),
  O: () => { const q1 = norm360(ASC - MC) / 3, q2 = norm360(norm360(MC + 180) - ASC) / 3; return fill(MC, MC + q1, MC + 2 * q1, ASC, ASC + q2, ASC + 2 * q2).map(norm360) },
  X: () => Array.from({ length: 12 }, (_, i) => raToLon(th + 30 * (i - 9))),
  // Morinus: ekvator RAMC+90'dan (1. ev) başlayarak 30°'lik parçalara bölünür; ekliptik kutuplarından geçen dairelerle taşınır
  M: () => Array.from({ length: 12 }, (_, i) => { const a = (th + 90 + 30 * i) * R; return atan2d(Math.sin(a) * Math.cos(ep * R), Math.cos(a)) }),
  R: () => { const p = (h: number) => Math.atan(Math.tan(ph * R) * Math.sin(h * R)) * D; return fill(MC, cuspAt(th + 30, p(30)), cuspAt(th + 60, p(60)), ASC, cuspAt(th + 120, p(60)), cuspAt(th + 150, p(30))) },
  T: () => { const p = (f: number) => Math.atan(Math.tan(ph * R) * f) * D; return fill(MC, cuspAt(th + 30, p(1 / 3)), cuspAt(th + 60, p(2 / 3)), ASC, cuspAt(th + 120, p(2 / 3)), cuspAt(th + 150, p(1 / 3))) },
  C: () => {
    const cus = (h: number) => { const a = Math.atan2(Math.sin(h * R) * Math.cos(ph * R), Math.cos(h * R)) * D; const p = Math.asin(Math.sin(ph * R) * Math.sin(h * R)) * D; return cuspAt(th + a, p) }
    return fill(MC, cus(30), cus(60), ASC, cus(120), cus(150))
  },
  P: () => {
    // yarı-yay üçlemesi: 11/12 gündüz yayından, 2/3 gece yayından; yinelemeli
    const solve = (f: (l: number) => number, start: number) => { let l = start; for (let k = 0; k < 100; k++) l = raToLon(f(l)); return l }
    const c11 = solve((l) => th + (90 + adOf(l)) / 3, MC + 30)
    const c12 = solve((l) => th + (2 * (90 + adOf(l))) / 3, MC + 60)
    const c2 = solve((l) => th + 180 - (2 * (90 - adOf(l))) / 3, ASC + 30)
    const c3 = solve((l) => th + 180 - (90 - adOf(l)) / 3, ASC + 60)
    return fill(MC, c11, c12, ASC, c2, c3)
  },
  K: () => {
    // Koch (doğum yeri sistemi): MC derecesinin gündüz yarı-yayı (DSA) üçe bölünür. 11 ve 12, RAMC'den 2/3 ve 1/3 DSA
    // geriye; 2 ve 3, aynı aralıklarla ileriye kayan zamanların yükselenidir (kutup = doğum enlemi)
    const dsa = 90 + adOf(MC)
    const asc = (t: number) => cuspAt(t + 90, ph)
    return fill(MC, asc(th - (2 * dsa) / 3), asc(th - dsa / 3), ASC, asc(th + dsa / 3), asc(th + (2 * dsa) / 3))
  },
  B: () => {
    // Alcabitius: yükselenin gündüz yarı-yayı ekvatorda üçe bölünür, saat daireleriyle ekliptiğe taşınır
    const dsa = 90 + adOf(ASC), nsa = 180 - dsa
    return fill(MC, raToLon(th + dsa / 3), raToLon(th + (2 * dsa) / 3), ASC, raToLon(th + dsa + nsa / 3), raToLon(th + dsa + (2 * nsa) / 3))
  }
}
const NAMES: Record<string, string> = { P: 'Placidus', K: 'Koch', R: 'Regiomontanus', C: 'Campanus', E: 'Eşit', W: 'Tam Burç', O: 'Porphyry', B: 'Alcabitius', T: 'Topocentric', M: 'Morinus', X: 'Meridian' }
for (const [k, f] of Object.entries(sys)) {
  const se = sweph.houses_ex2(c.jdUt, 0, ph, input.place.lon, k as HouseSystem).data.houses.slice(0, 12)
  const mine = f()
  const worst = Math.max(...mine.map((x, i) => s1(x, se[i])))
  row(worst < 1, `${NAMES[k].padEnd(14)} en büyük fark ${worst.toFixed(3)}"`)
}

// ——— 4. Gezegenlerin evleri: Placidus başlangıçlarına göre bağımsız atama ———
console.log('\n4) Gezegenlerin evleri (Placidus)')
const cps = c.cusps
const inHouse = (l: number) => { for (let i = 0; i < 12; i++) { const a = cps[i], b = cps[(i + 1) % 12]; if (norm360(l - a) < norm360(b - a)) return i + 1 } return 12 }
const wrong = c.points.filter((p) => p.house !== inHouse(p.lon))
row(!wrong.length, `${c.points.length} noktanın hepsinin evi doğru${wrong.length ? ' — yanlış: ' + wrong.map((p) => p.name).join(', ') : ''}`)

// ——— 5. Açılar: bütün çiftler yeniden hesaplanır ———
console.log('\n5) Açılar')
const orbOf = (t: string) => DEFAULT_SETTINGS.customOrbs.orbs[t as keyof typeof DEFAULT_SETTINGS.customOrbs.orbs]!
const ids = c.points.filter((p) => !['southnode', 'lilith', 'fortune'].includes(p.id)).map((p) => ({ id: p.id, lon: p.lon }))
ids.push({ id: 'asc', lon: c.angles.asc }, { id: 'mc', lon: c.angles.mc })
const AST = ['ceres', 'pallas', 'juno', 'vesta']
const expected = new Set<string>()
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  const A = ids[i], B = ids[j]
  if (A.id === 'asc' && B.id === 'mc') continue
  const sep = separation(A.lon, B.lon)
  for (const a of ASPECTS) {
    const ast = AST.includes(A.id) || AST.includes(B.id)
    const lum = ['sun', 'moon'].includes(A.id) || ['sun', 'moon'].includes(B.id)
    let max = orbOf(a.type)
    max = ast ? Math.min(max, a.major ? 3 : 1) : max + (lum ? (a.major ? 2 : 0.5) : 0)
    if (Math.abs(sep - a.angle) <= max) { expected.add(`${A.id}|${B.id}|${a.type}`); break }
  }
}
const got = new Set(c.aspects.map((a) => `${a.a}|${a.b}|${a.type}`))
const missing = [...expected].filter((x) => !got.has(x))
const extra = [...got].filter((x) => !expected.has(x))
row(!missing.length && !extra.length, `${expected.size} açının hepsi bağımsız hesapla aynı${missing.length ? ' · eksik: ' + missing.join(', ') : ''}${extra.length ? ' · fazla: ' + extra.join(', ') : ''}`)
const orbErr = Math.max(...c.aspects.map((a) => Math.abs(Math.abs(separation(ids.find((x) => x.id === a.a)!.lon, ids.find((x) => x.id === a.b)!.lon) - a.angle) - a.orb) * 3600))
row(orbErr < 0.001, `Orb değerleri: en büyük fark ${orbErr.toFixed(4)}"`)

// ——— 6. Yükselen/MC: kendi yıldız zamanı hesabıyla (Meeus) ———
console.log('\n6) Yükselen ve MC')
row(s1(ASC, c.angles.asc) < 0.01 && s1(MC, c.angles.mc) < 0.01, `Formülden AC ${ASC.toFixed(5)}° / MC ${MC.toFixed(5)}° · SouthAstra AC ${c.angles.asc.toFixed(5)}° / MC ${c.angles.mc.toFixed(5)}°`)

// ——— 7. Transit kesinleşme anları: hem transit hem natal konum NASA JPL Horizons'tan ———
console.log('\n7) Transit kesinleşme anları — NASA JPL ile (açı farkı, yay saniyesi)')
{
  // [transit, açı, natal, SouthAstra'nın bulduğu an (UT), JPL'de o andaki transit boylamı]; natal değerler yukarıdaki JPL tablosundan
  const REF: [string, string, string, string, number][] = [
    ['saturn', 'square', 'venus', '2024-04-19T16:40', 345.5843431], ['saturn', 'square', 'venus', '2024-09-13T23:46', 345.5843324],
    ['saturn', 'square', 'venus', '2025-01-13T16:13', 345.5843511], ['jupiter', 'conjunction', 'venus', '2024-08-07T20:20', 75.5843368],
    ['jupiter', 'sextile', 'sun', '2024-04-21T12:10', 51.9230843], ['mars', 'square', 'sun', '2024-05-29T09:30', 21.9230897]
  ]
  const ev = transitList(input, '2024-01-01T00:00:00Z', '2025-12-31T00:00:00Z', ['mars', 'jupiter', 'saturn'])
  const ANG: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 }
  for (const [t, type, n, when, jplLon] of REF) {
    const e = ev.find((x) => x.transit === t && x.type === type && x.natal === n && x.utc.startsWith(when))
    const nat = JPL[n][2]
    const err = Math.abs(Math.abs(separation(jplLon, nat)) - ANG[type]) * 3600
    row(!!e && err < 1, `${t} ${type} natal ${n} ${when} UT${e?.pass ? ` (${e.pass.n}/${e.pass.of}. geçiş)` : ''}: JPL'e göre açı farkı ${err.toFixed(3)}"`)
  }
}

console.log(fail ? `\n${fail} kontrol başarısız` : '\nBütün değerler bağımsız kaynaklarla aynı')
process.exit(fail ? 1 : 0)
