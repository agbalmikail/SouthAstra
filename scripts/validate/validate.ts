// Bağımsız astronomik doğrulama (npm run dogrula).
// 1) Gerekli NASA JPL Horizons sorgularını tests/reference/requests.json'a yazar.
// 2) tests/reference/jpl.json varsa (scripts/validate/fetch_jpl.py ile bir kez alınır) karşılaştırır.
// 3) tests/reference/tz.json varsa (fetch_tz.py, Python zoneinfo + sistem tzdata) saat dilimlerini karşılaştırır.
// 4) docs/dogrulama/RAPOR.md üretir. Referans yoksa ilgili bölüm "DOĞRULANMADI" olarak raporlanır.
// --local: local/validate-charts.json içindeki kişisel haritalar; çıktılar local/ altında kalır (git'e girmez).
import sweph from 'sweph'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { initEphemeris, natalChart, transitList, useSettings, view } from '../../src/main/engine'
import { toUtc } from '../../src/main/time'
import { ASPECTS, DEFAULT_SETTINGS, ORB_PROFILES, separation } from '../../src/shared/zodiac'
import type { ChartInput, HouseSystem } from '../../src/shared/types'
import { apparentGST, arcsec, houses, meanNode, trueObliquity } from './independent'

const ROOT = process.cwd()
const LOCAL = process.argv.includes('--local')
const DIR = LOCAL ? join(ROOT, 'local') : join(ROOT, 'tests/reference')
const REPORT = LOCAL ? join(ROOT, 'local/DOGRULAMA.md') : join(ROOT, 'docs/dogrulama/RAPOR.md')
mkdirSync(DIR, { recursive: true }); mkdirSync(join(ROOT, 'docs/dogrulama'), { recursive: true })
initEphemeris(join(ROOT, 'resources/ephe'))
useSettings({ ...DEFAULT_SETTINGS, asteroids: false, showParallels: false })
const C = sweph.constants

// ——— Referans haritaları (depoda: genel tarihler, kişisel veri değil) ———
interface RefChart { id: string; label: string; input: ChartInput; progressTo?: string; transits?: [string, string] }
const place = (name: string, lat: number, lon: number, tz: string) => ({ name, region: '', country: '', lat, lon, tz })
const REPO: RefChart[] = [
  { id: 'R1959', label: '1959 · İstanbul (genel tarih)', input: { name: 'R1959', date: '1959-03-15', time: '10:00', timeMode: 'zone', houseSystem: 'P', nodeType: 'true', place: place('İstanbul', 41.0138, 28.9497, 'Europe/Istanbul') }, progressTo: '1989-03-15T12:00:00Z' },
  { id: 'R1988', label: '1988 · Kadıköy (Örnek A, uydurma kişi)', input: { name: 'Örnek A', date: '1988-07-14', time: '06:45', timeMode: 'zone', houseSystem: 'P', nodeType: 'true', place: place('Kadıköy', 40.9823, 29.0903, 'Europe/Istanbul') }, progressTo: '2018-07-14T12:00:00Z', transits: ['2024-01-01T00:00:00Z', '2025-12-31T00:00:00Z'] },
  { id: 'R1990', label: '1990 · Berlin (genel tarih, yaz saati)', input: { name: 'R1990', date: '1990-09-15', time: '08:30', timeMode: 'zone', houseSystem: 'P', nodeType: 'true', place: place('Berlin', 52.5244, 13.4105, 'Europe/Berlin') }, progressTo: '2020-09-15T12:00:00Z' }
]
const CHARTS: RefChart[] = LOCAL ? (existsSync(join(DIR, 'validate-charts.json')) ? JSON.parse(readFileSync(join(DIR, 'validate-charts.json'), 'utf8')) : []) : REPO

const HZ: Record<string, string> = { sun: '10', moon: '301', mercury: '199', venus: '299', mars: '499', jupiter: '599', saturn: '699', uranus: '799', neptune: '899', pluto: '999', chiron: '2060;' }
const SE: Record<string, number> = { sun: C.SE_SUN, moon: C.SE_MOON, mercury: C.SE_MERCURY, venus: C.SE_VENUS, mars: C.SE_MARS, jupiter: C.SE_JUPITER, saturn: C.SE_SATURN, uranus: C.SE_URANUS, neptune: C.SE_NEPTUNE, pluto: C.SE_PLUTO, chiron: C.SE_CHIRON }

interface Req { key: string; body: string; command: string; jd: number; scale: 'TT' | 'UT'; q: '31' | '1'; site?: [number, number, number] }
const reqs: Req[] = []
const req = (r: Omit<Req, 'command'>) => { reqs.push({ ...r, command: HZ[r.body] }); return r.key }

// ——— İstekleri hazırla ———
type Plan = { chart: RefChart; jdUt: number; jdTt: number; prog?: { jdUt: number; points: Record<string, number> }; transits: { body: string; natal: string; type: string; jdUt: number; utc: string; pass?: string }[] }
const plans: Plan[] = []
for (const ch of CHARTS) {
  const c = natalChart(ch.input)
  const p: Plan = { chart: ch, jdUt: c.jdUt, jdTt: c.jdTt, transits: [] }
  for (const b of Object.keys(HZ)) {
    req({ key: `${ch.id}|${b}|TT|31`, body: b, jd: c.jdTt, scale: 'TT', q: '31' })
    req({ key: `${ch.id}|${b}|UT|31`, body: b, jd: c.jdUt, scale: 'UT', q: '31' })
    req({ key: `${ch.id}|${b}|TT|1`, body: b, jd: c.jdTt, scale: 'TT', q: '1' })
  }
  req({ key: `${ch.id}|moon|UT|31|topo`, body: 'moon', jd: c.jdUt, scale: 'UT', q: '31', site: [ch.input.place.lon, ch.input.place.lat, 0] })
  if (ch.progressTo) {
    const v = view(ch.input, { mode: 'progressed', date: ch.progressTo })
    const pj = Date.parse(v.outer!.utc) / 86400000 + 2440587.5
    p.prog = { jdUt: pj, points: Object.fromEntries(v.outer!.points.filter((x) => HZ[x.id]).map((x) => [x.id, x.lon])) }
    for (const b of Object.keys(HZ)) req({ key: `${ch.id}|${b}|prog`, body: b, jd: pj, scale: 'UT', q: '31' })
  }
  if (ch.transits) {
    const ev = transitList(ch.input, ch.transits[0], ch.transits[1], ['mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']).filter((e) => e.natal && HZ[e.natal])
    for (const e of ev.slice(0, 40)) {
      const k = req({ key: `${ch.id}|${e.transit}|tr|${e.jd.toFixed(6)}`, body: e.transit, jd: e.jd, scale: 'UT', q: '31' })
      p.transits.push({ body: e.transit, natal: e.natal!, type: e.type, jdUt: e.jd, utc: e.utc, pass: e.pass ? `${e.pass.n}/${e.pass.of}` : undefined, ...(k ? {} : {}) })
    }
  }
  plans.push(p)
}
writeFileSync(join(DIR, 'requests.json'), JSON.stringify({ note: 'NASA JPL Horizons sorguları; scripts/validate/fetch_jpl.py ile alınır', requests: reqs }, null, 1))

// ——— Saat dilimi vakaları (Python zoneinfo ile ayrıca hesaplanır) ———
const TZ_CASES: [string, string, string][] = [
  ['Europe/Istanbul', '1959-03-15', '10:00'], ['Europe/Istanbul', '1959-07-15', '12:00'], ['Europe/Istanbul', '1964-06-01', '12:00'], ['Europe/Istanbul', '1978-07-01', '12:00'],
  ['Europe/Istanbul', '1983-07-31', '12:00'], ['Europe/Istanbul', '1985-04-20', '12:00'], ['Europe/Istanbul', '1988-07-14', '06:45'], ['Europe/Istanbul', '1999-12-31', '23:00'],
  ['Europe/Istanbul', '2010-07-01', '12:00'], ['Europe/Istanbul', '2016-11-01', '12:00'], ['Europe/Istanbul', '2024-01-01', '12:00'],
  ['Europe/Berlin', '1946-07-01', '12:00'], ['Europe/Berlin', '1947-06-01', '12:00'], ['Europe/Berlin', '1949-07-01', '12:00'], ['Europe/Berlin', '1975-07-01', '12:00'],
  ['Europe/Berlin', '1980-07-01', '12:00'], ['Europe/Berlin', '1990-03-24', '12:00'], ['Europe/Berlin', '1990-03-26', '12:00'], ['Europe/Berlin', '1990-09-15', '08:30'],
  ['Europe/Berlin', '1990-09-29', '12:00'], ['Europe/Berlin', '1990-10-01', '12:00'], ['Europe/Berlin', '2024-07-01', '12:00'],
  ['America/New_York', '1990-07-01', '12:00'], ['Europe/London', '1990-06-01', '12:00']
]
writeFileSync(join(ROOT, 'tests/reference/tz-cases.json'), JSON.stringify(TZ_CASES, null, 1))

// ——— Karşılaştırma ———
const jplFile = join(DIR, 'jpl.json')
const jpl: { meta?: Record<string, unknown>; values?: Record<string, number[]> } = existsSync(jplFile) ? JSON.parse(readFileSync(jplFile, 'utf8')) : {}
const V = jpl.values ?? {}
let pass = 0, fail = 0, missing = 0
const maxd = { planets: 0, angles: 0, houses: 0, aspects: 0, progressions: 0, transits: 0, node: 0, tzCases: 0 }
const mx = (k: keyof typeof maxd, v: number) => { if (Number.isFinite(v) && v > maxd[k]) maxd[k] = v }
const lines: string[] = []
const out = (s = '') => lines.push(s)
const fails: string[] = []
const check = (ok: boolean, row: string, failDetail: string) => { if (ok) pass++; else { fail++; fails.push(failDetail) } ; return (ok ? '✓' : '✗') + ' ' + row }
const has = (k: string) => { if (!V[k]) { missing++; return false } return true }

const f6 = (x: number) => x.toFixed(6)
const f2 = (x: number) => x.toFixed(2)
const prof = ORB_PROFILES[0]
const LUM = new Set(['sun', 'moon'])
const orbOf = (type: string, a: string, b: string) => (prof.orbs[type as keyof typeof prof.orbs] ?? 0) + (LUM.has(a) || LUM.has(b) ? (ASPECTS.find((x) => x.type === type)?.major ? prof.luminaryBonus : Math.min(0.5, prof.luminaryBonus)) : 0)

out(`# SouthAstra · bağımsız astronomik doğrulama${LOCAL ? ' (yerel, kişisel haritalar)' : ''}`)
out()
out(`Oluşturuldu: ${new Date().toISOString()} · Swiss Ephemeris ${sweph.version()} (sepl_18/semo_18; JPL DE431 tabanlı Swiss Ephemeris dosyaları) · Node ICU tzdata ${process.versions.tz ?? '?'}`)
out()
if (jpl.meta) {
  out('## Referans: NASA JPL Horizons')
  out()
  for (const [k, v] of Object.entries(jpl.meta)) out(`- **${k}**: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
  out()
} else out('> **NASA referansı yok** (tests/reference/jpl.json bulunamadı): gezegen bölümleri DOĞRULANMADI. `python3 scripts/validate/fetch_jpl.py` ile alın.\n')

out('## Eşitlenen ayarlar')
out()
out('| Karşılaştırma | NASA JPL Horizons | Swiss Ephemeris / SouthAstra |')
out('|---|---|---|')
out('| Görünür ekliptik, TT | QUANTITIES=31 (gözlemci ekliptik boylam/enlem, görünür, günün ekliptiği ve ekinoksu, nütasyon dahil), CENTER=500@399 (yer merkezi), TIME_TYPE=TT | `swe_calc(jd_TT, SEFLG_SWIEPH)` — görünür, gerçek ekinoks, nütasyon dahil, yer merkezi |')
out('| Görünür ekliptik, UT (uygulamanın kendisi) | aynı, TIME_TYPE=UT | SouthAstra harita çıktısı (`swe_calc_ut`, UT1; ΔT Swiss Ephemeris modeli) |')
out('| Astrometrik RA/Dec, TT | QUANTITIES=1 (astrometrik, ICRF) | `SEFLG_EQUATORIAL·J2000·ICRS·NOABERR·NOGDEFL` |')
out('| Ay, yer yüzeyinden (toposentrik) | CENTER=coord@399, SITE_COORD=boylam,enlem,0 | `swe_set_topo` + `SEFLG_TOPOCTR` (uygulama yer merkezli kullanır; bu satır yalnızca karşılaştırma içindir) |')
out()

const T_POS = 1.0 // yay saniyesi: gezegenler
const T_CHIRON = 3.0
for (const p of plans) {
  const ch = p.chart
  const c = natalChart(ch.input)
  out(`## ${ch.label}`)
  out()
  out(`Yerel ${ch.input.date} ${ch.input.time} (${ch.input.place.tz}) → UTC ${c.utc.replace('T', ' ').replace(/\.\d+Z$/, '')} · JD(UT1) ${f6(c.jdUt)} · JD(TT) ${f6(c.jdTt)} · ΔT ${f2((c.jdTt - c.jdUt) * 86400)} s · ${ch.input.place.lat}°, ${ch.input.place.lon}°`)
  out()
  out('| Cisim | JPL TT (°) | SwissEph TT (°) | fark (″) | JPL UT (°) | SouthAstra (°) | fark (″) | RA/Dec astrometrik fark (″) |')
  out('|---|---|---|---|---|---|---|---|')
  for (const b of Object.keys(HZ)) {
    const kTT = `${ch.id}|${b}|TT|31`, kUT = `${ch.id}|${b}|UT|31`, kAS = `${ch.id}|${b}|TT|1`
    if (!has(kTT) || !has(kUT) || !has(kAS)) { out(`| ${b} | — | | | | | | DOĞRULANMADI (referans yok) |`); continue }
    const swTT = sweph.calc(p.jdTt, SE[b], C.SEFLG_SWIEPH).data[0]
    const app = c.points.find((x) => x.id === b)!.lon
    const eq = sweph.calc(p.jdTt, SE[b], C.SEFLG_SWIEPH | C.SEFLG_EQUATORIAL | C.SEFLG_J2000 | C.SEFLG_ICRS | C.SEFLG_NOABERR | C.SEFLG_NOGDEFL).data
    const dTT = arcsec(swTT, V[kTT][0]), dUT = arcsec(app, V[kUT][0])
    const dRA = arcsec(eq[0], V[kAS][0]) * Math.cos(eq[1] * Math.PI / 180), dDec = Math.abs(eq[1] - V[kAS][1]) * 3600
    const tol = b === 'chiron' ? T_CHIRON : T_POS
    if (b !== 'chiron') mx('planets', Math.max(dTT, dUT, dRA, dDec))
    const ok = dTT <= tol && dUT <= tol && dRA <= tol && dDec <= tol
    out(check(ok, `| ${b} | ${f6(V[kTT][0])} | ${f6(swTT)} | ${f2(dTT)} | ${f6(V[kUT][0])} | ${f6(app)} | ${f2(dUT)} | ${f2(dRA)} / ${f2(dDec)} |`, `${ch.id} ${b}: beklenen (JPL) TT ${f6(V[kTT][0])}°, UT ${f6(V[kUT][0])}°, RA ${f6(V[kAS][0])} Dec ${f6(V[kAS][1])}; hesaplanan TT ${f6(swTT)}°, UT ${f6(app)}°, RA ${f6(eq[0])} Dec ${f6(eq[1])}; fark ${f2(dTT)}″/${f2(dUT)}″/${f2(dRA)}″/${f2(dDec)}″; sınır ${tol}″; parametreler: JD(TT) ${f6(p.jdTt)}, JD(UT1) ${f6(p.jdUt)}`).replace(/^([✓✗]) \|/, '| $1 '))
  }
  out()
  const kTopo = `${ch.id}|moon|UT|31|topo`
  if (has(kTopo)) {
    sweph.set_topo(ch.input.place.lon, ch.input.place.lat, 0)
    const topo = sweph.calc_ut(p.jdUt, C.SE_MOON, C.SEFLG_SWIEPH | C.SEFLG_TOPOCTR).data[0]
    const d = arcsec(topo, V[kTopo][0])
    const geo = c.points.find((x) => x.id === 'moon')!.lon
    out(check(d <= 2, `Ay toposentrik: JPL ${f6(V[kTopo][0])}° · SwissEph ${f6(topo)}° · fark ${f2(d)}″ (sınır 2″). Yer merkezli konumdan farkı (paralaks) ${f2(arcsec(geo, topo) / 60)}′.`, `${ch.id} Ay toposentrik: beklenen ${f6(V[kTopo][0])}, hesaplanan ${f6(topo)}, fark ${f2(d)}″`))
    out()
  }

  if (ch.input.timeUnknown) {
    out('**Köşeler ve evler:** doğum saati bilinmediği için SouthAstra yükselen, MC ve ev hesaplamaz (tasarım gereği); karşılaştırma yapılmadı. Ay açıları da saate bağlı olduğundan açı karşılaştırmasında Ay hariç tutuldu.')
    out()
  } else {
    // ASC / MC / evler: bağımsız yıldız zamanı, eğim ve nütasyonla
    const ramc = (apparentGST(p.jdUt, p.jdTt) + ch.input.place.lon + 360) % 360
    const eps = trueObliquity(p.jdTt)
    const H = houses(ramc, ch.input.place.lat, eps)
    out(`**Köşeler ve evler (bağımsız: Meeus yıldız zamanı + IAU 1980 nütasyon + ev formülleri).** RAMC ${f6(ramc)}° (SwissEph ${f6(c.angles.armc)}°, fark ${f2(arcsec(ramc, c.angles.armc))}″) · ε ${f6(eps)}° (SwissEph ${f6(c.obliquity)}°, fark ${f2(arcsec(eps, c.obliquity))}″)`)
    out()
    const dA = arcsec(H.ASC, c.angles.asc), dM = arcsec(H.MC, c.angles.mc)
    mx('angles', Math.max(dA, dM))
    out(check(dA <= 5 && dM <= 5, `ASC formül ${f6(H.ASC)}° · SouthAstra ${f6(c.angles.asc)}° · fark ${f2(dA)}″ — MC formül ${f6(H.MC)}° · SouthAstra ${f6(c.angles.mc)}° · fark ${f2(dM)}″ (sınır 5″)`, `${ch.id} ASC/MC: beklenen ${f6(H.ASC)}/${f6(H.MC)}, hesaplanan ${f6(c.angles.asc)}/${f6(c.angles.mc)}, fark ${f2(dA)}″/${f2(dM)}″, RAMC ${f6(ramc)}, ε ${f6(eps)}`))
    out()
    for (const hs of ['P', 'K', 'R', 'C', 'O', 'E', 'W'] as HouseSystem[]) {
      const ac = natalChart({ ...ch.input, houseSystem: hs })
      const exp = H.sys[hs]()
      const worst = Math.max(...exp.map((x, i) => arcsec(x, ac.cusps[i])))
    mx('houses', worst)
      out(check(worst <= 5, `Ev sistemi ${hs} (${ac.houseSystemUsed}): 12 başlangıcın en büyük farkı ${f2(worst)}″ (sınır 5″)`, `${ch.id} ev ${hs}: beklenen ${exp.map((x) => x.toFixed(4)).join(', ')}; hesaplanan ${ac.cusps.map((x) => x.toFixed(4)).join(', ')}; en büyük fark ${f2(worst)}″`))
    }
    out()

  }
  // Ortalama düğüm
  const mn = natalChart({ ...ch.input, nodeType: 'mean' }).points.find((x) => x.id === 'northnode')!.lon
  const mnRef = meanNode(p.jdTt)
  mx('node', arcsec(mn, mnRef))
  out(check(arcsec(mn, mnRef) <= 3, `Ortalama Ay düğümü: Meeus ${f6(mnRef)}° · SouthAstra ${f6(mn)}° · fark ${f2(arcsec(mn, mnRef))}″ (sınır 3″). Gerçek (oskülatör) düğüm: bağımsız referans yok — DOĞRULANMADI.`, `${ch.id} ortalama düğüm: beklenen ${f6(mnRef)}, hesaplanan ${f6(mn)}`))
  out()

  // Açılar: JPL konumlarından bağımsız yeniden hesap
  const bodies = Object.keys(HZ).filter((b) => b !== 'chiron' && !(ch.input.timeUnknown && b === 'moon'))
  if (bodies.every((b) => V[`${ch.id}|${b}|UT|31`])) {
    const exp = new Map<string, number>()
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const sep = separation(V[`${ch.id}|${bodies[i]}|UT|31`][0], V[`${ch.id}|${bodies[j]}|UT|31`][0])
      for (const a of ASPECTS) { const orb = Math.abs(sep - a.angle); if (orb <= orbOf(a.type, bodies[i], bodies[j])) { exp.set(`${bodies[i]}|${bodies[j]}|${a.type}`, orb); break } }
    }
    const got = new Map(c.aspects.filter((a) => bodies.includes(a.a) && bodies.includes(a.b) && ASPECTS.some((x) => x.type === a.type)).map((a) => [`${a.a}|${a.b}|${a.type}`, a.orb]))
    const miss = [...exp.keys()].filter((k) => !got.has(k)), extra = [...got.keys()].filter((k) => !exp.has(k))
    const worst = Math.max(0, ...[...exp].filter(([k]) => got.has(k)).map(([k, o]) => Math.abs(o - got.get(k)!) * 3600))
    mx('aspects', worst)
    out(check(!miss.length && !extra.length && worst <= 2, `Açılar (10 gezegen, standart orb profili): JPL konumlarından ${exp.size} açı · SouthAstra ${got.size} · eksik ${miss.length} · fazla ${extra.length} · en büyük orb farkı ${f2(worst)}″`, `${ch.id} açılar: eksik ${miss.join(', ') || '—'}; fazla ${extra.join(', ') || '—'}; orb farkı ${f2(worst)}″`))
    out()
  }

  // Progresyon
  if (p.prog) {
    const rows = Object.entries(p.prog.points).filter(([b]) => has(`${ch.id}|${b}|prog`)).map(([b, lon]) => [b, arcsec(lon, V[`${ch.id}|${b}|prog`][0])] as const)
    if (rows.length) {
      const worst = Math.max(...rows.map(([, d]) => d))
      mx('progressions', worst)
      out(check(worst <= 1.5, `İkincil progresyon (${ch.progressTo!.slice(0, 10)}; progresif an JD ${f6(p.prog.jdUt)}): ${rows.length} cisim, en büyük fark ${f2(worst)}″ (sınır 1,5″)`, `${ch.id} progresyon: ${rows.map(([b, d]) => `${b} ${f2(d)}″`).join(', ')}`))
      out()
    }
  }
  // Transitler: kesinleşme anında transit (JPL) ile natal (JPL) arası açı
  if (p.transits.length) {
    const ANG: Record<string, number> = Object.fromEntries(ASPECTS.map((a) => [a.type, a.angle]))
    const rows = p.transits.filter((e) => has(`${ch.id}|${e.body}|tr|${e.jdUt.toFixed(6)}`) && V[`${ch.id}|${e.natal}|UT|31`]).map((e) => ({ e, d: Math.abs(separation(V[`${ch.id}|${e.body}|tr|${e.jdUt.toFixed(6)}`][0], V[`${ch.id}|${e.natal}|UT|31`][0]) - ANG[e.type]) * 3600 }))
    if (rows.length) {
      const worst = rows.reduce((m, r) => (r.d > m.d ? r : m))
      mx('transits', worst.d)
      out(check(worst.d <= 1.5, `Transit kesinleşme anları: ${rows.length} olay (${ch.transits![0].slice(0, 10)} – ${ch.transits![1].slice(0, 10)}), JPL'e göre en büyük açı sapması ${f2(worst.d)}″ (${worst.e.body} ${worst.e.type} natal ${worst.e.natal}, ${worst.e.utc.slice(0, 16)} UT) · sınır 1,5″ (≈ yavaş gezegende birkaç dakika)`, `${ch.id} transit: ${rows.filter((r) => r.d > 1.5).map((r) => `${r.e.body} ${r.e.type} ${r.e.natal} ${r.e.utc} ${f2(r.d)}″`).join('; ')}`))
      out()
    }
  }
}

// ——— Saat dilimleri ———
out('## Tarihsel saat dilimleri (IANA tzdb)')
out()
const tzFile = join(ROOT, 'tests/reference/tz.json')
if (existsSync(tzFile)) {
  const tz = JSON.parse(readFileSync(tzFile, 'utf8')) as { meta: Record<string, string>; values: [string, string, string, number][] }
  out(`Bağımsız uygulama: ${tz.meta.engine} · tzdata ${tz.meta.tzdata} · alındı ${tz.meta.fetched}. SouthAstra: luxon + Node ICU tzdata ${process.versions.tz ?? '?'}.`)
  out()
  out('| Saat dilimi | Yerel | Python zoneinfo (dk) | SouthAstra (dk) | |')
  out('|---|---|---|---|---|')
  for (const [zone, date, time, off] of tz.values) {
    const got = toUtc({ name: 'x', date, time, timeMode: 'zone', houseSystem: 'P', nodeType: 'true', place: place('', 0, 0, zone) }).offsetMinutes
    maxd.tzCases++
    out(check(got === off, `| ${zone} | ${date} ${time} | ${off} | ${got} |`, `${zone} ${date} ${time}: beklenen ofset ${off} dk (Python zoneinfo), hesaplanan ${got} dk`).replace(/^([✓✗]) (\|.*)$/, '$2 $1 |'))
  }
  out()
} else out('> Saat dilimi referansı yok (tests/reference/tz.json): DOĞRULANMADI. `python3 scripts/validate/fetch_tz.py` ile üretin.\n')

out('## Özet')
out()
out(`- Geçen: **${pass}** · Başarısız: **${fail}** · Referansı olmadığı için doğrulanmayan kalem: **${missing}**`)
if (fails.length) { out(); out('### Başarısızlar (beklenen, hesaplanan, fark, parametreler)'); out(); for (const f of fails) out(`- ${f}`) }
out()
out('Sınırlar: gezegenler 1″, Chiron 3″, toposentrik Ay 2″, köşeler ve evler 5″ (bağımsız nütasyon serisi kısaltılmış: ~0,1″), ortalama düğüm 3″, transit ve progresyon 1,5″.')
writeFileSync(REPORT, lines.join('\n') + '\n')
// uygulamanın teknik eki için özet (resources/verification.json; git'e girmez, CI'da paketlemeden önce üretilir)
if (!LOCAL) {
  const vf = join(ROOT, 'resources/verification.json')
  let cur: Record<string, unknown> = {}
  try { cur = JSON.parse(readFileSync(vf, 'utf8')) } catch { /* yok */ }
  const { createHash } = require('node:crypto') as typeof import('node:crypto')
  const sha = existsSync(jplFile) ? createHash('sha256').update(readFileSync(jplFile)).digest('hex') : ''
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  cur.jpl = { date: new Date().toISOString(), version: pkg.version, passed: pass, failed: fail, missing, charts: CHARTS.map((c) => c.input.date.slice(0, 4)), max: maxd, horizons: jpl.meta?.['Horizons API'] ?? '', sources: jpl.meta?.['Efemeris kaynakları (Horizons)'] ?? {}, fetched: jpl.meta?.['Alındı'] ?? '', sha256: sha, report: 'https://github.com/agbalmikail/SouthAstra/blob/main/docs/dogrulama/RAPOR.md' }
  writeFileSync(vf, JSON.stringify(cur, null, 2))
}
console.log(lines.filter((l) => /^[✓✗]|\| [✓✗]|DOĞRULANMADI|Özet|Geçen/.test(l)).join('\n'))
console.log(`\nRapor: ${REPORT}`)
console.log(fail ? `${fail} kontrol başarısız` : missing ? `Başarısız yok; ${missing} kalem referans olmadığı için doğrulanmadı` : 'Bütün kontroller bağımsız referanslarla geçti')
process.exit(fail ? 1 : 0)
