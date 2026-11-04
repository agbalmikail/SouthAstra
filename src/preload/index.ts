import { contextBridge, ipcRenderer } from 'electron'
import type { MenuCommand, SouthAstraApi } from '@shared/types'

const api: SouthAstraApi = {
  view: (input, req) => ipcRenderer.invoke('chart:view', input, req),
  transitList: (input, from, to, planets) => ipcRenderer.invoke('chart:transits', input, from, to, planets),
  rectify: (input, from, to, step) => ipcRenderer.invoke('chart:rectify', input, from, to, step),
  eclipses: (input, from, to) => ipcRenderer.invoke('chart:eclipses', input, from, to),
  acg: (input) => ipcRenderer.invoke('chart:acg', input),
  getLibrary: () => ipcRenderer.invoke('library:get'),
  setLibraryEntry: (key, text) => ipcRenderer.invoke('library:set', key, text),
  searchCities: (q, filter) => ipcRenderer.invoke('cities:search', q, filter),
  listCountries: () => ipcRenderer.invoke('cities:countries'),
  listRegions: (cc) => ipcRenderer.invoke('cities:regions', cc),
  listDistricts: (cc, region) => ipcRenderer.invoke('cities:districts', cc, region),
  browsePlaces: (filter) => ipcRenderer.invoke('cities:browse', filter),
  addressSearch: (q) => ipcRenderer.invoke('geo:address', q),
  nearestPlace: (lat, lon) => ipcRenderer.invoke('cities:nearest', lat, lon),
  previewTime: (input) => ipcRenderer.invoke('time:preview', input),
  listCharts: () => ipcRenderer.invoke('charts:list'),
  saveChart: (c) => ipcRenderer.invoke('charts:save', c),
  deleteChart: (id) => ipcRenderer.invoke('charts:delete', id),
  exportCharts: () => ipcRenderer.invoke('charts:export'),
  importCharts: () => ipcRenderer.invoke('charts:import'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  exportPdf: (name, footer) => ipcRenderer.invoke('pdf:export', name, footer),
  onMenu: (cb) => {
    const h = (_e: unknown, cmd: MenuCommand) => cb(cmd)
    ipcRenderer.on('menu', h)
    return () => { ipcRenderer.removeListener('menu', h) }
  },
  info: () => ipcRenderer.invoke('app:info'),
  notices: () => ipcRenderer.invoke('app:notices'),
  openExternal: (url) => ipcRenderer.invoke('app:open', url),
  checkUpdate: () => ipcRenderer.invoke('app:update')
}

contextBridge.exposeInMainWorld('southastra', api)
