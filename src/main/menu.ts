import { app, BrowserWindow, Menu, shell } from 'electron'
import type { MenuCommand } from '@shared/types'
import { t } from '@shared/i18n'

export function buildMenu(): void {
  const send = (cmd: MenuCommand) => () => BrowserWindow.getFocusedWindow()?.webContents.send('menu', cmd)
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: 'SouthAstra',
      submenu: [
        { label: t('SouthAstra Hakkında'), click: send('about') },
        { type: 'separator' as const },
        { label: t('Ayarlar…'), accelerator: 'CmdOrCtrl+,', click: send('settings') },
        { label: t('Güncellemeleri denetle…'), click: send('update-check') },
        { type: 'separator' as const },
        { role: 'hide' as const, label: t('SouthAstra\'yı Gizle') },
        { role: 'hideOthers' as const, label: t('Diğerlerini Gizle') },
        { type: 'separator' as const },
        { role: 'quit' as const, label: t('SouthAstra\'dan Çık') }
      ]
    }] : []),
    {
      label: t('Dosya'),
      submenu: [
        { label: t('Yeni harita'), accelerator: 'CmdOrCtrl+N', click: send('new') },
        { label: t('Şu anın haritası'), accelerator: 'CmdOrCtrl+T', click: send('now') },
        { label: t('Haritayı düzenle'), accelerator: 'CmdOrCtrl+E', click: send('edit') },
        { label: t('Hızlı arama…'), accelerator: 'CmdOrCtrl+K', click: send('palette') },
        { label: t('Arşivde filtrele'), accelerator: 'CmdOrCtrl+F', click: send('find') },
        { label: t('Yorum kütüphanesi'), accelerator: 'CmdOrCtrl+L', click: send('library') },
        { label: t('Efemeris'), accelerator: 'CmdOrCtrl+Shift+E', click: send('ephemeris') },
        { label: t('Kör karşılaştırma…'), click: send('blind') },
        { type: 'separator' },
        { label: t('PDF olarak kaydet…'), accelerator: 'CmdOrCtrl+P', click: send('pdf') },
        { label: t('Çarkı resim olarak kopyala'), accelerator: 'CmdOrCtrl+Shift+C', click: send('copy-image') },
        { type: 'separator' },
        { label: t('Arşivi dışa aktar…'), click: send('export') },
        { label: t('Arşiv içe aktar…'), click: send('import') },
        ...(isMac ? [] : [{ type: 'separator' as const }, { label: t('Ayarlar…'), accelerator: 'Ctrl+,', click: send('settings') }, { role: 'quit' as const, label: t('Çıkış') }])
      ]
    },
    {
      label: t('Düzen'),
      submenu: [
        { role: 'undo', label: t('Geri al') }, { role: 'redo', label: t('Yinele') }, { type: 'separator' },
        { role: 'cut', label: t('Kes') }, { role: 'copy', label: t('Kopyala') }, { role: 'paste', label: t('Yapıştır') }, { role: 'selectAll', label: t('Tümünü seç') }
      ]
    },
    {
      label: t('Görünüm'),
      submenu: [
        { label: t('Kenar çubuğunu gizle / göster'), accelerator: 'CmdOrCtrl+\\', click: send('toggle-side') },
        { label: t('Paneli gizle / göster'), accelerator: 'CmdOrCtrl+Alt+\\', click: send('toggle-panel') },
        { type: 'separator' },
        { role: 'resetZoom', label: t('Gerçek boyut') }, { role: 'zoomIn', label: t('Yakınlaştır') }, { role: 'zoomOut', label: t('Uzaklaştır') },
        { type: 'separator' }, { role: 'togglefullscreen', label: t('Tam ekran') },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' as const, label: t('Geliştirici araçları') }])
      ]
    },
    {
      label: t('Yardım'),
      submenu: [
        ...(isMac ? [] : [{ label: t('SouthAstra Hakkında'), click: send('about') }, { label: t('Güncellemeleri denetle…'), click: send('update-check') }, { type: 'separator' as const }]),
        { label: t('Başlangıç rehberi'), click: send('onboarding') },
        { type: 'separator' },
        { label: t('Swiss Ephemeris belgeleri'), click: () => shell.openExternal('https://www.astro.com/swisseph/swephinfo_e.htm') },
        { label: t('Proje sayfası'), click: () => shell.openExternal('https://github.com/agbalmikail/SouthAstra') }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
