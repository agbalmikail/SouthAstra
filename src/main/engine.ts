// SouthAstra hesaplama motoru.
// Swiss Ephemeris © Astrodienst AG, AGPL-3.0 lisansıyla kullanılmaktadır.
import sweph from 'sweph'
import type {
  AcgLine, Aspect, AspectType, ChartInput, ChartResult, EclipseEvent, Ephemeris, EphemerisEvent, HouseSystem, Place, PointPos, RectifyRow, Settings, StarContact,
  TransitEvent, ViewRequest, ViewResult, VoidPeriod
} from '@shared/types'
import { HOUSE_SYSTEMS, placeLabel } from '@shared/types'
import { activeOrbs, ASPECTS, DEFAULT_SETTINGS, dignityOf, norm360, separation, signOf, AYANAMSAS, SIGNS } from '@shared/zodiac'
import { toUtc } from './time'
import { t } from '@shared/i18n'

const C = sweph.constants
const VS = '︎'

const BODIES: { id: string; name: string; glyph: string; se: number; station?: number }[] = [
  { id: 'sun', name: 'Güneş', glyph: '☉', se: C.SE_SUN },
  { id: 'moon', name: 'Ay', glyph: '☽', se: C.SE_MOON },
  { id: 'mercury', name: 'Merkür', glyph: '☿', se: C.SE_MERCURY, station: 1 },
  { id: 'venus', name: 'Venüs', glyph: '♀', se: C.SE_VENUS, station: 2 },
  { id: 'mars', name: 'Mars', glyph: '♂', se: C.SE_MARS, station: 3 },
  { id: 'jupiter', name: 'Jüpiter', glyph: '♃', se: C.SE_JUPITER, station: 5 },
  { id: 'saturn', name: 'Satürn', glyph: '♄', se: C.SE_SATURN, station: 6 },
  { id: 'uranus', name: 'Uranüs', glyph: '♅', se: C.SE_URANUS, station: 8 },
  { id: 'neptune', name: 'Neptün', glyph: '♆', se: C.SE_NEPTUNE, station: 9 },
  { id: 'pluto', name: 'Plüton', glyph: '♇', se: C.SE_PLUTO, station: 10 },
  { id: 'chiron', name: 'Chiron', glyph: '⚷', se: C.SE_CHIRON, station: 8 },
  { id: 'lilith', name: 'Lilith (ort.)', glyph: '⚸', se: C.SE_MEAN_APOG }
]
/** Ana asteroitler (ayarlardan açılır) */
const ASTEROIDS: typeof BODIES = [
  { id: 'ceres', name: 'Ceres', glyph: '⚳', se: C.SE_CERES, station: 4 },
  { id: 'pallas', name: 'Pallas', glyph: '⚴', se: C.SE_PALLAS, station: 4 },
  { id: 'juno', name: 'Juno', glyph: '⚵', se: C.SE_JUNO, station: 4 },
  { id: 'vesta', name: 'Vesta', glyph: '⚶', se: C.SE_VESTA, station: 4 }
]
const ASTEROID_IDS = new Set(ASTEROIDS.map((a) => a.id))
const BODY_BY_ID = Object.fromEntries([...BODIES, ...ASTEROIDS].map((b) => [b.id, b]))

/** Sabit yıldızlar: astrolojide en çok kullanılanlar */
const STARS = [
  'Algol', 'Alcyone', 'Aldebaran', 'Rigel', 'Capella', 'Betelgeuse', 'Sirius', 'Canopus', 'Castor', 'Pollux',
  'Procyon', 'Regulus', 'Zosma', 'Denebola', 'Vindemiatrix', 'Spica', 'Arcturus', 'Zubenelgenubi', 'Zubeneschamali',
  'Antares', 'Vega', 'Altair', 'Deneb Algedi', 'Fomalhaut', 'Deneb Adige', 'Achernar', 'Markab', 'Scheat'
]

let ephePath = ''
let settings: Settings = DEFAULT_SETTINGS
export function initEphemeris(path: string): void { ephePath = path; sweph.set_ephe_path(path) }
export const getEphePath = (): string => ephePath
export const swephVersion = (): string => sweph.version()
export function useSettings(s: Settings): void { settings = s }

const norm180 = (x: number): number => ((((x + 180) % 360) + 360) % 360) - 180
const midpoint = (a: number, b: number): number => norm360(a + norm180(b - a) / 2)
const jdFromMs = (ms: number): number => ms / 86400000 + 2440587.5
const isoFromJd = (jd: number): string => new Date(Math.round((jd - 2440587.5) * 86400000)).toISOString()

/** Sideral seçiliyse Swiss Ephemeris bayrağını hazırlar */
function zf(): number {
  if (settings.zodiac !== 'sidereal') return 0
  sweph.set_sid_mode(settings.ayanamsa, 0, 0)
  return C.SEFLG_SIDEREAL
}
const ayanamsaAt = (jd: number): number => {
  sweph.set_sid_mode(settings.ayanamsa, 0, 0)
  return sweph.get_ayanamsa_ex_ut(jd, C.SEFLG_SWIEPH).data
}
const zodiacName = (): string => settings.zodiac === 'sidereal'
  ? t('Sideral · {ayanamsa}', { ayanamsa: AYANAMSAS.find((a) => a.id === settings.ayanamsa)?.name ?? sweph.get_ayanamsa_name(settings.ayanamsa) })
  : t('Tropikal')

const obliquityAt = (jd: number): number => sweph.calc_ut(jd, C.SE_ECL_NUT, 0).data[0]

// ——— Konumlar ———

/**
 * Duraklama: boylam hızının işaret değiştirdiği an. BODIES[].station gün cinsinden penceredir;
 * doğum anına bu kadar gün yakın bir duraklama varsa gezegen "durağan" sayılır ve kesin an döner.
 */
function nearestStation(jd: number, se: number, flags: number, windowDays: number): PointPos['station'] {
  const speed = (t: number) => sweph.calc_ut(t, se, flags).data[3]
  const step = windowDays <= 2 ? 0.25 : 1
  let best: PointPos['station']
  for (const dir of [1, -1]) {
    let t0 = jd
    let v0 = speed(t0)
    for (let k = step; k <= windowDays + step; k += step) {
      const t1 = jd + dir * k
      const v1 = speed(t1)
      if (Math.sign(v0) !== Math.sign(v1)) {
        let a = Math.min(t0, t1), b = Math.max(t0, t1), fa = speed(a)
        for (let i = 0; i < 40; i++) { const m = (a + b) / 2; const fm = speed(m); if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm } else b = m }
        const ts = (a + b) / 2
        const days = ts - jd
        if (Math.abs(days) <= windowDays && (!best || Math.abs(days) < Math.abs(best.days))) {
          best = { utc: isoFromJd(ts), kind: speed(ts + 0.01) < 0 ? 'retro' : 'direct', days }
        }
        break
      }
      t0 = t1; v0 = v1
    }
  }
  return best
}

interface Geo { lat: number; lon: number }

function computePoints(jd: number, nodeType: 'true' | 'mean', geo: Geo | null, warnings: string[]): PointPos[] {
  const flags = C.SEFLG_SWIEPH | C.SEFLG_SPEED | zf()
  let usedMoshier = false
  const all = [...BODIES, ...(settings.asteroids ? ASTEROIDS : []), { id: 'northnode', name: nodeType === 'mean' ? 'K. Ay Düğümü (ortalama)' : 'K. Ay Düğümü (gerçek)', glyph: '☊', se: nodeType === 'mean' ? C.SE_MEAN_NODE : C.SE_TRUE_NODE, station: undefined }]
  const out: PointPos[] = []
  for (const b of all) {
    const r = sweph.calc_ut(jd, b.se, flags)
    if (r.flag < 0) { warnings.push(t('{name} hesaplanamadı: {error}', { name: t(b.name), error: r.error })); continue }
    if ((b.se <= C.SE_PLUTO || ASTEROID_IDS.has(b.id)) && !(r.flag & C.SEFLG_SWIEPH)) usedMoshier = true
    const eq = sweph.calc_ut(jd, b.se, C.SEFLG_SWIEPH | C.SEFLG_SPEED | C.SEFLG_EQUATORIAL)
    const p: PointPos = {
      id: b.id, name: t(b.name), glyph: b.glyph + VS,
      lon: r.data[0], lat: r.data[1], distance: r.data[2], speed: r.data[3], latSpeed: r.data[4], retro: r.data[3] < 0,
      ra: eq.data[0], declination: eq.data[1], house: 0,
      dignity: dignityOf(b.id, r.data[0], settings.rulership)
    }
    if (b.station !== undefined) {
      p.station = nearestStation(jd, b.se, flags, b.station)
      p.stationary = !!p.station
    }
    if (geo) {
      const az = sweph.azalt(jd, C.SE_EQU2HOR, [geo.lon, geo.lat, 0], 0, 0, [eq.data[0], eq.data[1], eq.data[2]])
      p.azimuth = norm360(az[0] + 180) // Swiss Ephemeris güneyden ölçer; kuzeyden ölçüme çevir
      p.altitude = az[1]
    }
    out.push(p)
  }
  const nn = out.find((p) => p.id === 'northnode')
  if (nn) out.push({ ...nn, id: 'southnode', name: t(nodeType === 'mean' ? 'G. Ay Düğümü (ortalama)' : 'G. Ay Düğümü (gerçek)'), glyph: '☋' + VS, lon: norm360(nn.lon + 180), lat: -nn.lat, declination: -nn.declination, ra: norm360((nn.ra ?? 0) + 180), azimuth: undefined, altitude: undefined })
  if (usedMoshier) warnings.push(t('Efemeris dosyaları bulunamadı; daha düşük hassasiyetli Moshier yöntemi kullanıldı.'))
  return out
}

function houseOf(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i]
    const b = cusps[(i + 1) % 12]
    if (norm360(lon - a) < norm360(b - a)) return i + 1
  }
  return 12
}

interface HouseData { cusps: number[]; asc: number; mc: number; vertex: number; armc: number; used: string; ok: boolean }

function computeHouses(jd: number, geo: Geo, hsys: HouseSystem, warnings: string[]): HouseData {
  const h = sweph.houses_ex2(jd, zf(), geo.lat, geo.lon, hsys)
  let used = HOUSE_SYSTEMS.find((x) => x.id === hsys)?.name ?? hsys
  if (h.flag < 0) {
    warnings.push(t('{system} bu enlemde hesaplanamıyor (kutup bölgesi); Porphyry kullanıldı.', { system: used }))
    used = t('Porphyry (yedek)')
  }
  const [asc, mc, armc, vertex] = h.data.points
  return { cusps: h.data.houses.slice(0, 12), asc, mc, vertex, armc, used, ok: true }
}

/** Ekliptik boylamdan (zodyak ayarına göre) evleri ARMC üzerinden kurar: progresyon ve kompozit için */
function housesFromMc(mcLon: number, lat: number, jd: number, hsys: HouseSystem): HouseData {
  const aya = settings.zodiac === 'sidereal' ? ayanamsaAt(jd) : 0
  const eps = obliquityAt(jd)
  const trop = norm360(mcLon + aya)
  const armc = norm360((sweph.cotrans([trop, 0, 1], -eps) as unknown as number[])[0])
  const h = sweph.houses_armc_ex2(armc, lat, eps, hsys)
  const fix = (x: number) => norm360(x - aya)
  return {
    cusps: h.data.houses.slice(0, 12).map(fix), asc: fix(h.data.points[0]), mc: fix(h.data.points[1]),
    vertex: fix(h.data.points[3]), armc, used: HOUSE_SYSTEMS.find((x) => x.id === hsys)?.name ?? hsys, ok: h.flag >= 0
  }
}

/**
 * Hermetik arazlar (Paulus Alexandrinus). Gündüz formülü; gece haritasında çıkarılan ve eklenen yer değiştirir.
 * Şans = AC + Ay − Güneş · Ruh = AC + Güneş − Ay · Eros = AC + Venüs − Ruh · Zorunluluk = AC + Şans − Merkür
 * Cesaret = AC + Şans − Mars · Zafer = AC + Jüpiter − Ruh · Nemesis = AC + Şans − Satürn
 */
function computeLots(points: PointPos[], asc: number, cusps: number[], day: boolean): ChartResult['lots'] {
  const L = (id: string) => points.find((p) => p.id === id)?.lon ?? 0
  const lot = (a: number, b: number) => norm360(day ? asc + a - b : asc + b - a)
  const fortune = lot(L('moon'), L('sun'))
  const spirit = lot(L('sun'), L('moon'))
  const defs: [string, string, number, string, string][] = [
    ['fortune', 'Şans (Fortuna)', fortune, 'Ay', 'Güneş'],
    ['spirit', 'Ruh (Daimon)', spirit, 'Güneş', 'Ay'],
    ['eros', 'Eros', lot(L('venus'), spirit), 'Venüs', 'Ruh'],
    ['necessity', 'Zorunluluk (Ananke)', lot(fortune, L('mercury')), 'Şans', 'Merkür'],
    ['courage', 'Cesaret (Tolma)', lot(fortune, L('mars')), 'Şans', 'Mars'],
    ['victory', 'Zafer (Nike)', lot(L('jupiter'), spirit), 'Jüpiter', 'Ruh'],
    ['nemesis', 'Nemesis', lot(fortune, L('saturn')), 'Şans', 'Satürn']
  ]
  return defs.map(([id, name, lon, a, b]) => ({ id, name: t(name), lon, house: houseOf(lon, cusps), formula: day ? `AC + ${t(a)} − ${t(b)}` : t('AC + {b} − {a} (gece)', { a: t(a), b: t(b) }) }))
}

function addFortune(points: PointPos[], asc: number): void {
  const sun = points.find((p) => p.id === 'sun')
  const moon = points.find((p) => p.id === 'moon')
  if (!sun || !moon) return
  const day = sun.house >= 7 // Güneş ufkun üstünde (7–12. evler)
  const lon = norm360(day ? asc + moon.lon - sun.lon : asc + sun.lon - moon.lon)
  points.push({ id: 'fortune', name: day ? t('Şans Noktası (gündüz)') : t('Şans Noktası (gece)'), glyph: '⊗', lon, lat: 0, speed: 0, retro: false, house: 0, declination: 0 })
}

// ——— Açılar ———

const LUM = new Set(['sun', 'moon'])
const NO_ASPECT = new Set(['southnode', 'lilith', 'fortune'])

function aspectBetween(A: { id: string; lon: number; speed: number }, B: { id: string; lon: number; speed: number }, orbOf: (type: string, a: string, b: string) => number | null): Aspect | null {
  const sep = separation(A.lon, B.lon)
  for (const asp of ASPECTS) {
    const max = orbOf(asp.type, A.id, B.id)
    if (max === null) continue
    const orb = Math.abs(sep - asp.angle)
    if (orb > max) continue
    const dt = 0.01
    const later = Math.abs(separation(A.lon + A.speed * dt, B.lon + B.speed * dt) - asp.angle)
    return { a: A.id, b: B.id, type: asp.type, angle: asp.angle, orb, applying: A.speed === 0 && B.speed === 0 ? false : later < orb }
  }
  return null
}

const natalOrb = (type: string, a: string, b: string): number | null => {
  const prof = activeOrbs(settings)
  const base = prof.orbs[type as keyof typeof prof.orbs]
  if (base === undefined) return null
  const major = ASPECTS.find((x) => x.type === type)?.major
  // asteroit içeren açılarda dar orb: majörde en fazla 3°, minörde 1°
  if (ASTEROID_IDS.has(a) || ASTEROID_IDS.has(b)) return Math.min(base, major ? 3 : 1)
  return base + (LUM.has(a) || LUM.has(b) ? (major ? prof.luminaryBonus : Math.min(0.5, prof.luminaryBonus)) : 0)
}

function natalAspects(points: PointPos[], angles: { asc: number; mc: number } | null): Aspect[] {
  const items = [
    ...points.filter((p) => !NO_ASPECT.has(p.id)).map((p) => ({ id: p.id, lon: p.lon, speed: p.speed, decl: p.declination })),
    ...(angles ? [{ id: 'asc', lon: angles.asc, speed: 0, decl: NaN }, { id: 'mc', lon: angles.mc, speed: 0, decl: NaN }] : [])
  ]
  const out: Aspect[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i]
      const B = items[j]
      if (A.id === 'asc' && B.id === 'mc') continue
      const a = aspectBetween(A, B, natalOrb)
      if (a) out.push(a)
      if (settings.showParallels && Number.isFinite(A.decl) && Number.isFinite(B.decl) && !(A.id === 'northnode' || B.id === 'northnode')) {
        const par = Math.abs(A.decl - B.decl)
        const contra = Math.abs(A.decl + B.decl)
        if (par <= 1) out.push({ a: A.id, b: B.id, type: 'parallel', angle: 0, orb: par, applying: false })
        else if (contra <= 1) out.push({ a: A.id, b: B.id, type: 'contraparallel', angle: 0, orb: contra, applying: false })
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb)
}

function crossAspects(outer: ChartResult, inner: ChartResult, orbOf: (type: string, a: string, b: string) => number | null): Aspect[] {
  const os = outer.points.filter((p) => !NO_ASPECT.has(p.id))
  const is = [
    ...inner.points.filter((p) => !NO_ASPECT.has(p.id)),
    ...(inner.hasHouses ? [{ id: 'asc', lon: inner.angles.asc, speed: 0 }, { id: 'mc', lon: inner.angles.mc, speed: 0 }] : [])
  ]
  const out: Aspect[] = []
  for (const A of os) for (const B of is) {
    const a = aspectBetween(A, { ...B, speed: 0 }, orbOf)
    if (a) out.push(a)
  }
  return out.sort((x, y) => x.orb - y.orb)
}

const majorOnly = (orb: number) => (type: string): number | null => (ASPECTS.find((a) => a.type === type)?.major ? orb : null)

// ——— Sabit yıldızlar ———

function starContacts(jd: number, points: PointPos[], angles: { asc: number; mc: number } | null): StarContact[] {
  const flags = C.SEFLG_SWIEPH | zf()
  const targets = [
    ...points.filter((p) => !['southnode', 'lilith', 'fortune'].includes(p.id)).map((p) => ({ id: p.id, lon: p.lon })),
    ...(angles ? [{ id: 'asc', lon: angles.asc }, { id: 'mc', lon: angles.mc }] : [])
  ]
  const out: StarContact[] = []
  for (const s of STARS) {
    const r = sweph.fixstar2_ut(s, jd, flags)
    if (r.flag < 0) continue
    for (const t of targets) {
      const orb = separation(r.data[0], t.lon)
      if (orb <= settings.fixedStarOrb) out.push({ star: s, starLon: r.data[0], point: t.id, orb })
    }
  }
  return out.sort((a, b) => a.orb - b.orb)
}

// ——— Harita kurulumu ———

interface MakeOpts {
  input: ChartInput
  jd: number
  place: Place | null // null: ev yok (ör. dış çarktaki transitler)
  hsys: HouseSystem
  kind: ChartResult['kind']
  label: string
  offsetMinutes?: number
  offsetSource?: string
  warnings?: string[]
  houses?: HouseData // hazır ev verisi (progresyon, kompozit)
  points?: PointPos[] // hazır konumlar (solar arc, kompozit)
}

function makeChart(o: MakeOpts): ChartResult {
  const warnings = [...(o.warnings ?? [])]
  const geo = o.place ? { lat: o.place.lat, lon: o.place.lon } : null
  const points = o.points ?? computePoints(o.jd, o.input.nodeType, geo, warnings)
  const wantHouses = !!o.place && !o.input.timeUnknown
  let h: HouseData | null = o.houses ?? (wantHouses && geo ? computeHouses(o.jd, geo, o.hsys, warnings) : null)
  if (!wantHouses) h = null
  if (h) {
    for (const p of points) p.house = houseOf(p.lon, h.cusps)
    if (geo && !o.points) {
      const eps = obliquityAt(o.jd)
      const aya = settings.zodiac === 'sidereal' ? ayanamsaAt(o.jd) : 0
      for (const p of points) {
        const r = sweph.house_pos(h.armc, geo.lat, eps, o.hsys, [norm360(p.lon + aya), p.lat])
        if (!r.error) p.housePos = r.data
      }
    }
    if (!points.some((p) => p.id === 'fortune')) addFortune(points, h.asc)
    const f = points.find((p) => p.id === 'fortune')
    if (f) f.house = houseOf(f.lon, h.cusps)
  }
  const angles = h
    ? { asc: h.asc, mc: h.mc, dsc: norm360(h.asc + 180), ic: norm360(h.mc + 180), vertex: h.vertex, armc: h.armc }
    : { asc: 0, mc: 0, dsc: 180, ic: 180, vertex: 0, armc: 0 }
  const dT = sweph.deltat(o.jd)
  const sid = geo ? norm360((sweph.sidtime(o.jd) + geo.lon / 15) * 15) / 15 : sweph.sidtime(o.jd)
  return {
    input: o.input,
    label: o.label,
    kind: o.kind,
    houseSystem: o.hsys,
    houseSystemUsed: h ? h.used : '—',
    utc: isoFromJd(o.jd),
    jdUt: o.jd,
    jdTt: o.jd + dT,
    deltaT: dT * 86400,
    obliquity: obliquityAt(o.jd),
    siderealTime: sid,
    ayanamsa: settings.zodiac === 'sidereal' ? ayanamsaAt(o.jd) : undefined,
    offsetMinutes: o.offsetMinutes ?? 0,
    offsetSource: o.offsetSource ?? 'UTC',
    warnings,
    ephemeris: warnings.some((w) => w.includes('Moshier')) ? t('Moshier (yedek)') : `Swiss Ephemeris ${sweph.version()}`,
    zodiac: zodiacName(),
    points,
    cusps: h ? h.cusps : [],
    angles,
    hasHouses: !!h,
    aspects: natalAspects(points, h ? angles : null),
    stars: starContacts(o.jd, points, h ? angles : null),
    place: o.place ?? undefined,
    lots: h ? computeLots(points, h.asc, h.cusps, (points.find((p) => p.id === 'sun')?.house ?? 0) >= 7) : [],
    isDay: h ? (points.find((p) => p.id === 'sun')?.house ?? 0) >= 7 : undefined
  }
}

function birth(input: ChartInput, shiftMin = 0) {
  const tu = toUtc(input)
  const ms = tu.utcMs + shiftMin * 60000
  const d = new Date(ms)
  const r = sweph.utc_to_jd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds() + d.getUTCMilliseconds() / 1000, C.SE_GREG_CAL)
  if (r.flag !== C.OK) throw new Error(t('Jülyen günü hesaplanamadı: {error}', { error: r.error }))
  return { jd: r.data[1], t: tu }
}

export function natalChart(input: ChartInput, hsys?: HouseSystem, shiftMin = 0): ChartResult {
  const b = birth(input, shiftMin)
  const warnings = [...b.t.warnings]
  if (input.timeUnknown) {
    warnings.unshift(t('Doğum saati bilinmiyor: 12:00 varsayıldı. Yükselen, MC ve evler bu yüzden gösterilmiyor. Ay gün içinde yaklaşık ±6–7° oynayabilir; diğer gezegenler ±1°\'nin altında kalır.'))
  }
  if (shiftMin) warnings.unshift(t('Simülasyon: doğum saati {min} dakika kaydırılmış olarak hesaplandı. Kayıtlı saat değişmedi.', { min: `${shiftMin > 0 ? '+' : ''}${shiftMin}` }))
  const ch = makeChart({
    input, jd: b.jd, place: input.place, hsys: hsys ?? input.houseSystem, kind: 'natal', label: t('Doğum haritası'),
    offsetMinutes: b.t.offsetMinutes, offsetSource: b.t.source, warnings
  })
  if (shiftMin) ch.shiftMin = shiftMin
  // UTC gösterimi saat dilimi dönüşümünden (tam saniye); Jülyen günü UT1'dir (Swiss Ephemeris utc_to_jd, UT1 = UTC + DUT1)
  const utcMs = b.t.utcMs + shiftMin * 60000
  ch.utc = new Date(utcMs).toISOString()
  ch.jdUtc = utcMs / 86400000 + 2440587.5
  if (input.timeUnknown && !shiftMin) applyMoonUncertainty(ch, b.jd)
  if (!input.timeUnknown) addTimeSensitivity(ch, b.jd)
  return ch
}

/**
 * Saat bilinmiyor: Ay gün içinde ~12–15° ilerler. Ay'ın açılarını yerel gün boyunca (12:00 ± 12 saat) 30 dakikalık
 * adımlarla tarar: tüm gün orb içindeyse "kesin", yalnızca günün bir kısmında "saate bağlı", 12:00'de yok ama gün içinde
 * oluşabiliyorsa "olası". Ayrıca Ay'ın gün içinde burç değiştirip değiştirmediğini bildirir.
 */
function applyMoonUncertainty(ch: ChartResult, noonJd: number) {
  const flags = C.SEFLG_SWIEPH | C.SEFLG_SPEED | zf()
  const N = 48
  const times = Array.from({ length: N + 1 }, (_, k) => noonJd - 0.5 + k / N)
  const moonLon = times.map((t) => sweph.calc_ut(t, C.SE_MOON, flags).data[0])
  const minL = moonLon[0], maxL = moonLon[N]
  ch.moonRange = { from: minL, to: maxL }
  if (signOf(minL) !== signOf(maxL)) ch.warnings.unshift(t("Ay doğum gününde burç değiştiriyor: günün başında {from}, sonunda {to}. Ay'ın burcu doğum saatine bağlıdır.", { from: SIGNS[signOf(minL)].name, to: SIGNS[signOf(maxL)].name }))
  const others = ch.points.filter((p) => p.id !== 'moon' && !NO_ASPECT.has(p.id))
  // Ay'ın paralelleri (deklinasyon da gün içinde değişir): saate bağlı say
  const keep = ch.aspects.filter((a) => (a.a !== 'moon' && a.b !== 'moon') || a.type === 'parallel' || a.type === 'contraparallel')
    .map((a) => (a.a === 'moon' || a.b === 'moon' ? { ...a, certainty: 'saate-bagli' as const } : a))
  const moonAsp: Aspect[] = []
  for (const p of others) {
    const se = BODY_BY_ID[p.id]?.se ?? (p.id === 'northnode' ? (ch.input.nodeType === 'mean' ? C.SE_MEAN_NODE : C.SE_TRUE_NODE) : undefined)
    const pl = se === undefined ? times.map(() => p.lon) : times.map((t) => sweph.calc_ut(t, se, flags).data[0])
    const sep = times.map((_, k) => separation(moonLon[k], pl[k]))
    for (const asp of ASPECTS) {
      const max = natalOrb(asp.type, 'moon', p.id)
      if (max === null) continue
      const dev = sep.map((s) => Math.abs(s - asp.angle))
      const inside = dev.map((d) => d <= max)
      const count = inside.filter(Boolean).length
      if (!count) continue
      const atNoon = inside[N / 2]
      // Ay'ın görece hareketi tek yönlü: sapmanın gün içinde bir iç minimumu varsa tam açı o gün oluşuyor
      const exactInDay = dev.some((d, k) => k > 0 && k < N && d <= dev[k - 1] && d <= dev[k + 1])
      const certainty = count === N + 1 ? 'kesin' : atNoon ? 'saate-bagli' : 'olasi'
      const minOrb = Math.min(...dev)
      const a = moonAsp.find((x) => x.b === p.id || x.a === p.id)
      if (a && a.certainty === 'kesin') continue // bir noktaya tek açı: kesin olan öncelikli
      const later = Math.abs(separation(moonLon[N / 2] + 0.1, pl[N / 2]) - asp.angle)
      moonAsp.push({
        a: 'moon', b: p.id, type: asp.type, angle: asp.angle, orb: dev[N / 2], applying: later < dev[N / 2],
        certainty, minOrb, applyingUnknown: exactInDay
      })
    }
  }
  ch.aspects = [...keep, ...moonAsp].sort((x, y) => x.orb - y.orb)
}

/**
 * Saat duyarlılığı: Ay, Yükselen veya MC burç sınırına yakınsa, doğum saatinde kaç dakikalık farkın burcu değiştireceği.
 * Ay için hız, köşeler için sayısal türev (±2 dk) kullanılır. Eşik: Ay 120 dk, köşeler 10 dk.
 */
function addTimeSensitivity(ch: ChartResult, jd: number) {
  const sens: { id: string; name: string; minutes: number; direction: 'erken' | 'geç'; otherSign: number }[] = []
  const check = (id: string, name: string, lon: number, degPerDay: number, limitMin: number) => {
    if (!degPerDay) return
    const inSign = norm360(lon) % 30
    // ileri hareket: sonraki sınıra (geç doğum), geriye: önceki sınıra (erken doğum)
    const toNext = (30 - inSign) / Math.abs(degPerDay) * 1440
    const toPrev = inSign / Math.abs(degPerDay) * 1440
    const s = signOf(lon)
    const fwd = degPerDay > 0
    if (Math.min(toNext, toPrev) > limitMin) return
    const useNext = toNext < toPrev
    const later = useNext === fwd
    sens.push({ id, name, minutes: Math.min(toNext, toPrev), direction: later ? 'geç' : 'erken', otherSign: (s + (useNext ? 1 : 11)) % 12 })
  }
  const moon = ch.points.find((p) => p.id === 'moon')
  if (moon) check('moon', t('Ay'), moon.lon, moon.speed, 120)
  if (ch.hasHouses && ch.place) {
    const geo = { lat: ch.place.lat, lon: ch.place.lon }
    const dt = 2 / 1440
    const w: string[] = []
    const a = computeHouses(jd - dt, geo, ch.houseSystem, w), b = computeHouses(jd + dt, geo, ch.houseSystem, w)
    const ascSpeed = norm180(b.asc - a.asc) / (2 * dt), mcSpeed = norm180(b.mc - a.mc) / (2 * dt)
    check('asc', t('Yükselen'), ch.angles.asc, ascSpeed, 10)
    check('mc', 'MC', ch.angles.mc, mcSpeed, 10)
  }
  scanTimeChanges(ch, jd)
  if (!sens.length) return
  ch.sensitivity = sens
  for (const x of sens) {
    const vars = { name: x.name, sign: SIGNS[signOf(x.id === 'moon' ? ch.points.find((p) => p.id === 'moon')!.lon : x.id === 'asc' ? ch.angles.asc : ch.angles.mc)].name, min: Math.max(1, Math.round(x.minutes)), other: SIGNS[x.otherSign].name }
    ch.warnings.push(x.direction === 'geç'
      ? t('Saat duyarlılığı: {name} burç sınırına çok yakın ({sign}). Doğum saati yaklaşık {min} dakika geç olsaydı {name} {other} burcunda olurdu. Saat kaydının kaynağını (Rodden) dikkate alın.', vars)
      : t('Saat duyarlılığı: {name} burç sınırına çok yakın ({sign}). Doğum saati yaklaşık {min} dakika erken olsaydı {name} {other} burcunda olurdu. Saat kaydının kaynağını (Rodden) dikkate alın.', vars))
  }
}

/**
 * Saat duyarlılığı taraması (doğum saati ±60 dk, 1 dk adım): yükselen/MC burcu, gezegenlerin evleri, Şans Noktası'nın
 * burcu ve evi, yükselen ve MC ile açıların oluşması/kaybolması. Her öğe için ilk değişimin kaç dakika erken veya geç
 * doğumda olduğu kaydedilir. Ay'ın konumu hızıyla, diğer gezegenler sabit kabul edilir (bir saatte < 0,1°).
 */
function scanTimeChanges(ch: ChartResult, jd: number) {
  if (!ch.hasHouses || !ch.place) return
  const geo = { lat: ch.place.lat, lon: ch.place.lon }
  const W = 60
  const pts = ch.points.filter((p) => !['fortune', 'southnode', 'lilith'].includes(p.id))
  const moon = ch.points.find((p) => p.id === 'moon')
  const sun = ch.points.find((p) => p.id === 'sun')
  const lonAt = (p: PointPos, m: number) => norm360(p.lon + p.speed * (m / 1440))
  const state = (m: number) => {
    const h = computeHouses(jd + m / 1440, geo, ch.houseSystem, [])
    const out: Record<string, string> = { 'sign:asc': String(signOf(h.asc)), 'sign:mc': String(signOf(h.mc)) }
    for (const p of pts) out['house:' + p.id] = String(houseOf(lonAt(p, m), h.cusps))
    if (moon && sun) {
      const day = houseOf(lonAt(sun, m), h.cusps) >= 7
      const f = norm360(day ? h.asc + lonAt(moon, m) - lonAt(sun, m) : h.asc + lonAt(sun, m) - lonAt(moon, m))
      out['sign:fortune'] = String(signOf(f)); out['house:fortune'] = String(houseOf(f, h.cusps))
    }
    for (const p of pts) for (const [ang, lon] of [['asc', h.asc], ['mc', h.mc]] as const) {
      const a = aspectBetween({ id: p.id, lon: lonAt(p, m), speed: 0 }, { id: ang, lon, speed: 0 }, natalOrb)
      out[`asp:${p.id}:${ang}`] = a ? a.type : ''
    }
    return out
  }
  const base = state(0)
  const first: Record<string, { minutes: number; direction: 'erken' | 'geç'; to: string }> = {}
  for (let m = 1; m <= W; m++) {
    for (const dir of [1, -1] as const) {
      const s = state(dir * m)
      for (const k of Object.keys(base)) if (!first[k] && s[k] !== base[k]) first[k] = { minutes: m, direction: dir > 0 ? 'geç' : 'erken', to: s[k] }
    }
  }
  const name = (id: string) => (id === 'asc' ? t('Yükselen') : id === 'mc' ? 'MC' : id === 'fortune' ? t('Şans Noktası') : ch.points.find((p) => p.id === id)?.name ?? id)
  const list: NonNullable<ChartResult['timeChanges']> = []
  for (const [k, v] of Object.entries(first)) {
    const [kind, id, ang] = k.split(':')
    const from = base[k], to = v.to
    let text = ''
    if (kind === 'sign') text = t('{name}: {from} → {to}', { name: name(id), from: SIGNS[+from].name, to: SIGNS[+to].name })
    else if (kind === 'house') text = t('{name}: {from}. ev → {to}. ev', { name: name(id), from, to })
    else {
      const A = ASPECTS.find((x) => x.type === (from || to))
      text = from && !to ? t('{name} ile {angle} arasındaki {aspect} kaybolur', { name: name(id), angle: name(ang), aspect: A?.name.toLowerCase() ?? '' })
        : !from && to ? t('{name} ile {angle} arasında {aspect} oluşur', { name: name(id), angle: name(ang), aspect: A?.name.toLowerCase() ?? '' })
          : t('{name} ile {angle} arasındaki açı değişir', { name: name(id), angle: name(ang) })
    }
    list.push({ kind: kind as 'sign' | 'house' | 'asp', id, ...(ang ? { with: ang } : {}), minutes: v.minutes, direction: v.direction, text })
  }
  ch.timeChanges = list.sort((a, b) => a.minutes - b.minutes)
}

function draconic(ch: ChartResult): ChartResult {
  const nn = ch.points.find((p) => p.id === 'northnode')
  if (!nn) return ch
  const s = nn.lon
  const points = ch.points.map((p) => ({ ...p, lon: norm360(p.lon - s), dignity: dignityOf(p.id, norm360(p.lon - s), settings.rulership) }))
  const sh = (x: number) => norm360(x - s)
  const angles = ch.hasHouses
    ? { ...ch.angles, asc: sh(ch.angles.asc), mc: sh(ch.angles.mc), dsc: sh(ch.angles.dsc), ic: sh(ch.angles.ic), vertex: sh(ch.angles.vertex) }
    : ch.angles
  return {
    ...ch, kind: 'draconic', label: t('Drakonik harita'), points, angles, cusps: ch.cusps.map(sh),
    aspects: natalAspects(points, ch.hasHouses ? angles : null), stars: starContacts(ch.jdUt, points, ch.hasHouses ? angles : null),
    lots: ch.lots.map((l) => ({ ...l, lon: sh(l.lon) }))
  }
}

const TROPICAL_YEAR = 365.242199
const LUNAR_MONTH = 27.321582 // tropikal kameri ay (gün)

/**
 * İkinci çarkın (transit, progresyon, partner, natal…) noktalarını iç çarkın evlerine yerleştirir.
 * Ev, ekliptik boylama göre iç çarkın ev başlangıçları arasında belirlenir (transit/sinastri için yaygın uygulama).
 */
export function view(input: ChartInput, req: ViewRequest): ViewResult {
  const r = viewRaw(input, req)
  if (r.outer && r.inner.hasHouses && r.inner.cusps.length === 12) {
    const cusps = r.inner.cusps
    r.outer = { ...r.outer, points: r.outer.points.map((p) => ({ ...p, innerHouse: houseOf(p.lon, cusps) })) }
  }
  return r
}

function viewRaw(input: ChartInput, req: ViewRequest): ViewResult {
  const hsys = req.houseSystem ?? input.houseSystem
  const natal = natalChart(input, hsys, req.timeShiftMin ?? 0)
  const target = req.date ? jdFromMs(Date.parse(req.date)) : jdFromMs(Date.now())
  const who = input.name

  switch (req.mode) {
    case 'natal':
    case 'acg':
      return { inner: natal, cross: [], title: who, subtitle: '' }
    case 'relocated': {
      // aynı doğum anı, evler ve köşeler başka bir yer için
      const at = req.place ?? input.place
      const rel = makeChart({ input: { ...input }, jd: natal.jdUt, place: at, hsys, kind: 'relocated', label: t('Taşınma haritası'), offsetMinutes: natal.offsetMinutes, offsetSource: natal.offsetSource })
      rel.warnings.unshift(t('Taşınma haritası: doğum anı aynı ({utc} UT); evler ve köşeler {place} ({lat}°, {lon}°) için hesaplandı.', { utc: natal.utc.slice(0, 16).replace('T', ' '), place: placeLabel(at), lat: at.lat.toFixed(4), lon: at.lon.toFixed(4) }))
      return { inner: rel, cross: [], title: who, subtitle: t('Taşınma · {place}', { place: placeLabel(at) }) }
    }
    case 'draconic':
      return { inner: draconic(natal), cross: [], title: who, subtitle: t('Drakonik harita') }
    case 'transit': {
      const outer = makeChart({ input, jd: target, place: null, hsys, kind: 'transit', label: t('Transitler') })
      return { inner: natal, outer, cross: crossAspects(outer, natal, majorOnly(settings.transitOrb)), title: who, subtitle: t('Transitler') }
    }
    case 'progressed':
    case 'tertiary':
    case 'minor': {
      const elapsed = target - natal.jdUt // gerçek geçen gün
      const age = elapsed / TROPICAL_YEAR
      // İkincil: 1 gün = 1 yıl · Tersiyer: 1 gün = 1 kameri ay · Minör: 1 kameri ay = 1 yıl
      const pdays = req.mode === 'progressed' ? age : req.mode === 'tertiary' ? elapsed / LUNAR_MONTH : age * LUNAR_MONTH
      const pjd = natal.jdUt + pdays
      const label = t(req.mode === 'progressed' ? 'İkincil progresyon' : req.mode === 'tertiary' ? 'Tersiyer progresyon' : 'Minör progresyon')
      const pts = computePoints(pjd, input.nodeType, null, [])
      let houses: HouseData | undefined
      if (natal.hasHouses) {
        const arc = norm180((pts.find((p) => p.id === 'sun')?.lon ?? 0) - (natal.points.find((p) => p.id === 'sun')?.lon ?? 0))
        houses = housesFromMc(norm360(natal.angles.mc + arc), input.place.lat, pjd, hsys)
      }
      const outer = makeChart({
        input, jd: pjd, place: natal.hasHouses ? input.place : null, hsys, kind: req.mode, label,
        points: pts, houses, warnings: natal.hasHouses ? [t('Progresif köşe noktaları: MC güneş yayıyla (solar arc), yükselen bu MC\'den doğum enleminde hesaplandı.')] : []
      })
      return { inner: natal, outer, cross: crossAspects(outer, natal, majorOnly(settings.progressionOrb)), title: who, subtitle: t('{label} · yaş {age} · progresif an {date}', { label, age: age.toFixed(2), date: isoFromJd(pjd).slice(0, 10) }) }
    }
    case 'harmonic': {
      const n = Math.max(1, Math.min(180, Math.round(req.harmonic ?? 5)))
      const hl = (x: number) => norm360(x * n)
      const points: PointPos[] = natal.points.filter((p) => p.id !== 'southnode' && p.id !== 'fortune').map((p) => ({
        ...p, lon: hl(p.lon), house: 0, housePos: undefined, azimuth: undefined, altitude: undefined, ra: undefined, distance: undefined, declination: 0, dignity: undefined, stationary: false, station: undefined
      }))
      if (natal.hasHouses) {
        points.push(
          { id: 'h-asc', name: t('H{n} Yükselen', { n }), glyph: 'AC', lon: hl(natal.angles.asc), lat: 0, speed: 0, retro: false, house: 0, declination: 0 },
          { id: 'h-mc', name: `H${n} MC`, glyph: 'MC', lon: hl(natal.angles.mc), lat: 0, speed: 0, retro: false, house: 0, declination: 0 }
        )
      }
      const h = makeChart({ input: { ...input, timeUnknown: true }, jd: natal.jdUt, place: null, hsys, kind: 'harmonic', label: t('{n}. harmonik', { n }), points })
      h.input = input
      h.warnings.unshift(t('{n}. harmonik: her boylam {n} ile çarpıldı (mod 360°). Bu haritadaki kavuşumlar natal haritadaki 360°/{n} = {deg}° katı açılara karşılık gelir.', { n, deg: (360 / n).toFixed(2) }))
      return { inner: h, cross: [], title: who, subtitle: t('{n}. harmonik harita', { n }) }
    }
    case 'solararc': {
      const age = (target - natal.jdUt) / TROPICAL_YEAR
      const ps = computePoints(natal.jdUt + age, input.nodeType, null, [])
      const arc = norm360((ps.find((p) => p.id === 'sun')?.lon ?? 0) - (natal.points.find((p) => p.id === 'sun')?.lon ?? 0))
      const points = natal.points.filter((p) => p.id !== 'fortune').map((p) => ({ ...p, lon: norm360(p.lon + arc), house: 0, housePos: undefined, azimuth: undefined, altitude: undefined, retro: false, speed: 0, stationary: false, station: undefined, dignity: dignityOf(p.id, norm360(p.lon + arc), settings.rulership) }))
      const outer = makeChart({ input, jd: natal.jdUt + age, place: null, hsys, kind: 'solararc', label: 'Solar arc', points })
      if (natal.hasHouses) {
        outer.points.push(
          { id: 'sa-asc', name: t('SA Yükselen'), glyph: 'AC', lon: norm360(natal.angles.asc + arc), lat: 0, speed: 0, retro: false, house: 0, declination: 0 },
          { id: 'sa-mc', name: 'SA MC', glyph: 'MC', lon: norm360(natal.angles.mc + arc), lat: 0, speed: 0, retro: false, house: 0, declination: 0 }
        )
      }
      return { inner: natal, outer, cross: crossAspects(outer, natal, majorOnly(settings.progressionOrb)), title: who, subtitle: t('Solar arc · yay {arc}° · yaş {age}', { arc: arc.toFixed(2), age: age.toFixed(2) }) }
    }
    case 'solarreturn':
    case 'lunarreturn': {
      const isSun = req.mode === 'solarreturn'
      const natalLon = natal.points.find((p) => p.id === (isSun ? 'sun' : 'moon'))?.lon ?? 0
      const flags = C.SEFLG_SWIEPH | zf()
      const r = isSun ? sweph.solcross_ut(natalLon, target, flags) : sweph.mooncross_ut(natalLon, target, flags)
      if (r.error) throw new Error(t('Dönüş anı bulunamadı: {error}', { error: r.error }))
      const at = req.place ?? input.place
      const retInput: ChartInput = { ...input, timeUnknown: false }
      const ret = makeChart({ input: retInput, jd: r.date, place: at, hsys, kind: req.mode, label: t(isSun ? 'Güneş dönüşü' : 'Ay dönüşü'), offsetSource: t('Dönüş anı (UTC)') })
      ret.warnings.unshift(at === input.place ? t('Dönüş haritası {place} için kuruldu (doğum yeri).', { place: placeLabel(at) }) : t('Dönüş haritası {place} için kuruldu.', { place: placeLabel(at) }))
      if (input.timeUnknown) ret.warnings.unshift(isSun ? t('Doğum saati bilinmediği için natal Güneş konumu yaklaşık; dönüş anı birkaç saat kayabilir.') : t('Doğum saati bilinmediği için natal Ay konumu yaklaşık; dönüş anı birkaç saat kayabilir.'))
      const natalOuter = { ...natal, label: t('Doğum haritası') }
      return { inner: ret, outer: natalOuter, cross: crossAspects(natalOuter, ret, majorOnly(settings.transitOrb)), title: who, subtitle: t(isSun ? 'Güneş dönüşü · {place}' : 'Ay dönüşü · {place}', { place: placeLabel(at) }) }
    }
    case 'synastry': {
      if (!req.partner) throw new Error(t('Sinastri için ikinci bir harita seçin.'))
      const b = natalChart(req.partner, hsys)
      const outer = { ...b, label: req.partner.name }
      return { inner: natal, outer, cross: crossAspects(outer, natal, natalOrb), title: `${who} × ${req.partner.name}`, subtitle: t('Sinastri') }
    }
    case 'composite': {
      if (!req.partner) throw new Error(t('Kompozit için ikinci bir harita seçin.'))
      const b = natalChart(req.partner, hsys)
      const midJd = (natal.jdUt + b.jdUt) / 2
      const pb = Object.fromEntries(b.points.map((p) => [p.id, p]))
      const points: PointPos[] = natal.points
        .filter((p) => pb[p.id] && p.id !== 'fortune' && p.id !== 'southnode')
        .map((p) => {
          const lon = midpoint(p.lon, pb[p.id].lon)
          return { id: p.id, name: p.name, glyph: p.glyph, lon, lat: 0, speed: (p.speed + pb[p.id].speed) / 2, retro: false, house: 0, declination: (p.declination + pb[p.id].declination) / 2, dignity: dignityOf(p.id, lon, settings.rulership) }
        })
      const nn = points.find((p) => p.id === 'northnode')
      if (nn) points.push({ ...nn, id: 'southnode', name: t('G. Ay Düğümü'), glyph: '☋' + VS, lon: norm360(nn.lon + 180) })
      const both = natal.hasHouses && b.hasHouses
      const lat = (input.place.lat + req.partner.place.lat) / 2
      const houses = both ? housesFromMc(midpoint(natal.angles.mc, b.angles.mc), lat, midJd, hsys) : undefined
      const compInput: ChartInput = { ...input, name: `${who} + ${req.partner.name}`, timeUnknown: !both }
      const comp = makeChart({ input: compInput, jd: midJd, place: both ? { ...input.place, lat } : null, hsys, kind: 'composite', label: t('Kompozit'), points, houses, offsetSource: t('Orta nokta yöntemi') })
      comp.warnings.unshift(t('Kompozit: gezegenler iki haritadaki konumların kısa yay orta noktası; MC orta noktasından ve ortalama enlemden evler kuruldu.'))
      if (!both) comp.warnings.unshift(t('Haritalardan birinde doğum saati bilinmediği için kompozit evler hesaplanmadı.'))
      return { inner: comp, cross: [], title: `${who} + ${req.partner.name}`, subtitle: t('Kompozit (orta nokta)') }
    }
  }
}

// ——— Transit listesi ———

const ASPECT_TARGETS = ASPECTS.filter((a) => a.major).flatMap((a) => (a.angle === 0 || a.angle === 180 ? [{ type: a.type, off: a.angle }] : [{ type: a.type, off: a.angle }, { type: a.type, off: -a.angle }]))

export function transitList(input: ChartInput, fromIso: string, toIso: string, planetIds: string[]): TransitEvent[] {
  const natal = natalChart(input)
  const from = jdFromMs(Date.parse(fromIso))
  const to = jdFromMs(Date.parse(toIso))
  if (!(to > from)) return []
  if (to - from > 3660 * 3) throw new Error(t('En fazla 30 yıllık aralık hesaplanabilir.'))
  const flags = C.SEFLG_SWIEPH | C.SEFLG_SPEED | zf()
  const targets = [
    ...natal.points.filter((p) => !['southnode', 'lilith', 'fortune'].includes(p.id)).map((p) => ({ id: p.id, lon: p.lon })),
    ...(natal.hasHouses ? [{ id: 'asc', lon: natal.angles.asc }, { id: 'mc', lon: natal.angles.mc }] : [])
  ]
  const events: TransitEvent[] = []
  for (const pid of planetIds) {
    const body = BODY_BY_ID[pid]
    if (!body) continue
    const lonAt = (jd: number) => sweph.calc_ut(jd, body.se, flags).data
    const step = pid === 'moon' ? 0.25 : 1
    const samples: { jd: number; lon: number; speed: number }[] = []
    for (let jd = from - step; jd <= to + step; jd += step) { const d = lonAt(jd); samples.push({ jd, lon: d[0], speed: d[3] }) }
    const refine = (a: number, b: number, f: (jd: number) => number) => {
      let fa = f(a)
      for (let k = 0; k < 40; k++) {
        const m = (a + b) / 2
        const fm = f(m)
        if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm } else b = m
      }
      return (a + b) / 2
    }
    const push = (jd: number, e: Omit<TransitEvent, 'jd' | 'utc' | 'transit'>) => {
      if (jd < from || jd > to) return
      const house = natal.hasHouses ? houseOf(lonAt(jd)[0], natal.cusps) : undefined
      events.push({ jd, utc: isoFromJd(jd), transit: pid, ...e, ...(house ? { house } : {}) })
    }

    for (let k = 0; k < samples.length - 1; k++) {
      const s0 = samples[k]
      const s1 = samples[k + 1]
      // duraklamalar
      if (body.station !== undefined && Math.sign(s0.speed) !== Math.sign(s1.speed)) {
        const jd = refine(s0.jd, s1.jd, (x) => lonAt(x)[3])
        push(jd, { type: s0.speed > 0 ? 'station-retro' : 'station-direct', retro: s0.speed > 0, sign: signOf(lonAt(jd)[0]) })
      }
      // burç geçişleri
      if (signOf(s0.lon) !== signOf(s1.lon) && Math.abs(norm180(s1.lon - s0.lon)) < 30) {
        const boundary = s1.speed >= 0 ? signOf(s1.lon) * 30 : signOf(s0.lon) * 30
        const jd = refine(s0.jd, s1.jd, (x) => norm180(lonAt(x)[0] - boundary))
        push(jd, { type: 'ingress', retro: s1.speed < 0, sign: signOf(lonAt(jd + 1e-4 * Math.sign(s1.speed || 1))[0]) })
      }
      // açılar
      if (pid === 'moon') continue
      for (const t of targets) {
        for (const a of ASPECT_TARGETS) {
          const goal = t.lon + a.off
          const v0 = norm180(s0.lon - goal)
          const v1 = norm180(s1.lon - goal)
          if (v0 === 0 || Math.sign(v0) === Math.sign(v1) || Math.abs(v0 - v1) > 90) continue
          const jd = refine(s0.jd, s1.jd, (x) => norm180(lonAt(x)[0] - goal))
          push(jd, { type: a.type, natal: t.id, retro: lonAt(jd)[3] < 0 })
        }
      }
    }
  }
  events.sort((a, b) => a.jd - b.jd)
  addTransitWindows(events, targets, flags)
  return events
}

const ASPECT_ANGLE: Record<string, number> = Object.fromEntries(ASPECTS.map((a) => [a.type, a.angle]))

/** Aynı açının tekrarları bu süre içinde ise tek seri sayılır (bir retrograd döngüsü, gün) */
const SERIES_GAP: Record<string, number> = { sun: 0, mercury: 70, venus: 90, mars: 220, jupiter: 330, saturn: 350, uranus: 380, neptune: 380, pluto: 380, chiron: 380 }

/**
 * Etkinlik dönemi ve retrograd serisi.
 * Seri: aynı transit gezegenin aynı natal noktaya aynı yönlü açısının, bir retrograd döngüsü içinde kalan kesinleşmeleri
 * (seçili tarih aralığının dışındakiler de sayılır). Etkinlik dönemi: serinin ilk kesinleşmesinden önce orba giriş,
 * sonuncusundan sonra orbdan çıkış (transit orbu, Ayarlar).
 */
function addTransitWindows(events: TransitEvent[], targets: { id: string; lon: number }[], flags: number) {
  const orb = settings.transitOrb
  const tlon = Object.fromEntries(targets.map((t) => [t.id, t.lon]))
  const done = new Map<string, { hits: number[]; start: string; end: string; segments?: { start: string; end: string }[] }>()
  for (const e of events) {
    if (!e.natal || tlon[e.natal] === undefined) continue
    const body = BODY_BY_ID[e.transit]
    const lonAt = (jd: number) => sweph.calc_ut(jd, body.se, flags).data[0]
    const angle = ASPECT_ANGLE[e.type]
    const off = angle === 0 || angle === 180 ? angle : Math.sign(norm180(lonAt(e.jd) - tlon[e.natal])) * angle
    const goal = tlon[e.natal] + off
    const signed = (jd: number) => norm180(lonAt(jd) - goal)
    const dev = (jd: number) => Math.abs(Math.abs(norm180(lonAt(jd) - tlon[e.natal!])) - angle) - orb
    const gap = SERIES_GAP[e.transit] ?? 0
    const step = ['sun', 'mercury', 'venus'].includes(e.transit) ? 0.25 : e.transit === 'mars' ? 0.5 : 1
    const key = `${e.transit}|${e.natal}|${off}`
    // bu olay daha önce bulunmuş bir serinin içinde mi?
    let series = [...done.entries()].find(([k, v]) => k.startsWith(key + '|') && v.hits.some((h) => Math.abs(h - e.jd) < 1e-3))?.[1]
    if (!series) {
      // kesinleşmeleri iki yöne zincirle: son bulunandan itibaren 'gap' gün içinde yenisi varsa devam
      const hits = [e.jd]
      const scan = (from: number, dir: 1 | -1) => {
        let t0 = from + dir * 1e-3
        let v0 = signed(t0)
        let lastHit = from
        for (let t1 = t0 + dir * step; Math.abs(t1 - lastHit) <= gap; t1 += dir * step) {
          const v1 = signed(t1)
          if (v0 !== 0 && Math.sign(v0) !== Math.sign(v1) && Math.abs(v0 - v1) < 90) {
            const h = bisect(Math.min(t0, t1), Math.max(t0, t1), signed)
            hits.push(h); lastHit = h
          }
          t0 = t1; v0 = v1
        }
      }
      if (gap > 0) { scan(e.jd, 1); scan(e.jd, -1) }
      hits.sort((x, y) => x - y)
      const edge = (from: number, dir: 1 | -1) => {
        let t0 = from
        for (let k = 1; k * step <= 1461; k++) {
          const t1 = from + dir * k * step
          if (dev(t1) > 0) return bisect(Math.min(t0, t1), Math.max(t0, t1), dev)
          t0 = t1
        }
        return t0
      }
      const s0 = edge(hits[0], -1), s1 = edge(hits[hits.length - 1], 1)
      // orb içinde kalınan parçalar: arada orb dışına çıkılıyorsa birden çok parça olur
      const segments: { start: string; end: string }[] = []
      if (hits.length > 1) {
        let inside = true, segStart = s0, t0 = s0
        for (let t1 = s0 + step; t1 < s1; t1 += step) {
          const ins = dev(t1) <= 0
          if (ins !== inside) {
            const tb = bisect(t0, t1, dev)
            if (inside) segments.push({ start: isoFromJd(segStart), end: isoFromJd(tb) })
            else segStart = tb
            inside = ins
          }
          t0 = t1
        }
        if (inside) segments.push({ start: isoFromJd(segStart), end: isoFromJd(s1) })
      }
      series = { hits, start: isoFromJd(s0), end: isoFromJd(s1), segments: segments.length > 1 ? segments : undefined }
      done.set(`${key}|${hits[0].toFixed(3)}`, series)
    }
    const n = series.hits.findIndex((h) => Math.abs(h - e.jd) < 1e-3) + 1
    e.window = { start: series.start, end: series.end, orb, ...(series.segments ? { segments: series.segments } : {}) }
    e.pass = { n: n || 1, of: series.hits.length }
  }
}

// ——— Efemeris, Ay geçişleri ve boşluktaki Ay ———

const bisect = (a: number, b: number, f: (jd: number) => number): number => {
  let fa = f(a)
  for (let k = 0; k < 50; k++) {
    const m = (a + b) / 2
    const fm = f(m)
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm } else b = m
  }
  return (a + b) / 2
}

const VOID_ASPECTS: { type: AspectType; off: number }[] = [
  { type: 'conjunction', off: 0 }, { type: 'sextile', off: 60 }, { type: 'sextile', off: -60 }, { type: 'square', off: 90 }, { type: 'square', off: -90 },
  { type: 'trine', off: 120 }, { type: 'trine', off: -120 }, { type: 'opposition', off: 180 }
]

/**
 * Ay'ın boşlukta olduğu dönemler: Ay'ın bulunduğu burçta yaptığı son tam Ptolemaik açıdan (kavuşum, altmışlık, kare, üçgen, karşıt)
 * bir sonraki burca girişine kadar. Modern: Güneş–Plüton; geleneksel: Güneş–Satürn.
 */
function voidPeriods(fromJd: number, toJd: number, planets: string[], flags: number): VoidPeriod[] {
  const moonAt = (jd: number) => sweph.calc_ut(jd, C.SE_MOON, flags).data[0]
  // Ay geçişleri: aralığın 3 gün öncesinden başla (ilk dönemin başlangıcı için)
  const ingresses: number[] = []
  const step = 0.25
  let prevJd = fromJd - 3
  let prevLon = moonAt(prevJd)
  for (let jd = prevJd + step; jd <= toJd + 3; jd += step) {
    const lon = moonAt(jd)
    if (signOf(lon) !== signOf(prevLon)) {
      const boundary = signOf(lon) * 30
      ingresses.push(bisect(prevJd, jd, (x) => norm180(moonAt(x) - boundary)))
    }
    prevJd = jd; prevLon = lon
  }
  const out: VoidPeriod[] = []
  const seAt = (id: string) => BODY_BY_ID[id].se
  for (let i = 1; i < ingresses.length; i++) {
    const a = ingresses[i - 1]
    const b = ingresses[i]
    if (b < fromJd || a > toJd) continue
    let last: { jd: number; planet: string; type: AspectType } | null = null
    for (const pid of planets) {
      const se = seAt(pid)
      for (const asp of VOID_ASPECTS) {
        const f = (jd: number) => norm180(moonAt(jd) - sweph.calc_ut(jd, se, flags).data[0] - asp.off)
        let t0 = a + 1e-6
        let v0 = f(t0)
        const n = Math.ceil((b - a) / 0.1)
        for (let k = 1; k <= n; k++) {
          const t1 = Math.min(b - 1e-6, a + k * 0.1)
          const v1 = f(t1)
          if (v0 !== 0 && Math.sign(v0) !== Math.sign(v1) && Math.abs(v0 - v1) < 90) {
            const jd = bisect(t0, t1, f)
            if (!last || jd > last.jd) last = { jd, planet: pid, type: asp.type }
          }
          t0 = t1; v0 = v1
        }
      }
    }
    const sign = signOf(moonAt((a + b) / 2))
    const start = last ? last.jd : a
    out.push({
      start: isoFromJd(start), end: isoFromJd(b), sign, nextSign: (sign + 1) % 12,
      ...(last ? { last: { planet: last.planet, type: last.type, utc: isoFromJd(last.jd) } } : {})
    })
  }
  return out
}

const EPHEM_IDS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron']

export function ephemeris(fromIso: string, toIso: string, voidPlanets: 'modern' | 'traditional' = 'modern'): Ephemeris {
  const from = jdFromMs(Date.parse(fromIso))
  const to = jdFromMs(Date.parse(toIso))
  if (!(to > from)) throw new Error(t('Geçersiz tarih aralığı.'))
  if (to - from > 400) throw new Error(t('Efemeris en fazla bir yıllık aralık için hesaplanır.'))
  const flags = C.SEFLG_SWIEPH | C.SEFLG_SPEED | zf()
  const nodeSe = settings.defaultNodeType === 'mean' ? C.SE_MEAN_NODE : C.SE_TRUE_NODE
  const bodies = [
    ...EPHEM_IDS.map((id) => ({ id, name: t(BODY_BY_ID[id].name), glyph: BODY_BY_ID[id].glyph + VS, se: BODY_BY_ID[id].se })),
    { id: 'northnode', name: t(settings.defaultNodeType === 'mean' ? 'K. Ay Düğümü (ortalama)' : 'K. Ay Düğümü (gerçek)'), glyph: '☊' + VS, se: nodeSe }
  ]
  const at = (jd: number, se: number) => sweph.calc_ut(jd, se, flags).data

  // günlük satırlar: her gün 0h UT
  const rows = []
  for (let jd = Math.ceil(from - 0.5) + 0.5; jd < to; jd += 1) {
    const pos: Record<string, { lon: number; speed: number }> = {}
    for (const b of bodies) { const d = at(jd, b.se); pos[b.id] = { lon: d[0], speed: d[3] } }
    rows.push({ utc: isoFromJd(jd), sidTime: sweph.sidtime(jd), pos })
  }

  // olaylar: burç geçişleri, duraklamalar, Ay evreleri
  const events: EphemerisEvent[] = []
  const push = (jd: number, e: Omit<EphemerisEvent, 'jd' | 'utc'>) => { if (jd >= from && jd < to) events.push({ jd, utc: isoFromJd(jd), ...e }) }
  for (const b of bodies) {
    const step = b.id === 'moon' ? 0.25 : 1
    let s0 = { jd: from - step, d: at(from - step, b.se) }
    for (let jd = from; jd <= to + step; jd += step) {
      const s1 = { jd, d: at(jd, b.se) }
      if (b.id !== 'sun' && b.id !== 'moon' && b.id !== 'northnode' && Math.sign(s0.d[3]) !== Math.sign(s1.d[3])) {
        const t = bisect(s0.jd, s1.jd, (x) => at(x, b.se)[3])
        push(t, { body: b.id, type: s0.d[3] > 0 ? 'station-retro' : 'station-direct', sign: signOf(at(t, b.se)[0]) })
      }
      if (signOf(s0.d[0]) !== signOf(s1.d[0]) && Math.abs(norm180(s1.d[0] - s0.d[0])) < 30) {
        const boundary = s1.d[3] >= 0 ? signOf(s1.d[0]) * 30 : signOf(s0.d[0]) * 30
        const t = bisect(s0.jd, s1.jd, (x) => norm180(at(x, b.se)[0] - boundary))
        push(t, { body: b.id, type: 'ingress', retro: s1.d[3] < 0, sign: signOf(s1.d[0]) })
      }
      s0 = s1
    }
  }
  {
    const elong = (jd: number) => norm360(at(jd, C.SE_MOON)[0] - at(jd, C.SE_SUN)[0])
    let t0 = from - 0.25
    let e0 = elong(t0)
    for (let jd = from; jd <= to + 0.25; jd += 0.25) {
      const e1 = elong(jd)
      for (let q = 0; q < 4; q++) {
        const goal = q * 90
        const v0 = norm180(e0 - goal)
        const v1 = norm180(e1 - goal)
        if (v0 !== 0 && Math.sign(v0) !== Math.sign(v1) && Math.abs(v0 - v1) < 90) {
          const t = bisect(t0, jd, (x) => norm180(elong(x) - goal))
          push(t, { body: 'moon', type: 'phase', phase: q as 0 | 1 | 2 | 3, sign: signOf(at(t, C.SE_MOON)[0]) })
        }
      }
      t0 = jd; e0 = e1
    }
  }
  events.sort((a, b) => a.jd - b.jd)

  const vp = voidPlanets === 'traditional' ? ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] : ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
  return {
    from: isoFromJd(from), to: isoFromJd(to), zodiac: zodiacName(),
    bodies: bodies.map(({ id, name, glyph }) => ({ id, name, glyph })),
    rows, events, voids: voidPeriods(from, to, vp, flags), voidPlanets
  }
}

// ——— Doğum saati aralığı (basit rektifikasyon) ———

export function rectify(input: ChartInput, from: string, to: string, stepMin: number): RectifyRow[] {
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
  const a = toMin(from)
  let b = toMin(to)
  if (b < a) b += 24 * 60
  const step = Math.max(1, Math.round(stepMin))
  if ((b - a) / step > 500) throw new Error(t('Çok fazla satır: aralığı daraltın veya adımı büyütün.'))
  const rows: RectifyRow[] = []
  for (let m = a; m <= b; m += step) {
    const mm = m % (24 * 60)
    const time = `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
    const t = toUtc({ ...input, time, timeUnknown: false })
    const jd = jdFromMs(t.utcMs)
    const h = sweph.houses_ex2(jd, zf(), input.place.lat, input.place.lon, input.houseSystem)
    const moon = sweph.calc_ut(jd, C.SE_MOON, C.SEFLG_SWIEPH | zf()).data[0]
    rows.push({ time, asc: h.data.points[0], mc: h.data.points[1], moon })
  }
  return rows
}

// ——— Tutulmalar ———

const SOLAR_TYPE = (f: number) => t(f & C.SE_ECL_TOTAL ? 'Tam' : f & C.SE_ECL_ANNULAR ? 'Halkalı' : f & C.SE_ECL_HYBRID ? 'Melez' : 'Parçalı')
const LUNAR_TYPE = (f: number) => t(f & C.SE_ECL_TOTAL ? 'Tam' : f & C.SE_ECL_PARTIAL ? 'Parçalı' : 'Yarıgölge')

function eclipseAt(jd: number, kind: 'solar' | 'lunar', flag: number, natal: ChartResult, prenatal = false): EclipseEvent {
  const body = kind === 'solar' ? C.SE_SUN : C.SE_MOON
  const lon = sweph.calc_ut(jd, body, C.SEFLG_SWIEPH | zf()).data[0]
  const targets = [
    ...natal.points.filter((p) => !['southnode', 'lilith', 'fortune'].includes(p.id)),
    ...(natal.hasHouses ? [{ id: 'asc', lon: natal.angles.asc }, { id: 'mc', lon: natal.angles.mc }] : [])
  ]
  const contacts: EclipseEvent['contacts'] = []
  for (const t of targets) {
    const sep = separation(lon, t.lon)
    for (const [type, ang] of [['conjunction', 0], ['opposition', 180], ['square', 90]] as const) {
      if (Math.abs(sep - ang) <= ECLIPSE_ORB) contacts.push({ point: t.id, type, orb: Math.abs(sep - ang) })
    }
  }
  contacts.sort((a, b) => a.orb - b.orb)
  return { jd, utc: isoFromJd(jd), kind, type: kind === 'solar' ? SOLAR_TYPE(flag) : LUNAR_TYPE(flag), lon, prenatal, contacts }
}
const ECLIPSE_ORB = 3

export function eclipses(input: ChartInput, fromIso: string, toIso: string): EclipseEvent[] {
  const natal = natalChart(input)
  const from = jdFromMs(Date.parse(fromIso))
  const to = jdFromMs(Date.parse(toIso))
  if (to - from > 366 * 50) throw new Error(t('En fazla 50 yıllık aralık listelenebilir.'))
  const out: EclipseEvent[] = []
  for (const kind of ['solar', 'lunar'] as const) {
    let jd = from
    for (let k = 0; k < 400; k++) {
      const r = kind === 'solar' ? sweph.sol_eclipse_when_glob(jd, C.SEFLG_SWIEPH, 0, false) : sweph.lun_eclipse_when(jd, C.SEFLG_SWIEPH, 0, false)
      const t = r.data[0]
      if (r.flag < 0 || !t || t > to) break
      out.push(eclipseAt(t, kind, r.flag, natal))
      jd = t + 10
    }
  }
  // doğum öncesi son güneş ve ay tutulması
  const s = sweph.sol_eclipse_when_glob(natal.jdUt, C.SEFLG_SWIEPH, 0, true)
  const l = sweph.lun_eclipse_when(natal.jdUt, C.SEFLG_SWIEPH, 0, true)
  const pre = [eclipseAt(s.data[0], 'solar', s.flag, natal, true), eclipseAt(l.data[0], 'lunar', l.flag, natal, true)]
  return [...pre.sort((a, b) => a.jd - b.jd), ...out.sort((a, b) => a.jd - b.jd)]
}

// ——— Astrokartografi (ACG) ———

export function acg(input: ChartInput): AcgLine[] {
  const b = birth(input)
  const gmst = sweph.sidtime(b.jd) * 15 // Greenwich görünür yıldız zamanı (derece)
  const ids = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron']
  const deg = Math.PI / 180
  return ids.map((id) => {
    const body = BODY_BY_ID[id]
    const eq = sweph.calc_ut(b.jd, body.se, C.SEFLG_SWIEPH | C.SEFLG_EQUATORIAL).data
    const ra = eq[0]
    const dec = eq[1]
    const mc = norm180(ra - gmst)
    const asc: [number, number][] = []
    const dsc: [number, number][] = []
    for (let lat = -75; lat <= 75; lat += 0.5) {
      const cosH = -Math.tan(lat * deg) * Math.tan(dec * deg)
      if (Math.abs(cosH) > 1) continue // bu enlemde doğmaz/batmaz
      const H = Math.acos(cosH) / deg
      asc.push([lat, norm180(ra - H - gmst)])
      dsc.push([lat, norm180(ra + H - gmst)])
    }
    return { id, name: t(body.name), glyph: body.glyph + VS, mc, ic: norm180(mc + 180), asc, dsc }
  })
}
