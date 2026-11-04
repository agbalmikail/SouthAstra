// Kişisel yorum kütüphanesi: astrologun her etken için yazdığı kendi metinleri (library.json)
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
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
  if (!/^[a-z0-9:-]{3,80}$/.test(key)) throw new Error('Geçersiz yorum anahtarı')
  const t = text.trim()
  if (t) lib[key] = { text: t, updatedAt: new Date().toISOString() }
  else delete lib[key]
  const tmp = file + '.tmp'
  writeFileSync(tmp, JSON.stringify(lib, null, 2))
  renameSync(tmp, file)
  return lib
}
