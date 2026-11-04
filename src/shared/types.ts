export type HouseSystem = 'P' | 'K' | 'R' | 'C' | 'E' | 'W' | 'O' | 'B' | 'T' | 'M' | 'X'

export const HOUSE_SYSTEMS: { id: HouseSystem; name: string }[] = [
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
]

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
export const RODDEN: { id: Rodden; desc: string }[] = [
  { id: 'AA', desc: 'Doğum belgesi veya resmî kayıt' },
  { id: 'A', desc: 'Kişinin, ailesinin beyanı veya hafızadan' },
  { id: 'B', desc: 'Biyografi veya otobiyografi' },
  { id: 'C', desc: 'Kaynağı belirsiz, yaklaşık veya düzeltilmiş (rektifiye)' },
  { id: 'DD', desc: 'Çelişkili kaynaklar' },
  { id: 'X', desc: 'Tarih biliniyor, saat bilinmiyor' },
  { id: 'XX', desc: 'Tarih de doğrulanmamış' }
]

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
  events?: LifeEvent[]
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
  | 'harmonic' | 'acg'

export const VIEW_MODES: { id: ViewMode; name: string; group: string; needsDate?: boolean; needsPartner?: boolean }[] = [
  { id: 'natal', name: 'Natal', group: 'Doğum' },
  { id: 'draconic', name: 'Drakonik', group: 'Doğum' },
  { id: 'transit', name: 'Transitler', group: 'Öngörü', needsDate: true },
  { id: 'progressed', name: 'İkincil progresyon', group: 'Öngörü', needsDate: true },
  { id: 'tertiary', name: 'Tersiyer progresyon', group: 'Öngörü', needsDate: true },
  { id: 'minor', name: 'Minör progresyon', group: 'Öngörü', needsDate: true },
  { id: 'solararc', name: 'Solar arc', group: 'Öngörü', needsDate: true },
  { id: 'solarreturn', name: 'Güneş dönüşü', group: 'Dönüşler', needsDate: true },
  { id: 'lunarreturn', name: 'Ay dönüşü', group: 'Dönüşler', needsDate: true },
  { id: 'synastry', name: 'Sinastri', group: 'İlişki', needsPartner: true },
  { id: 'composite', name: 'Kompozit', group: 'İlişki', needsPartner: true },
  { id: 'harmonic', name: 'Harmonik harita', group: 'Doğum' },
  { id: 'acg', name: 'Astrokartografi (ACG)', group: 'Doğum' }
]

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
  jdUt: number
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

export type MenuCommand = 'new' | 'edit' | 'find' | 'pdf' | 'settings' | 'now' | 'export' | 'import' | 'library' | 'toggle-side' | 'toggle-panel' | 'about'

/** Kişisel yorum kütüphanesi: etken anahtarı → astrologun kendi metni */
export type Library = Record<string, { text: string; updatedAt: string }>

export interface SouthAstraApi {
  view: (input: ChartInput, req: ViewRequest) => Promise<ViewResult>
  transitList: (input: ChartInput, fromIso: string, toIso: string, planets: string[]) => Promise<TransitEvent[]>
  rectify: (input: ChartInput, from: string, to: string, stepMin: number) => Promise<RectifyRow[]>
  eclipses: (input: ChartInput, fromIso: string, toIso: string) => Promise<EclipseEvent[]>
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
  importCharts: () => Promise<{ added: number; skipped: number } | null>
  getSettings: () => Promise<Settings>
  setSettings: (s: Settings) => Promise<Settings>
  exportPdf: (fileName: string, footer: string) => Promise<string | null>
  onMenu: (cb: (cmd: MenuCommand) => void) => () => void
  info: () => Promise<{ version: string; sweph: string; ephePath: string; platform: string; dataDir: string }>
  notices: () => Promise<{ license: string; thirdParty: string }>
  openExternal: (url: string) => Promise<void>
}
