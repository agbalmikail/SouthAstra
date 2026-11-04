// PDF ekleri: transit özeti, zaman çizelgesi, ayrıntılı transit tablosu ve teknik ek
import type { JplSummary, AppInfo, ChartResult, Settings, TransitEvent, ViewResult } from '@shared/types'
import { HOUSE_SYSTEMS, placeLabel, RODDEN } from '@shared/types'
import { activeOrbs, ASPECT_BY_TYPE, ASPECTS, AYANAMSAS, SIGNS } from '@shared/zodiac'
import { durationClass, DURATION_NAME, importance, rankRule, topTransits, windowDays } from '@shared/transitRank'
import { fmtOffset, jdText, precisionText } from '../format'
import { jplKey } from '@shared/jplkey'
import { loc, t, getLang } from '@shared/i18n'

const fmtD = (iso: string, tz: string) => new Date(iso).toLocaleDateString(loc(), { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtDT = (iso: string, tz: string) => new Date(iso).toLocaleString(loc(), { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function names(natal: ChartResult) {
  const gl = (id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : natal.points.find((p) => p.id === id)?.glyph ?? '')
  const nm = (id: string) => (id === 'asc' ? t('Yükselen') : id === 'mc' ? 'MC' : natal.points.find((p) => p.id === id)?.name ?? id)
  return { gl, nm }
}
const eventText = (e: TransitEvent, nm: (id: string) => string) => {
  const def = e.natal ? ASPECT_BY_TYPE[e.type as keyof typeof ASPECT_BY_TYPE] : undefined
  const sign = SIGNS[e.sign ?? 0].name
  return def ? t('Transit {a} {aspect} natal {b}', { a: nm(e.transit), aspect: def.name.toLowerCase(), b: nm(e.natal!) }) : e.type === 'station-retro' ? t('{planet} geri harekete dönüyor · {sign}', { planet: nm(e.transit), sign }) : e.type === 'station-direct' ? t('{planet} düz harekete dönüyor · {sign}', { planet: nm(e.transit), sign }) : t('{planet} {sign} burcuna geçiyor', { planet: nm(e.transit), sign })
}

/** Özet: önem sırasına göre en önemli 5 transit (her seriden bir satır) */
export function TransitSummary({ natal, transits, tz }: { natal: ChartResult; transits: TransitEvent[]; tz: string }) {
  const { gl, nm } = names(natal)
  const top = topTransits(transits, 5)
  if (!top.length) return null
  return (
    <div className="p-summary-box">
      <h3>{t('Öne çıkan transitler')}</h3>
      <table className="data">
        <thead><tr><th>{t('Transit')}</th><th>{t('Etkinlik dönemi')}</th><th>{t('Kesinleşme')}</th><th className="r">{t('Süre')}</th></tr></thead>
        <tbody>
          {top.map((e, k) => {
            const all = transits.filter((x) => x.transit === e.transit && x.natal === e.natal && x.type === e.type && x.window?.start === e.window?.start)
            return (
              <tr key={k}>
                <td><span className="sym">{gl(e.transit)}</span> <span className={`asp-g ${e.type}`}>{ASPECT_BY_TYPE[e.type as keyof typeof ASPECT_BY_TYPE].glyph}</span> <span className={gl(e.natal!).length > 2 ? 'axis-txt' : 'sym'}>{gl(e.natal!)}</span> {eventText(e, nm)}{e.house ? ' · ' + t('{house}. evden', { house: e.house }) : ''}</td>
                <td className="num nowrap">{e.window ? `${fmtD(e.window.start, tz)} – ${fmtD(e.window.end, tz)}` : '—'}</td>
                <td className="num">{all.map((x) => fmtD(x.utc, tz)).join(' · ')}{(e.pass?.of ?? 1) > all.length ? ' ' + t('(+{n} aralık dışında)', { n: (e.pass?.of ?? 1) - all.length }) : ''}</td>
                <td className="r">{DURATION_NAME[durationClass(e) ?? 'short']}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="hint">{rankRule()}</p>
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
      <h3>{t('Zaman çizelgesi · orta ve uzun süreli transitler')}</h3>
      <svg viewBox={`0 0 ${W} ${rows.length * H + 22}`} width="100%" role="img" aria-label={t('Transit zaman çizelgesi')}>
        {months.filter((m) => m >= t0).map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={14} x2={x(m)} y2={rows.length * H + 18} className="tl-grid" />
            {(months.length <= 14 || new Date(m).getUTCMonth() % 3 === 0) && <text x={x(m) + 1.5} y={10} className="tl-month">{new Date(m).toLocaleDateString(loc(), { month: 'short', year: '2-digit', timeZone: 'UTC' })}</text>}
          </g>
        ))}
        {rows.map((r, k) => {
          const e = r[0]
          const y = 18 + k * H
          const def = ASPECT_BY_TYPE[e.type as keyof typeof ASPECT_BY_TYPE]
          return (
            <g key={k}>
              <text x={2} y={y + 8} className="tl-label">{gl(e.transit)} {def.glyph} {gl(e.natal!)}{(e.pass?.of ?? 1) > 1 ? `  ×${e.pass!.of}` : ''}</text>
              {(e.window!.segments ?? [{ start: e.window!.start, end: e.window!.end }]).map((sg, j) => <rect key={j} x={x(Date.parse(sg.start))} y={y + 2} width={Math.max(1.5, x(Date.parse(sg.end)) - x(Date.parse(sg.start)))} height={H - 5} rx={2} className={`tl-bar ${e.type}`} />)}
              {e.window!.segments && <line x1={x(Date.parse(e.window!.start))} x2={x(Date.parse(e.window!.end))} y1={y + 2 + (H - 5) / 2} y2={y + 2 + (H - 5) / 2} className="tl-gap" />}
              {r.map((h, j) => <circle key={j} cx={x(Date.parse(h.utc))} cy={y + 2 + (H - 5) / 2} r={2.2} className="tl-hit" />)}
            </g>
          )
        })}
      </svg>
      <p className="hint">{t('Çubuk: transit orbu içinde kalınan dönem (seçili aralığa kırpılmış) · nokta: kesinleşme anı · ×3: retrograd nedeniyle üç kez kesinleşen seri. En önemli {n} seri gösterilir.', { n: rows.length })}</p>
    </div>
  )
}

/** Ayrıntılı transit tablosu */
export function TransitTable({ natal, transits, tz }: { natal: ChartResult; transits: TransitEvent[]; tz: string }) {
  const { gl, nm } = names(natal)
  return (
    <table className="data p-transits">
      <thead><tr><th>{t('Kesinleşme')}</th><th>{t('Transit')}</th><th>{t('Olay')}</th><th className="c">{t('Natal ev')}</th><th className="c">{t('Seri')}</th><th>{t('Etkinlik dönemi')}</th><th>{t('Süre')}</th></tr></thead>
      <tbody>
        {transits.map((e, k) => (
          <tr key={k}>
            <td className="num nowrap">{fmtDT(e.utc, tz)}</td>
            <td className="nowrap"><span className="sym">{gl(e.transit)}</span> {nm(e.transit)}{e.retro ? ' (R)' : ''}</td>
            <td>{eventText(e, nm)}</td>
            <td className="c num">{e.house ?? '—'}</td>
            <td className="c num">{e.pass && e.pass.of > 1 ? `${e.pass.n}/${e.pass.of}` : '—'}</td>
            <td className="num nowrap">{e.window ? `${fmtD(e.window.start, tz)} – ${fmtD(e.window.end, tz)}` : '—'}{e.window?.segments ? <div className="muted">{t('{n} parça: {list}', { n: e.window.segments.length, list: e.window.segments.map((s) => `${fmtD(s.start, tz)}–${fmtD(s.end, tz)}`).join(', ') })}</div> : null}</td>
            <td>{e.window ? `${DURATION_NAME[durationClass(e)!]} · ${t('{n} g', { n: Math.round(windowDays(e)) })}` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const jplSummaryText = (j: JplSummary) => {
  const s = (x?: number) => { const v = (x ?? 0).toFixed(2); return getLang() === 'en' ? v : v.replace('.', ',') }
  return t('{passed}/{total} kontrol geçti · {charts} haritaları · en büyük fark: gezegenler {pl}″, köşeler {an}″, evler {ho}″, açılar {as}″, progresyon {pr}″, transit anları {tr}″, ortalama düğüm {no}″; {tz} saat dilimi vakası · Horizons: {hz}, referans alındı {fetched} · referans dosyası SHA-256 {sha} · programın genel doğrulama raporu (uydurma test haritalarıyla, kişisel veri içermez): {url}', {
    passed: j.passed, total: j.passed + j.failed + j.missing, charts: j.charts.join(', '), pl: s(j.max.planets), an: s(j.max.angles), ho: s(j.max.houses), as: s(j.max.aspects), pr: s(j.max.progressions), tr: s(j.max.transits), no: s(j.max.node), tz: j.max.tzCases ?? 0,
    hz: `${j.horizons} (${[...new Set(Object.values(j.sources))].join(', ')})`, fetched: j.fetched.slice(0, 10), sha: j.sha256.slice(0, 16) + '…', url: j.report
  })
}

const verText = (info?: AppInfo) => {
  const v = info?.verification
  const f = (r?: { date: string; version: string; passed: number; failed: number; sweph: string }, name?: string) => r ? t('{name}: {passed} kontrol geçti', { name: name ?? '', passed: r.passed }) + (r.failed ? t(', {n} başarısız', { n: r.failed }) : '') + ' ' + t('({date}, sürüm {version}, Swiss Ephemeris {sweph})', { date: new Date(r.date).toLocaleDateString(loc()), version: r.version, sweph: r.sweph }) : ''
  const txt = [f(v?.verify, t('Testler (npm run verify)')), f(v?.audit, t('Değer denetimi (npm run denetim)'))].filter(Boolean).join(' · ')
  return txt || t('Bu kurulumda doğrulama kaydı bulunamadı (testler bu bilgisayarda çalıştırılmamış).')
}

/** Teknik ek: sonuçları yeniden üretmek için gereken her şey */
export function TechnicalAppendix({ view, settings, info, reportAt }: { view: ViewResult; settings: Settings; info?: AppInfo; reportAt: string }) {
  const c = view.inner
  const i = c.input
  const natal = c.kind === 'natal' ? c : view.outer?.kind === 'natal' ? view.outer : c
  const prof = activeOrbs(settings)
  const rows: [string, string][] = [
    [t('Program'), `SouthAstra ${info?.version ?? ''} · ${info?.platform ?? ''}`],
    [t('Efemeris'), `${info?.sweph ? 'Swiss Ephemeris ' + info.sweph : c.ephemeris}${info?.epheFiles?.length ? ' · ' + t('dosyalar: {list}', { list: info.epheFiles.join(', ') }) : ''}`],
    [t('Konum türü'), t('Geosantrik, görünür konum (ışık zamanı ve sapınç düzeltmeli), gerçek ekinoks; ΔT Swiss Ephemeris modeli')],
    [t('Zodyak'), settings.zodiac === 'sidereal' ? t('Sideral · ayanamsa {name}', { name: AYANAMSAS.find((a) => a.id === settings.ayanamsa)?.name ?? settings.ayanamsa }) : t('Tropikal')],
    [t('Ev sistemi'), c.hasHouses ? c.houseSystemUsed : `${HOUSE_SYSTEMS.find((h) => h.id === c.houseSystem)?.name ?? ''} ${t('(doğum saati bilinmediği için evler hesaplanmadı)')}`],
    [t('Ay düğümü'), i.nodeType === 'mean' ? t('Ortalama düğüm') : t('Gerçek (oskülatör) düğüm')],
    [t('Burç yöneticiliği'), settings.rulership === 'traditional' ? t('Geleneksel (yedi gezegen)') : t('Modern (♅ Kova, ♆ Balık, ♇ Akrep)')],
    [t('Orb profili'), `${t(prof.name)}: ${ASPECTS.map((a) => `${a.name} ±${prof.orbs[a.type] ?? '—'}°`).join(', ')}; ${t('Güneş/Ay ek orbu {n}°', { n: prof.luminaryBonus })}`],
    [t('Transit / progresyon orbu'), t('±{n}° (transit etkinlik dönemi bu orba göre)', { n: settings.transitOrb })],
    [t('Doğum saati güvenilirliği'), i.rodden ? `Rodden ${i.rodden} — ${RODDEN.find((r) => r.id === i.rodden)?.desc ?? ''} · ${t('kayıtta beyan edilen; SouthAstra kaynağı doğrulamaz')}` : t('Belirtilmedi')],
    [t('Saat bilgisi'), i.timeUnknown ? t('Doğum saati bilinmiyor: 12:00 yalnızca hesap referansı; Ay açıları gün boyunca tarandı') : t('{date} {time} yerel saat', { date: i.date, time: i.time })],
    [t('UTC dönüşümü'), `${natal.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, '')} UT · ${t('ofset {offset}', { offset: fmtOffset(natal.offsetMinutes) })} · ${i.timeMode === 'zone' ? t('saat dilimi {tz} (IANA tarihsel kuralları)', { tz: i.place.tz }) : i.timeMode === 'lmt' ? t('yerel ortalama zaman (LMT, boylamdan)') : t('elle girilen ofset')}`],
    [t('Jülyen günü'), `${jdText(natal)} — ${t('hesaplar UT1 ile yapılır; UTC değeri saat dilimi dönüşümünden')}`],
    [t('Doğum yeri'), `${placeLabel(i.place)} · ${i.place.lat.toFixed(5)}°, ${i.place.lon.toFixed(5)}° · ${t('kaynak: {src}', { src: i.place.geonameId ? `GeoNames ${i.place.geonameId}${i.place.precision ? ` (${precisionText(i.place.precision)})` : ''}` : t('elle girilen koordinat') })}`],
    ...(c.place && (c.place.lat !== i.place.lat || c.place.lon !== i.place.lon) ? [[t('Harita yeri'), `${placeLabel(c.place)} · ${c.place.lat.toFixed(5)}°, ${c.place.lon.toFixed(5)}°`] as [string, string]] : []),
    ...(view.outer && view.outer.kind !== 'natal' ? [[t('İkinci çark'), `${view.outer.label} · ${view.outer.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, '')} UT`] as [string, string]] : []),
    [t('Rapor oluşturuldu'), `${new Date(reportAt).toLocaleString(loc(), { dateStyle: 'long', timeStyle: 'short' })} ${t('(bilgisayar saati)')}`],
    [t('Doğrulama yöntemi'), t('Gezegen konumları ve transit anları NASA JPL Horizons ile, ev başlangıçları bağımsız formüllerle, ortalama Ay düğümü Meeus formülüyle, saat dilimleri IANA verisiyle, şehir koordinatları OpenStreetMap ile karşılaştırılır.')],
    [t('Son doğrulama'), verText(info)],
    ...(info?.verification?.jpl ? [[t('NASA JPL karşılaştırması (referans haritalar)'), jplSummaryText(info.verification.jpl)] as [string, string]] : [])
  ]
  const jc = i.jplCheck && i.jplCheck.key === jplKey(i) ? i.jplCheck : null
  const pname = (id: string) => natal.points.find((p) => p.id === id)?.name ?? id
  return (
    <>
      <dl className="p-meta p-tech">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <h3>{t('Bu harita için NASA JPL karşılaştırması')}</h3>
      {jc ? (
        <>
          <p className="hint">{t('Geosantrik görünür ekliptik boylam, günün ekliptiği; NASA JPL Horizons ({api}), doğum anı JD(UT) {jd}; sorgu {date}. Efemeris kaynakları: {src}.', { api: jc.api, jd: jc.jdUt.toFixed(6), date: new Date(jc.date).toLocaleString(loc()), src: Object.values(jc.sources).filter((v, k, a) => a.indexOf(v) === k).join(', ') })}</p>
          <table className="data p-jpl">
            <thead><tr><th>{t('Cisim')}</th><th className="r">NASA JPL</th><th className="r">SouthAstra</th><th className="r">{t('Fark')}</th></tr></thead>
            <tbody>{jc.rows.map((r) => <tr key={r.id}><td>{pname(r.id)}</td><td className="r num">{r.jpl.toFixed(6)}°</td><td className="r num">{r.sa.toFixed(6)}°</td><td className="r num">{getLang() === 'en' ? r.diff.toFixed(2) : r.diff.toFixed(2).replace('.', ',')}″</td></tr>)}</tbody>
          </table>
        </>
      ) : <p className="hint">{t("Bu harita için NASA JPL karşılaştırması yapılmadı. Uygulamada \"Hesaplama bilgileri\" altındaki \"NASA JPL ile karşılaştır\" düğmesiyle eklenebilir (internet gerekir; NASA'ya yalnızca tarih ve saat gider).")}</p>}
    </>
  )
}
