// PDF ekleri: transit özeti, zaman çizelgesi, ayrıntılı transit tablosu ve teknik ek
import type { AppInfo, ChartResult, Settings, TransitEvent, ViewResult } from '@shared/types'
import { HOUSE_SYSTEMS, placeLabel, RODDEN } from '@shared/types'
import { activeOrbs, ASPECT_BY_TYPE, ASPECTS, AYANAMSAS, SIGNS } from '@shared/zodiac'
import { durationClass, DURATION_NAME, importance, RANK_RULE, topTransits, windowDays } from '@shared/transitRank'
import { fmtOffset } from '../format'

const fmtD = (iso: string, tz: string) => new Date(iso).toLocaleDateString('tr-TR', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtDT = (iso: string, tz: string) => new Date(iso).toLocaleString('tr-TR', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function names(natal: ChartResult) {
  const gl = (id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : natal.points.find((p) => p.id === id)?.glyph ?? '')
  const nm = (id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : natal.points.find((p) => p.id === id)?.name ?? id)
  return { gl, nm }
}
const eventText = (e: TransitEvent, nm: (id: string) => string) => {
  const def = e.natal ? ASPECT_BY_TYPE[e.type as keyof typeof ASPECT_BY_TYPE] : undefined
  return def ? `Transit ${nm(e.transit)} ${def.name.toLowerCase()} natal ${nm(e.natal!)}` : e.type === 'station-retro' ? `${nm(e.transit)} geri harekete dönüyor · ${SIGNS[e.sign ?? 0].name}` : e.type === 'station-direct' ? `${nm(e.transit)} düz harekete dönüyor · ${SIGNS[e.sign ?? 0].name}` : `${nm(e.transit)} ${SIGNS[e.sign ?? 0].name} burcuna geçiyor`
}

/** Özet: önem sırasına göre en önemli 5 transit (her seriden bir satır) */
export function TransitSummary({ natal, transits, tz }: { natal: ChartResult; transits: TransitEvent[]; tz: string }) {
  const { gl, nm } = names(natal)
  const top = topTransits(transits, 5)
  if (!top.length) return null
  return (
    <div className="p-summary-box">
      <h3>Öne çıkan transitler</h3>
      <table className="data">
        <thead><tr><th>Transit</th><th>Etkinlik dönemi</th><th>Kesinleşme</th><th className="r">Süre</th></tr></thead>
        <tbody>
          {top.map((e, k) => {
            const all = transits.filter((x) => x.transit === e.transit && x.natal === e.natal && x.type === e.type && x.window?.start === e.window?.start)
            return (
              <tr key={k}>
                <td><span className="sym">{gl(e.transit)}</span> <span className={`asp-g ${e.type}`}>{ASPECT_BY_TYPE[e.type as keyof typeof ASPECT_BY_TYPE].glyph}</span> <span className={gl(e.natal!).length > 2 ? 'axis-txt' : 'sym'}>{gl(e.natal!)}</span> {eventText(e, nm)}{e.house ? ` · ${e.house}. evden` : ''}</td>
                <td className="num nowrap">{e.window ? `${fmtD(e.window.start, tz)} – ${fmtD(e.window.end, tz)}` : '—'}</td>
                <td className="num">{all.map((x) => fmtD(x.utc, tz)).join(' · ')}{(e.pass?.of ?? 1) > all.length ? ` (+${(e.pass?.of ?? 1) - all.length} aralık dışında)` : ''}</td>
                <td className="r">{DURATION_NAME[durationClass(e) ?? 'short']}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="hint">{RANK_RULE}</p>
    </div>
  )
}

/** Zaman çizelgesi: orta ve uzun süreli transit serileri; çubuk = etkinlik dönemi, nokta = kesinleşme */
export function TransitTimeline({ natal, transits, from, to }: { natal: ChartResult; transits: TransitEvent[]; from: string; to: string }) {
  const { gl } = names(natal)
  const t0 = Date.parse(from + 'T00:00:00Z'), t1 = Date.parse(to + 'T23:59:59Z')
  const series = new Map<string, TransitEvent[]>()
  for (const e of transits) {
    if (!e.natal || !e.window) continue
    const c = durationClass(e)
    if (c === 'short') continue
    const key = `${e.transit}|${e.natal}|${e.type}|${e.window.start}`
    series.set(key, [...(series.get(key) ?? []), e])
  }
  const rows = [...series.values()].sort((a, b) => importance(b[0]) - importance(a[0])).slice(0, 22).sort((a, b) => Date.parse(a[0].window!.start) - Date.parse(b[0].window!.start))
  if (!rows.length) return null
  const W = 520, L = 92, H = 13
  const x = (ms: number) => L + ((Math.min(t1, Math.max(t0, ms)) - t0) / (t1 - t0)) * (W - L - 6)
  const months: number[] = []
  for (let d = new Date(t0); d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 1, 1)) months.push(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  return (
    <div className="p-timeline">
      <h3>Zaman çizelgesi · orta ve uzun süreli transitler</h3>
      <svg viewBox={`0 0 ${W} ${rows.length * H + 22}`} width="100%" role="img" aria-label="Transit zaman çizelgesi">
        {months.filter((m) => m >= t0).map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={14} x2={x(m)} y2={rows.length * H + 18} className="tl-grid" />
            {(months.length <= 14 || new Date(m).getUTCMonth() % 3 === 0) && <text x={x(m) + 1.5} y={10} className="tl-month">{new Date(m).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit', timeZone: 'UTC' })}</text>}
          </g>
        ))}
        {rows.map((r, k) => {
          const e = r[0]
          const y = 18 + k * H
          const def = ASPECT_BY_TYPE[e.type as keyof typeof ASPECT_BY_TYPE]
          return (
            <g key={k}>
              <text x={2} y={y + 8} className="tl-label">{gl(e.transit)} {def.glyph} {gl(e.natal!)}{(e.pass?.of ?? 1) > 1 ? `  ×${e.pass!.of}` : ''}</text>
              <rect x={x(Date.parse(e.window!.start))} y={y + 2} width={Math.max(1.5, x(Date.parse(e.window!.end)) - x(Date.parse(e.window!.start)))} height={H - 5} rx={2} className={`tl-bar ${e.type}`} />
              {r.map((h, j) => <circle key={j} cx={x(Date.parse(h.utc))} cy={y + 2 + (H - 5) / 2} r={2.2} className="tl-hit" />)}
            </g>
          )
        })}
      </svg>
      <p className="hint">Çubuk: transit orbu içinde kalınan dönem (seçili aralığa kırpılmış) · nokta: kesinleşme anı · ×3: retrograd nedeniyle üç kez kesinleşen seri. En önemli {rows.length} seri gösterilir.</p>
    </div>
  )
}

/** Ayrıntılı transit tablosu */
export function TransitTable({ natal, transits, tz }: { natal: ChartResult; transits: TransitEvent[]; tz: string }) {
  const { gl, nm } = names(natal)
  return (
    <table className="data p-transits">
      <thead><tr><th>Kesinleşme</th><th>Transit</th><th>Olay</th><th className="c">Natal ev</th><th className="c">Seri</th><th>Etkinlik dönemi</th><th>Süre</th></tr></thead>
      <tbody>
        {transits.map((e, k) => (
          <tr key={k}>
            <td className="num nowrap">{fmtDT(e.utc, tz)}</td>
            <td className="nowrap"><span className="sym">{gl(e.transit)}</span> {nm(e.transit)}{e.retro ? ' (R)' : ''}</td>
            <td>{eventText(e, nm)}</td>
            <td className="c num">{e.house ?? '—'}</td>
            <td className="c num">{e.pass && e.pass.of > 1 ? `${e.pass.n}/${e.pass.of}` : '—'}</td>
            <td className="num nowrap">{e.window ? `${fmtD(e.window.start, tz)} – ${fmtD(e.window.end, tz)}` : '—'}</td>
            <td>{e.window ? `${DURATION_NAME[durationClass(e)!]} · ${Math.round(windowDays(e))} g` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Teknik ek: sonuçları yeniden üretmek için gereken her şey */
export function TechnicalAppendix({ view, settings, info, reportAt }: { view: ViewResult; settings: Settings; info?: AppInfo; reportAt: string }) {
  const c = view.inner
  const i = c.input
  const natal = c.kind === 'natal' ? c : view.outer?.kind === 'natal' ? view.outer : c
  const prof = activeOrbs(settings)
  const rows: [string, string][] = [
    ['Program', `SouthAstra ${info?.version ?? ''} · ${info?.platform ?? ''}`],
    ['Efemeris', `${info?.sweph ? 'Swiss Ephemeris ' + info.sweph : c.ephemeris}${info?.epheFiles?.length ? ' · dosyalar: ' + info.epheFiles.join(', ') : ''}`],
    ['Konum türü', 'Geosantrik, görünür konum (ışık zamanı ve sapınç düzeltmeli), gerçek ekinoks; ΔT Swiss Ephemeris modeli'],
    ['Zodyak', settings.zodiac === 'sidereal' ? `Sideral · ayanamsa ${AYANAMSAS.find((a) => a.id === settings.ayanamsa)?.name ?? settings.ayanamsa}` : 'Tropikal'],
    ['Ev sistemi', c.hasHouses ? c.houseSystemUsed : `${HOUSE_SYSTEMS.find((h) => h.id === c.houseSystem)?.name ?? ''} (doğum saati bilinmediği için evler hesaplanmadı)`],
    ['Ay düğümü', i.nodeType === 'mean' ? 'Ortalama düğüm' : 'Gerçek (oskülatör) düğüm'],
    ['Burç yöneticiliği', settings.rulership === 'traditional' ? 'Geleneksel (yedi gezegen)' : 'Modern (♅ Kova, ♆ Balık, ♇ Akrep)'],
    ['Orb profili', `${prof.name}: ${ASPECTS.map((a) => `${a.name} ±${prof.orbs[a.type] ?? '—'}°`).join(', ')}; Güneş/Ay ek orbu ${prof.luminaryBonus}°`],
    ['Transit / progresyon orbu', `±${settings.transitOrb}° (transit etkinlik dönemi bu orba göre)`],
    ['Doğum saati güvenilirliği', i.rodden ? `Rodden ${i.rodden} — ${RODDEN.find((r) => r.id === i.rodden)?.desc ?? ''}` : 'Belirtilmedi'],
    ['Saat bilgisi', i.timeUnknown ? 'Doğum saati bilinmiyor: 12:00 yalnızca hesap referansı; Ay açıları gün boyunca tarandı' : `${i.date} ${i.time} yerel saat`],
    ['UTC dönüşümü', `${natal.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, '')} UT · ofset ${fmtOffset(natal.offsetMinutes)} · ${i.timeMode === 'zone' ? `saat dilimi ${i.place.tz} (IANA tarihsel kuralları)` : i.timeMode === 'lmt' ? 'yerel ortalama zaman (LMT, boylamdan)' : 'elle girilen ofset'}`],
    ['Jülyen günü', `${natal.jdUt.toFixed(6)} UT`],
    ['Doğum yeri', `${placeLabel(i.place)} · ${i.place.lat.toFixed(5)}°, ${i.place.lon.toFixed(5)}° · kaynak: ${i.place.geonameId ? `GeoNames ${i.place.geonameId}${i.place.precision ? ` (${i.place.precision})` : ''}` : 'elle girilen koordinat'}`],
    ...(c.place && (c.place.lat !== i.place.lat || c.place.lon !== i.place.lon) ? [['Harita yeri', `${placeLabel(c.place)} · ${c.place.lat.toFixed(5)}°, ${c.place.lon.toFixed(5)}°`] as [string, string]] : []),
    ...(view.outer && view.outer.kind !== 'natal' ? [['İkinci çark', `${view.outer.label} · ${view.outer.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, '')} UT`] as [string, string]] : []),
    ['Rapor oluşturuldu', `${new Date(reportAt).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })} (bilgisayar saati)`],
    ['Doğrulama', 'Gezegen konumları ve transit anları NASA JPL Horizons ile, ev başlangıçları bağımsız formüllerle, saat dilimleri IANA verisiyle düzenli olarak test edilir (npm run verify, npm run denetim).']
  ]
  return <dl className="p-meta p-tech">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
}
