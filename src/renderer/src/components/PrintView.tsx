import type { AppInfo, ChartResult, EclipseEvent, Library, RectifyRow, Settings, TransitEvent, ViewResult } from '@shared/types'
import { HOUSE_SYSTEMS, placeLabel, RODDEN } from '@shared/types'
import { activeOrbs, ASPECT_BY_TYPE, ASPECTS, moonPhase, SIGNS } from '@shared/zodiac'
import { aspectPatterns } from '@shared/patterns'
import { chartFactors } from '@shared/factors'
import Wheel from './Wheel'
import { AspectGrid, AspectList, CrossList, HouseTable, planetLegend, PlanetTable } from './Tables'
import { Distribution, LotsTable, RectifyTable, StarsTable } from './Analysis'
import { getPanelParams } from '../panelParams'
import { LearnPanel } from './LearnPanel'
import { HighlightsPanel } from './HighlightsPanel'
import { TechnicalAppendix, TransitSummary, TransitTable, TransitTimeline } from './PrintExtras'
import { TimeLordsPanel } from './TimeLords'
import { EclipsePanel, MidpointsPanel, PatternsBlock, TraditionalPanel, type PdfSections } from './Extras'
import { fmtDateTr, fmtOffset, precisionText } from '../format'
import logoMark from '../assets/logo-mark.svg'
import { loc, t } from '@shared/i18n'

const noop = () => undefined

function Section({ title, who, children, page }: { title: string; who: string; children: React.ReactNode; page?: boolean }) {
  return (
    <section className={page ? 'p-sec p-page' : 'p-sec'}>
      <div className="p-h"><h2>{title}</h2><span>{who}</span></div>
      {children}
    </section>
  )
}

const shiftedTime = (base: string, shift: number) => {
  const [h, m] = base.split(':').map(Number)
  const t = (((h * 60 + m + shift) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

function Meta({ view, reportAt }: { view: ViewResult; reportAt: string }) {
  const c = view.inner
  const i = c.input
  const natal: ChartResult | undefined = c.kind === 'natal' || c.kind === 'draconic' || c.kind === 'harmonic' || c.kind === 'relocated' ? c : view.outer?.kind === 'natal' ? view.outer : undefined
  const moment = c.kind === 'solarreturn' || c.kind === 'lunarreturn' ? c.utc : view.outer && view.outer.kind !== 'natal' ? view.outer.utc : null
  const local = (iso: string) => new Date(iso).toLocaleString(loc(), { timeZone: (c.place ?? i.place).tz, dateStyle: 'long', timeStyle: 'short' })
  const NS = (lat: number) => (lat >= 0 ? t('K') : t('G'))
  const EW = (lon: number) => (lon >= 0 ? t('D') : t('B'))
  const rows: [string, string][] = [
    [t('Doğum tarihi'), `${fmtDateTr(i.date)} · ${i.timeUnknown ? t('saat bilinmiyor (12:00 varsayıldı)') : i.time} ${t('yerel saat')}`],
    ...(natal?.shiftMin ? [[t('Simülasyon'), t('harita {time} için hesaplandı ({shift} dk); kayıtlı saat değişmedi', { time: shiftedTime(i.timeUnknown ? '12:00' : i.time, natal.shiftMin), shift: `${natal.shiftMin > 0 ? '+' : ''}${natal.shiftMin}` })] as [string, string]] : []),
    [t('Doğum yeri'), placeLabel(i.place)],
    ...(c.place && (c.place.lat !== i.place.lat || c.place.lon !== i.place.lon) ? [[t('Harita yeri'), `${placeLabel(c.place)} · ${Math.abs(c.place.lat).toFixed(4)}° ${NS(c.place.lat)} · ${Math.abs(c.place.lon).toFixed(4)}° ${EW(c.place.lon)}`] as [string, string]] : []),
    [t('Koordinat'), `${Math.abs(i.place.lat).toFixed(4)}° ${NS(i.place.lat)} · ${Math.abs(i.place.lon).toFixed(4)}° ${EW(i.place.lon)}${i.place.precision ? ` · ${precisionText(i.place.precision)}` : ''}`],
    ...(natal ? [['UTC', `${natal.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, '')} · ${fmtOffset(natal.offsetMinutes)} (${i.timeMode === 'zone' ? i.place.tz : i.timeMode === 'lmt' ? 'LMT' : t('elle ofset')})`] as [string, string]] : []),
    ...(moment ? [[c.kind === 'solarreturn' || c.kind === 'lunarreturn' ? t('Dönüş anı') : t('Harita tarihi'), `${local(moment)} (${(c.place ?? i.place).tz})`] as [string, string]] : []),
    [t('Rapor tarihi'), new Date(reportAt).toLocaleString(loc(), { dateStyle: 'long', timeStyle: 'short' })],
    [t('Ev sistemi'), c.hasHouses ? c.houseSystemUsed : (HOUSE_SYSTEMS.find((h) => h.id === c.houseSystem)?.name ?? '') + ' · ' + t('evler gösterilmiyor')],
    [t('Zodyak'), `${c.zodiac} · ${t('geosantrik · görünür konum')}`],
    [t('Ay düğümü'), i.nodeType === 'mean' ? t('Ortalama düğüm') : t('Gerçek (oskülatör) düğüm')],
    ...(i.rodden ? [[t('Veri güvenilirliği'), `Rodden ${i.rodden} — ${RODDEN.find((r) => r.id === i.rodden)?.desc}`] as [string, string]] : [])
  ]
  return <dl className="p-meta">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
}

/** Açı tablosu açıklaması: hücre içeriği ve kullanılan orb sınırları */
function OrbLegend({ settings, cross }: { settings: Settings; cross?: 'transit' | 'progression' | 'natal' }) {
  const prof = activeOrbs(settings)
  const orbs = ASPECTS.map((a) => `${a.name} ${a.angle}° ±${prof.orbs[a.type] ?? '—'}°`).join(' · ')
  return (
    <div className="p-orbs">
      <p><b>{t('Okuma:')}</b> {t('Hücrede açının işareti, altında durum ve orb (derece°dakika) yer alır.')} <b>A</b> = {t('yaklaşan (açı henüz tamlaşmadı, gezegenler birbirine yaklaşıyor)')}, <b>S</b> = {t('ayrılan (açı tamlaştı, gezegenler uzaklaşıyor)')}. {t('Paralel ve kontraparaleller deklinasyona göredir (orb 1°).')}</p>
      {cross === 'transit' || cross === 'progression'
        ? <p><b>{t('Orb sınırı:')}</b> {cross === 'transit' ? t('transitlerde majör açılar için ±{n}°', { n: settings.transitOrb }) : t('progresyon ve solar arc için majör açılar ±{n}°', { n: settings.progressionOrb })}.</p>
        : <p><b>{t('Orb sınırları ({name} profili):', { name: prof.name })}</b> {orbs}. {t('Güneş veya Ay içeren açılara +{n}° eklenir.', { n: prof.luminaryBonus })}</p>}
    </div>
  )
}

function Legend() {
  const items: [string, string][] = [['conjunction', t('Kavuşum')], ['sextile', t('Altmışlık')], ['square', t('Kare')], ['trine', t('Üçgen')], ['opposition', t('Karşıt')]]
  return (
    <div className="p-legend">
      {items.map(([t, n]) => <span key={t}><span className={`asp-g ${t}`}>{ASPECT_BY_TYPE[t as keyof typeof ASPECT_BY_TYPE].glyph}</span> {n}</span>)}
      <span className="muted">{t('R: geri · AC/MC: köşeler')}</span>
    </div>
  )
}

/** Kapak sayfası özeti: ana yerleşimler ve baskın nitelikler */
function Summary({ chart }: { chart: ChartResult }) {
  const p = (id: string) => chart.points.find((x) => x.id === id)
  const sign = (lon?: number) => (lon === undefined ? '—' : `${SIGNS[Math.floor(lon / 30)].name} ${Math.floor(lon % 30)}°`)
  const classic = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
  const count = (fn: (s: number) => number, n: number) => {
    const c = Array(n).fill(0)
    for (const id of classic) { const x = p(id); if (x) c[fn(Math.floor(x.lon / 30))]++ }
    return c
  }
  const el = count((s) => s % 4, 4)
  const mo = count((s) => s % 3, 3)
  const EL = [t('Ateş'), t('Toprak'), t('Hava'), t('Su')]
  const MO = [t('Öncü'), t('Sabit'), t('Değişken')]
  const maxIdx = (a: number[]) => a.indexOf(Math.max(...a))
  const sun = p('sun')
  const moon = p('moon')
  const phase = sun && moon ? moonPhase(sun.lon, moon.lon).text : '—'
  const patterns = chart.kind === 'harmonic' ? [] : aspectPatterns(chart)
  const rows: [string, string][] = [
    [t('Güneş'), sign(sun?.lon) + (chart.hasHouses && sun ? ' · ' + t('{n}. ev', { n: sun.house }) : '')],
    [t('Ay'), sign(moon?.lon) + (chart.hasHouses && moon ? ' · ' + t('{n}. ev', { n: moon.house }) : '')],
    ...(chart.hasHouses ? [[t('Yükselen'), sign(chart.angles.asc)] as [string, string], ['MC', sign(chart.angles.mc)] as [string, string]] : []),
    [t('Baskın element'), `${EL[maxIdx(el)]} (${el.map((n, i) => `${EL[i]} ${n}`).join(', ')})`],
    [t('Baskın nitelik'), `${MO[maxIdx(mo)]} (${mo.map((n, i) => `${MO[i]} ${n}`).join(', ')})`],
    [t('Ay evresi'), phase],
    ...(patterns.length ? [[t('Açı kalıpları'), patterns.map((x) => t(x.name)).join(', ')] as [string, string]] : [])
  ]
  return (
    <div className="p-summary">
      <h3>{t('Özet')}</h3>
      <dl className="p-meta">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </div>
  )
}

export default function PrintView({ view, sections, library, transits, eclipses, rectify, modeName, settings, info, reportAt }: {
  view: ViewResult; sections: PdfSections; library: Library; transits?: TransitEvent[]; eclipses?: EclipseEvent[]
  rectify?: { rows: RectifyRow[]; from: string; to: string; step: number }; modeName: string; settings: Settings; info?: AppInfo; reportAt: string
}) {
  const c = view.inner
  const i = c.input
  const who = `${view.title} · ${modeName}`
  const single = !view.outer
  const natalLike = c.kind === 'natal' || c.kind === 'draconic' || c.kind === 'relocated' || c.kind === 'composite' || c.kind === 'solarreturn' || c.kind === 'lunarreturn'
  const factors = natalLike ? chartFactors(c).filter((f) => library[f.key]) : []
  const natal = view.outer?.kind === 'natal' ? view.outer : c
  const nm = (id: string) => (id === 'asc' ? t('Yükselen') : id === 'mc' ? 'MC' : natal.points.find((p) => p.id === id)?.name ?? id)
  const gl = (id: string) => natal.points.find((p) => p.id === id)?.glyph ?? ''
  const transitRangeText = () => {
    const tl = getPanelParams().transitList
    const kinds = [tl.kinds.aspects && t('açılar'), tl.kinds.stations && t('duraklamalar'), tl.kinds.ingress && t('burç geçişleri')].filter(Boolean).join(', ')
    return `${tl.from.split('-').reverse().join('.')} – ${tl.to.split('-').reverse().join('.')} · ${tl.planets.map((p) => gl(p)).join(' ')} · ${kinds || t('olay türü seçilmedi')}`
  }

  return (
    <div className={sections.compact ? "print-page compact" : "print-page"}>
      {sections.chart && (
        <section className="p-sec p-cover">
          <header className="p-title">
            <div>
              <h1>{view.title}</h1>
              <div className="p-kind">{view.subtitle || modeName}</div>
            </div>
            <div className="p-brand"><img src={logoMark} alt="" className="logo-mark" /><span>South<b>Astra</b></span></div>
          </header>
          <Meta view={view} reportAt={reportAt} />
          <div className="p-wheel"><Wheel inner={c} outer={view.outer} cross={view.cross} hovered={null} onHover={noop} showMinor={false} print appearance={settings.appearance} /></div>
          <Legend />
          <Summary chart={c} />
          {c.warnings.length > 0 && <div className="p-notes">{c.warnings.map((w, k) => <p key={k}>{w}</p>)}</div>}
        </section>
      )}

      {sections.highlights && (
        <Section title={t('Öne çıkanlar')} who={who}>
          <HighlightsPanel chart={c} rulership={settings.rulership} print />
        </Section>
      )}

      {sections.positions && (
        <Section title={t('Konumlar')} who={who} page>
          {view.outer ? (
            <>
              <div className="p-two">
                <div><h3>{c.label}</h3><PlanetTable chart={c} hovered={null} onHover={noop} compact /></div>
                <div><h3>{view.outer.label}</h3><PlanetTable chart={view.outer} hovered={null} onHover={noop} compact innerLabel={c.kind === 'solarreturn' || c.kind === 'lunarreturn' ? t('Dönüş') : view.title.includes(' × ') ? i.name : t('Natal')} /></div>
              </div>
              <p className="p-legend-text">{planetLegend()} {t("Hız ve deklinasyon her iki çark için ayrı PDF'lerde (tek çark) ayrıntılı verilir.")}</p>
              {c.hasHouses && (<><h3>{t('Ev başlangıçları')} · {c.houseSystemUsed}</h3><div className="p-cols2"><HouseTable chart={c} /></div></>)}
            </>
          ) : (
            <>
              <h3>{c.label}</h3>
              <PlanetTable chart={c} hovered={null} onHover={noop} />
              <p className="p-legend-text">{planetLegend()}</p>
              {c.hasHouses && (<><h3>{t('Ev başlangıçları')} · {c.houseSystemUsed}</h3><div className="p-cols2"><HouseTable chart={c} /></div></>)}
            </>
          )}
        </Section>
      )}

      {sections.aspects && single && (
        <>
          <Section title={t('Açı tablosu')} who={who} page>
            <AspectGrid chart={c} showMinor hovered={null} onHover={noop} legend={<OrbLegend settings={settings} />} />
          </Section>
          <Section title={t('Açı listesi')} who={who}>
            <p className="hint">{t('Bütün açılar orba göre sıralı (en sıkı açı en üstte).')}</p>
            <div className="p-cols2"><AspectList chart={c} showMinor hovered={null} onHover={noop} /></div>
          </Section>
        </>
      )}
      {sections.aspects && !single && (
        <Section title={t('Karşılıklı açılar')} who={who}>
          <CrossList outer={view.outer!} inner={c} cross={view.cross} showMinor hovered={null} onHover={noop} />
          <OrbLegend settings={settings} cross={view.outer!.kind === 'transit' || c.kind === 'solarreturn' || c.kind === 'lunarreturn' ? 'transit' : view.outer!.kind === 'natal' ? 'natal' : 'progression'} />
        </Section>
      )}

      {sections.analysis && single && c.kind !== 'harmonic' && (
        <>
          <Section title={t('Analiz')} who={who}>
            <PatternsBlock chart={c} />
            <div className="p-two">
              <div><Distribution chart={c} /></div>
              <div><h3>{t('Sabit yıldız kavuşumları')}</h3><StarsTable chart={c} orb={settings.fixedStarOrb} /><h3>{t('Arap noktaları')}</h3><LotsTable chart={c} /></div>
            </div>
          </Section>
          <Section title={t('Geleneksel analiz')} who={who}>
            <TraditionalPanel chart={c} />
          </Section>
          <Section title={t('Orta nokta temasları')} who={who}>
            <div className="p-cols2"><MidpointsPanel chart={c} print /></div>
          </Section>
        </>
      )}

      {sections.timelords && c.kind === 'natal' && (
        <Section title={t('Profeksiyon ve firdaria')} who={who}>
          <TimeLordsPanel chart={c} print />
        </Section>
      )}

      {sections.eclipses && eclipses && (
        <Section title={t('Tutulmalar')} who={who}>
          <EclipsePanel input={i} chart={c.kind === 'natal' ? c : view.outer ?? c} print preloaded={eclipses} />
        </Section>
      )}

      {sections.rectify && rectify && (
        <Section title={t('Doğum saati aralığı')} who={who}>
          <p className="hint">{t("{from} – {to} yerel saat · {step} dk adım · yükselen ve MC'nin burç değiştirdiği satırlar vurgulu", { from: rectify.from, to: rectify.to, step: rectify.step })}</p>
          <div className="p-cols2"><RectifyTable rows={rectify.rows} current={i.timeUnknown ? undefined : i.time.slice(0, 5)} /></div>
        </Section>
      )}

      {sections.transits && transits && (
        <Section title={t('Transit listesi')} who={who}>
          <p className="hint">{transitRangeText()} · {t('tam açı anları, {tz} saatiyle · {n} olay', { tz: i.place.tz, n: transits.length })}</p>
          <TransitSummary natal={natal} transits={transits} tz={i.place.tz} />
          <TransitTimeline natal={natal} transits={transits} from={getPanelParams().transitList.from} to={getPanelParams().transitList.to} />
          <h3>{t('Bütün olaylar')}</h3>
          <TransitTable natal={natal} transits={transits} tz={i.place.tz} />
        </Section>
      )}

      {sections.interpretations && factors.length > 0 && (
        <Section title={t('Yorumlar')} who={who}>
          {(['Köşeler', 'Burçlar', 'Evler', 'Açılar'] as const).map((grp) => {
            const list = factors.filter((f) => f.group === grp)
            if (!list.length) return null
            return (
              <div key={grp} className="p-interp">
                <h3>{t(grp)}</h3>
                {list.map((f) => (
                  <div key={f.key} className="p-factor">
                    <div className="p-factor-t"><span className="sym">{f.glyphs}</span> {f.title}</div>
                    <p>{library[f.key].text}</p>
                  </div>
                ))}
              </div>
            )
          })}
        </Section>
      )}

      {sections.learning && (
        <Section title={t('Öğrenme · sembollerin geleneksel anlamları')} who={who}>
          <LearnPanel chart={c} outer={view.outer} cross={view.cross} print />
        </Section>
      )}

      {sections.technical && (
        <Section title={t('Teknik ek · hesaplama bilgileri')} who={who}>
          <p className="hint">{t('Bu rapordaki değerleri başka bir programla yeniden üretmek için gereken ayarlar.')}</p>
          <TechnicalAppendix view={view} settings={settings} info={info} reportAt={reportAt} />
        </Section>
      )}

      {sections.notes && (i.notes || (i.sessions && i.sessions.length > 0)) && (
        <Section title={t('Notlar')} who={who}>
          {i.notes && <p className="p-pre">{i.notes}</p>}
          {[...(i.sessions ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((s) => (
            <div key={s.id} className="p-factor">
              <div className="p-factor-t">{new Date(s.date + 'T12:00:00').toLocaleDateString(loc(), { dateStyle: 'long' })}</div>
              <p className="p-pre">{s.text}</p>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
