import { join } from 'node:path'
import { initEphemeris, natalChart } from '../src/main/engine'
import { isDayChart, mutualReceptions, dispositorChains } from '../src/shared/dignities'
import { toUtc } from '../src/main/time'
initEphemeris(join(process.cwd(), 'resources/ephe'))
const base = { name: 'x', date: '1975-11-02', time: '12:00', timeUnknown: true, place: { name: 'İstanbul', country: 'Türkiye', lat: 41.01, lon: 28.95, tz: 'Europe/Istanbul' }, timeMode: 'zone', houseSystem: 'P', nodeType: 'mean' } as never
const c = natalChart(base)
console.log('noktalar', c.points.map((p) => p.id).join(','), '| hasHouses', c.hasHouses, '| lots', c.lots?.length, '| isDay', c.isDay, '| isDayChart', isDayChart(c))
console.log('aspects with moon', c.aspects.filter((a) => a.a === 'moon' || a.b === 'moon').map((a) => `${a.a}-${a.b} ${a.type} ${a.orb.toFixed(2)}`).join('; '))
for (const d of ['1959-07-01', '1959-01-15', '1959-10-15']) { const t = toUtc({ ...(base as object), date: d, time: '12:00', timeUnknown: false } as never); console.log('TR', d, t.offsetMinutes, t.warnings.join(' / ').slice(0, 160)) }
