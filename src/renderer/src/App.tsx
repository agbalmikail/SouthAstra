import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AcgLine, ChartInput, ChartResult, CityHit, HouseSystem, Library, LifeEvent, MenuCommand, Place, Rodden, SavedChart, Session, Settings, TransitEvent, ViewMode, ViewResult } from '@shared/types'
import { HOUSE_SYSTEMS, placeLabel, RODDEN, VIEW_MODES } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/zodiac'
import { fold } from './search'
import Wheel, { NO_RETRO } from './components/Wheel'
import ChartForm from './components/ChartForm'
import SettingsModal from './components/SettingsModal'
import PrintView from './components/PrintView'
import { DateBar, ShiftBar } from './components/TimeBar'
import { AspectGrid, AspectList, CrossList, HouseTable, PlanetTable } from './components/Tables'
import { Distribution, HouseCompare, PlanetDetail, RectifyPanel, StarsTable, TransitListPanel } from './components/Analysis'
import { DEFAULT_PDF, EclipsePanel, EventsPanel, InterpretPanel, LibraryModal, MidpointsPanel, PatternsBlock, PdfDialog, SessionsPanel, TraditionalPanel, type PdfSections } from './components/Extras'
import { AcgMap, AcgPanel } from './components/AcgMap'
import ZoomPane from './components/ZoomPane'
import AboutModal from './components/AboutModal'
import { fmtDateTr, fmtDecl, fmtOffset, lonParts } from './format'
import { kbd } from './platform'

const ISTANBUL: Place = { geonameId: 745044, name: 'İstanbul', district: '', region: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 41.0138, lon: 28.9497, tz: 'Europe/Istanbul', precision: 'İl/eyalet merkezi' }

function nowInput(place: Place = ISTANBUL): ChartInput {
  const s = new Date().toLocaleString('sv-SE', { timeZone: place.tz })
  const [date, time] = s.split(' ')
  return { name: 'Şu an', date, time, place, timeMode: 'zone', houseSystem: 'P', nodeType: 'true' }
}

const pref = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v === null ? d : (JSON.parse(v) as T) } catch { return d } }
const savePref = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* yok say */ } }
const errText = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

type Tab = { k: string; label: string }
const T = (k: string, label: string): Tab => ({ k, label })
const HARMONICS = [4, 5, 7, 8, 9, 11, 12, 16]
const PDF_TRANSIT_PLANETS = ['sun', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

/** Görünüme göre panel sekmeleri: ana sekmeler görünür, diğerleri "Araçlar" menüsünde */
function tabsFor(mode: ViewMode, a: string, b: string): { main: Tab[]; more: Tab[] } {
  switch (mode) {
    case 'natal': return {
      main: [T('planets', 'Gezegenler'), T('aspects', 'Açılar'), T('grid', 'Tablo'), T('houses', 'Evler'), T('interpret', 'Yorum')],
      more: [T('analysis', 'Analiz ve kalıplar'), T('traditional', 'Geleneksel (dignite)'), T('midpoints', 'Orta noktalar'), T('eclipses', 'Tutulmalar'), T('compare', 'Ev sistemleri'), T('rectify', 'Saat aralığı'), T('events', 'Hayat olayları'), T('sessions', 'Seans notları')]
    }
    case 'draconic': case 'composite': return {
      main: [T('planets', 'Gezegenler'), T('aspects', 'Açılar'), T('grid', 'Tablo'), T('houses', 'Evler'), T('interpret', 'Yorum')],
      more: [T('analysis', 'Analiz ve kalıplar'), T('traditional', 'Geleneksel (dignite)'), T('midpoints', 'Orta noktalar')]
    }
    case 'harmonic': return { main: [T('planets', 'Gezegenler'), T('aspects', 'Açılar'), T('grid', 'Tablo')], more: [] }
    case 'transit': return { main: [T('cross', 'Transit açıları'), T('list', 'Transit listesi'), T('outer', 'Transitler'), T('planets', 'Natal')], more: [T('eclipses', 'Tutulmalar')] }
    case 'progressed': case 'tertiary': case 'minor': case 'solararc': return { main: [T('cross', 'Natal\'e açılar'), T('outer', 'Progresif'), T('planets', 'Natal')], more: [] }
    case 'solarreturn': case 'lunarreturn': return { main: [T('planets', 'Dönüş'), T('houses', 'Evler'), T('aspects', 'Açılar'), T('cross', 'Natal ile'), T('interpret', 'Yorum')], more: [T('outer', 'Natal konumlar')] }
    case 'synastry': return { main: [T('cross', 'Sinastri açıları'), T('planets', a), T('outer', b)], more: [] }
    case 'acg': return { main: [T('acg', 'Çizgiler')], more: [] }
  }
}

export default function App() {
  const [charts, setCharts] = useState<SavedChart[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [input, setInput] = useState<ChartInput | null>(null)
  const [mode, setMode] = useState<ViewMode>('natal')
  const [dateMs, setDateMs] = useState(Date.now())
  const [partnerId, setPartnerId] = useState<string>('')
  const [harmonic, setHarmonic] = useState<number>(pref('harmonic', 5))
  const [hsysView, setHsysView] = useState<HouseSystem | null>(null)
  const [shift, setShift] = useState(0)
  const [view, setView] = useState<ViewResult | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState('planets')
  const [showMinor, setShowMinor] = useState<boolean>(pref('showMinor', false))
  const [form, setForm] = useState<null | 'new' | 'edit'>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(pref('theme2', 'dark'))
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [roddenFilter, setRoddenFilter] = useState<Rodden | ''>('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [library, setLibrary] = useState<Library>({})
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pdfSections, setPdfSections] = useState<PdfSections>({ ...DEFAULT_PDF, ...pref('pdfSections', {}) })
  const [printing, setPrinting] = useState(false)
  const [printTransits, setPrintTransits] = useState<TransitEvent[] | undefined>()
  const [acgLines, setAcgLines] = useState<AcgLine[]>([])
  const [acgHidden, setAcgHidden] = useState<Set<string>>(new Set(pref<string[]>('acgHidden', ['chiron'])))
  const [acgHover, setAcgHover] = useState<string | null>(null)
  const [acgMarker, setAcgMarker] = useState<CityHit | null>(null)
  const [toast, setToast] = useState('')
  const [sideW, setSideW] = useState<number>(pref('sideW', 248))
  const [panelW, setPanelW] = useState<number>(pref('panelW', 460))
  const [sideOpen, setSideOpen] = useState<boolean>(pref('sideOpen', true))
  const [panelOpen, setPanelOpen] = useState<boolean>(pref('panelOpen', true))
  useEffect(() => { savePref('sideW', sideW); savePref('panelW', panelW); savePref('sideOpen', sideOpen); savePref('panelOpen', panelOpen) }, [sideW, panelW, sideOpen, panelOpen])
  const filterRef = useRef<HTMLInputElement>(null)

  const modeDef = VIEW_MODES.find((m) => m.id === mode)!

  /** Kenar çubuğu genişliğini sürükleyerek ayarla; dir: sağa sürükleyince büyüyorsa +1 */
  const startResize = (e: React.PointerEvent, start: number, dir: 1 | -1, set: (n: number) => void, min: number, max: number) => {
    e.preventDefault()
    const x0 = e.clientX
    document.body.classList.add('resizing')
    const move = (ev: PointerEvent) => set(Math.max(min, Math.min(max, start + dir * (ev.clientX - x0))))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.classList.remove('resizing') }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const partner = charts.find((c) => c.id === partnerId)

  useEffect(() => {
    document.documentElement.dataset.theme = printing ? 'light' : theme
    if (printing) document.documentElement.dataset.printing = '1'; else delete document.documentElement.dataset.printing
    savePref('theme2', theme)
  }, [theme, printing])
  useEffect(() => savePref('showMinor', showMinor), [showMinor])
  useEffect(() => savePref('harmonic', harmonic), [harmonic])
  useEffect(() => savePref('acgHidden', [...acgHidden]), [acgHidden])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t) } }, [toast])

  useEffect(() => {
    window.southastra.getSettings().then(setSettings)
    window.southastra.getLibrary().then(setLibrary)
    window.southastra.listCharts().then((list) => {
      setCharts(list)
      if (list.length) { setCurrentId(list[0].id); setInput(list[0]) } else setInput(nowInput())
    })
  }, [])

  // Haritayı hesapla
  useEffect(() => {
    if (!input) return
    if (modeDef.needsPartner && !partner) { setView(null); setError(''); return }
    setError('')
    window.southastra.view(input, {
      mode,
      houseSystem: hsysView ?? input.houseSystem,
      date: modeDef.needsDate ? new Date(dateMs).toISOString() : undefined,
      partner: modeDef.needsPartner ? partner : undefined,
      timeShiftMin: mode === 'natal' || mode === 'draconic' ? shift : 0,
      harmonic
    }).then(setView).catch((e) => { setView(null); setError(errText(e)) })
  }, [input, mode, hsysView, dateMs, partner, shift, settings, modeDef, harmonic])

  useEffect(() => {
    if (mode === 'acg' && input) window.southastra.acg(input).then(setAcgLines).catch((e) => setError(errText(e)))
  }, [mode, input, settings])

  const tabs = useMemo(() => tabsFor(mode, input?.name ?? 'A', partner?.name ?? 'B'), [mode, input, partner])
  const allTabs = [...tabs.main, ...tabs.more]
  useEffect(() => { if (!allTabs.some((t) => t.k === tab)) setTab(tabs.main[0].k) }, [tabs, tab, allTabs])
  useEffect(() => { setSelected(null) }, [mode, input])

  const select = useCallback((c: SavedChart) => {
    setCurrentId(c.id); setInput(c); setHsysView(null); setConfirmDelete(false); setShift(0); setAcgMarker(null)
    if (partnerId === c.id) setPartnerId('')
  }, [partnerId])

  const refresh = async () => setCharts(await window.southastra.listCharts())

  const submitForm = async (data: ChartInput) => {
    const keep = form === 'edit' && input ? { sessions: input.sessions, events: input.events } : {}
    const saved = await window.southastra.saveChart(form === 'edit' && currentId ? { ...data, ...keep, id: currentId } : data)
    await refresh()
    setForm(null)
    select(saved)
    setToast(form === 'edit' ? 'Harita güncellendi' : 'Harita arşive kaydedildi')
  }

  const saveCurrent = async () => {
    if (!input) return
    const saved = await window.southastra.saveChart(input)
    await refresh()
    select(saved)
    setToast('Harita arşive kaydedildi')
  }

  const saveSessions = async (sessions: Session[]) => {
    if (!input || !currentId) return
    const saved = await window.southastra.saveChart({ ...input, sessions, id: currentId })
    setInput(saved)
    await refresh()
  }

  const saveEvents = async (events: LifeEvent[]) => {
    if (!input || !currentId) return
    const saved = await window.southastra.saveChart({ ...input, events, id: currentId })
    setInput(saved)
    await refresh()
  }

  // Olay tarihini doğum yerinin saat dilimindeki yerel saat olarak ele al
  const openEvent = (ev: LifeEvent, m: 'transit' | 'progressed' | 'solararc') => {
    if (!input) return
    const guess = Date.parse(`${ev.date}T${ev.time ?? '12:00'}:00Z`)
    const off = Date.parse(new Date(guess).toLocaleString('sv-SE', { timeZone: input.place.tz }).replace(' ', 'T') + 'Z') - guess
    setDateMs(guess - off)
    setMode(m)
    setToast(`${ev.title} · ${new Date(ev.date + 'T12:00:00').toLocaleDateString('tr-TR')}`)
  }

  const saveInterp = async (key: string, text: string) => {
    try { setLibrary(await window.southastra.setLibraryEntry(key, text)); setToast(text.trim() ? 'Yorum kütüphaneye kaydedildi' : 'Yorum silindi') } catch (e) { setError(errText(e)) }
  }

  const applyShift = async () => {
    if (!input || !currentId) return
    const [h, m] = (input.timeUnknown ? '12:00' : input.time).split(':').map(Number)
    const total = h * 60 + m + shift
    const t = ((total % 1440) + 1440) % 1440
    const d = new Date(input.date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + Math.floor(total / 1440))
    const hhmm = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    const next = { ...input, date: d.toISOString().slice(0, 10), time: hhmm, timeUnknown: false, notes: [input.notes, `Doğum saati ${input.timeUnknown ? 'bilinmiyordu' : input.time}; ${hhmm} olarak düzeltildi (${new Date().toLocaleDateString('tr-TR')}).`].filter(Boolean).join('\n') }
    const saved = await window.southastra.saveChart({ ...next, id: currentId })
    await refresh(); select(saved); setToast('Yeni doğum saati kaydedildi')
  }

  const remove = async () => {
    if (!currentId) return
    await window.southastra.deleteChart(currentId)
    const list = await window.southastra.listCharts()
    setCharts(list)
    setConfirmDelete(false)
    if (list.length) select(list[0]); else { setCurrentId(null); setInput(nowInput()) }
    setToast('Harita silindi')
  }

  const single = !view?.outer
  const natalLike = ['natal', 'draconic', 'composite', 'solarreturn', 'lunarreturn'].includes(mode)
  const pdfAvailable: (keyof PdfSections)[] = [
    'chart', 'positions', 'aspects',
    ...(single && mode !== 'harmonic' ? ['analysis' as const] : []),
    ...(mode === 'transit' ? ['transits' as const] : []),
    ...(natalLike ? ['interpretations' as const] : []),
    'notes'
  ]

  const exportPdf = useCallback(async (s: PdfSections) => {
    if (!view || !input) return
    setPdfOpen(false)
    setPdfSections(s); savePref('pdfSections', s)
    const sec = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v && pdfAvailable.includes(k as keyof PdfSections)])) as PdfSections
    setPdfSections(sec)
    if (sec.transits) {
      const from = new Date(dateMs)
      const to = new Date(dateMs); to.setUTCFullYear(to.getUTCFullYear() + 1)
      try {
        const list = await window.southastra.transitList(input, from.toISOString(), to.toISOString(), PDF_TRANSIT_PLANETS)
        setPrintTransits(list.filter((e) => e.natal || e.type !== 'ingress'))
      } catch { setPrintTransits(undefined) }
    } else setPrintTransits(undefined)
    setPrinting(true)
    await new Promise((r) => setTimeout(r, 400))
    try {
      const path = await window.southastra.exportPdf(`${view.title} - ${modeDef.name}`, `SouthAstra · ${view.title} · ${modeDef.name} · ${new Date().toLocaleDateString('tr-TR')}`)
      if (path) setToast('PDF kaydedildi')
    } catch (e) { setError(errText(e)) }
    setPrinting(false)
    setPdfSections({ ...DEFAULT_PDF, ...s })
  }, [view, input, modeDef, dateMs, pdfAvailable])

  // Menü ve kısayollar
  useEffect(() => window.southastra.onMenu(async (cmd: MenuCommand) => {
    if (cmd === 'new') setForm('new')
    if (cmd === 'edit' && currentId) setForm('edit')
    if (cmd === 'find') filterRef.current?.focus()
    if (cmd === 'now') { setCurrentId(null); setInput(nowInput(input?.place)); setMode('natal') }
    if (cmd === 'settings') setSettingsOpen(true)
    if (cmd === 'library') setLibraryOpen(true)
    if (cmd === 'about') setAboutOpen(true)
    if (cmd === 'toggle-side') setSideOpen((v) => !v)
    if (cmd === 'toggle-panel') setPanelOpen((v) => !v)
    if (cmd === 'pdf' && view && mode !== 'acg') setPdfOpen(true)
    if (cmd === 'export') { const p = await window.southastra.exportCharts(); if (p) setToast('Arşiv dışa aktarıldı') }
    if (cmd === 'import') {
      try {
        const r = await window.southastra.importCharts()
        if (r) { await refresh(); setToast(`${r.added} harita eklendi${r.skipped ? `, ${r.skipped} tanesi zaten vardı` : ''}`) }
      } catch (e) { setError(errText(e)) }
    }
  }), [currentId, input, view, mode])

  const allTags = useMemo(() => [...new Set(charts.flatMap((c) => c.tags ?? []))].sort((a, b) => a.localeCompare(b, 'tr')), [charts])
  const shown = useMemo(() => {
    const q = fold(filter.trim())
    return charts.filter((c) =>
      (!q || fold(`${c.name} ${c.place.name} ${c.place.region} ${(c.tags ?? []).join(' ')} ${c.notes ?? ''}`).includes(q)) &&
      (!tagFilter || (c.tags ?? []).includes(tagFilter)) &&
      (!roddenFilter || c.rodden === roddenFilter))
  }, [charts, filter, tagFilter, roddenFilter])

  // Kullanıcının gizlediği noktaları çarktan, tablolardan ve açılardan çıkar
  const shownView = useMemo((): ViewResult | null => {
    if (!view) return null
    const hide = new Set(settings.hiddenPoints)
    if (!hide.size) return view
    const f = (c: ChartResult): ChartResult => ({ ...c, points: c.points.filter((p) => !hide.has(p.id)), aspects: c.aspects.filter((a) => !hide.has(a.a) && !hide.has(a.b)), stars: c.stars.filter((x) => !hide.has(x.point)) })
    return { ...view, inner: f(view.inner), outer: view.outer ? f(view.outer) : undefined, cross: view.cross.filter((a) => !hide.has(a.a) && !hide.has(a.b)) }
  }, [view, settings.hiddenPoints])

  const chartFor = (id: string | null): [ChartResult | undefined, string] => {
    if (!id || !shownView) return [undefined, '']
    return id.startsWith('o:') ? [shownView.outer, id.slice(2)] : [shownView.inner, id]
  }
  const [hc, hid] = chartFor(hovered)
  const hp = hc?.points.find((p) => p.id === hid)
  const [sc, sid] = chartFor(selected)

  if (printing && shownView) return <PrintView view={shownView} sections={pdfSections} library={library} transits={printTransits} modeName={modeDef.name} />

  const inner = shownView?.inner
  const outer = shownView?.outer

  const panel = () => {
    if (!shownView || !inner) return null
    const view = shownView
    if (sc && sid && sc.points.some((p) => p.id === sid)) return <PlanetDetail chart={sc} id={sid} onClose={() => setSelected(null)} />
    switch (tab) {
      case 'planets': return <PlanetTable chart={inner} hovered={hovered} onHover={setHovered} onSelect={setSelected} />
      case 'outer': return outer ? <PlanetTable chart={outer} prefix="o:" hovered={hovered} onHover={setHovered} onSelect={setSelected} /> : null
      case 'aspects': return <AspectList chart={inner} showMinor={showMinor} hovered={hovered} onHover={setHovered} />
      case 'grid': return <AspectGrid chart={inner} showMinor={showMinor} hovered={hovered} onHover={setHovered} />
      case 'houses': return <HouseTable chart={inner} />
      case 'cross': return outer ? <CrossList outer={outer} inner={inner} cross={view.cross} showMinor={showMinor} hovered={hovered} onHover={setHovered} /> : null
      case 'analysis': return <><PatternsBlock chart={inner} /><Distribution chart={inner} /><div className="cap">Sabit yıldız kavuşumları</div><StarsTable chart={inner} /></>
      case 'traditional': return <TraditionalPanel chart={inner} />
      case 'events': return input ? <EventsPanel input={input} canSave={!!currentId} onChange={saveEvents} onOpen={openEvent} /> : null
      case 'midpoints': return <MidpointsPanel chart={inner} />
      case 'interpret': return <InterpretPanel chart={inner} library={library} onSave={saveInterp} />
      case 'eclipses': return input ? <EclipsePanel input={input} chart={mode === 'transit' ? inner : inner} /> : null
      case 'sessions': return input ? <SessionsPanel input={input} canSave={!!currentId} onChange={saveSessions} /> : null
      case 'compare': return input ? <HouseCompare input={input} base={inner} hsys={hsysView ?? input.houseSystem} /> : null
      case 'rectify': return input ? <RectifyPanel input={input} onPick={(t) => { const [h, m] = t.split(':').map(Number); const [h0, m0] = (input.timeUnknown ? '12:00' : input.time).split(':').map(Number); setShift(h * 60 + m - (h0 * 60 + m0)); setMode('natal') }} /> : null
      case 'list': return input ? <TransitListPanel input={input} natal={inner} onPick={(iso) => setDateMs(Date.parse(iso))} /> : null
      case 'acg': return input ? <AcgPanel input={input} lines={acgLines} hidden={acgHidden} setHidden={setAcgHidden} hovered={acgHover} onHover={setAcgHover} marker={acgMarker} setMarker={setAcgMarker} /> : null
    }
    return null
  }
  const minorToggle = ['aspects', 'grid', 'cross'].includes(tab) && !selected
  const moreActive = tabs.more.find((t) => t.k === tab && !selected)

  const momentText = () => {
    if (!view || !input) return ''
    const t = mode === 'solarreturn' || mode === 'lunarreturn' ? view.inner.utc : modeDef.needsDate ? new Date(dateMs).toISOString() : ''
    return t ? new Date(t).toLocaleString('tr-TR', { timeZone: input.place.tz, dateStyle: 'medium', timeStyle: 'short' }) : ''
  }

  return (
    <div className="app" style={{ gridTemplateColumns: sideOpen ? `${sideW}px minmax(0, 1fr)` : '34px minmax(0, 1fr)' }}>
      {!sideOpen ? (
        <aside className="side rail">
          <div className="drag rail-top" />
          <button className="rail-btn" onClick={() => setSideOpen(true)} title={`Kenar çubuğunu göster (${kbd('\\')})`}>»</button>
        </aside>
      ) : (
      <aside className="side">
        <div className="resizer right" onPointerDown={(e) => startResize(e, sideW, 1, setSideW, 200, 440)} onDoubleClick={() => setSideW(248)} title="Sürükleyerek genişlet · çift tıkla varsayılana dön" />
        <div className="brand drag"><span className="logo">South<b>Astra</b></span><button className="collapse-btn no-drag" onClick={() => setSideOpen(false)} title={`Kenar çubuğunu gizle (${kbd('\\')})`}>«</button></div>
        <div className="side-actions">
          <button className="btn primary block" onClick={() => setForm('new')} title={kbd('N')}>Yeni harita</button>
          <button className="btn ghost block" onClick={() => { setCurrentId(null); setInput(nowInput(input?.place)); setMode('natal') }} title={kbd('T')}>Şu anın haritası</button>
        </div>
        <input id="side-filter" ref={filterRef} className="filter" placeholder={`Arşivde ara… (${kbd('K')})`} value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="side-filters">
          <select id="side-rodden" className="compact" value={roddenFilter} onChange={(e) => setRoddenFilter(e.target.value as Rodden | '')} title="Güvenilirlik">
            <option value="">Tüm dereceler</option>
            {RODDEN.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
          </select>
          {allTags.length > 0 && (
            <select id="side-tag" className="compact" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} title="Etiket">
              <option value="">Tüm etiketler</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
        <div className="list-cap">Kayıtlı haritalar · {shown.length}{shown.length !== charts.length ? ` / ${charts.length}` : ''}</div>
        <ul className="chart-list">
          {shown.map((c) => (
            <li key={c.id} className={c.id === currentId ? 'on' : ''} onClick={() => select(c)} onDoubleClick={() => { select(c); setForm('edit') }} title="Çift tıklayınca düzenlenir">
              <span className="nm">{c.name}{c.rodden && <span className="rodden">{c.rodden}</span>}<button className="edit-btn" title="Düzenle" aria-label={`${c.name} kaydını düzenle`} onClick={(e) => { e.stopPropagation(); select(c); setForm('edit') }}>✎</button></span>
              <span className="muted small">{fmtDateTr(c.date)} · {c.place.name}{c.sessions?.length ? ` · ${c.sessions.length} seans` : ''}</span>
              {c.tags && c.tags.length > 0 && <span className="tags">{c.tags.map((t) => <span key={t}>{t}</span>)}</span>}
            </li>
          ))}
          {!charts.length && <li className="empty muted small">Henüz kayıtlı harita yok. “Yeni harita” ile ilk danışanınızı ekleyin.</li>}
          {charts.length > 0 && !shown.length && <li className="empty muted small">Süzgeçlere uyan harita yok.</li>}
        </ul>
        <div className="side-foot muted small">
          <button className="link" onClick={() => setLibraryOpen(true)} title={kbd('L')}>Yorumlar</button>
          <button className="link" onClick={() => setSettingsOpen(true)}>Ayarlar</button>
          <button className="link" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Açık' : 'Koyu'} tema</button>
        </div>
      </aside>
      )}

      <main className="main">
        <header className="top drag">
          <div className="title">
            <h1>
              {view?.title ?? input?.name ?? '…'}
              {mode !== 'natal' && <span className="badge">{mode === 'harmonic' ? `${harmonic}. harmonik` : modeDef.name}</span>}
              {input?.rodden && <span className="badge muted-badge" title={RODDEN.find((r) => r.id === input.rodden)?.desc}>Rodden {input.rodden}</span>}
              {settings.zodiac === 'sidereal' && <span className="badge muted-badge">Sideral</span>}
            </h1>
            {input && (
              <div className="sub muted">
                {fmtDateTr(input.date)} · {input.timeUnknown ? <span className="warn-inline">saat bilinmiyor (12:00)</span> : input.time} · {placeLabel(input.place)}
                {momentText() && <> · <span className="hl-text">{mode === 'solarreturn' || mode === 'lunarreturn' ? 'dönüş' : 'tarih'}: {momentText()}</span></>}
              </div>
            )}
          </div>
          <div className="controls no-drag">
            <select id="view-mode" className="compact mode-select" value={mode} onChange={(e) => { setMode(e.target.value as ViewMode); setShift(0) }} title="Harita türü">
              {[...new Set(VIEW_MODES.map((m) => m.group))].map((g) => (
                <optgroup key={g} label={g}>
                  {VIEW_MODES.filter((m) => m.group === g).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              ))}
            </select>
            {mode === 'harmonic' && (
              <select id="view-harm" className="compact" value={harmonic} onChange={(e) => setHarmonic(Number(e.target.value))} title="Harmonik numarası">
                {HARMONICS.map((h) => <option key={h} value={h}>{h}. harmonik</option>)}
              </select>
            )}
            {modeDef.needsPartner && (
              <select id="view-partner" className="compact" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} title="İkinci kişi">
                <option value="">İkinci kişiyi seçin…</option>
                {charts.filter((c) => c.id !== currentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {mode !== 'acg' && mode !== 'harmonic' && (
              <select id="view-hsys" className="compact" value={hsysView ?? input?.houseSystem ?? 'P'} onChange={(e) => setHsysView(e.target.value as HouseSystem)} title="Ev sistemi">
                {HOUSE_SYSTEMS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            <button className="btn ghost" onClick={() => setPdfOpen(true)} title={mode === 'acg' ? 'Astrokartografi için PDF henüz yok' : `PDF olarak kaydet (${kbd('P')})`} disabled={!view || mode === 'acg'}>PDF</button>
            {currentId ? (
              <>
                <button className="btn ghost" onClick={() => setForm('edit')} title={kbd('E')}>Düzenle</button>
                {confirmDelete
                  ? <button className="btn danger" onClick={remove} onBlur={() => setConfirmDelete(false)} autoFocus>Silmeyi onayla</button>
                  : <button className="btn ghost" onClick={() => setConfirmDelete(true)}>Sil</button>}
              </>
            ) : (
              input && <button className="btn ghost" onClick={saveCurrent}>Arşive kaydet</button>
            )}
          </div>
        </header>

        {error && <div className="error-bar">{error}</div>}
        {modeDef.needsPartner && !partner && (
          <div className="empty-state">
            <h2>{modeDef.name}</h2>
            <p className="muted">{charts.length > 1 ? 'Üst çubuktan ikinci kişiyi seçin.' : 'Bu görünüm için arşivde en az iki harita olmalı. Önce ikinci kişinin haritasını ekleyin.'}</p>
          </div>
        )}

        {shownView && inner && (
          <div className="content" style={{ gridTemplateColumns: panelOpen ? `minmax(0, 1fr) ${panelW}px` : 'minmax(0, 1fr) 34px' }}>
            <section className="wheel-pane">
              <ZoomPane resetKey={mode}>
                {mode === 'acg' && input
                  ? <AcgMap input={input} lines={acgLines} hidden={acgHidden} hovered={acgHover} onHover={setAcgHover} marker={acgMarker} />
                  : <Wheel inner={inner} outer={outer} cross={shownView.cross} hovered={hovered} selected={selected} onHover={setHovered} onSelect={(id) => setSelected(selected === id ? null : id)} showMinor={showMinor} />}
              </ZoomPane>
              {modeDef.needsDate && input && <DateBar ms={dateMs} tz={input.place.tz} onChange={setDateMs} label={mode === 'solarreturn' ? 'Bu tarihten sonraki ilk Güneş dönüşü' : mode === 'lunarreturn' ? 'Bu tarihten sonraki ilk Ay dönüşü' : 'Tarih'} />}
              {mode === 'natal' && currentId && input && <ShiftBar shift={shift} onChange={setShift} baseTime={input.timeUnknown ? '12:00' : input.time} onApply={applyShift} />}
              {mode !== 'acg' && (
                <div className="hover-strip">
                  {hp ? (() => {
                    const l = lonParts(hp.lon)
                    return <><span className={hp.glyph.length > 2 ? 'axis-txt' : 'sym g'}>{hp.glyph}</span><b>{hp.name}</b><span className="muted">{hc?.label}</span><span>{l.deg}° {l.signName} {String(l.min).padStart(2, '0')}'</span>{hc?.hasHouses && hp.house > 0 && <span className="muted">{hp.house}. ev</span>}{hp.retro && !NO_RETRO.has(hp.id) && <span className="tag retro">Retro</span>}{hp.dignity && <span className="muted">{hp.dignity}</span>}{hp.declination !== 0 && <span className="muted">Dekl. {fmtDecl(hp.declination)}</span>}</>
                  })() : <span className="muted">Bir gezegenin üstüne gelin; tıklayınca tüm hesaplama ayrıntıları açılır.</span>}
                </div>
              )}
            </section>

            {!panelOpen ? (
              <section className="panel rail">
                <button className="rail-btn" onClick={() => setPanelOpen(true)} title={`Paneli göster (${kbd('\\', { alt: true })})`}>«</button>
              </section>
            ) : (
            <section className="panel">
              <div className="resizer left" onPointerDown={(e) => startResize(e, panelW, -1, setPanelW, 360, 820)} onDoubleClick={() => setPanelW(460)} title="Sürükleyerek genişlet · çift tıkla varsayılana dön" />
              <div className="tabs">
                {tabs.main.map((t) => <button key={t.k} className={tab === t.k && !selected ? 'on' : ''} onClick={() => { setTab(t.k); setSelected(null) }}>{t.label}</button>)}
                {tabs.more.length > 0 && (
                  <select id="more-tabs" className={moreActive ? 'more on' : 'more'} value={moreActive ? tab : ''} onChange={(e) => { if (e.target.value) { setTab(e.target.value); setSelected(null) } }} title="Diğer araçlar">
                    <option value="">{moreActive ? moreActive.label : 'Araçlar'}</option>
                    {tabs.more.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
                  </select>
                )}
                <button className="collapse-btn" onClick={() => setPanelOpen(false)} title={`Paneli gizle (${kbd('\\', { alt: true })})`}>»</button>
              </div>
              <div className="panel-body">
                {panel()}
                {minorToggle && <label className="check"><input id="minor" type="checkbox" checked={showMinor} onChange={(e) => setShowMinor(e.target.checked)} /> Minör açıları göster</label>}
              </div>

              <details className="details" open={pref('detailsOpen', true)} onToggle={(e) => savePref('detailsOpen', (e.target as HTMLDetailsElement).open)}>
                <summary className="cap">Hesaplama bilgileri</summary>
                <dl>
                  <dt>UTC</dt><dd className="num">{inner.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, '')}</dd>
                  {(mode === 'natal' || mode === 'draconic') && <><dt>Saat farkı</dt><dd><span className="num">{fmtOffset(inner.offsetMinutes)}</span> <span className="muted small">{inner.offsetSource.replace(/ \(UTC.*\)$/, '')}</span></dd></>}
                  <dt>Yer</dt><dd>{placeLabel(inner.input.place)}</dd>
                  <dt>Koordinat</dt><dd className="num">{Math.abs(inner.input.place.lat).toFixed(4)}°{inner.input.place.lat >= 0 ? 'K' : 'G'} {Math.abs(inner.input.place.lon).toFixed(4)}°{inner.input.place.lon >= 0 ? 'D' : 'B'}</dd>
                  <dt>Doğruluk</dt><dd>{inner.input.place.precision ?? '—'}{inner.input.place.geonameId ? <span className="muted small num"> · GeoNames {inner.input.place.geonameId}</span> : ''}</dd>
                  <dt>Jülyen günü</dt><dd className="num">{inner.jdUt.toFixed(6)} UT</dd>
                  <dt>Ev sistemi</dt><dd>{inner.hasHouses ? inner.houseSystemUsed : '— (evsiz)'}</dd>
                  <dt>Zodyak</dt><dd>{inner.zodiac}</dd>
                  <dt>Efemeris</dt><dd>{inner.ephemeris}</dd>
                </dl>
                {[...inner.warnings, ...(outer?.warnings ?? []).filter((w) => !inner.warnings.includes(w))].map((w, i) => <p key={i} className="warn">{w}</p>)}
                {inner.input.notes && <p className="note small">{inner.input.notes}</p>}
              </details>
            </section>
            )}
          </div>
        )}
      </main>

      {form && <ChartForm initial={form === 'edit' ? input : null} onCancel={() => setForm(null)} onSubmit={submitForm} />}
      {settingsOpen && <SettingsModal initial={settings} onAbout={() => { setSettingsOpen(false); setAboutOpen(true) }} onClose={() => setSettingsOpen(false)} onSave={async (s) => { setSettings(await window.southastra.setSettings(s)); setSettingsOpen(false); setToast('Ayarlar kaydedildi') }} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      {libraryOpen && <LibraryModal library={library} onSave={saveInterp} onClose={() => setLibraryOpen(false)} />}
      {pdfOpen && <PdfDialog initial={pdfSections} available={pdfAvailable} onCancel={() => setPdfOpen(false)} onExport={exportPdf} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
