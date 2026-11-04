/**
 * Yapıştırılan koordinatı çözer: "41.0086, 28.9802" (Google Haritalar), "41.0086 28.9802",
 * "41°00'31\"N 28°58'49\"E" veya Türkçe harflerle "41°00'31\"K 28°58'49\"D".
 */
export function parseCoords(text: string): { lat: number; lon: number } | null {
  const t = text.trim().replace(/[′’]/g, "'").replace(/[″”]/g, '"')
  const dms = [...t.matchAll(/(-?\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*'\s*)?(?:(\d+(?:[.,]\d+)?)\s*"\s*)?([NSEWKGDB])?/gi)]
  if (dms.length === 2) {
    const v = dms.map((m) => {
      const n = (x?: string) => (x ? Number(x.replace(',', '.')) : 0)
      let d = Math.abs(n(m[1])) + n(m[2]) / 60 + n(m[3]) / 3600
      const h = (m[4] ?? '').toUpperCase()
      if (m[1].startsWith('-') || h === 'S' || h === 'G' || h === 'W' || h === 'B') d = -d
      return { d, h }
    })
    // harf varsa hangisinin enlem olduğunu ondan anla
    const isLon = (h: string) => 'EWDB'.includes(h) && h !== ''
    const [a, b] = isLon(v[0].h) ? [v[1], v[0]] : [v[0], v[1]]
    return Math.abs(a.d) <= 90 && Math.abs(b.d) <= 180 ? { lat: a.d, lon: b.d } : null
  }
  const m = t.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/)
  if (m) {
    const la = Number(m[1])
    const lo = Number(m[2])
    return Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? { lat: la, lon: lo } : null
  }
  return null
}

