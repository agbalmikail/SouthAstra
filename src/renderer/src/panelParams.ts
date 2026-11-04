// Panel ayarları (aralık, filtre, orb…): panel ile PDF aynı değerleri kullanır; seçimler hatırlanır.
import { useCallback, useSyncExternalStore } from 'react'

export interface PanelParams {
  transitList: { from: string; to: string; planets: string[]; kinds: { aspects: boolean; stations: boolean; ingress: boolean } }
  eclipses: { from: string; to: string; onlyContacts: boolean }
  rectify: Record<string, { from: string; to: string; step: number }> // harita başına (doğum saati farklı)
  midpoints: { orb: number }
  timelords: { span: number; nightNodes: 'end' | 'afterMars' }
}

const KEY = 'sa.panelParams'
const y = new Date().getFullYear()
const DEFAULTS: PanelParams = {
  transitList: { from: `${y}-01-01`, to: `${y}-12-31`, planets: ['mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], kinds: { aspects: true, stations: true, ingress: false } },
  eclipses: { from: `${y}-01-01`, to: `${y + 2}-12-31`, onlyContacts: false },
  rectify: {},
  midpoints: { orb: 1.5 },
  timelords: { span: 12, nightNodes: 'end' }
}

function load(): PanelParams {
  const out: PanelParams = structuredClone(DEFAULTS)
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw && typeof raw === 'object') for (const k of Object.keys(DEFAULTS) as (keyof PanelParams)[]) if (raw[k] && typeof raw[k] === 'object') Object.assign(out[k], raw[k])
    // eski sürümün kayıtları
    const tp = JSON.parse(localStorage.getItem('transit-planets') ?? 'null')
    if (!raw?.transitList && Array.isArray(tp)) out.transitList.planets = tp
    if (!raw?.timelords && localStorage.getItem('sa.firdaria.nightNodes') === 'afterMars') out.timelords.nightNodes = 'afterMars'
  } catch { /* bozuk kayıt: varsayılanlar */ }
  return out
}

let state = load()
const subs = new Set<() => void>()

export function getPanelParams(): PanelParams { return state }

export function setPanelParam<K extends keyof PanelParams>(key: K, value: PanelParams[K]): void {
  state = { ...state, [key]: value }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* yok */ }
  subs.forEach((f) => f())
}

export function usePanelParam<K extends keyof PanelParams>(key: K): [PanelParams[K], (v: PanelParams[K]) => void] {
  const v = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state[key])
  const set = useCallback((nv: PanelParams[K]) => setPanelParam(key, nv), [key])
  return [v, set]
}

/** Saat aralığı varsayılanı: kayıtlı saatin ±60 dk'sı, adım 4 dk; saat bilinmiyorsa tüm gün, 30 dk */
export const rectifyKey = (date: string, time: string, unknown?: boolean) => `${date}|${unknown ? '?' : time}`
export function rectifyDefaults(time: string, unknown?: boolean): { from: string; to: string; step: number } {
  if (unknown) return { from: '00:00', to: '23:59', step: 30 }
  const sh = (m: number) => { const [h, mm] = time.slice(0, 5).split(':').map(Number); const x = (((h * 60 + mm + m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }
  return { from: sh(-60), to: sh(60), step: 4 }
}
