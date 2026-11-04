import { useEffect, useRef, useState } from 'react'
import type { ChartInput, CityHit, CountryInfo, HouseSystem, Place, Rodden, TimeMode, TimePreview } from '@shared/types'
import { HOUSE_SYSTEMS, placeLabel, RODDEN } from '@shared/types'
import { fmtOffset } from '../format'
import { parseCoords } from '../coords'
import { loc, t } from '@shared/i18n'

interface Props {
  initial: ChartInput | null
  defaults?: { houseSystem: HouseSystem; nodeType: 'true' | 'mean' }
  onCancel: () => void
  onSubmit: (input: ChartInput) => void
}

const fmtCoord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`
/** K/G, D/B yön harfleri (İngilizcede N/S, E/W) */
const fmtLatLon = (la: number, lo: number) => `${fmtCoord(la, t('K'), t('G'))} · ${fmtCoord(lo, t('D'), t('B'))}`

const kmBetween = (la1: number, lo1: number, la2: number, lo2: number) => {
  const r = Math.PI / 180
  const a = Math.sin(((la2 - la1) * r) / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}
const regionKey = (cc: string) => (cc === 'TR' ? 'İl' : cc === 'DE' || cc === 'AT' || cc === 'US' ? 'Eyalet' : 'Bölge')
const districtKey = (cc: string) => (cc === 'DE' ? 'Landkreis' : cc === 'US' ? 'County' : 'İlçe')
const regionLabel = (cc: string) => t(regionKey(cc))
const districtLabel = (cc: string) => t(districtKey(cc))
/** "Tüm iller" gibi süzgeç başlığı */
const allOf = (w: string) => (w === 'İl' ? t('Tüm iller') : w === 'Eyalet' ? t('Tüm eyaletler') : w === 'İlçe' ? t('Tüm ilçeler') : w === 'Bölge' ? t('Tüm bölgeler') : t('Tüm {w}', { w }))

const readPref = (k: string, d: string): string => {
  try { return localStorage.getItem(k) ?? d } catch { return d }
}
const writePref = (k: string, v: string) => {
  try { localStorage.setItem(k, v) } catch { /* yok say */ }
}

export default function ChartForm({ initial, defaults, onCancel, onSubmit }: Props) {
  const [step, setStep] = useState<'edit' | 'confirm'>('edit')
  const [name, setName] = useState(initial?.name ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  // Saniye yalnızca istenirse (ör. rektifiye edilmiş saat); doğum kayıtlarında genelde saat:dakika olur
  const [withSec, setWithSec] = useState(/^\d{2}:\d{2}:\d{2}$/.test(initial?.time ?? '') && !(initial?.time ?? '').endsWith(':00'))
  const [timeUnknown, setTimeUnknown] = useState(initial?.timeUnknown ?? false)
  const [place, setPlace] = useState<Place | null>(initial?.place ?? null)
  const [query, setQuery] = useState(initial ? initial.place.name : '')
  const [hits, setHits] = useState<CityHit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [countries, setCountries] = useState<CountryInfo[]>([])
  const [country, setCountry] = useState(initial?.place.countryCode ?? readPref('f-country', 'TR'))
  const [regions, setRegions] = useState<{ name: string; count: number }[]>([])
  const [region, setRegion] = useState('')
  const [districts, setDistricts] = useState<{ name: string; count: number }[]>([])
  const [district, setDistrict] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [doneFor, setDoneFor] = useState('')
  // arama kutusuna koordinat yapıştırıldıysa: o nokta ve en yakın yerleşim
  const [coordHit, setCoordHit] = useState<{ lat: number; lon: number; near: (CityHit & { distanceKm: number }) | null } | null>(null) // sonuçları hazır olan arama metni (bitmeden "sonuç yok" deme)
  const [partial, setPartial] = useState('') // sokak gibi tanınmayan kelimeler atıldıysa açıklama
  const [addrHits, setAddrHits] = useState<(Place & { display: string })[]>([])
  const [addrState, setAddrState] = useState<'' | 'busy' | 'done' | string>('')
  const [timeMode, setTimeMode] = useState<TimeMode>(initial?.timeMode ?? 'zone')
  const [manualOffset, setManualOffset] = useState(String(initial?.manualOffset ?? 3))
  const [houseSystem, setHouseSystem] = useState<HouseSystem>(initial?.houseSystem ?? defaults?.houseSystem ?? 'P')
  const [nodeType, setNodeType] = useState<'true' | 'mean'>(initial?.nodeType ?? defaults?.nodeType ?? 'true')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [rodden, setRodden] = useState<Rodden | ''>(initial?.rodden ?? '')
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [lat, setLat] = useState(initial ? String(initial.place.lat) : '')
  const [lon, setLon] = useState(initial ? String(initial.place.lon) : '')
  const [tzNote, setTzNote] = useState('')
  const [paste, setPaste] = useState('')
  const [live, setLive] = useState<TimePreview | null>(null)
  const [coordMsg, setCoordMsg] = useState<{ kind: 'warn' | 'error' | 'ok'; text: string } | null>(null)
  // listeden seçilen yerin özgün kaydı (koordinat elle değişirse karşılaştırma ve geri dönüş için)
  const [picked, setPicked] = useState<Place | null>(initial?.place ?? null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<ChartInput | null>(null)
  const [preview, setPreview] = useState<TimePreview | null>(null)
  const seq = useRef(0)

  useEffect(() => { window.southastra.listCountries().then(setCountries) }, [])
  useEffect(() => {
    setRegion('')
    if (country) window.southastra.listRegions(country).then(setRegions); else setRegions([])
  }, [country])
  useEffect(() => {
    setDistrict('')
    if (country && region) window.southastra.listDistricts(country, region).then(setDistricts); else setDistricts([])
  }, [country, region])

  // Yazılıysa ara; boşsa ve il seçiliyse o il/ilçedeki yerleri listele (göz atma)
  useEffect(() => {
    const filter = { country: country || undefined, region: region || undefined, district: district || undefined }
    const q = query.trim()
    if (!open || (q.length < 2 && !(q.length === 0 && region && !place))) { setHits([]); setBrowsing(false); return }
    const my = ++seq.current
    setAddrHits([]); setAddrState('')
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        const r = await window.southastra.browsePlaces(filter)
        if (my === seq.current) { setHits(r); setActive(-1); setBrowsing(true); setPartial('') }
        return
      }
      const asCoord = parseCoords(q)
      if (asCoord) {
        const near = await window.southastra.nearestPlace(asCoord.lat, asCoord.lon)
        if (my === seq.current) { setCoordHit({ ...asCoord, near }); setHits([]); setBrowsing(false); setPartial(''); setDoneFor(query) }
        return
      }
      setCoordHit(null)
      let r = await window.southastra.searchCities(query, filter)
      let note = ''
      // Hiç sonuç yoksa tanınmayan kelimeleri (ör. sokak adı) atarak yeniden dene: kelime sırası önemsiz,
      // en uzun ardışık kelime grubundan başlanır ("Kurfürstendamm Berlin" → "Berlin")
      const words = q.split(/[\s,]+/).filter(Boolean)
      outer: for (let len = words.length - 1; !r.length && len >= 1; len--) {
        for (let i = 0; i + len <= words.length; i++) {
          const kept = words.slice(i, i + len).join(' ')
          r = await window.southastra.searchCities(kept, filter)
          if (r.length) {
            const dropped = [...words.slice(0, i), ...words.slice(i + len)].join(' ')
            note = t('“{dropped}” çevrimdışı listede yok (sokak ve cadde adları bulunmaz). “{kept}” için sonuçlar:', { dropped, kept })
            break outer
          }
        }
      }
      if (my === seq.current) { setHits(r); setActive(-1); setBrowsing(false); setPartial(note); setDoneFor(query) }
    }, q.length >= 2 ? 120 : 0)
    return () => clearTimeout(timer)
  }, [query, open, country, region, district, place])

  // Tarih, saat ve yer girildikçe o doğum için geçerli UTC farkını hemen göster
  useEffect(() => {
    setLive(null)
    if (!place || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const tm = timeUnknown ? '12:00' : time
    if (!/^\d{2}:\d{2}/.test(tm)) return
    const off = Number(manualOffset.replace(',', '.'))
    const h = setTimeout(() => {
      window.southastra.previewTime({ name: '', date, time: tm, place, timeMode, manualOffset: timeMode === 'manual' ? off : undefined, houseSystem, nodeType })
        .then(setLive).catch(() => setLive(null))
    }, 150)
    return () => clearTimeout(h)
  }, [place, date, time, timeUnknown, timeMode, manualOffset, houseSystem, nodeType])

  const choose = (c: CityHit) => {
    const chosen = { name: c.name, localName: c.localName, district: c.district, region: c.region, country: c.country, countryCode: c.countryCode, lat: c.lat, lon: c.lon, tz: c.tz, geonameId: c.geonameId, precision: c.precision }
    setPlace(chosen); setPicked(chosen); setCoordMsg(null); setPaste('')
    setLat(String(c.lat))
    setLon(String(c.lon))
    setTzNote('')
    setQuery(c.name)
    setOpen(false)
  }

  const chooseCoord = (c: { lat: number; lon: number; near: (CityHit & { distanceKm: number }) | null }) => {
    const n = c.near
    const base: Place | null = n ? { name: n.name, district: n.district, region: n.region, country: n.country, countryCode: n.countryCode, lat: n.lat, lon: n.lon, tz: n.tz, geonameId: n.geonameId, precision: n.precision } : null
    const p: Place = { ...(base ?? { name: t('Koordinat'), region: '', country: '', tz: 'UTC' }), lat: +c.lat.toFixed(6), lon: +c.lon.toFixed(6), geonameId: undefined, precision: 'Elle girilen koordinat' }
    setPlace(p); setPicked(base)
    setLat(String(p.lat)); setLon(String(p.lon))
    setTzNote(n ? t('Koordinat elle girildi. En yakın kayıtlı yer: {place} ({km} km); saat dilimi oradan alındı ({tz}).', { place: placeLabel(n), km: n.distanceKm.toFixed(1), tz: n.tz }) : '')
    setQuery(p.name)
    setCoordHit(null)
    setOpen(false)
  }

  const searchOnline = async () => {
    setAddrState('busy')
    try {
      const r = await window.southastra.addressSearch(query)
      setAddrHits(r)
      setAddrState('done')
    } catch (e) { setAddrState((e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')) }
  }
  const chooseAddress = (a: Place & { display: string }) => {
    const { display, ...p } = a
    setPlace(p)
    setLat(String(p.lat)); setLon(String(p.lon))
    setTzNote(t("Adres OpenStreetMap'ten alındı: {display}. Saat dilimi en yakın yerleşimden belirlendi ({tz}).", { display, tz: p.tz }))
    setQuery(p.name)
    setOpen(false)
  }

  // Koordinat elle değiştirilirse: konum kimliği düşer, saat dilimi en yakın yerleşimden bulunur
  const applyManualCoords = async (laIn?: number, loIn?: number) => {
    if (!place) return
    const la = laIn ?? Number(lat.replace(',', '.'))
    const lo = loIn ?? Number(lon.replace(',', '.'))
    if (!(Math.abs(la) <= 90) || !(Math.abs(lo) <= 180) || !lat.trim() || !lon.trim()) {
      setCoordMsg({ kind: 'error', text: t('Enlem −90 ile 90, boylam −180 ile 180 arasında olmalı.') }); return
    }
    if (Math.abs(la - place.lat) < 1e-6 && Math.abs(lo - place.lon) < 1e-6) return
    const n = await window.southastra.nearestPlace(la, lo)
    setPlace({ ...place, lat: la, lon: lo, geonameId: undefined, precision: 'Elle girilen koordinat', tz: n?.tz ?? place.tz })
    if (n) setTzNote(t('Saat dilimi en yakın yerleşimden alındı: {place} ({km} km)', { place: placeLabel(n), km: n.distanceKm.toFixed(1) }))
    const base = picked ?? place
    const km = kmBetween(base.lat, base.lon, la, lo)
    if (km > 30) {
      const swapped = kmBetween(base.lat, base.lon, lo, la) < 30
      const far = n ? t('Girilen nokta seçtiğiniz {name} kaydından {km} km uzakta (en yakın yerleşim: {near}).', { name: base.name, km: Math.round(km).toLocaleString(loc()), near: placeLabel(n) }) : t('Girilen nokta seçtiğiniz {name} kaydından {km} km uzakta.', { name: base.name, km: Math.round(km).toLocaleString(loc()) })
      setCoordMsg({ kind: 'warn', text: `${far} ${swapped ? t('Enlem ve boylamı ters girmiş olabilirsiniz.') : t('Doğru yeri girdiğinizden emin olun.')}` })
    } else setCoordMsg({ kind: 'ok', text: t('Koordinat güncellendi · {name} merkezinden {km} km.', { name: base.name, km: km.toFixed(1) }) })
  }

  const applyPaste = (text: string) => {
    setPaste(text)
    if (!text.trim()) return
    const c = parseCoords(text)
    if (!c) { setCoordMsg({ kind: 'error', text: t('Bu metin koordinat olarak okunamadı. Örnek: 41.0086, 28.9802') }); return }
    setLat(String(+c.lat.toFixed(6))); setLon(String(+c.lon.toFixed(6)))
    applyManualCoords(c.lat, c.lon)
  }

  const resetCoords = () => {
    if (!picked) return
    setPlace(picked); setLat(String(picked.lat)); setLon(String(picked.lon)); setTzNote(''); setCoordMsg(null); setPaste('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError(t('Bir isim girin.'))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError(t('Doğum tarihini girin.'))
    const tm = timeUnknown ? '12:00' : withSec ? time : time.slice(0, 5)
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(tm)) return setError(t('Doğum saatini girin ya da “Doğum saati bilinmiyor” seçeneğini işaretleyin.'))
    if (!place) return setError(t('Doğum yerini listeden seçin. Aynı adlı yerler karışmasın diye ilk sonuç otomatik seçilmez.'))
    const off = Number(manualOffset.replace(',', '.'))
    if (timeMode === 'manual' && !(Math.abs(off) <= 15)) return setError(t('Saat ofseti −15 ile +15 arasında olmalı.'))
    const input: ChartInput = {
      name: name.trim(), date, time: tm, timeUnknown: timeUnknown || undefined, place, timeMode,
      manualOffset: timeMode === 'manual' ? off : undefined, houseSystem, nodeType, notes: notes.trim() || undefined,
      rodden: rodden || (timeUnknown ? 'X' : undefined),
      tags: tags.split(',').map((x) => x.trim()).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i)
    }
    try {
      setPreview(await window.southastra.previewTime(input))
      setPending(input)
      setStep('confirm')
    } catch (err) {
      setError((err as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    }
  }

  if (step === 'confirm' && pending && preview) {
    const p = pending.place
    const [d, m, y] = [pending.date.slice(8, 10), pending.date.slice(5, 7), pending.date.slice(0, 4)]
    return (
      <div className="modal-back">
        <div className="modal" onKeyDown={(e) => { if (e.key === 'Escape') setStep('edit') }}>
          <h2>{t('Doğum bilgilerini doğrulayın')}</h2>
          <p className="hint" style={{ marginTop: -6 }}>{t('Yükselen ve evler bu bilgilere çok duyarlıdır. Hesaplamadan önce kontrol edin.')}</p>
          <dl className="confirm">
            <dt>{t('İsim')}</dt><dd>{pending.name}</dd>
            <dt>{t('Yer')}</dt><dd><b>{placeLabel(p)}</b></dd>
            <dt>{t('Koordinat')}</dt><dd className="num">{fmtLatLon(p.lat, p.lon)}</dd>
            <dt>{t('Doğruluk')}</dt><dd>{p.precision ? t(p.precision) : '—'}</dd>
            <dt>{t('Konum kimliği')}</dt><dd className="num">{p.geonameId ? `GeoNames ${p.geonameId}` : t('Yok (elle girilen koordinat)')}</dd>
            <dt>{t('Saat dilimi')}</dt><dd className="num">{p.tz}</dd>
            <dt>{t('Yerel saat')}</dt><dd className="num">{t('{d}.{m}.{y}', { d, m, y })} {pending.time}{pending.timeUnknown && <span className="warn-inline"> {t('varsayılan, doğum saati bilinmiyor')}</span>}</dd>
            <dt>{t('UTC farkı')}</dt><dd><span className="num">{fmtOffset(preview.offsetMinutes)}</span> <span className="muted small">{preview.source.replace(/ \(UTC.*\)$/, '')}</span></dd>
            <dt>{t('UTC karşılığı')}</dt><dd className="num">{preview.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, '')}</dd>
            <dt>{t('Ev sistemi')}</dt><dd>{HOUSE_SYSTEMS.find((h) => h.id === pending.houseSystem)?.name}</dd>
            <dt>{t('Güvenilirlik')}</dt><dd>{pending.rodden ? `${pending.rodden} — ${RODDEN.find((r) => r.id === pending.rodden)?.desc}` : t('Belirtilmedi')}</dd>
          </dl>
          {preview.warnings.map((w, i) => <p key={i} className="warn">{w}</p>)}
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => setStep('edit')}>{t('Geri dön ve düzelt')}</button>
            <button type="button" className="btn primary" autoFocus onClick={() => onSubmit(pending)}>{t('Onayla ve hesapla')}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <form className="modal" onSubmit={submit} onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}>
        <h2>{initial ? t('Haritayı düzenle') : t('Yeni harita')}</h2>

        <label className="field">
          <span>{t('İsim')}</span>
          <input id="f-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Danışanın adı')} />
        </label>

        <div className="row2">
          <label className="field">
            <span>{t('Doğum tarihi')}</span>
            <input id="f-date" type="date" min="1200-01-01" max="2399-12-31" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="field">
            <span>{t('Yerel doğum saati')}</span>
            <input id="f-time" type="time" step={withSec ? 1 : 60} value={timeUnknown ? '' : withSec ? time : time.slice(0, 5)} disabled={timeUnknown} onChange={(e) => setTime(e.target.value)} />
            <div className="time-opts">
              <label className="inline small"><input id="f-tu" type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} /> {t('Doğum saati bilinmiyor')}</label>
              {!timeUnknown && <label className="inline small muted"><input id="f-sec" type="checkbox" checked={withSec} onChange={(e) => { setWithSec(e.target.checked); if (!e.target.checked) setTime((t) => t.slice(0, 5)); else if (/^\d{2}:\d{2}$/.test(time)) setTime(time + ':00') }} /> {t('Saniye de gir')}</label>}
            </div>
          </div>
        </div>
        {timeUnknown && <p className="warn" style={{ margin: 0 }}>{t("12:00 varsayılacak. Yükselen, MC ve evler hesaplanmayacak; Ay'ın konumu için olası aralık gösterilecek.")}</p>}

        <div className="field">
          <span>{t('Doğum yeri')}</span>
          <div className={districts.length ? 'row3' : 'row2'}>
            <select id="f-country" value={country} onChange={(e) => { setCountry(e.target.value); writePref('f-country', e.target.value) }} title={t('Ülke')}>
              <option value="">{t('Tüm ülkeler')}</option>
              {countries.map((c, i) => (
                <option key={c.code} value={c.code}>{c.name}{c.detailed ? ` · ${t('köy düzeyinde')}` : ''}{i > 0 && countries[i - 1].detailed && !c.detailed ? '' : ''}</option>
              ))}
            </select>
            <select id="f-region" value={region} onChange={(e) => setRegion(e.target.value)} disabled={!country || !regions.length} title={regionLabel(country)}>
              <option value="">{country ? allOf(regionKey(country)) : '—'}</option>
              {regions.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
            {districts.length > 0 && (
              <select id="f-district" value={district} onChange={(e) => setDistrict(e.target.value)} title={districtLabel(country)}>
                <option value="">{allOf(districtKey(country))}</option>
                {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="field city">
          <input
            id="f-city" value={query} placeholder={region ? t('Listeden seçin veya yazarak daraltın…') : t('Şehir, ilçe, köy veya semt adı yazın · koordinat da yapıştırabilirsiniz')} autoComplete="off"
            onChange={(e) => { setQuery(e.target.value); setOpen(true); if (place) { setPlace(null); setLat(''); setLon('') } }}
            onFocus={() => { if (!place) setOpen(true) }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && coordHit) { e.preventDefault(); chooseCoord(coordHit); return }
              if (!open || !hits.length) return
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
              if (e.key === 'Enter') { e.preventDefault(); if (coordHit) chooseCoord(coordHit); else if (active >= 0) choose(hits[active]) }
            }}
          />
          {open && coordHit && (
            <ul className="suggest" onMouseDown={(e) => e.preventDefault()}>
              <li className="on" onMouseDown={() => chooseCoord(coordHit)}>
                <div className="s-main"><b>{t('Bu koordinatı kullan')}</b> <span className="muted">— {fmtLatLon(coordHit.lat, coordHit.lon)}</span></div>
                <div className="s-meta">{coordHit.near ? t('En yakın yer: {place} · {km} km · {tz}', { place: placeLabel(coordHit.near), km: coordHit.near.distanceKm.toFixed(1), tz: coordHit.near.tz }) : t('Yakında kayıtlı yer yok')}</div>
              </li>
            </ul>
          )}
          {open && !coordHit && (hits.length > 0 || query.trim().length >= 3) && (
            <ul className="suggest" onMouseDown={(e) => e.preventDefault()}>
              {browsing && <li className="suggest-head muted small">{district || region} · {t('{n} yer · yazarak daraltabilirsiniz', { n: `${hits.length}${hits.length >= 400 ? '+' : ''}` })}</li>}
              {partial && <li className="suggest-head warn-inline small">{partial}</li>}
              {!hits.length && !addrHits.length && doneFor !== query && <li className="suggest-head muted small">{t('Aranıyor…')}</li>}
              {!hits.length && !addrHits.length && doneFor === query && <li className="suggest-head muted small">{t('Çevrimdışı listede sonuç yok. Ülke, {region} veya {district} süzgecini kaldırmayı ya da internetten aramayı deneyin.', { region: regionLabel(country).toLocaleLowerCase(loc()), district: districtLabel(country).toLocaleLowerCase(loc()) })}</li>}
              {hits.map((c, i) => (
                <li key={c.geonameId} className={i === active ? 'on' : ''} onMouseDown={() => choose(c)} onMouseEnter={() => setActive(i)}>
                  <div className="s-main">
                    <b>{c.name}</b>{c.localName && <span className="local-name"> ({c.localName})</span>}
                    <span className="muted"> — {[c.district, c.region, c.country].filter((x) => x && x !== c.name).join(', ')}</span>
                  </div>
                  <div className="s-meta num">
                    {fmtLatLon(c.lat, c.lon)} · {c.precision ? t(c.precision) : ''} · ID {c.geonameId}
                  </div>
                </li>
              ))}
              {addrHits.length > 0 && <li className="suggest-head muted small">{t('İnternetten bulunan adresler (OpenStreetMap)')}</li>}
              {addrHits.map((a, i) => (
                <li key={'a' + i} onMouseDown={() => chooseAddress(a)}>
                  <div className="s-main"><b>{a.name}</b> <span className="muted">— {a.display.split(', ').slice(1, 5).join(', ')}</span></div>
                  <div className="s-meta num">{fmtLatLon(a.lat, a.lon)} · {t('Adres')} · {a.tz}</div>
                </li>
              ))}
              {query.trim().length >= 3 && addrState !== 'done' && (
                <li className="suggest-online" onMouseDown={() => { if (addrState !== 'busy') searchOnline() }}>
                  {addrState === 'busy' ? t('İnternette aranıyor…') : addrState ? <span className="danger-text">{addrState}</span> : <>{t('İnternette adres ara (sokak düzeyi)')} <span className="muted small">· {t("yazdığınız adres OpenStreetMap'e gönderilir")}</span></>}
                </li>
              )}
              {addrState === 'done' && !addrHits.length && <li className="suggest-head muted small">{t("OpenStreetMap'te de bulunamadı. Koordinatı elle girebilirsiniz.")}</li>}
            </ul>
          )}
          {place ? (
            <div className="place-card">
              <div><b>{placeLabel(place)}</b>{place.localName && <span className="local-name"> · {t('yerel adı {name}', { name: place.localName })}</span>}</div>
              <div className="num small">{fmtLatLon(place.lat, place.lon)} · {place.tz}</div>
              <div className="muted small">{place.precision ? t(place.precision) : ''}{place.geonameId ? ` · GeoNames ${place.geonameId}` : ''}</div>
              {tzNote && <div className="muted small">{tzNote}</div>}
              {live ? (
                <div className="live-off">
                  {t('Bu doğum için:')} <b className="num">{fmtOffset(live.offsetMinutes)}</b>
                  <span className="muted small"> · {timeMode === 'zone' ? (live.dst ? t('{tz} kuralı, yaz saati', { tz: place.tz }) : t('{tz} kuralı, standart saat', { tz: place.tz })) : timeMode === 'lmt' ? t('yerel ortalama saat') : t('elle girilen ofset')} · UTC {live.utc.slice(11, 16)}</span>
                  {live.warnings.map((w, i) => <div key={i} className="warn-inline small">{w}</div>)}
                </div>
              ) : <div className="muted small">{t('Tarih ve saat girilince bu doğum için geçerli UTC farkı burada görünür.')}</div>}
            </div>
          ) : (
            <p className="hint">{t('Listeden bir yer seçin. Aynı adı taşıyan yerleri ilçe ve il bilgisinden ayırt edin.')}</p>
          )}
        </div>

        {place && (
          <details className="adv">
            <summary>{t('Koordinatı değiştir (isteğe bağlı)')}</summary>
            <p className="hint">{t('Koordinatlar seçtiğiniz yerden')} <b>{t('otomatik dolduruldu')}</b>{t("; çoğu harita için değiştirmeniz gerekmez. Yalnızca doğumun gerçekleştiği yeri (ör. hastane) tam biliyorsanız kullanın: Google Haritalar'da o noktaya sağ tıklayın, en üstteki sayıları (ör. 41.0086, 28.9802) tıklayıp kopyalayın ve aşağıya yapıştırın.")}</p>
            <label className="field">
              <span>{t('Koordinatı yapıştır')}</span>
              <input id="f-paste" value={paste} placeholder={t('41.0086, 28.9802   veya   41°00\'31"K 28°58\'49"D')} onChange={(e) => setPaste(e.target.value)} onPaste={(e) => { e.preventDefault(); applyPaste(e.clipboardData.getData('text')) }} onBlur={() => paste && applyPaste(paste)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPaste(paste) } }} />
            </label>
            <div className="row2">
              <label className="field"><span>{t('Enlem (kuzey +, güney −)')}</span><input id="f-lat" value={lat} onChange={(e) => setLat(e.target.value)} onBlur={() => applyManualCoords()} /></label>
              <label className="field"><span>{t('Boylam (doğu +, batı −)')}</span><input id="f-lon" value={lon} onChange={(e) => setLon(e.target.value)} onBlur={() => applyManualCoords()} /></label>
            </div>
            {coordMsg && <p className={coordMsg.kind === 'warn' ? 'warn' : coordMsg.kind === 'error' ? 'error' : 'hint'}>{coordMsg.text}</p>}
            {picked && place && (picked.lat !== place.lat || picked.lon !== place.lon) && <button type="button" className="link small" onClick={resetCoords}>{t('{name} koordinatına geri dön', { name: picked.name })}</button>}
          </details>
        )}

        <fieldset className="field">
          <span>{t('Saat çevirisi')}</span>
          <div className="seg">
            <label><input type="radio" name="tm" checked={timeMode === 'zone'} onChange={() => setTimeMode('zone')} />{t('Saat dilimi (otomatik)')}</label>
            <label><input type="radio" name="tm" checked={timeMode === 'manual'} onChange={() => setTimeMode('manual')} />{t('Elle ofset')}</label>
            <label><input type="radio" name="tm" checked={timeMode === 'lmt'} onChange={() => setTimeMode('lmt')} />{t('Yerel ortalama (LMT)')}</label>
          </div>
          {timeMode === 'manual' && (
            <label className="inline">{t("UTC'ye göre fark (saat):")} <input id="f-off" className="short" value={manualOffset} onChange={(e) => setManualOffset(e.target.value)} /> <span className="muted small">{t('ör. 3, 2, −5.5')}</span></label>
          )}
          {timeMode === 'zone' && <p className="hint">{t('Doğum tarihinde o yerde geçerli olan saat dilimi ve yaz saati kuralı uygulanır (bugünkü kural değil).')}</p>}
          {timeMode === 'lmt' && <p className="hint">{t('Standart saat öncesi doğumlar için: saat, doğum yerinin boylamına göre hesaplanır.')}</p>}
        </fieldset>

        <div className="row2">
          <label className="field">
            <span>{t('Ev sistemi')}</span>
            <select id="f-hsys" value={houseSystem} onChange={(e) => setHouseSystem(e.target.value as HouseSystem)}>
              {HOUSE_SYSTEMS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t('Ay düğümü')}</span>
            <select id="f-node" value={nodeType} onChange={(e) => setNodeType(e.target.value as 'true' | 'mean')}>
              <option value="true">{t('Gerçek düğüm')}</option>
              <option value="mean">{t('Ortalama düğüm')}</option>
            </select>
          </label>
        </div>

        <div className="row2">
          <label className="field">
            <span>{t('Veri güvenilirliği (Rodden)')}</span>
            <select id="f-rodden" value={rodden} onChange={(e) => setRodden(e.target.value as Rodden | '')}>
              <option value="">{t('Belirtilmedi')}</option>
              {RODDEN.map((r) => <option key={r.id} value={r.id}>{r.id} — {r.desc}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t('Etiketler (virgülle)')}</span>
            <input id="f-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('danışan, aile, olay haritası…')} />
          </label>
        </div>

        <label className="field">
          <span>{t('Notlar')}</span>
          <textarea id="f-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Doğum saatinin kaynağı, güvenilirliği (ör. doğum belgesi, anne beyanı)…')} />
        </label>

        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onCancel}>{t('Vazgeç')}</button>
          <button type="submit" className="btn primary">{t('Devam et')}</button>
        </div>
      </form>
    </div>
  )
}
