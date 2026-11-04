import { app, BrowserWindow, clipboard, ClipboardItem, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { AppInfo } from '@shared/types'
import { acg, ephemeris, eclipses, getEphePath, initEphemeris, rectify, swephVersion, transitList, useSettings, view } from './engine'
import { getLibrary, initLibrary, mergeLibrary, setLibraryEntry } from './library'
import { browsePlaces, listCountries, listDistricts, listRegions, loadCities, nearest, searchCities } from './cities'
import { deleteChart, exportTo, importFrom, initStore, listCharts, readArchive, saveChart } from './store'
import { getSettings, initSettings, setSettings } from './settings'
import { buildMenu } from './menu'
import { jplCheck } from './jplcheck'
import { getLang, setLang, t } from '@shared/i18n'
import '@shared/i18n/en/all'
import { toUtc } from './time'
import { addressSearch } from './geocode'
import { checkForUpdate } from './updates'

// Testler için ayrı veri klasörü (gerçek arşive dokunmasın)
if (process.env.SA_DATA_DIR) app.setPath('userData', process.env.SA_DATA_DIR)

const resourceDir = app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources')

function createWindow(): void {
  const win = new BrowserWindow({
    width: Number(process.env.SA_WIN_W) || 1440, // SA_WIN_W: test için pencere genişliği
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#13161d',
    title: 'SouthAstra',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    ...(process.platform !== 'darwin' && !app.isPackaged ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.once('ready-to-show', () => win.show())
  // Geliştirme: SA_SHOT=dosya.png ile açılışta ekran görüntüsü alıp kapanır (SA_SHOT_JS: önce çalıştırılacak betik)
  const shot = process.env.SA_SHOT
  if (shot) {
    win.webContents.on('console-message', (e) => { if (String(e.message).startsWith('SHOTLOG')) console.log(e.message) })
    win.webContents.on('render-process-gone', (_e, d) => console.log('SHOTLOG ÇÖKTÜ', d.reason, d.exitCode))
    win.webContents.on('did-start-navigation', (d) => { if (!d.isSameDocument) console.log('SHOTLOG GEZİNME', d.url) })
    win.webContents.on('unresponsive', () => console.log('SHOTLOG YANIT VERMİYOR'))
    win.webContents.once('did-finish-load', async () => {
      if (process.env.SA_SHOT_JS) await win.webContents.executeJavaScript(readFileSync(process.env.SA_SHOT_JS, 'utf8'))
      await new Promise((r) => setTimeout(r, 1200))
      const img = await win.webContents.capturePage()
      writeFileSync(shot, img.toPNG())
      app.quit()
    })
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').trim() || t('harita')

app.whenReady().then(() => {
  // Geliştirme modunda da Dock/görev çubuğunda SouthAstra ikonu (kurulu sürümde ikon pakete gömülüdür)
  if (!app.isPackaged && process.platform === 'darwin') app.dock?.setIcon(join(__dirname, '../../build/icon.png'))
  const dataDir = app.getPath('userData')
  initEphemeris(join(resourceDir, 'ephe'))
  loadCities(join(resourceDir, 'cities.json.gz'))
  initStore(dataDir)
  const s0 = initSettings(join(dataDir, 'settings.json'))
  setLang(s0.language)
  useSettings(s0)
  initLibrary(join(dataDir, 'library.json'))
  buildMenu()

  ipcMain.handle('chart:view', (_e, input, req) => view(input, req))
  ipcMain.handle('chart:transits', (_e, input, from: string, to: string, planets: string[]) => transitList(input, from, to, planets))
  ipcMain.handle('chart:rectify', (_e, input, from: string, to: string, step: number) => rectify(input, from, to, step))
  ipcMain.handle('chart:eclipses', (_e, input, from: string, to: string) => eclipses(input, from, to))
  ipcMain.handle('chart:acg', (_e, input) => acg(input))
  ipcMain.handle('chart:jpl', (_e, input) => jplCheck(input))
  ipcMain.handle('chart:ephemeris', (_e, from: string, to: string, vp: 'modern' | 'traditional') => ephemeris(from, to, vp))
  ipcMain.handle('library:get', () => getLibrary())
  ipcMain.handle('library:set', (_e, key: string, text: string) => setLibraryEntry(key, text))
  ipcMain.handle('cities:search', (_e, q: string, filter) => searchCities(q, filter ?? {}))
  ipcMain.handle('cities:countries', () => listCountries())
  ipcMain.handle('cities:regions', (_e, cc: string) => listRegions(cc))
  ipcMain.handle('cities:districts', (_e, cc: string, region: string) => listDistricts(cc, region))
  ipcMain.handle('geo:address', (_e, q: string) => addressSearch(q))
  ipcMain.handle('cities:browse', (_e, filter) => browsePlaces(filter ?? {}))
  ipcMain.handle('cities:nearest', (_e, lat: number, lon: number) => nearest(lat, lon))
  ipcMain.handle('time:preview', (_e, input) => {
    const t = toUtc(input)
    return { utc: new Date(t.utcMs).toISOString(), offsetMinutes: t.offsetMinutes, source: t.source, warnings: t.warnings, dst: t.dst }
  })
  ipcMain.handle('charts:list', () => listCharts())
  ipcMain.handle('charts:save', (_e, c) => saveChart(c))
  ipcMain.handle('charts:delete', (_e, id: string) => deleteChart(id))
  ipcMain.handle('charts:export', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)!
    const r = await dialog.showSaveDialog(win, { title: t('Arşivi dışa aktar (haritalar, yorumlar, ayarlar)'), defaultPath: `SouthAstra-${t('arsiv')}-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: t('SouthAstra arşivi'), extensions: ['json'] }] })
    if (r.canceled || !r.filePath) return null
    exportTo(r.filePath, { library: getLibrary(), settings: getSettings() })
    return r.filePath
  })
  ipcMain.handle('charts:import', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)!
    const r = await dialog.showOpenDialog(win, { title: t('Arşiv içe aktar'), properties: ['openFile'], filters: [{ name: t('SouthAstra arşivi'), extensions: ['json'] }] })
    if (r.canceled || !r.filePaths[0]) return null
    const res = importFrom(r.filePaths[0])
    const notes = mergeLibrary(readArchive(r.filePaths[0]).library as Record<string, { text: string; updatedAt: string }>)
    return { ...res, notes }
  })
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, s) => {
    const v = setSettings(s)
    const changed = getLang() !== v.language
    setLang(v.language); useSettings(v)
    if (changed) buildMenu() // menü dili
    return v
  })
  ipcMain.handle('pdf:export', async (e, fileName: string, footer: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)!
    const target = process.env.SA_PDF // test: kayıt penceresi olmadan yaz
      ?? (await dialog.showSaveDialog(win, { title: t('PDF olarak kaydet'), defaultPath: `${safeName(fileName)}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] })).filePath
    if (!target) return null
    win.setBackgroundColor('#ffffff') // kenar boşlukları pencere rengiyle boyanmasın
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4', printBackground: true, preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-family:-apple-system,'Segoe UI',sans-serif;font-size:7.5px;color:#8a93a6;padding:0 12mm;display:flex;justify-content:space-between"><span>${esc(footer)}</span><span>${t('Sayfa {page} / {total}', { page: '<span class="pageNumber"></span>', total: '<span class="totalPages"></span>' })}</span></div>`
    })
    win.setBackgroundColor('#13161d')
    writeFileSync(target, pdf)
    if (!process.env.SA_PDF) shell.showItemInFolder(target)
    return target
  })
  // Çarkı resim olarak panoya kopyala: pencerenin verilen bölgesini ekran çözünürlüğünde yakala
  ipcMain.handle('app:copy-rect', async (e, r: { x: number; y: number; width: number; height: number }) => {
    const win = BrowserWindow.fromWebContents(e.sender)!
    const rect = { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) }
    const img = await win.webContents.capturePage(rect)
    if (img.isEmpty()) throw new Error(t('Görüntü alınamadı.'))
    const png = img.toPNG()
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }) })])
    if (process.env.SA_COPY) writeFileSync(process.env.SA_COPY, png) // test
    return img.getSize()
  })
  const docDir = app.isPackaged ? process.resourcesPath : join(__dirname, '../..')
  ipcMain.handle('app:notices', () => {
    const read = (f: string) => { try { return readFileSync(join(docDir, f), 'utf8') } catch { return '' } }
    return { license: read('LICENSE'), thirdParty: read('THIRD_PARTY_NOTICES.md') }
  })
  ipcMain.handle('app:open', (_e, url: string) => { if (/^https:\/\/[\w.-]+\//.test(url)) return shell.openExternal(url) })
  ipcMain.handle('app:update', () => checkForUpdate())
  ipcMain.handle('app:info', () => {
    let epheFiles: string[] = []
    try { epheFiles = readdirSync(getEphePath()).filter((f) => /\.(se1|txt)$/i.test(f)).sort() } catch { /* yok */ }
    let verification: AppInfo['verification']
    try { verification = JSON.parse(readFileSync(app.isPackaged ? join(process.resourcesPath, 'verification.json') : join(__dirname, '../../resources/verification.json'), 'utf8')) } catch { /* test çalıştırılmamış */ }
    return { version: app.getVersion(), sweph: swephVersion(), ephePath: getEphePath(), epheFiles, platform: process.platform, dataDir, verification }
  })

  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
