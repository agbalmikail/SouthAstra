// Natural Earth 1:110m (kamu malı, naturalearthdata.com) kara ve sınır verisinden
// eşdikdörtgen (equirectangular) SVG yolları üretir: x = boylam + 180, y = 90 − enlem.
// Kullanım: node scripts/build-world.mjs <ne_110m_land.geojson> <ne_110m_admin_0_boundary_lines_land.geojson>
import { readFileSync, writeFileSync } from 'node:fs'

const [landFile, borderFile] = process.argv.slice(2)
const r = (v) => Math.round(v * 10) / 10
const ring = (pts, close) => pts.map(([lon, lat], i) => `${i ? 'L' : 'M'}${r(lon + 180)} ${r(90 - lat)}`).join('') + (close ? 'Z' : '')
const paths = (file, close) => {
  const out = []
  for (const f of JSON.parse(readFileSync(file, 'utf8')).features) {
    const g = f.geometry
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : g.type === 'LineString' ? [[g.coordinates]] : g.type === 'MultiLineString' ? g.coordinates.map((c) => [c]) : []
    for (const poly of polys) for (const rg of poly) out.push(ring(rg, close))
  }
  return out.join('')
}
writeFileSync('src/renderer/src/assets/world.json', JSON.stringify({ source: 'Natural Earth 1:110m (public domain)', land: paths(landFile, true), borders: paths(borderFile, false) }))
console.log('yazıldı')
