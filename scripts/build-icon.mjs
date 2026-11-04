// build/icon.svg → build/icon.png (1024×1024, gerçek saydam kenarlar)
// macOS Önizleme (qlmanage) kenarları beyaz zemine karşı yumuşattığı için beyaz hale bırakıyordu.
import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const svg = readFileSync('build/icon.svg', 'utf8')
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 }, background: 'rgba(0,0,0,0)' }).render().asPng()
writeFileSync('build/icon.png', png)
console.log('build/icon.png yazıldı', png.length, 'bayt')
