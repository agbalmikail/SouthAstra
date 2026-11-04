// Yeni sürüm denetimi: GitHub'daki en son sürümü (Release) okur ve mevcut sürümle karşılaştırır.
// Mac'te imzasız uygulama kendini sessizce güncelleyemez; bu yüzden kullanıcıya indirme bağlantısı sunulur.
import { app } from 'electron'
import { isNewer } from '@shared/version'

const REPO = 'agbalmikail/SouthAstra'

export interface UpdateInfo {
  current: string
  latest?: string
  newer: boolean
  pageUrl?: string // sürüm notları sayfası
  downloadUrl?: string // bu işletim sistemine uygun kurulum dosyası
  notes?: string
  error?: string
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = app.getVersion()
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'SouthAstra-update-check' },
      signal: AbortSignal.timeout(8000)
    })
    if (res.status === 404) return { current, newer: false } // henüz yayınlanmış sürüm yok
    if (!res.ok) return { current, newer: false, error: `GitHub yanıt vermedi (${res.status})` }
    const r = (await res.json()) as { tag_name: string; html_url: string; body?: string; assets?: { name: string; browser_download_url: string }[] }
    const latest = r.tag_name.replace(/^v/, '')
    const want = process.platform === 'darwin' ? (process.arch === 'arm64' ? /arm64\.dmg$/ : /(x64|[^4])\.dmg$/) : process.platform === 'win32' ? /\.exe$/ : /\.AppImage$/
    const asset = r.assets?.find((a) => want.test(a.name)) ?? r.assets?.find((a) => /\.(dmg|exe)$/.test(a.name))
    return { current, latest, newer: isNewer(latest, current), pageUrl: r.html_url, downloadUrl: asset?.browser_download_url, notes: r.body?.slice(0, 2000) }
  } catch {
    return { current, newer: false, error: 'İnternete bağlanılamadı' }
  }
}
