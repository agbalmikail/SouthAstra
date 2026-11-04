// Kullanıcı ayarları (zodyak, orb profili…): kullanıcı klasöründe settings.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Settings } from '@shared/types'
import { HOUSE_SYSTEMS } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/zodiac'

let file = ''
let current: Settings = DEFAULT_SETTINGS

export function initSettings(path: string): Settings {
  file = path
  if (existsSync(file)) {
    try { current = sanitize({ ...DEFAULT_SETTINGS, ...JSON.parse(readFileSync(file, 'utf8')) }) } catch { current = DEFAULT_SETTINGS }
  }
  return current
}

function sanitize(s: Settings): Settings {
  const num = (v: unknown, d: number, min: number, max: number) => (typeof v === 'number' && v >= min && v <= max ? v : d)
  return {
    zodiac: s.zodiac === 'sidereal' ? 'sidereal' : 'tropical',
    ayanamsa: num(s.ayanamsa, 1, 0, 50),
    orbProfileId: typeof s.orbProfileId === 'string' ? s.orbProfileId : 'standard',
    customOrbs: {
      ...DEFAULT_SETTINGS.customOrbs,
      ...s.customOrbs,
      id: 'custom',
      name: 'Özel',
      orbs: Object.fromEntries(Object.entries({ ...DEFAULT_SETTINGS.customOrbs.orbs, ...s.customOrbs?.orbs }).map(([k, v]) => [k, num(v, 0, 0, 15)])),
      luminaryBonus: num(s.customOrbs?.luminaryBonus, 2, 0, 5)
    },
    transitOrb: num(s.transitOrb, 2, 0.1, 5),
    progressionOrb: num(s.progressionOrb, 1, 0.1, 3),
    showParallels: s.showParallels !== false,
    fixedStarOrb: num(s.fixedStarOrb, 1, 0.1, 3),
    hiddenPoints: Array.isArray(s.hiddenPoints) ? s.hiddenPoints.filter((x) => typeof x === 'string') : [],
    defaultHouseSystem: HOUSE_SYSTEMS.some((h) => h.id === s.defaultHouseSystem) ? s.defaultHouseSystem : 'P',
    defaultNodeType: s.defaultNodeType === 'mean' ? 'mean' : 'true',
    asteroids: s.asteroids === true,
    rulership: s.rulership === 'traditional' ? 'traditional' : 'modern',
    appearance: {
      glyphScale: num(s.appearance?.glyphScale, 1, 0.8, 1.4),
      showDegrees: s.appearance?.showDegrees !== false,
      showAspectLines: s.appearance?.showAspectLines !== false,
      showHouseNumbers: s.appearance?.showHouseNumbers !== false,
      coloredSigns: s.appearance?.coloredSigns !== false,
      aspectLineWidth: num(s.appearance?.aspectLineWidth, 0.9, 0.6, 2)
    },
    updateCheck: s.updateCheck !== false
  }
}

export const getSettings = (): Settings => current
export function setSettings(s: Settings): Settings {
  current = sanitize(s)
  writeFileSync(file, JSON.stringify(current, null, 2))
  return current
}
