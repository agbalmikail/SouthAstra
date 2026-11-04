// Açı kalıpları: büyük üçgen, T-kare, büyük haç, Yod, uçurtma, mistik dikdörtgen, stelyum
import type { AspectType, ChartResult } from './types'
import { signOf } from './zodiac'

export interface Pattern {
  name: string
  points: string[]
  detail: string
}

const BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

export function aspectPatterns(c: ChartResult, includeAngles = false): Pattern[] {
  const ids = [...BODIES.filter((id) => c.points.some((p) => p.id === id)), ...(includeAngles && c.hasHouses ? ['asc', 'mc'] : [])]
  const rel = new Map<string, AspectType>()
  for (const a of c.aspects.filter((x) => x.certainty !== 'olasi')) {
    if (!ids.includes(a.a) || !ids.includes(a.b)) continue
    rel.set(`${a.a}|${a.b}`, a.type)
    rel.set(`${a.b}|${a.a}`, a.type)
  }
  const is = (x: string, y: string, t: AspectType) => rel.get(`${x}|${y}`) === t
  const out: Pattern[] = []
  const seen = new Set<string>()
  const add = (name: string, pts: string[], detail: string) => {
    const k = name + ':' + [...pts].sort().join(',')
    if (seen.has(k)) return
    seen.add(k)
    out.push({ name, points: pts, detail })
  }
  const n = ids.length
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const [a, b, d] = [ids[i], ids[j], ids[k]]
    if (is(a, b, 'trine') && is(b, d, 'trine') && is(a, d, 'trine')) add('Büyük üçgen', [a, b, d], 'Üç nokta birbirine üçgen')
    for (const [x, y, z] of [[a, b, d], [a, d, b], [b, d, a]]) {
      if (is(x, y, 'opposition') && is(z, x, 'square') && is(z, y, 'square')) add('T-kare', [x, y, z], 'Karşıtlık ve iki ucuna kare yapan odak noktası')
      if (is(x, y, 'sextile') && is(z, x, 'quincunx') && is(z, y, 'quincunx')) add('Yod', [x, y, z], 'Altmışlık ve iki ucuna quincunx yapan odak noktası')
    }
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) for (let l = k + 1; l < n; l++) {
    const q = [ids[i], ids[j], ids[k], ids[l]]
    const opp = (x: string, y: string) => is(x, y, 'opposition')
    // iki karşıtlık çifti bul
    const pairs: [string, string, string, string][] = [[q[0], q[1], q[2], q[3]], [q[0], q[2], q[1], q[3]], [q[0], q[3], q[1], q[2]]]
    for (const [a, b, d, e] of pairs) {
      if (!opp(a, b) || !opp(d, e)) continue
      if (is(a, d, 'square') && is(a, e, 'square') && is(b, d, 'square') && is(b, e, 'square')) add('Büyük haç', q, 'İki karşıtlık, dört kare')
      const tri = (x: string, y: string) => is(x, y, 'trine')
      const sex = (x: string, y: string) => is(x, y, 'sextile')
      if ((tri(a, d) && tri(b, e) && sex(a, e) && sex(b, d)) || (tri(a, e) && tri(b, d) && sex(a, d) && sex(b, e))) add('Mistik dikdörtgen', q, 'İki karşıtlık, iki üçgen, iki altmışlık')
    }
    // uçurtma: büyük üçgen + üçgenin bir köşesine karşıt, diğer ikisine altmışlık dördüncü nokta
    for (let t = 0; t < 4; t++) {
      const tip = q[t]
      const rest = q.filter((_, x) => x !== t)
      if (!(is(rest[0], rest[1], 'trine') && is(rest[1], rest[2], 'trine') && is(rest[0], rest[2], 'trine'))) continue
      for (let r = 0; r < 3; r++) {
        const others = rest.filter((_, x) => x !== r)
        if (is(tip, rest[r], 'opposition') && others.every((o) => is(tip, o, 'sextile'))) add('Uçurtma', [tip, ...rest], 'Büyük üçgen ve karşıt uçta odak')
      }
    }
  }
  // stelyum: aynı burçta veya aynı evde 4+ gezegen
  for (let s = 0; s < 12; s++) {
    const inSign = BODIES.filter((id) => { const p = c.points.find((x) => x.id === id); return p && signOf(p.lon) === s })
    if (inSign.length >= 4) add('Stelyum (burç)', inSign, `${inSign.length} gezegen aynı burçta`)
  }
  if (c.hasHouses) for (let h = 1; h <= 12; h++) {
    const inHouse = BODIES.filter((id) => c.points.find((x) => x.id === id)?.house === h)
    if (inHouse.length >= 4) add('Stelyum (ev)', inHouse, `${inHouse.length} gezegen ${h}. evde`)
  }
  return out
}
