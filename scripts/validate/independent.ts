// Bağımsız astronomik formüller (Swiss Ephemeris kullanılmaz). Kaynak: Jean Meeus, Astronomical Algorithms, 2. baskı (1998).
// Yıldız zamanı (12.4), ekliptik eğimi (22.2), nütasyon (22, IAU 1980 serisinin büyük terimleri), yükselen ve MC, ev formülleri.
const R = Math.PI / 180
const D = 180 / Math.PI
export const norm360 = (x: number) => ((x % 360) + 360) % 360
const atan2d = (y: number, x: number) => norm360(Math.atan2(y, x) * D)

/** Nütasyon (Meeus 22, IAU 1980 serisinin en büyük 9 terimi; doğruluk ~0,1″) — Δψ, Δε derece */
export function nutation(jdTT: number): { dpsi: number; deps: number } {
  const T = (jdTT - 2451545) / 36525
  const D_ = norm360(297.85036 + 445267.11148 * T - 0.0019142 * T * T + (T ** 3) / 189474) * R
  const M = norm360(357.52772 + 35999.05034 * T - 0.0001603 * T * T - (T ** 3) / 300000) * R
  const Mp = norm360(134.96298 + 477198.867398 * T + 0.0086972 * T * T + (T ** 3) / 56250) * R
  const F = norm360(93.27191 + 483202.017538 * T - 0.0036825 * T * T + (T ** 3) / 327270) * R
  const Om = norm360(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T ** 3) / 450000) * R
  // [D, M, M', F, Ω, ψ0, ψ1, ε0, ε1] (0,0001″ birimi)
  const terms: number[][] = [
    [0, 0, 0, 0, 1, -171996, -174.2, 92025, 8.9], [-2, 0, 0, 2, 2, -13187, -1.6, 5736, -3.1], [0, 0, 0, 2, 2, -2274, -0.2, 977, -0.5],
    [0, 0, 0, 0, 2, 2062, 0.2, -895, 0.5], [0, 1, 0, 0, 0, 1426, -3.4, 54, -0.1], [0, 0, 1, 0, 0, 712, 0.1, -7, 0],
    [-2, 1, 0, 2, 2, -517, 1.2, 224, -0.6], [0, 0, 0, 2, 1, -386, -0.4, 200, 0], [0, 0, 1, 2, 2, -301, 0, 129, -0.1],
    [-2, -1, 0, 2, 2, 217, -0.5, -95, 0.3], [-2, 0, 1, 0, 0, -158, 0, 0, 0], [-2, 0, 0, 2, 1, 129, 0.1, -70, 0],
    [0, 0, -1, 2, 2, 123, 0, -53, 0], [2, 0, 0, 0, 0, 63, 0, 0, 0], [0, 0, 1, 0, 1, 63, 0.1, -33, 0],
    [2, 0, -1, 2, 2, -59, 0, 26, 0], [0, 0, -1, 0, 1, -58, -0.1, 32, 0], [0, 0, 1, 2, 1, -51, 0, 27, 0],
    [-2, 0, 2, 0, 0, 48, 0, 0, 0], [0, 0, -2, 2, 1, 46, 0, -24, 0], [2, 0, 0, 2, 2, -38, 0, 16, 0],
    [0, 0, 2, 2, 2, -31, 0, 13, 0], [0, 0, 2, 0, 0, 29, 0, 0, 0], [-2, 0, 1, 2, 2, 29, 0, -12, 0],
    [0, 0, 0, 2, 0, 26, 0, 0, 0], [-2, 0, 0, 2, 0, -22, 0, 0, 0], [0, 0, -1, 2, 1, 21, 0, -10, 0],
    [0, 2, 0, 0, 0, 17, -0.1, 0, 0], [2, 0, -1, 0, 1, 16, 0, -8, 0], [-2, 2, 0, 2, 2, -16, 0.1, 7, 0],
    [0, 1, 0, 0, 1, -15, 0, 9, 0], [-2, 0, 1, 0, 1, -13, 0, 7, 0], [0, -1, 0, 0, 1, -12, 0, 6, 0]
  ]
  let dpsi = 0, deps = 0
  for (const [d, m, mp, f, om, p0, p1, e0, e1] of terms) {
    const arg = d * D_ + m * M + mp * Mp + f * F + om * Om
    dpsi += (p0 + p1 * T) * Math.sin(arg)
    deps += (e0 + e1 * T) * Math.cos(arg)
  }
  return { dpsi: dpsi * 0.0001 / 3600, deps: deps * 0.0001 / 3600 }
}

/** Gerçek ekliptik eğimi (Meeus 22.2 + Δε), derece */
export function trueObliquity(jdTT: number): number {
  const U = (jdTT - 2451545) / 3652500
  const e0 = 23 + 26 / 60 + 21.448 / 3600 + (-4680.93 * U - 1.55 * U ** 2 + 1999.25 * U ** 3 - 51.38 * U ** 4 - 249.67 * U ** 5 - 39.05 * U ** 6 + 7.12 * U ** 7 + 27.87 * U ** 8 + 5.79 * U ** 9 + 2.45 * U ** 10) / 3600
  return e0 + nutation(jdTT).deps
}

/** Görünür Greenwich yıldız zamanı (Meeus 12.4 + ekinoks denklemi), derece; jdUT = UT1 */
export function apparentGST(jdUT: number, jdTT: number): number {
  const T = (jdUT - 2451545) / 36525
  const gmst = norm360(280.46061837 + 360.98564736629 * (jdUT - 2451545) + 0.000387933 * T * T - (T ** 3) / 38710000)
  const { dpsi } = nutation(jdTT)
  return norm360(gmst + dpsi * Math.cos(trueObliquity(jdTT) * R))
}

/** RAMC, MC, ASC ve ev formülleri (Placidus, Koch, Regiomontanus, Campanus, Porphyry, Eşit, Tam burç) */
export function houses(ramc: number, lat: number, eps: number) {
  const th = ramc, ph = lat, ep = eps
  const cuspAt = (r: number, p: number) => atan2d(Math.sin(r * R), Math.cos(r * R) * Math.cos(ep * R) - Math.tan(p * R) * Math.sin(ep * R))
  const raToLon = (a: number) => atan2d(Math.sin(a * R), Math.cos(a * R) * Math.cos(ep * R))
  const decOf = (l: number) => Math.asin(Math.sin(ep * R) * Math.sin(l * R)) * D
  const adOf = (l: number) => Math.asin(Math.tan(ph * R) * Math.tan(decOf(l) * R)) * D
  const MC = raToLon(th)
  const ASC = cuspAt(th + 90, ph)
  const fill = (c10: number, c11: number, c12: number, c1: number, c2: number, c3: number) => [c1, c2, c3, c10 + 180, c11 + 180, c12 + 180, c1 + 180, c2 + 180, c3 + 180, c10, c11, c12].map(norm360)
  const solve = (f: (l: number) => number, start: number) => { let l = start; for (let k = 0; k < 100; k++) l = raToLon(f(l)); return l }
  const sys: Record<string, () => number[]> = {
    P: () => fill(MC, solve((l) => th + (90 + adOf(l)) / 3, MC + 30), solve((l) => th + (2 * (90 + adOf(l))) / 3, MC + 60), ASC, solve((l) => th + 180 - (2 * (90 - adOf(l))) / 3, ASC + 30), solve((l) => th + 180 - (90 - adOf(l)) / 3, ASC + 60)),
    K: () => { const dsa = 90 + adOf(MC); const a = (t: number) => cuspAt(t + 90, ph); return fill(MC, a(th - (2 * dsa) / 3), a(th - dsa / 3), ASC, a(th + dsa / 3), a(th + (2 * dsa) / 3)) },
    R: () => { const p = (h: number) => Math.atan(Math.tan(ph * R) * Math.sin(h * R)) * D; return fill(MC, cuspAt(th + 30, p(30)), cuspAt(th + 60, p(60)), ASC, cuspAt(th + 120, p(60)), cuspAt(th + 150, p(30))) },
    C: () => { const cus = (h: number) => { const a = Math.atan2(Math.sin(h * R) * Math.cos(ph * R), Math.cos(h * R)) * D; const p = Math.asin(Math.sin(ph * R) * Math.sin(h * R)) * D; return cuspAt(th + a, p) }; return fill(MC, cus(30), cus(60), ASC, cus(120), cus(150)) },
    O: () => { const q1 = norm360(ASC - MC) / 3, q2 = norm360(MC + 180 - ASC) / 3; return fill(MC, MC + q1, MC + 2 * q1, ASC, ASC + q2, ASC + 2 * q2) },
    E: () => Array.from({ length: 12 }, (_, i) => norm360(ASC + 30 * i)),
    W: () => Array.from({ length: 12 }, (_, i) => norm360(Math.floor(ASC / 30) * 30 + 30 * i))
  }
  return { MC, ASC, sys }
}

/** Ortalama Ay düğümü (Meeus 47.7), ortalama ekinoksa göre; görünür konum için Δψ eklenir */
export function meanNode(jdTT: number): number {
  const T = (jdTT - 2451545) / 36525
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T ** 3) / 467441 - (T ** 4) / 60616000 + nutation(jdTT).dpsi)
}

export const arcsec = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180) * 3600
