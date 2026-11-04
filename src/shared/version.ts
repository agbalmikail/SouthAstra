/** "0.10.2" > "0.9.9" gibi sürüm karşılaştırması */
export function isNewer(latest: string, current: string): boolean {
  const a = latest.replace(/^v/, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0)
  const b = current.replace(/^v/, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  }
  return false
}
