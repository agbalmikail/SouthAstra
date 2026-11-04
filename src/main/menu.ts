import { app, BrowserWindow, Menu, shell } from 'electron'
import type { MenuCommand } from '@shared/types'

export function buildMenu(): void {
  const send = (cmd: MenuCommand) => () => BrowserWindow.getFocusedWindow()?.webContents.send('menu', cmd)
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: 'SouthAstra',
      submenu: [
        { label: 'SouthAstra Hakkında', click: send('about') },
        { type: 'separator' as const },
        { label: 'Ayarlar…', accelerator: 'CmdOrCtrl+,', click: send('settings') },
        { type: 'separator' as const },
        { role: 'hide' as const, label: 'SouthAstra\'yı Gizle' },
        { role: 'hideOthers' as const, label: 'Diğerlerini Gizle' },
        { type: 'separator' as const },
        { role: 'quit' as const, label: 'SouthAstra\'dan Çık' }
      ]
    }] : []),
    {
      label: 'Dosya',
      submenu: [
        { label: 'Yeni harita', accelerator: 'CmdOrCtrl+N', click: send('new') },
        { label: 'Şu anın haritası', accelerator: 'CmdOrCtrl+T', click: send('now') },
        { label: 'Haritayı düzenle', accelerator: 'CmdOrCtrl+E', click: send('edit') },
        { label: 'Arşivde ara', accelerator: 'CmdOrCtrl+K', click: send('find') },
        { label: 'Yorum kütüphanesi', accelerator: 'CmdOrCtrl+L', click: send('library') },
        { type: 'separator' },
        { label: 'PDF olarak kaydet…', accelerator: 'CmdOrCtrl+P', click: send('pdf') },
        { type: 'separator' },
        { label: 'Arşivi dışa aktar…', click: send('export') },
        { label: 'Arşiv içe aktar…', click: send('import') },
        ...(isMac ? [] : [{ type: 'separator' as const }, { label: 'Ayarlar…', accelerator: 'Ctrl+,', click: send('settings') }, { role: 'quit' as const, label: 'Çıkış' }])
      ]
    },
    {
      label: 'Düzen',
      submenu: [
        { role: 'undo', label: 'Geri al' }, { role: 'redo', label: 'Yinele' }, { type: 'separator' },
        { role: 'cut', label: 'Kes' }, { role: 'copy', label: 'Kopyala' }, { role: 'paste', label: 'Yapıştır' }, { role: 'selectAll', label: 'Tümünü seç' }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Kenar çubuğunu gizle / göster', accelerator: 'CmdOrCtrl+\\', click: send('toggle-side') },
        { label: 'Paneli gizle / göster', accelerator: 'CmdOrCtrl+Alt+\\', click: send('toggle-panel') },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Gerçek boyut' }, { role: 'zoomIn', label: 'Yakınlaştır' }, { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' }, { role: 'togglefullscreen', label: 'Tam ekran' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' as const, label: 'Geliştirici araçları' }])
      ]
    },
    {
      label: 'Yardım',
      submenu: [
        ...(isMac ? [] : [{ label: 'SouthAstra Hakkında', click: send('about') }, { type: 'separator' as const }]),
        { label: 'Swiss Ephemeris belgeleri', click: () => shell.openExternal('https://www.astro.com/swisseph/swephinfo_e.htm') },
        { label: 'Proje sayfası', click: () => shell.openExternal('https://github.com/agbalmikail/SouthAstra') }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
