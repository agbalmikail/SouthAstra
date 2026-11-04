// SouthAstra hesaplama motoru.
// Swiss Ephemeris © Astrodienst AG, AGPL-3.0 lisansıyla kullanılmaktadır.
import sweph from 'sweph'
import type {
  AcgLine, Aspect, ChartInput, ChartResult, EclipseEvent, HouseSystem, Place, PointPos, RectifyRow, Settings, StarContact,
  TransitEvent, ViewRequest, ViewResult
} from '@shared/types'
import { HOUSE_SYSTEMS, placeLabel } from '@shared/types'
import { activeOrbs, ASPECTS, DEFAULT_SETTINGS, dignityOf, norm360, separation, signOf, AYANAMSAS } from '@shared/zodiac'
import { toUtc } from './time'

const C = sweph.constants
const VS = '︎'

const BODIES: { id: string; name: string; glyph: string; se: number; station?: number }[] = [
  { id: 'sun', name: 'Güneş', glyph: '☉', se: C.SE_SUN },
  { id: 'moon', name: 'Ay', glyph: '☽', se: C.SE_MOON },
  { id: 'mercury', name: 'Merkür', glyph: '☿', se: C.SE_MERCURY, station: 0.12 },
  { id: 'venus', name: 'Venüs', glyph: '♀', se: C.SE_VENUS, station: 0.08 },
  { id: 'mars', name: 'Mars', glyph: '♂', se: C.SE_MARS, station: 0.05 },
  { id: 'jupiter', name: 'Jüpiter', glyph: '♃', se: C.SE_JUPITER, station: 0.015 },
  { id: 'saturn', name: 'Satürn', glyph: '♄', se: C.SE_SATURN, station: 0.008 },
  { id: 'uranus', name: 'Uranüs', glyph: '♅', se: C.SE_URANUS, station: 0.004 },
  { id: 'neptune', name: 'Neptün', glyph: '♆', se: C.SE_NEPTUNE, station: 0.003 },
  { id: 'pluto', name: 'Plüton', glyph: '♇', se: C.SE_PLUTO, station: 0.003 },
  { id: 'chiron', name: 'Chiron', glyph: '⚷', se: C.SE_CHIRON, station: 0.005 },
  { id: 'lilith', name: 'Lilith (ort.)', glyph: '⚸', se: C.SE_MEAN_APOG }
]
const BODY_BY_ID = Object.fromEntries(BODIES.map((b) => [b.id, b]))

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
  ? `Sideral · ${AYANAMSAS.find((a) => a.id === settings.ayanamsa)?.name ?? sweph.get_ayanamsa_name(settings.ayanamsa)}`
  : 'Tropikal'

const obliquityAt = (jd: number): number => sweph.calc_ut(jd, C.SE_ECL_NUT, 0).data[0]

// ——— Konumlar ———

interface Geo { lat: number; lon: number }

function computePoints(jd: number, nodeType: 'true' | 'mean', geo: Geo | null, warnings: string[]): PointPos[] {
  const flags = C.SEFLG_SWIEPH | C.SEFLG_SPEED | zf()
  let usedMoshier = false
  const all = [...BODIES, { id: 'northnode', name: nodeType === 'mean' ? 'K. Ay Düğümü (ortalama)' : 'K. Ay Düğümü (gerçek)', glyph: '☊', se: nodeType === 'mean' ? C.SE_MEAN_NODE : C.SE_TRUE_NODE, station: undefined }]
  const out: PointPos[] = []
  for (const b of all) {
    const r = sweph.calc_ut(jd, b.se, flags)
    if (r.flag < 0) { warnings.push(`${b.name} hesaplanamadı: ${r.error}`); continue }
    if (b.se <= C.SE_PLUTO && !(r.flag & C.SEFLG_SWIEPH)) usedMoshier = true
    const eq = sweph.calc_ut(jd, b.se, C.SEFLG_SWIEPH | C.SEFLG_SPEED | C.SEFLG_EQUATORIAL)
    const p: PointPos = {
      id: b.id, name: b.name, glyph: b.glyph + VS,
      lon: r.data[0], lat: r.data[1], distance: r.data[2], speed: r.data[3], latSpeed: r.data[4], retro: r.data[3] < 0,
      ra: eq.data[0], declination: eq.data[1], house: 0,
      stationary: b.station !== undefined && Math.abs(r.data[3]) < b.station,
      dignity: dignityOf(b.id, r.data[0])
    }
    if (geo) {
      const az = sweph.azalt(jd, C.SE_EQU2HOR, [geo.lon, geo.lat, 0], 0, 0, [eq.data[0], eq.data[1], eq.data[2]])
      p.azimuth = norm360(az[0] + 180) // Swiss Ephemeris güneyden ölçer; kuzeyden ölçüme çevir
      p.altitude = az[1]
    }
    out.push(p)
  }
  const nn = out.find((p) => p.id === 'northnode')
  if (nn) out.push({ ...nn, id: 'southnode', name: nodeType === 'mean' ? 'G. Ay Düğümü (ortalama)' : 'G. Ay Düğümü (gerçek)', glyph: '☋' + VS, lon: norm360(nn.lon + 180), lat: -nn.lat, declination: -nn.declination, ra: norm360((nn.ra ?? 0) + 180), azimuth: undefined, altitude: undefined })
  if (usedMoshier) warnings.push('Efemeris dosyaları bulunamadı; daha düşük hassasiyetli Moshier yöntemi kullanıldı.')
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
    warnings.push(`${used} bu enlemde hesaplanamıyor (kutup bölgesi); Porphyry kullanıldı.`)
    used = 'Porphyry (yedek)'
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

function addFortune(points: PointPos[], asc: number): void {
  const sun = points.find((p) => p.id === 'sun')
  const moon = points.find((p) => p.id === 'moon')
  if (!sun || !moon) return
  const day = sun.house >= 7 // Güneş ufkun üstünde (7–12. evler)
  const lon = norm360(day ? asc + moon.lon - sun.lon : asc + sun.lon - moon.lon)
  points.push({ id: 'fortune', name: `Şans Noktası (${day ? 'gündüz' : 'gece'})`, glyph: '⊗', lon, lat: 0, speed: 0, retro: false, house: 0, declination: 0 })
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
    ephemeris: warnings.some((w) => w.includes('Moshier')) ? 'Moshier (yedek)' : `Swiss Ephemeris ${sweph.version()}`,
    zodiac: zodiacName(),
    points,
    cusps: h ? h.cusps : [],
    angles,
    hasHouses: !!h,
    aspects: natalAspects(points, h ? angles : null),
    stars: starContacts(o.jd, points, h ? angles : null)
  }
}

function birth(input: ChartInput, shiftMin = 0) {
  const t = toUtc(input)
  const ms = t.utcMs + shiftMin * 60000
  const d = new Date(ms)
  const r = sweph.utc_to_jd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds() + d.getUTCMilliseconds() / 1000, C.SE_GREG_CAL)
  if (r.flag !== C.OK) throw new Error('Jülyen günü hesaplanamadı: ' + r.error)
  return { jd: r.data[1], t }
}

export function natalChart(input: ChartInput, hsys?: HouseSystem, shiftMin = 0): ChartResult {
  const b = birth(input, shiftMin)
  const warnings = [...b.t.warnings]
  if (input.timeUnknown) {
    warnings.unshift('Doğum saati bilinmiyor: 12:00 varsayıldı. Yükselen, MC ve evler bu yüzden gösterilmiyor. Ay gün içinde yaklaşık ±6–7° oynayabilir; diğer gezegenler ±1°\'nin altında kalır.')
  }
  if (shiftMin) warnings.unshift(`Doğum saati ${shiftMin > 0 ? '+' : ''}${shiftMin} dakika kaydırılmış olarak gösteriliyor (kaydedilmedi).`)
  return makeChart({
    input, jd: b.jd, place: input.place, hsys: hsys ?? input.houseSystem, kind: 'natal', label: 'Doğum haritası',
    offsetMinutes: b.t.offsetMinutes, offsetSource: b.t.source, warnings
  })
}

function draconic(ch: ChartResult): ChartResult {
  const nn = ch.points.find((p) => p.id === 'northnode')
  if (!nn) return ch
  const s = nn.lon
  const points = ch.points.map((p) => ({ ...p, lon: norm360(p.lon - s), dignity: dignityOf(p.id, norm360(p.lon - s)) }))
  const sh = (x: number) => norm360(x - s)
  const angles = ch.hasHouses
    ? { ...ch.angles, asc: sh(ch.angles.asc), mc: sh(ch.angles.mc), dsc: sh(ch.angles.dsc), ic: sh(ch.angles.ic), vertex: sh(ch.angles.vertex) }
    : ch.angles
  return {
    ...ch, kind: 'draconic', label: 'Drakonik harita', points, angles, cusps: ch.cusps.map(sh),
    aspects: natalAspects(points, ch.hasHouses ? angles : null), stars: starContacts(ch.jdUt, points, ch.hasHouses ? angles : null)
  }
}

const TROPICAL_YEAR = 365.242199
const LUNAR_MONTH = 27.321582 // tropikal kameri ay (gün)

export function view(input: ChartInput, req: ViewRequest): ViewResult {
  const hsys = req.houseSystem ?? input.houseSystem
  const natal = natalChart(input, hsys, req.timeShiftMin ?? 0)
  const target = req.date ? jdFromMs(Date.parse(req.date)) : jdFromMs(Date.now())
  const who = input.name
  const where = placeLabel(input.place)

  switch (req.mode) {
    case 'natal':
    case 'acg':
      return { inner: natal, cross: [], title: who, subtitle: '' }
    case 'draconic':
      return { inner: draconic(natal), cross: [], title: who, subtitle: 'Drakonik harita' }
    case 'transit': {
      const outer = makeChart({ input, jd: target, place: null, hsys, kind: 'transit', label: 'Transitler' })
      return { inner: natal, outer, cross: crossAspects(outer, natal, majorOnly(settings.transitOrb)), title: who, subtitle: 'Transitler' }
    }
    case 'progressed':
    case 'tertiary':
    case 'minor': {
      const elapsed = target - natal.jdUt // gerçek geçen gün
      const age = elapsed / TROPICAL_YEAR
      // İkincil: 1 gün = 1 yıl · Tersiyer: 1 gün = 1 kameri ay · Minör: 1 kameri ay = 1 yıl
      const pdays = req.mode === 'progressed' ? age : req.mode === 'tertiary' ? elapsed / LUNAR_MONTH : age * LUNAR_MONTH
      const pjd = natal.jdUt + pdays
      const label = req.mode === 'progressed' ? 'İkincil progresyon' : req.mode === 'tertiary' ? 'Tersiyer progresyon' : 'Minör progresyon'
      const pts = computePoints(pjd, input.nodeType, null, [])
      let houses: HouseData | undefined
      if (natal.hasHouses) {
        const arc = norm180((pts.find((p) => p.id === 'sun')?.lon ?? 0) - (natal.points.find((p) => p.id === 'sun')?.lon ?? 0))
        houses = housesFromMc(norm360(natal.angles.mc + arc), input.place.lat, pjd, hsys)
      }
      const outer = makeChart({
        input, jd: pjd, place: natal.hasHouses ? input.place : null, hsys, kind: req.mode, label,
        points: pts, houses, warnings: natal.hasHouses ? ['Progresif köşe noktaları: MC güneş yayıyla (solar arc), yükselen bu MC\'den doğum enleminde hesaplandı.'] : []
      })
      return { inner: natal, outer, cross: crossAspects(outer, natal, majorOnly(settings.progressionOrb)), title: who, subtitle: `${label} · yaş ${age.toFixed(2)} · progresif an ${isoFromJd(pjd).slice(0, 10)}` }
    }
    case 'harmonic': {
      const n = Math.max(1, Math.min(180, Math.round(req.harmonic ?? 5)))
      const hl = (x: number) => norm360(x * n)
      const points: PointPos[] = natal.points.filter((p) => p.id !== 'southnode' && p.id !== 'fortune').map((p) => ({
        ...p, lon: hl(p.lon), house: 0, housePos: undefined, azimuth: undefined, altitude: undefined, ra: undefined, distance: undefined, declination: 0, dignity: undefined, stationary: false
      }))
      if (natal.hasHouses) {
        points.push(
          { id: 'h-asc', name: `H${n} Yükselen`, glyph: 'AC', lon: hl(natal.angles.asc), lat: 0, speed: 0, retro: false, house: 0, declination: 0 },
          { id: 'h-mc', name: `H${n} MC`, glyph: 'MC', lon: hl(natal.angles.mc), lat: 0, speed: 0, retro: false, house: 0, declination: 0 }
        )
      }
      const h = makeChart({ input: { ...input, timeUnknown: true }, jd: natal.jdUt, place: null, hsys, kind: 'harmonic', label: `${n}. harmonik`, points })
      h.input = input
      h.warnings.unshift(`${n}. harmonik: her boylam ${n} ile çarpıldı (mod 360°). Bu haritadaki kavuşumlar natal haritadaki 360°/${n} = ${(360 / n).toFixed(2)}° katı açılara karşılık gelir.`)
      return { inner: h, cross: [], title: who, subtitle: `${n}. harmonik harita` }
    }
    case 'solararc': {
      const age = (target - natal.jdUt) / TROPICAL_YEAR
      const ps = computePoints(natal.jdUt + age, input.nodeType, null, [])
      const arc = norm360((ps.find((p) => p.id === 'sun')?.lon ?? 0) - (natal.points.find((p) => p.id === 'sun')?.lon ?? 0))
      const points = natal.points.filter((p) => p.id !== 'fortune').map((p) => ({ ...p, lon: norm360(p.lon + arc), house: 0, housePos: undefined, azimuth: undefined, altitude: undefined, retro: false, speed: 0, dignity: dignityOf(p.id, norm360(p.lon + arc)) }))
      const outer = makeChart({ input, jd: natal.jdUt + age, place: null, hsys, kind: 'solararc', label: 'Solar arc', points })
      if (natal.hasHouses) {
        outer.points.push(
          { id: 'sa-asc', name: 'SA Yükselen', glyph: 'AC', lon: norm360(natal.angles.asc + arc), lat: 0, speed: 0, retro: false, house: 0, declination: 0 },
          { id: 'sa-mc', name: 'SA MC', glyph: 'MC', lon: norm360(natal.angles.mc + arc), lat: 0, speed: 0, retro: false, house: 0, declination: 0 }
        )
      }
      return { inner: natal, outer, cross: crossAspects(outer, natal, majorOnly(settings.progressionOrb)), title: who, subtitle: `Solar arc · yay ${arc.toFixed(2)}° · yaş ${age.toFixed(2)}` }
    }
    case 'solarreturn':
    case 'lunarreturn': {
      const isSun = req.mode === 'solarreturn'
      const natalLon = natal.points.find((p) => p.id === (isSun ? 'sun' : 'moon'))?.lon ?? 0
      const flags = C.SEFLG_SWIEPH | zf()
      const r = isSun ? sweph.solcross_ut(natalLon, target, flags) : sweph.mooncross_ut(natalLon, target, flags)
      if (r.error) throw new Error('Dönüş anı bulunamadı: ' + r.error)
      const retInput: ChartInput = { ...input, timeUnknown: false }
      const ret = makeChart({ input: retInput, jd: r.date, place: input.place, hsys, kind: req.mode, label: isSun ? 'Güneş dönüşü' : 'Ay dönüşü', offsetSource: 'Dönüş anı (UTC)' })
      if (input.timeUnknown) ret.warnings.unshift(`Doğum saati bilinmediği için natal ${isSun ? 'Güneş' : 'Ay'} konumu yaklaşık; dönüş anı ${isSun ? 'birkaç saat' : 'birkaç saat'} kayabilir.`)
      const natalOuter = { ...natal, label: 'Doğum haritası' }
      return { inner: ret, outer: natalOuter, cross: crossAspects(natalOuter, ret, majorOnly(settings.transitOrb)), title: who, subtitle: `${isSun ? 'Güneş' : 'Ay'} dönüşü · ${where}` }
    }
    case 'synastry': {
      if (!req.partner) throw new Error('Sinastri için ikinci bir harita seçin.')
      const b = natalChart(req.partner, hsys)
      const outer = { ...b, label: req.partner.name }
      return { inner: natal, outer, cross: crossAspects(outer, natal, natalOrb), title: `${who} × ${req.partner.name}`, subtitle: 'Sinastri' }
    }
    case 'composite': {
      if (!req.partner) throw new Error('Kompozit için ikinci bir harita seçin.')
      const b = natalChart(req.partner, hsys)
      const midJd = (natal.jdUt + b.jdUt) / 2
      const pb = Object.fromEntries(b.points.map((p) => [p.id, p]))
      const points: PointPos[] = natal.points
        .filter((p) => pb[p.id] && p.id !== 'fortune' && p.id !== 'southnode')
        .map((p) => {
          const lon = midpoint(p.lon, pb[p.id].lon)
          return { id: p.id, name: p.name, glyph: p.glyph, lon, lat: 0, speed: (p.speed + pb[p.id].speed) / 2, retro: false, house: 0, declination: (p.declination + pb[p.id].declination) / 2, dignity: dignityOf(p.id, lon) }
        })
      const nn = points.find((p) => p.id === 'northnode')
      if (nn) points.push({ ...nn, id: 'southnode', name: 'G. Ay Düğümü', glyph: '☋' + VS, lon: norm360(nn.lon + 180) })
      const both = natal.hasHouses && b.hasHouses
      const lat = (input.place.lat + req.partner.place.lat) / 2
      const houses = both ? housesFromMc(midpoint(natal.angles.mc, b.angles.mc), lat, midJd, hsys) : undefined
      const compInput: ChartInput = { ...input, name: `${who} + ${req.partner.name}`, timeUnknown: !both }
      const comp = makeChart({ input: compInput, jd: midJd, place: both ? { ...input.place, lat } : null, hsys, kind: 'composite', label: 'Kompozit', points, houses, offsetSource: 'Orta nokta yöntemi' })
      comp.warnings.unshift('Kompozit: gezegenler iki haritadaki konumların kısa yay orta noktası; MC orta noktasından ve ortalama enlemden evler kuruldu.')
      if (!both) comp.warnings.unshift('Haritalardan birinde doğum saati bilinmediği için kompozit evler hesaplanmadı.')
      return { inner: comp, cross: [], title: `${who} + ${req.partner.name}`, subtitle: 'Kompozit (orta nokta)' }
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
  if (to - from > 3660 * 3) throw new Error('En fazla 30 yıllık aralık hesaplanabilir.')
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
    const push = (jd: number, e: Omit<TransitEvent, 'jd' | 'utc' | 'transit'>) => { if (jd >= from && jd <= to) events.push({ jd, utc: isoFromJd(jd), transit: pid, ...e }) }

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
  return events.sort((a, b) => a.jd - b.jd)
}

// ——— Doğum saati aralığı (basit rektifikasyon) ———

export function rectify(input: ChartInput, from: string, to: string, stepMin: number): RectifyRow[] {
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
  const a = toMin(from)
  let b = toMin(to)
  if (b < a) b += 24 * 60
  const step = Math.max(1, Math.round(stepMin))
  if ((b - a) / step > 500) throw new Error('Çok fazla satır: aralığı daraltın veya adımı büyütün.')
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

const SOLAR_TYPE = (f: number) => (f & C.SE_ECL_TOTAL ? 'Tam' : f & C.SE_ECL_ANNULAR ? 'Halkalı' : f & C.SE_ECL_HYBRID ? 'Melez' : 'Parçalı')
const LUNAR_TYPE = (f: number) => (f & C.SE_ECL_TOTAL ? 'Tam' : f & C.SE_ECL_PARTIAL ? 'Parçalı' : 'Yarıgölge')

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
  if (to - from > 366 * 50) throw new Error('En fazla 50 yıllık aralık listelenebilir.')
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
    return { id, name: body.name, glyph: body.glyph + VS, mc, ic: norm180(mc + 180), asc, dsc }
  })
}
