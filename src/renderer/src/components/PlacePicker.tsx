import { useEffect, useRef, useState } from 'react'
import type { CityHit, Place } from '@shared/types'
import { placeLabel } from '@shared/types'
import { parseCoords } from '../coords'

/** Dönüş ve taşınma haritaları için kompakt yer seçici: doğum yeri, yaşadığı yer, arama veya koordinat */
export default function PlacePicker({ birth, residence, value, onChange, onSaveResidence }: {
  birth: Place; residence?: Place; value: Place | null; onChange: (p: Place | null) => void; onSaveResidence?: (p: Place) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<CityHit[]>([])
  const box = useRef<HTMLDivElement>(null)
  const current = value ?? birth
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])
  useEffect(() => {
    const t = setTimeout(async () => {
      const c = parseCoords(q)
      if (c) {
        const n = await window.southastra.nearestPlace(c.lat, c.lon)
        setHits(n ? [{ ...n, name: n.name, lat: +c.lat.toFixed(6), lon: +c.lon.toFixed(6), precision: 'Elle girilen koordinat' }] : [])
      } else if (q.trim().length >= 2) setHits((await window.southastra.searchCities(q)).slice(0, 8))
      else setHits([])
    }, 150)
    return () => clearTimeout(t)
  }, [q])
  const same = (a?: Place | null, b?: Place | null) => !!a && !!b && a.lat === b.lat && a.lon === b.lon
  const pick = (p: Place | null) => { onChange(p); setOpen(false); setQ('') }
  return (
    <div className="place-picker" ref={box}>
      <button className="btn ghost place-btn" onClick={() => setOpen(!open)} title="Haritanın kurulacağı yer">
        <span className="muted small">Yer</span> {current.name}{same(current, birth) ? <span className="muted small"> · doğum yeri</span> : same(current, residence) ? <span className="muted small"> · yaşadığı yer</span> : ''} ▾
      </button>
      {open && (
        <div className="place-pop">
          <button className={same(current, birth) ? 'pp-item on' : 'pp-item'} onClick={() => pick(null)}><b>Doğum yeri</b><span className="muted small">{placeLabel(birth)}</span></button>
          {residence && !same(residence, birth) && <button className={same(current, residence) ? 'pp-item on' : 'pp-item'} onClick={() => pick(residence)}><b>Yaşadığı yer</b><span className="muted small">{placeLabel(residence)}</span></button>}
          <input id="pp-q" autoFocus placeholder="Başka bir şehir veya koordinat…" value={q} onChange={(e) => setQ(e.target.value)} />
          {hits.map((h) => (
            <button key={`${h.geonameId}-${h.lat}`} className="pp-item" onClick={() => pick({ name: h.name, localName: h.localName, district: h.district, region: h.region, country: h.country, countryCode: h.countryCode, lat: h.lat, lon: h.lon, tz: h.tz, geonameId: h.precision === 'Elle girilen koordinat' ? undefined : h.geonameId, precision: h.precision })}>
              <b>{h.name}</b><span className="muted small">{[h.district, h.region, h.country].filter((x) => x && x !== h.name).join(', ')} · {h.lat.toFixed(3)}°, {h.lon.toFixed(3)}°</span>
            </button>
          ))}
          {onSaveResidence && value && !same(value, birth) && !same(value, residence) && (
            <button className="pp-save" onClick={() => { onSaveResidence(value); setOpen(false) }}>“{value.name}” yerini danışanın yaşadığı yer olarak kaydet</button>
          )}
        </div>
      )}
    </div>
  )
}
