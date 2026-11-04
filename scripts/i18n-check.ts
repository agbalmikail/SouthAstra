// Çeviri denetimi: eksik İngilizce, çakışan karşılıklar, yer tutucu uyumsuzluğu, t() dışında kalmış Türkçe metin
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [] })
const dictFiles = walk(join(ROOT, 'src/shared/i18n/en'))
const unq = (s: string) => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
// sözlük girdileri: 'anahtar': 'değer' veya "anahtar": "değer"
const STR = String.raw`'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"`
const entry = new RegExp(String.raw`^\s*(?:${STR})\s*:\s*(?:${STR})\s*,?\s*$`)
const dict = new Map<string, { v: string; f: string }[]>()
for (const f of dictFiles) for (const line of readFileSync(f, 'utf8').split('\n')) {
  const m = line.match(entry)
  if (!m) continue
  const k = unq(m[1] ?? m[2]), v = unq(m[3] ?? m[4])
  dict.set(k, [...(dict.get(k) ?? []), { v, f: f.split('/').pop()! }])
}
const srcFiles = [...walk(join(ROOT, 'src/renderer/src')), ...walk(join(ROOT, 'src/main')), ...walk(join(ROOT, 'src/shared'))].filter((f) => !f.includes('/i18n/'))
const used = new Map<string, string>()
const tcall = new RegExp(String.raw`\bt\(\s*(?:${STR})`, 'g')
const TR = /[çğıöşüÇĞİÖŞÜ]/
const unwrapped: string[] = []
for (const f of srcFiles) {
  const txt = readFileSync(f, 'utf8')
  for (const m of txt.matchAll(tcall)) used.set(unq(m[1] ?? m[2]), f.replace(ROOT + '/', ''))
  for (const m of txt.matchAll(new RegExp(String.raw`\btc\(\s*'([^']*)'\s*,\s*(?:${STR})`, 'g'))) { used.set(unq(m[2] ?? m[3]), f.replace(ROOT + '/', '')); used.set(`${m[1]}::${unq(m[2] ?? m[3])}`, f.replace(ROOT + '/', '')) }
  txt.split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
    if (!TR.test(code) || /^\s*\*/.test(line)) return
    // t( ile sarılmamış Türkçe dizge veya JSX metni
    const strs = [...code.matchAll(new RegExp(STR, 'g'))].filter((m) => TR.test(m[0]) && !/\bt\(\s*$/.test(code.slice(0, m.index)))
    const jsx = [...code.matchAll(/>([^<>{}]*[çğıöşüÇĞİÖŞÜ][^<>{}]*)</g)]
    const tmpl = [...code.matchAll(/`([^`]*[çğıöşüÇĞİÖŞÜ][^`]*)`/g)]
    if (strs.length || jsx.length || tmpl.length) unwrapped.push(`${f.replace(ROOT + '/', '')}:${i + 1}: ${code.trim().slice(0, 140)}`)
  })
}
const missing = [...used.keys()].filter((k) => !dict.has(k))
const conflicts = [...dict].filter(([, v]) => new Set(v.map((x) => x.v)).size > 1)
const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const phBad = [...dict].filter(([k, v]) => v.some((x) => ph(x.v) !== ph(k)))
console.log(`sözlük: ${dict.size} anahtar · kodda t(): ${used.size} · eksik: ${missing.length} · çakışan: ${conflicts.length} · yer tutucu uyumsuz: ${phBad.length} · sarılmamış Türkçe satır: ${unwrapped.length}`)
const show = (title: string, arr: string[], n = 60) => { if (arr.length) { console.log(`\n${title}`); arr.slice(0, n).forEach((x) => console.log('  ' + x)); if (arr.length > n) console.log(`  … +${arr.length - n}`) } }
show('EKSİK (kodda var, sözlükte yok):', missing.map((k) => `${JSON.stringify(k)}  ← ${used.get(k)}`))
show('ÇAKIŞAN:', conflicts.map(([k, v]) => `${JSON.stringify(k)} → ${v.map((x) => `${JSON.stringify(x.v)} (${x.f})`).join(' | ')}`))
show('YER TUTUCU:', phBad.map(([k, v]) => `${JSON.stringify(k)} → ${JSON.stringify(v[0].v)}`))
if (process.argv.includes('--unwrapped')) show('SARILMAMIŞ:', unwrapped, 400)
