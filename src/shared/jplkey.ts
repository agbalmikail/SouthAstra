import type { ChartInput } from './types'
/** NASA karşılaştırmasının ait olduğu doğum bilgisi (değişirse sonuç geçersiz sayılır) */
export const jplKey = (i: ChartInput) => JSON.stringify([i.date, i.time, i.timeUnknown ?? false, i.timeMode, i.manualOffset ?? null, i.place.tz, i.place.lat, i.place.lon])
