import type { FeedbackEntry } from './feedback'
import type { BlindTrial } from './blind'
import type { RankWeights } from './transitRank'
import { t } from './i18n'

/** Metin alanları okunduğu anda seçili dile çevrilir (Türkçe kaynak metin anahtardır) */
function translated<T extends object>(o: T, keys: (keyof T)[]): T {
  const out = { ...o }
  for (const k of keys) {
    const tr = o[k]
    if (typeof tr === 'string') Object.defineProperty(out, k, { get: () => t(tr), enumerable: true, configurable: true })
  }
  return out
}
export type HouseSystem = 'P' | 'K' | 'R' | 'C' | 'E' | 'W' | 'O' | 'B' | 'T' | 'M' | 'X'

export const HOUSE_SYSTEMS: { id: HouseSystem; readonly name: string }[] = ([
  { id: 'P', name: 'Placidus' },
  { id: 'K', name: 'Koch' },
  { id: 'R', name: 'Regiomontanus' },
  { id: 'C', name: 'Campanus' },
  { id: 'E', name: 'Eşit (Equal)' },
  { id: 'W', name: 'Tam Burç (Whole Sign)' },
  { id: 'O', name: 'Porphyry' },
  { id: 'B', name: 'Alcabitius' },
  { id: 'T', name: 'Topocentric' },
  { id: 'M', name: 'Morinus' },
  { id: 'X', name: 'Meridian' }
] as { id: HouseSystem; name: string }[]).map((h) => translated(h, ['name']))

export interface Place {
  name: string
  localName?: string // yerel ad, gösterilen (Türkçe) addan farklıysa
  district?: string // ilçe / Kreis
  region: string // il / eyalet
  country: string
  countryCode?: string
  lat: number
  lon: number
  tz: string
  geonameId?: number // GeoNames benzersiz konum kimliği (elle girilen koordinatta yok)
  precision?: string // koordinat neyi temsil ediyor: "İlçe merkezi", "Semt / mahalle", "Elle girilen koordinat"…
}

/** "Kadıköy — Silivri, İstanbul, Türkiye" */
export function placeLabel(p: Pick<Place, 'name' | 'district' | 'region' | 'country'>): string {
  const admin = [p.district, p.region, p.country].filter((x, i, a) => x && x !== p.name && a.indexOf(x) === i)
  return admin.length ? `${p.name} — ${admin.join(', ')}` : p.name
}

export interface CityFilter {
  country?: string // ISO ülke kodu, ör. TR, DE
  region?: string // il / eyalet adı
  district?: string // ilçe / Landkreis adı
}

export interface CountryInfo {
  code: string
  name: string
  count: number
  detailed: boolean // köy/semt düzeyinde ayrıntılı veri var mı
}

export type TimeMode = 'zone' | 'manual' | 'lmt'

/** Doğum verisi güvenilirliği (Rodden derecelendirmesi) */
export type Rodden = 'AA' | 'A' | 'B' | 'C' | 'DD' | 'X' | 'XX'
export const RODDEN: { id: Rodden; readonly desc: string }[] = ([
  { id: 'AA', desc: 'Doğum belgesi veya resmî kayıt' },
  { id: 'A', desc: 'Kişinin, ailesinin beyanı veya hafızadan' },
  { id: 'B', desc: 'Biyografi veya otobiyografi' },
  { id: 'C', desc: 'Kaynağı belirsiz, yaklaşık veya düzeltilmiş (rektifiye)' },
  { id: 'DD', desc: 'Çelişkili kaynaklar' },
  { id: 'X', desc: 'Tarih biliniyor, saat bilinmiyor' },
  { id: 'XX', desc: 'Tarih de doğrulanmamış' }
] as { id: Rodden; desc: string }[]).map((r) => translated(r, ['desc']))

export interface ChartInput {
  name: string
  date: string // YYYY-MM-DD
  time: string // HH:MM veya HH:MM:SS (yerel saat)
  place: Place
  timeMode: TimeMode
  manualOffset?: number // saat cinsinden, ör. 3 veya -5.5 (timeMode = 'manual')
  houseSystem: HouseSystem
  nodeType: 'true' | 'mean'
  timeUnknown?: boolean // doğum saati bilinmiyor: 12:00 varsayılır, yükselen ve evler gösterilmez
  rodden?: Rodden
  tags?: string[]
  notes?: string
  sessions?: Session[]
  feedback?: FeedbackEntry[] // seans geri bildirimi (Uyuyor / Kısmen / Uymuyor), kontrol metinleri dahil
  blindTrials?: BlindTrial[] // kör karşılaştırma denemeleri (bu kişi katılımcıyken)
  jplCheck?: JplCheck // bu haritanın NASA JPL Horizons karşılaştırması (isteğe bağlı)
  events?: LifeEvent[]
  residence?: Place // danışanın yaşadığı yer: dönüş ve taşınma haritalarında varsayılan
}

/** Danışanın hayatından tarihli olay (rektifikasyon ve öngörü kontrolü için) */
export interface LifeEvent {
  id: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM, biliniyorsa
  title: string
  category: string
}

/** Danışanla yapılan görüşmenin tarihli notu */
export interface Session {
  id: string
  date: string // YYYY-MM-DD
  text: string
}

export interface TimePreview {
  utc: string
  offsetMinutes: number
  source: string
  warnings: string[]
  dst?: boolean
}

/** Ekranda gösterilen harita türü */
export type ViewMode =
  | 'natal' | 'draconic'
  | 'transit' | 'progressed' | 'tertiary' | 'minor' | 'solararc'
  | 'solarreturn' | 'lunarreturn'
  | 'synastry' | 'composite'
  | 'harmonic' | 'acg' | 'relocated'

type ViewModeDef = { id: ViewMode; name: string; group: string; needsDate?: boolean; needsPartner?: boolean; needsPlace?: boolean }
export const VIEW_MODES: ViewModeDef[] = ([
  { id: 'natal', name: 'Natal', group: 'Doğum' },
  { id: 'draconic', name: 'Drakonik', group: 'Doğum' },
  { id: 'relocated', name: 'Taşınma haritası', group: 'Doğum', needsPlace: true },
  { id: 'transit', name: 'Transitler', group: 'Öngörü', needsDate: true },
  { id: 'progressed', name: 'İkincil progresyon', group: 'Öngörü', needsDate: true },
  { id: 'tertiary', name: 'Tersiyer progresyon', group: 'Öngörü', needsDate: true },
  { id: 'minor', name: 'Minör progresyon', group: 'Öngörü', needsDate: true },
  { id: 'solararc', name: 'Solar arc', group: 'Öngörü', needsDate: true },
  { id: 'solarreturn', name: 'Güneş dönüşü', group: 'Dönüşler', needsDate: true, needsPlace: true },
  { id: 'lunarreturn', name: 'Ay dönüşü', group: 'Dönüşler', needsDate: true, needsPlace: true },
  { id: 'synastry', name: 'Sinastri', group: 'İlişki', needsPartner: true },
  { id: 'composite', name: 'Kompozit', group: 'İlişki', needsPartner: true },
  { id: 'harmonic', name: 'Harmonik harita', group: 'Doğum' },
  { id: 'acg', name: 'Astrokartografi (ACG)', group: 'Doğum' }
] as ViewModeDef[]).map((m) => translated(m, ['name', 'group']))

export interface ViewRequest {
  mode: ViewMode
  houseSystem?: HouseSystem
  /** transit/progresyon/solar arc için hedef an; dönüşler için aramaya başlanacak an (UTC, ISO) */
  date?: string
  partner?: ChartInput
  /** doğum saatini dakika olarak kaydır (rektifikasyon için) */
  timeShiftMin?: number
  /** harmonik harita numarası (ör. 5, 7, 9) */
  harmonic?: number
  /** dönüş ve taşınma haritaları için yer (yoksa doğum yeri) */
  place?: Place
}

export interface EclipseEvent {
  jd: number
  utc: string
  kind: 'solar' | 'lunar'
  type: string // Tam, Halkalı, Parçalı, Melez, Yarıgölge
  lon: number // tutulma noktası (güneş tutulmasında Güneş/Ay, ay tutulmasında Ay)
  prenatal?: boolean
  contacts: { point: string; type: AspectType; orb: number }[]
}

export interface AcgLine {
  id: string
  name: string
  glyph: string
  mc: number // MC çizgisinin coğrafi boylamı
  ic: number
  asc: [number, number][] // [enlem, boylam] noktaları
  dsc: [number, number][]
}

export interface PointPos {
  id: string
  name: string
  glyph: string
  lon: number
  lat: number
  speed: number
  retro: boolean
  house: number
  declination: number
  // ayrıntılar (doğrulama paneli için)
  ra?: number
  distance?: number // AU
  latSpeed?: number
  azimuth?: number
  altitude?: number
  housePos?: number // ondalıklı ev konumu (ör. 5.42)
  dignity?: string
  stationary?: boolean
  /** Pencere içindeki en yakın duraklama: kesin an, yön (geri harekete / düz harekete), doğum anından gün farkı */
  station?: { utc: string; kind: 'retro' | 'direct'; days: number }
  /** İkinci çarkta: noktanın iç çarkın (natal / dönüş) evlerindeki yeri */
  innerHouse?: number
}

export type AspectType =
  | 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile'
  | 'quincunx' | 'semisextile' | 'semisquare' | 'sesquiquadrate' | 'quintile' | 'biquintile'
  | 'parallel' | 'contraparallel'

export interface Aspect {
  a: string
  b: string
  type: AspectType
  angle: number
  orb: number // gerçek sapma (derece)
  applying: boolean
  /** Doğum saati bilinmiyorsa Ay açıları: kesin (tüm gün), saate bağlı (günün bir kısmı, 12:00 dahil), olası (12:00'de yok, gün içinde var) */
  certainty?: 'kesin' | 'saate-bagli' | 'olasi'
  minOrb?: number // gün içindeki en dar orb
  applyingUnknown?: boolean // gün içinde tam açı oluşuyor: yaklaşan/ayrılan saate bağlı
}

export interface StarContact {
  star: string
  starLon: number
  point: string
  orb: number
}

export interface ChartResult {
  input: ChartInput
  label: string
  kind: ViewMode
  houseSystem: HouseSystem
  houseSystemUsed: string
  utc: string // ISO
  jdUt: number // UT1 (Dünya'nın gerçek dönüşüne bağlı); hesaplar bununla yapılır
  jdUtc?: number // aynı anın UTC'ye göre Jülyen günü (yalnız gösterim); fark |UT1−UTC| < 0,9 s
  jdTt: number
  deltaT: number // saniye
  obliquity: number
  siderealTime: number // yerel yıldız zamanı (saat)
  ayanamsa?: number
  offsetMinutes: number
  offsetSource: string
  warnings: string[]
  ephemeris: string
  zodiac: string
  points: PointPos[]
  cusps: number[] // 12 ev başlangıcı (yoksa boş)
  angles: { asc: number; mc: number; dsc: number; ic: number; vertex: number; armc: number }
  hasHouses: boolean
  aspects: Aspect[]
  stars: StarContact[]
  lots: Lot[]
  isDay?: boolean // Güneş ufkun üstünde
  moonRange?: { from: number; to: number } // saat bilinmiyorsa: Ay'ın doğum günündeki boylam aralığı
  /** Saat duyarlılığı: burç sınırına yakın Ay/Yükselen/MC ve burcu değiştirecek saat farkı (dakika) */
  sensitivity?: { id: string; name: string; minutes: number; direction: 'erken' | 'geç'; otherSign: number }[]
  /** Saat sürgüsü simülasyonu: kayıtlı saate eklenen dakika (kayıt değişmez) */
  shiftMin?: number
  place?: Place // haritanın kurulduğu yer (taşınma ve dönüşlerde doğum yerinden farklı olabilir)
}

export interface ViewResult {
  inner: ChartResult
  outer?: ChartResult
  cross: Aspect[] // a = dış çarktaki nokta, b = iç çarktaki nokta
  title: string
  subtitle: string
}

export interface TransitEvent {
  jd: number
  utc: string
  transit: string
  type: AspectType | 'station-retro' | 'station-direct' | 'ingress'
  natal?: string
  retro: boolean
  sign?: number
  house?: number // transit gezegenin o anda bulunduğu natal ev
  /** Etkinlik dönemi: transit orbu içinde kalınan süre (tekrarlarda tüm serinin başı ve sonu) */
  window?: { start: string; end: string; orb: number; segments?: { start: string; end: string }[] } // segments: arada orb dışına çıkılıyorsa orb içindeki parçalar
  /** Retrograd tekrarı: serideki sırası */
  pass?: { n: number; of: number }
}

/** Efemeris: günlük konumlar (0h UT), ay içindeki olaylar ve Ay'ın boşlukta olduğu dönemler */
export interface EphemerisRow {
  utc: string
  sidTime: number // Greenwich yıldız zamanı, saat
  pos: Record<string, { lon: number; speed: number }>
}
export interface EphemerisEvent {
  jd: number
  utc: string
  body: string
  type: 'ingress' | 'station-retro' | 'station-direct' | 'phase'
  sign?: number // girilen burç (geçişte) veya bulunulan burç
  retro?: boolean
  phase?: 0 | 1 | 2 | 3 // yeni ay, ilk dördün, dolunay, son dördün
}
export interface VoidPeriod {
  start: string
  end: string // Ay'ın bir sonraki burca girdiği an
  sign: number // Ay'ın bulunduğu burç
  nextSign: number
  last?: { planet: string; type: AspectType; utc: string } // boşluğu başlatan son açı
}
export interface Ephemeris {
  from: string
  to: string
  zodiac: string
  bodies: { id: string; name: string; glyph: string }[]
  rows: EphemerisRow[]
  events: EphemerisEvent[]
  voids: VoidPeriod[]
  voidPlanets: 'modern' | 'traditional'
}

export interface RectifyRow {
  time: string
  asc: number
  mc: number
  moon: number
}

export interface OrbProfile {
  id: string
  name: string
  orbs: Partial<Record<AspectType, number>>
  luminaryBonus: number
}

export interface Settings {
  zodiac: 'tropical' | 'sidereal'
  ayanamsa: number // Swiss Ephemeris SE_SIDM_* kodu
  orbProfileId: string
  customOrbs: OrbProfile
  transitOrb: number
  progressionOrb: number
  showParallels: boolean
  fixedStarOrb: number
  hiddenPoints: string[] // çarkta ve tablolarda gösterilmeyecek noktalar
  defaultHouseSystem: HouseSystem // yeni haritalar için
  defaultNodeType: 'true' | 'mean'
  asteroids: boolean // Ceres, Pallas, Juno, Vesta
  learningMode: boolean
  language: 'tr' | 'en' // arayüz ve rapor dili
  rankWeights?: Partial<RankWeights> // transit önem sıralaması ağırlıkları // öğrenme modu: sembollerin geleneksel anlamlarını açıklayan sekme ve PDF bölümü
  /** Gezegen tablosundaki dignite etiketleri: modern (dış gezegenler Kova/Balık/Akrep yöneticisi) veya geleneksel (yalnız yedi gezegen) */
  rulership: 'modern' | 'traditional'
  appearance: Appearance
  updateCheck: boolean // açılışta GitHub'da yeni sürüm denetimi
}

export interface UpdateInfo {
  current: string
  latest?: string
  newer: boolean
  pageUrl?: string
  downloadUrl?: string
  notes?: string
  error?: string
}

/** Çark görünümü */
export interface Appearance {
  glyphScale: number // gezegen ve burç işaretlerinin boyutu (0,8–1,4)
  showDegrees: boolean // gezegenlerin yanında derece yazısı
  showAspectLines: boolean // çarkın içindeki açı çizgileri
  showHouseNumbers: boolean
  coloredSigns: boolean // burç işaretleri element renginde (kapalıysa tek renk)
  aspectLineWidth: number // 0,6–2
  /** Gezegen seçilince (tıklayınca) diğer açı çizgileri: soluk veya gizli */
  focusOthers: 'dim' | 'hide'
}

/** Arap noktası (Hermetik araz) */
export interface Lot {
  id: string
  name: string
  formula: string // ör. "AC + Ay − Güneş"
  lon: number
  house: number
}

export interface CityHit extends Place {
  geonameId: number
  population: number
  localName?: string // yerel ad, Türkçe addan farklıysa (ör. Münih → München)
}

export interface SavedChart extends ChartInput {
  id: string
  createdAt: string
  updatedAt: string
}

export type MenuCommand = 'new' | 'edit' | 'find' | 'pdf' | 'settings' | 'now' | 'export' | 'import' | 'library' | 'toggle-side' | 'toggle-panel' | 'about' | 'update-check' | 'ephemeris' | 'palette' | 'copy-image' | 'onboarding' | 'blind'

/** Kişisel yorum kütüphanesi: etken anahtarı → astrologun kendi metni */
export type Library = Record<string, { text: string; updatedAt: string }>

/** Haritanın NASA JPL Horizons ile karşılaştırması: geosantrik görünür ekliptik boylam, UT */
export interface JplCheck { date: string; key: string; jdUt: number; api: string; sources: Record<string, string>; rows: { id: string; jpl: number; sa: number; diff: number }[]; max: number }

export interface VerificationRun { date: string; version: string; passed: number; failed: number; sweph: string }
export interface JplSummary { date: string; version: string; passed: number; failed: number; missing: number; charts: string[]; max: Record<string, number>; horizons: string; sources: Record<string, string>; fetched: string; sha256: string; report: string }
export interface AppInfo { version: string; sweph: string; ephePath: string; epheFiles: string[]; platform: string; dataDir: string; verification?: { verify?: VerificationRun; audit?: VerificationRun; jpl?: JplSummary } }

export interface SouthAstraApi {
  view: (input: ChartInput, req: ViewRequest) => Promise<ViewResult>
  transitList: (input: ChartInput, fromIso: string, toIso: string, planets: string[]) => Promise<TransitEvent[]>
  rectify: (input: ChartInput, from: string, to: string, stepMin: number) => Promise<RectifyRow[]>
  eclipses: (input: ChartInput, fromIso: string, toIso: string) => Promise<EclipseEvent[]>
  ephemeris: (fromIso: string, toIso: string, voidPlanets: 'modern' | 'traditional') => Promise<Ephemeris>
  acg: (input: ChartInput) => Promise<AcgLine[]>
  getLibrary: () => Promise<Library>
  setLibraryEntry: (key: string, text: string) => Promise<Library>
  searchCities: (q: string, filter?: CityFilter) => Promise<CityHit[]>
  listCountries: () => Promise<CountryInfo[]>
  listRegions: (countryCode: string) => Promise<{ name: string; count: number }[]>
  listDistricts: (countryCode: string, region: string) => Promise<{ name: string; count: number }[]>
  browsePlaces: (filter: CityFilter) => Promise<CityHit[]>
  addressSearch: (q: string) => Promise<(Place & { display: string })[]>
  nearestPlace: (lat: number, lon: number) => Promise<(CityHit & { distanceKm: number }) | null>
  previewTime: (input: ChartInput) => Promise<TimePreview>
  listCharts: () => Promise<SavedChart[]>
  saveChart: (c: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<SavedChart>
  deleteChart: (id: string) => Promise<void>
  exportCharts: () => Promise<string | null>
  importCharts: () => Promise<{ added: number; skipped: number; notes: number } | null>
  getSettings: () => Promise<Settings>
  setSettings: (s: Settings) => Promise<Settings>
  exportPdf: (fileName: string, footer: string) => Promise<string | null>
  copyRect: (r: { x: number; y: number; width: number; height: number }) => Promise<{ width: number; height: number }>
  onMenu: (cb: (cmd: MenuCommand) => void) => () => void
  info: () => Promise<AppInfo>
  jplCheck: (input: ChartInput) => Promise<JplCheck>
  notices: () => Promise<{ license: string; thirdParty: string }>
  openExternal: (url: string) => Promise<void>
  checkUpdate: () => Promise<UpdateInfo>
}
