// Kayıtlı haritalar: kullanıcı klasöründe charts.json + günlük yedek (son 30 gün)
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { SavedChart } from '@shared/types'

let file = ''
let backupDir = ''
let charts: SavedChart[] = []

export function initStore(dir: string): void {
  file = join(dir, 'charts.json')
  backupDir = join(dir, 'yedekler')
  if (existsSync(file)) {
    try { charts = JSON.parse(readFileSync(file, 'utf8')) } catch {
      // bozuk dosyayı kenara al, kaybetme
      renameSync(file, file + '.bozuk-' + Date.now())
      charts = []
    }
  }
}

function backup(): void {
  mkdirSync(backupDir, { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  writeFileSync(join(backupDir, `charts-${today}.json`), JSON.stringify(charts, null, 2))
  const old = readdirSync(backupDir).filter((f) => /^charts-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(0, -30)
  for (const f of old) rmSync(join(backupDir, f))
}

function flush(): void {
  const tmp = file + '.tmp'
  writeFileSync(tmp, JSON.stringify(charts, null, 2))
  renameSync(tmp, file) // yarım yazılmış dosya kalmasın
  backup()
}

export const listCharts = (): SavedChart[] => [...charts].sort((a, b) => a.name.localeCompare(b.name, 'tr'))

export function saveChart(c: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SavedChart {
  const now = new Date().toISOString()
  const existing = c.id ? charts.find((x) => x.id === c.id) : undefined
  if (existing) {
    Object.assign(existing, c, { updatedAt: now })
    flush()
    return existing
  }
  const saved: SavedChart = { ...c, id: randomUUID(), createdAt: now, updatedAt: now }
  charts.push(saved)
  flush()
  return saved
}

export function deleteChart(id: string): void {
  charts = charts.filter((c) => c.id !== id)
  flush()
}

/** Tam yedek: haritalar + yorum kütüphanesi + ayarlar */
export function exportTo(path: string, extra: { library: unknown; settings: unknown }): void {
  writeFileSync(path, JSON.stringify({ format: 'southastra-archive', version: 2, exportedAt: new Date().toISOString(), charts, library: extra.library, settings: extra.settings }, null, 2))
}

export function readArchive(path: string): { library?: unknown } {
  const d = JSON.parse(readFileSync(path, 'utf8'))
  return Array.isArray(d) ? {} : { library: d?.library }
}

/** SouthAstra arşiv dosyasını içe aktarır; aynı isim + tarih + saat + yer varsa atlar */
export function importFrom(path: string): { added: number; skipped: number } {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const list: SavedChart[] = Array.isArray(data) ? data : data?.charts
  if (!Array.isArray(list)) throw new Error('Bu dosya bir SouthAstra arşivi değil.')
  const key = (c: SavedChart) => [c.name, c.date, c.time, c.place?.lat, c.place?.lon].join('|')
  const have = new Set(charts.map(key))
  let added = 0
  let skipped = 0
  for (const c of list) {
    if (!c?.name || !c?.date || !c?.place || typeof c.place.lat !== 'number') { skipped++; continue }
    if (have.has(key(c))) { skipped++; continue }
    const now = new Date().toISOString()
    charts.push({ ...c, id: randomUUID(), createdAt: c.createdAt ?? now, updatedAt: now })
    have.add(key(c))
    added++
  }
  if (added) flush()
  return { added, skipped }
}
