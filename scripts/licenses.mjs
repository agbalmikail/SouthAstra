// Üçüncü taraf lisans bildirimleri: THIRD_PARTY_NOTICES.md
// Uygulamaya giren her yazılım bileşeni ve veri kaynağı, lisans metinleriyle birlikte.
// Kullanım: node scripts/licenses.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

// Çalışma zamanı bağımlılıkları + arayüze gömülen kütüphaneler + Electron
const tree = JSON.parse(execSync('npm ls --omit=dev --all --json', { encoding: 'utf8' }))
const names = new Set()
;(function walk(d) { for (const [n, v] of Object.entries(d.dependencies ?? {})) { names.add(n); walk(v) } })(tree)
for (const n of ['react', 'react-dom', 'scheduler', 'electron']) names.add(n)

const licenseText = (dir) => {
  const f = readdirSync(dir).find((x) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(x))
  return f ? readFileSync(join(dir, f), 'utf8').trim() : ''
}

const pkgs = [...names].sort().map((n) => {
  const dir = join('node_modules', n)
  const p = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const repo = typeof p.repository === 'string' ? p.repository : p.repository?.url ?? p.homepage ?? ''
  return { name: n, version: p.version, license: p.license ?? 'bilinmiyor', repo: repo.replace(/^git\+/, '').replace(/\.git$/, ''), text: existsSync(dir) ? licenseText(dir) : '' }
})

const data = [
  ['Swiss Ephemeris', 'Astrodienst AG, Zürih', 'AGPL-3.0 (çift lisanslı; SouthAstra AGPL seçeneğini kullanır)', 'https://www.astro.com/swisseph/', 'Gezegen, ev ve tutulma hesapları; efemeris dosyaları (sepl, semo, seas, sefstars). Efemerisler NASA JPL DE431 verisine dayanır.'],
  ['GeoNames', 'GeoNames.org', 'Creative Commons Atıf 4.0 (CC BY 4.0)', 'https://www.geonames.org/', 'Yer adları, koordinatlar ve saat dilimi atamaları. Veri, düzeltmelerle (scripts/countries.json) işlenmiştir.'],
  ['Natural Earth', 'naturalearthdata.com', 'Kamu malı', 'https://www.naturalearthdata.com/', 'Astrokartografi haritasındaki kıyı çizgileri ve sınırlar (1:110m).'],
  ['IANA saat dilimi veritabanı (tzdb)', 'IANA', 'Kamu malı', 'https://www.iana.org/time-zones', 'Tarihsel saat dilimi ve yaz saati kuralları (Electron/Chromium ICU verisi üzerinden).'],
  ['OpenStreetMap Nominatim (isteğe bağlı)', 'OpenStreetMap katkıcıları', 'ODbL 1.0', 'https://www.openstreetmap.org/copyright', 'Yalnızca kullanıcı "İnternette adres ara" seçeneğini kullandığında, çevrimiçi sorgu. Veri uygulamaya gömülü değildir.']
]

let md = `# Üçüncü taraf lisans bildirimleri

SouthAstra, GNU Affero General Public License v3.0 (AGPL-3.0) ile lisanslanmıştır (bkz. LICENSE).
Kaynak kodu: https://github.com/agbalmikail/SouthAstra

Bu dosya, SouthAstra'nın içerdiği veya kullandığı üçüncü taraf yazılım ve verilerin listesidir.
Otomatik üretilir: \`node scripts/licenses.mjs\`.

## Veri kaynakları

| Kaynak | Sahibi | Lisans | Kullanım |
|---|---|---|---|
${data.map(([n, o, l, u, k]) => `| [${n}](${u}) | ${o} | ${l} | ${k} |`).join('\n')}

GeoNames verisi CC BY 4.0 lisansıyla kullanılmaktadır: © GeoNames.org katkıcıları, https://creativecommons.org/licenses/by/4.0/

## Yazılım bileşenleri

| Bileşen | Sürüm | Lisans |
|---|---|---|
${pkgs.map((p) => `| ${p.repo ? `[${p.name}](${p.repo})` : p.name} | ${p.version} | ${p.license} |`).join('\n')}

Electron, Chromium ve Node.js içerir; bunların lisansları kurulu uygulamanın içindeki LICENSES.chromium.html ve LICENSE dosyalarındadır.

## Lisans metinleri
`
for (const p of pkgs) md += `\n### ${p.name} ${p.version} — ${p.license}\n\n${p.text ? '```\n' + p.text + '\n```' : '_(paket içinde ayrı lisans dosyası yok; lisans: ' + p.license + ')_'}\n`
writeFileSync('THIRD_PARTY_NOTICES.md', md)
console.log(`${pkgs.length} bileşen ve ${data.length} veri kaynağı yazıldı`)
