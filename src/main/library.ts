// Kişisel yorum kütüphanesi: astrologun her etken için yazdığı kendi metinleri (library.json)
import { t } from '@shared/i18n'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Library } from '@shared/types'

let file = ''
let lib: Library = {}

export function initLibrary(path: string): void {
  file = path
  if (existsSync(file)) {
    try { lib = JSON.parse(readFileSync(file, 'utf8')) } catch { renameSync(file, file + '.bozuk-' + Date.now()); lib = {} }
  }
}

export const getLibrary = (): Library => lib

export function setLibraryEntry(key: string, text: string): Library {
  if (key !== '__yaz__' && !/^[a-z0-9:-]{3,80}$/.test(key)) throw new Error(t('Geçersiz yorum anahtarı'))
  const body = text.trim()
  if (body) lib[key] = { text: body, updatedAt: new Date().toISOString() }
  else delete lib[key]
  const tmp = file + '.tmp'
  writeFileSync(tmp, JSON.stringify(lib, null, 2))
  renameSync(tmp, file)
  // günlük yedek (haritalarla aynı klasörde)
  const dir = join(dirname(file), 'yedekler')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `yorumlar-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(lib, null, 2))
  return lib
}

/** İçe aktarma: yalnızca kütüphanede olmayan yorumları ekler, mevcutların üzerine yazmaz */
export function mergeLibrary(other: Library): number {
  let n = 0
  for (const [k, v] of Object.entries(other ?? {})) {
    if (lib[k] || !v?.text || !/^[a-z0-9:-]{3,80}$/.test(k)) continue
    lib[k] = { text: String(v.text), updatedAt: v.updatedAt ?? new Date().toISOString() }
    n++
  }
  if (n) setLibraryEntry('__yaz__', '') // dosyaya yaz (boş anahtar silinir)
  return n
}
