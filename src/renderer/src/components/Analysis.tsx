import { useEffect, useMemo, useState } from 'react'
import type { ChartInput, ChartResult, HouseSystem, RectifyRow, TransitEvent } from '@shared/types'
import { HOUSE_SYSTEMS } from '@shared/types'
import { ASPECT_BY_TYPE, ELEMENT_TR, MODALITY, moonPhase, norm360, pad2, SIGNS, signOf, TRAD_RULER } from '@shared/zodiac'
import { fmtDecl, fmtOrb, lonParts } from '../format'
import { Lon, stationText } from './Tables'
import { rectifyDefaults, rectifyKey, usePanelParam, type PanelParams } from '../panelParams'
import { transitExplain } from '@shared/learn'
import { durationClass, DURATION_NAME, importance, RANK_RULE, windowDays } from '@shared/transitRank'

const err = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

// ——— Gezegen detayı (hesaplama doğrulama paneli) ———

const dms = (v: number, unit = '°') => {
  const a = Math.abs(v)
  const d = Math.floor(a)
  const m = Math.floor((a - d) * 60)
  const s = ((a - d) * 60 - m) * 60
  return `${v < 0 ? '−' : ''}${d}${unit}${pad2(m)}'${s.toFixed(1).padStart(4, '0')}"`
}
const hms = (h: number) => {
  const x = ((h % 24) + 24) % 24
  const hh = Math.floor(x)
  const mm = Math.floor((x - hh) * 60)
  const ss = ((x - hh) * 60 - mm) * 60
  return `${pad2(hh)}:${pad2(mm)}:${ss.toFixed(1).padStart(4, '0')}`
}

export function PlanetDetail({ chart, id, onClose }: { chart: ChartResult; id: string; onClose: () => void }) {
  const p = chart.points.find((x) => x.id === id)
  if (!p) return null
  const l = lonParts(p.lon)
  const aspects = chart.aspects.filter((a) => a.a === id || a.b === id)
  const other = (a: { a: string; b: string }) => {
    const o = a.a === id ? a.b : a.a
    return o === 'asc' ? 'Yükselen' : o === 'mc' ? 'MC' : chart.points.find((x) => x.id === o)?.name ?? o
  }
  const row = (k: string, v: React.ReactNode) => <><dt>{k}</dt><dd>{v}</dd></>
  return (
    <div className="detail">
      <div className="detail-head">
        <span className="sym big">{p.glyph}</span>
        <div>
          <b>{p.name}</b>
          <div className="muted small">{l.deg}° {l.signName} {pad2(l.min)}' · {chart.label}</div>
        </div>
        <button className="btn ghost small-btn" onClick={onClose} aria-label="Kapat">Kapat</button>
      </div>
      <dl className="kv">
        {row('Ekliptik boylam', <span className="num">{dms(p.lon)} <span className="muted">({p.lon.toFixed(6)}°)</span></span>)}
        {row('Ekliptik enlem', <span className="num">{dms(p.lat)}</span>)}
        {row('Hız (boylam)', <span className="num">{p.speed.toFixed(6)}°/gün {p.retro ? '· geri' : '· ileri'}</span>)}
        {p.station && row('Duraklama', <span>{stationText(p.station)}</span>)}
        {p.latSpeed !== undefined && row('Hız (enlem)', <span className="num">{p.latSpeed.toFixed(6)}°/gün</span>)}
        {p.distance !== undefined && p.id !== 'northnode' && p.id !== 'southnode' && p.id !== 'lilith' && row('Uzaklık', <span className="num">{p.distance.toFixed(6)} AU{p.id === 'moon' ? ` · ${(p.distance * 149597870.7).toFixed(0)} km` : ''}</span>)}
        {p.ra !== undefined && row('Sağ açıklık (RA)', <span className="num">{hms(p.ra / 15)} <span className="muted">({p.ra.toFixed(4)}°)</span></span>)}
        {row('Deklinasyon', <span className="num">{fmtDecl(p.declination)} <span className="muted">({p.declination.toFixed(4)}°)</span></span>)}
        {p.azimuth !== undefined && row('Azimut / yükseklik', <span className="num">{p.azimuth.toFixed(2)}° / {p.altitude!.toFixed(2)}° <span className="muted">({p.altitude! > 0 ? 'ufkun üstünde' : 'ufkun altında'})</span></span>)}
        {chart.hasHouses && row('Ev', <span className="num">{p.house}{p.housePos !== undefined ? ` · ondalık ${p.housePos.toFixed(3)}` : ''}</span>)}
        {p.dignity && row('Dignite', p.dignity)}
        {row('Burç yöneticisi', chart.points.find((x) => x.id === TRAD_RULER[signOf(p.lon)])?.name ?? '—')}
      </dl>
      <div className="cap">Hesaplama</div>
      <dl className="kv">
        {row('Zodyak', chart.zodiac + (chart.ayanamsa !== undefined ? ` · ayanamsa ${dms(chart.ayanamsa)}` : ''))}
        {row('Koordinat', 'Geosantrik · görünür konum · gerçek ekinoks')}
        {row('Efemeris', chart.ephemeris)}
        {row('Jülyen günü', <span className="num">{chart.jdUt.toFixed(6)} UT · {chart.jdTt.toFixed(6)} TT</span>)}
        {row('ΔT', <span className="num">{chart.deltaT.toFixed(2)} sn</span>)}
        {row('Ekliptik eğimi', <span className="num">{dms(chart.obliquity)}</span>)}
        {chart.hasHouses && row('Yerel yıldız zamanı', <span className="num">{hms(chart.siderealTime)}</span>)}
      </dl>
      {aspects.length > 0 && (
        <>
          <div className="cap">Açılar</div>
          <ul className="mini-list">
            {aspects.map((a, i) => (
              <li key={i}><span className={`asp-g ${a.type}`}>{ASPECT_BY_TYPE[a.type].glyph}</span> {ASPECT_BY_TYPE[a.type].name} {other(a)} <span className="muted num">{fmtOrb(a.orb)}</span></li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// ——— Ev sistemi karşılaştırması ———

export function HouseCompare({ input, base, hsys }: { input: ChartInput; base: ChartResult; hsys: HouseSystem }) {
  const [other, setOther] = useState<HouseSystem>(hsys === 'W' ? 'P' : 'W')
  const [cmp, setCmp] = useState<ChartResult | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    setError('')
    window.southastra.view(input, { mode: 'natal', houseSystem: other }).then((r) => setCmp(r.inner)).catch((e) => setError(err(e)))
  }, [input, other])
  if (!base.hasHouses) return <p className="empty-note">Doğum saati bilinmediği için evler karşılaştırılamaz.</p>
  const nameA = HOUSE_SYSTEMS.find((h) => h.id === hsys)?.name
  const nameB = HOUSE_SYSTEMS.find((h) => h.id === other)?.name
  const changed = cmp ? base.points.filter((p) => cmp.points.find((q) => q.id === p.id)?.house !== p.house).length : 0
  return (
    <div>
      <div className="toolbar">
        <span className="muted small">{nameA} ile karşılaştır:</span>
        <select id="cmp-hsys" className="compact" value={other} onChange={(e) => setOther(e.target.value as HouseSystem)}>
          {HOUSE_SYSTEMS.filter((h) => h.id !== hsys).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {cmp && (
        <>
          <p className="hint">{changed ? `${changed} noktanın evi değişiyor (vurgulu satırlar).` : 'Hiçbir noktanın evi değişmiyor.'}</p>
          <table className="data">
            <thead><tr><th>Nokta</th><th className="r">{nameA}</th><th className="r">{nameB}</th></tr></thead>
            <tbody>
              {base.points.filter((p) => p.id !== 'southnode').map((p) => {
                const q = cmp.points.find((x) => x.id === p.id)
                const diff = q && q.house !== p.house
                return <tr key={p.id} className={diff ? 'hl' : ''}><td><span className="sym">{p.glyph}</span> {p.name}</td><td className="r num">{p.house}</td><td className="r num">{q?.house ?? '—'}{diff ? ' ◂' : ''}</td></tr>
              })}
            </tbody>
          </table>
          <table className="data" style={{ marginTop: 12 }}>
            <thead><tr><th>Ev</th><th className="r">{nameA}</th><th className="r">{nameB}</th></tr></thead>
            <tbody>
              {base.cusps.map((c, i) => <tr key={i}><td className="num">{i + 1}</td><td className="r"><Lon lon={c} /></td><td className="r"><Lon lon={cmp.cusps[i]} /></td></tr>)}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

// ——— Sabit yıldızlar ———

export function StarsTable({ chart, orb }: { chart: ChartResult; orb?: number }) {
  const name = (id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : chart.points.find((p) => p.id === id)?.name ?? id)
  const note = <p className="hint">Yıldız konumları Swiss Ephemeris sabit yıldız kataloğundan (sefstars.txt, Hipparcos tabanlı); harita anına göre öz hareket ve presesyon uygulanmış, görünür geosantrik ekliptik boylam ({chart.zodiac.toLowerCase()}). Yalnızca kavuşum (boylam farkı) değerlendirilir{orb ? `, orb ±${orb}°` : ''}; enlem farkı dikkate alınmaz. 28 klasik yıldız.</p>
  if (!chart.stars.length) return <><p className="empty-note">Orb içinde sabit yıldız kavuşumu yok.</p>{note}</>
  return (
    <>
    <table className="data">
      <thead><tr><th>Yıldız</th><th className="r">Konum</th><th>Kavuşum</th><th className="r">Orb</th></tr></thead>
      <tbody>
        {chart.stars.map((s, i) => (
          <tr key={i}><td>{s.star}</td><td className="r"><Lon lon={s.starLon} /></td><td>{name(s.point)}</td><td className="r num">{fmtOrb(s.orb)}</td></tr>
        ))}
      </tbody>
    </table>
    {note}
    </>
  )
}

// ——— Dağılım: element, nitelik, yarımküre, Ay evresi, dispozitörler ———

const CLASSIC = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

export function Distribution({ chart }: { chart: ChartResult }) {
  const pts = chart.points.filter((p) => CLASSIC.includes(p.id))
  const sun = pts.find((p) => p.id === 'sun')
  const moon = pts.find((p) => p.id === 'moon')
  const el: Record<string, string[]> = { fire: [], earth: [], air: [], water: [] }
  const mo: string[][] = [[], [], []]
  for (const p of pts) {
    const s = signOf(p.lon)
    el[SIGNS[s].element].push(p.glyph)
    mo[s % 3].push(p.glyph)
  }
  const hemi = chart.hasHouses ? {
    üst: pts.filter((p) => p.house >= 7).length, alt: pts.filter((p) => p.house <= 6).length,
    doğu: pts.filter((p) => p.house >= 10 || p.house <= 3).length, batı: pts.filter((p) => p.house >= 4 && p.house <= 9).length
  } : null
  const phase = sun && moon ? moonPhase(sun.lon, moon.lon) : null
  // dispozitör zinciri (geleneksel yöneticiler)
  const finalDisp = useMemo(() => {
    const ids = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']
    const ruler = (id: string) => TRAD_RULER[signOf(pts.find((p) => p.id === id)?.lon ?? 0)]
    const finals = ids.filter((id) => ruler(id) === id)
    const names = finals.map((f) => pts.find((p) => p.id === f)?.name).join(', ')
    return finals.length === 1 ? names : finals.length > 1 ? `Birden fazla: ${names}` : 'Yok (karşılıklı ağırlama döngüsü)'
  }, [pts])
  const bar = (n: number) => <span className="bar"><span style={{ width: `${(n / pts.length) * 100}%` }} /></span>
  return (
    <div className="dist">
      <div className="cap">Elementler</div>
      {(['fire', 'earth', 'air', 'water'] as const).map((k) => (
        <div key={k} className="dist-row"><span className="dist-k" style={{ color: `var(--${k})` }}>{ELEMENT_TR[k]}</span>{bar(el[k].length)}<span className="num">{el[k].length}</span><span className="sym small">{el[k].join(' ')}</span></div>
      ))}
      <div className="cap">Nitelikler</div>
      {MODALITY.map((m, i) => (
        <div key={m} className="dist-row"><span className="dist-k">{m}</span>{bar(mo[i].length)}<span className="num">{mo[i].length}</span><span className="sym small">{mo[i].join(' ')}</span></div>
      ))}
      {hemi && (
        <>
          <div className="cap">Yarımküreler</div>
          <div className="dist-grid">
            <span>Üst (görünür) <b className="num">{hemi.üst}</b></span><span>Alt <b className="num">{hemi.alt}</b></span>
            <span>Doğu (AC tarafı) <b className="num">{hemi.doğu}</b></span><span>Batı (DC tarafı) <b className="num">{hemi.batı}</b></span>
          </div>
        </>
      )}
      <div className="cap">Diğer</div>
      <dl className="kv">
        {phase && <><dt>Ay evresi</dt><dd>{phase.name} <span className="muted num">({phase.angle.toFixed(1)}°)</span></dd></>}
        <dt>Son dispozitör</dt><dd>{finalDisp}</dd>
        <dt>Retro gezegenler</dt><dd className="sym">{pts.filter((p) => p.retro).map((p) => p.glyph).join(' ') || '—'}</dd>
      </dl>
    </div>
  )
}

// ——— Doğum saati aralığı (basit rektifikasyon) ———

export function RectifyPanel({ input, onPick }: { input: ChartInput; onPick: (time: string) => void }) {
  const t0 = input.time.slice(0, 5)
  const [all, setAll] = usePanelParam('rectify')
  const rk = rectifyKey(input.date, t0, input.timeUnknown)
  const cur = all[rk] ?? rectifyDefaults(t0, input.timeUnknown)
  const { from, to, step } = cur
  const upd = (v: Partial<typeof cur>) => setAll({ ...all, [rk]: { ...cur, ...v } })
  const setFrom = (v: string) => upd({ from: v })
  const setTo = (v: string) => upd({ to: v })
  const setStep = (v: number) => upd({ step: v })
  const [rows, setRows] = useState<RectifyRow[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    setError('')
    window.southastra.rectify(input, from, to, step).then(setRows).catch((e) => setError(err(e)))
  }, [input, from, to, step])
  return (
    <div>
      <p className="hint">Doğum saati belirsizse aralığı girin; yükselenin ve MC'nin burç değiştirdiği saatler vurgulanır. Bir satıra tıklayınca harita o saate kaydırılır.</p>
      <div className="toolbar">
        <label className="inline small">Başlangıç <input id="r-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline small">Bitiş <input id="r-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="inline small">Adım <select id="r-step" className="compact" value={step} onChange={(e) => setStep(Number(e.target.value))}>{[1, 2, 4, 5, 10, 15, 30, 60].map((s) => <option key={s} value={s}>{s} dk</option>)}</select></label>
      </div>
      {error && <p className="error">{error}</p>}
      <RectifyTable rows={rows} current={input.timeUnknown ? undefined : t0} onPick={onPick} />
    </div>
  )
}

/** Saat aralığı tablosu (panel ve PDF ortak) */
export function RectifyTable({ rows, current, onPick }: { rows: RectifyRow[]; current?: string; onPick?: (time: string) => void }) {
  let prevAsc = -1
  return (
    <table className="data">
      <thead><tr><th>Saat</th><th className="r">Yükselen</th><th className="r">MC</th><th className="r">Ay</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const s = signOf(r.asc)
          const change = prevAsc >= 0 && s !== prevAsc
          prevAsc = s
          return (
            <tr key={r.time} className={[onPick ? 'click' : '', change ? 'hl' : '', r.time === current ? 'cur' : ''].join(' ')} onClick={() => onPick?.(r.time)}>
              <td className="num">{r.time}{change ? ' ◂ burç değişti' : ''}{r.time === current ? ' · kayıtlı saat' : ''}</td>
              <td className="r"><Lon lon={r.asc} /></td>
              <td className="r"><Lon lon={r.mc} /></td>
              <td className="r"><Lon lon={r.moon} /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ——— Transit listesi ———

/** Panel ve PDF ortak: olay türü ve süre sınıfı süzgeci, tarih veya önem sırası */
export function filterTransits(events: TransitEvent[], tp: PanelParams['transitList']): TransitEvent[] {
  const list = events.filter((e) => (e.natal ? tp.kinds.aspects && (!e.window || tp.classes[durationClass(e)!]) : e.type === 'ingress' ? tp.kinds.ingress : tp.kinds.stations))
  return tp.sort === 'rank' ? [...list].sort((a, b) => importance(b) - importance(a) || Date.parse(a.utc) - Date.parse(b.utc)) : list
}

const T_PLANETS = [
  { id: 'sun', g: '☉' }, { id: 'mercury', g: '☿' }, { id: 'venus', g: '♀' }, { id: 'mars', g: '♂' }, { id: 'jupiter', g: '♃' },
  { id: 'saturn', g: '♄' }, { id: 'uranus', g: '♅' }, { id: 'neptune', g: '♆' }, { id: 'pluto', g: '♇' }, { id: 'chiron', g: '⚷' }
]

export function TransitListPanel({ input, natal, onPick }: { input: ChartInput; natal: ChartResult; onPick: (iso: string) => void }) {
  const [tp, setTp] = usePanelParam('transitList')
  const { from, to, planets, kinds, classes, sort } = tp
  const setFrom = (v: string) => setTp({ ...tp, from: v })
  const setTo = (v: string) => setTp({ ...tp, to: v })
  const setPlanets = (f: (l: string[]) => string[]) => setTp({ ...tp, planets: f(planets) })
  const setKinds = (k: typeof kinds) => setTp({ ...tp, kinds: k })
  const [events, setEvents] = useState<TransitEvent[]>([])
  const [openRow, setOpenRow] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!from || !to) return
    setBusy(true); setError('')
    window.southastra.transitList(input, `${from}T00:00:00Z`, `${to}T23:59:59Z`, planets)
      .then(setEvents).catch((e) => setError(err(e))).finally(() => setBusy(false))
  }, [input, from, to, planets])
  const g = (id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : natal.points.find((p) => p.id === id)?.glyph ?? T_PLANETS.find((p) => p.id === id)?.g ?? id)
  const n = (id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : natal.points.find((p) => p.id === id)?.name ?? id)
  const shown = filterTransits(events, tp)
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('tr-TR', { timeZone: input.place.tz, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { timeZone: input.place.tz, day: '2-digit', month: '2-digit', year: 'numeric' })
  let lastMonth = ''
  return (
    <div>
      <div className="toolbar wrap">
        <label className="inline small">Başlangıç <input id="t-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline small">Bitiş <input id="t-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="chips">
        {T_PLANETS.map((p) => (
          <button key={p.id} className={planets.includes(p.id) ? 'chip on sym' : 'chip sym'} title={p.id} onClick={() => setPlanets((l) => l.includes(p.id) ? l.filter((x) => x !== p.id) : [...l, p.id])}>{p.g}</button>
        ))}
      </div>
      <div className="chips">
        <label className="inline small"><input type="checkbox" checked={kinds.aspects} onChange={(e) => setKinds({ ...kinds, aspects: e.target.checked })} /> Açılar</label>
        <label className="inline small"><input type="checkbox" checked={kinds.stations} onChange={(e) => setKinds({ ...kinds, stations: e.target.checked })} /> Duraklamalar</label>
        <label className="inline small"><input type="checkbox" checked={kinds.ingress} onChange={(e) => setKinds({ ...kinds, ingress: e.target.checked })} /> Burç geçişleri</label>
      </div>
      <div className="chips">
        <span className="muted small">Süre</span>
        {(['short', 'medium', 'long'] as const).map((c) => <label key={c} className="inline small" title={c === 'short' ? '< 14 gün' : c === 'medium' ? '14–90 gün' : '> 90 gün'}><input type="checkbox" checked={classes[c]} onChange={(e) => setTp({ ...tp, classes: { ...classes, [c]: e.target.checked } })} /> {DURATION_NAME[c]}</label>)}
        <span className="muted small" style={{ marginLeft: 8 }}>Sıra</span>
        <div className="seg-btn small"><button className={sort === 'time' ? 'on' : ''} onClick={() => setTp({ ...tp, sort: 'time' })}>Tarih</button><button className={sort === 'rank' ? 'on' : ''} onClick={() => setTp({ ...tp, sort: 'rank' })} title={RANK_RULE}>Önem</button></div>
      </div>
      {error && <p className="error">{error}</p>}
      <p className="hint">{busy ? 'Hesaplanıyor…' : `${shown.length} olay · saatler doğum yerinin saat dilimine göre · tam açı anı · parantezde transit gezegenin natal evi · dönem: orba giriş–çıkış (transit orbu ${events.find((e) => e.window)?.window?.orb ?? '—'}°)`}{sort === 'rank' && <> · <span title={RANK_RULE} className="link small">önem kuralı</span></>}</p>
      <table className="data tlist">
        <tbody>
          {shown.map((e, i) => {
            const month = sort === 'rank' ? '' : new Date(e.utc).toLocaleString('tr-TR', { timeZone: input.place.tz, month: 'long', year: 'numeric' })
            const head = sort !== 'rank' && month !== lastMonth
            lastMonth = month
            const def = e.natal ? ASPECT_BY_TYPE[e.type as keyof typeof ASPECT_BY_TYPE] : undefined
            return [
              head && <tr key={'m' + i} className="month-row"><td colSpan={3}>{month}</td></tr>,
              <tr key={i} className={`click${openRow === i ? ' hl' : ''}`} onClick={() => onPick(e.utc)}>
                <td className="num small nowrap">{fmtDate(e.utc)}</td>
                <td className="nowrap">
                  <span className="sym">{g(e.transit)}</span>{e.house ? <span className="muted small">({e.house})</span> : null}{e.retro && <span className="tag retro">R</span>}{' '}
                  {def ? <><span className={`asp-g ${e.type}`}>{def.glyph}</span> <span className={g(e.natal!).length > 2 ? 'axis-txt' : 'sym'}>{g(e.natal!)}</span></> : null}
                </td>
                <td className="small">
                  <button className="explain-btn" title="Bu ne anlama geliyor?" onClick={(ev) => { ev.stopPropagation(); setOpenRow(openRow === i ? null : i) }}>?</button>{' '}
                  {e.pass && e.pass.of > 1 && <span className="tag stat" title="Retrograd hareket nedeniyle aynı açının tekrarı">{e.pass.n}/{e.pass.of}</span>}{' '}
                  {e.window && <span className={`tag dur-${durationClass(e)}`} title={`Etkinlik dönemi (orb ${e.window.orb}°): ${fmtDay(e.window.start)} – ${fmtDay(e.window.end)} · ${Math.round(windowDays(e))} gün`}>{DURATION_NAME[durationClass(e)!]}</span>}{' '}
                  {def ? `${def.name} natal ${n(e.natal!)}` : e.type === 'station-retro' ? `Geri dönüyor · ${SIGNS[e.sign ?? 0].name}` : e.type === 'station-direct' ? `İleri dönüyor · ${SIGNS[e.sign ?? 0].name}` : `${SIGNS[e.sign ?? 0].name} burcuna geçiş`}
                </td>
              </tr>,
              openRow === i && <tr key={'x' + i} className="explain-row"><td colSpan={3}>{transitExplain(e, fmtDay).map((l, k) => <p key={k} className={k === 0 ? 'ex-lead' : ''}>{l}</p>)}</td></tr>
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

export { norm360 }

// ——— Arap noktaları (Hermetik arazlar) ———

export function LotsTable({ chart }: { chart: ChartResult }) {
  if (!chart.lots.length) return <p className="empty-note">Arap noktaları yükselen gerektirir; doğum saati bilinmeyen haritada hesaplanmaz.</p>
  return (
    <>
      <table className="data">
        <thead><tr><th>Nokta</th><th>Formül</th><th className="r">Konum</th><th className="r">Ev</th></tr></thead>
        <tbody>
          {chart.lots.map((l) => (
            <tr key={l.id}><td>{l.name}</td><td className="muted small">{l.formula}</td><td className="r"><Lon lon={l.lon} /></td><td className="r num">{l.house}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="hint">Paulus Alexandrinus'un Hermetik arazları. {chart.isDay ? 'Gündüz haritası: gündüz formülleri kullanıldı.' : 'Gece haritası: formüllerde çıkarılan ve eklenen yer değiştirdi.'} Ruh ve Şans'a dayanan noktalar bu iki noktanın hesaplanan değerlerini kullanır.</p>
    </>
  )
}
