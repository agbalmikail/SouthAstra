import type { ChartResult, Library, TransitEvent, ViewResult } from '@shared/types'
import { HOUSE_SYSTEMS, placeLabel, RODDEN } from '@shared/types'
import { ASPECT_BY_TYPE, moonPhase, SIGNS } from '@shared/zodiac'
import { aspectPatterns } from '@shared/patterns'
import { chartFactors } from '@shared/factors'
import Wheel from './Wheel'
import { AspectGrid, AspectList, CrossList, HouseTable, PlanetTable } from './Tables'
import { Distribution, StarsTable } from './Analysis'
import { MidpointsPanel, PatternsBlock, TraditionalPanel, type PdfSections } from './Extras'
import { fmtDateTr, fmtOffset } from '../format'

const noop = () => undefined

function Section({ title, who, children }: { title: string; who: string; children: React.ReactNode }) {
  return (
    <section className="p-sec">
      <div className="p-h"><h2>{title}</h2><span>{who}</span></div>
      {children}
    </section>
  )
}

function Meta({ view }: { view: ViewResult }) {
  const c = view.inner
  const i = c.input
  const natal: ChartResult | undefined = c.kind === 'natal' || c.kind === 'draconic' || c.kind === 'harmonic' ? c : view.outer?.kind === 'natal' ? view.outer : undefined
  const moment = c.kind === 'solarreturn' || c.kind === 'lunarreturn' ? c.utc : view.outer && view.outer.kind !== 'natal' ? view.outer.utc : null
  const local = (iso: string) => new Date(iso).toLocaleString('tr-TR', { timeZone: i.place.tz, dateStyle: 'long', timeStyle: 'short' })
  const rows: [string, string][] = [
    ['Doğum tarihi', `${fmtDateTr(i.date)} · ${i.timeUnknown ? 'saat bilinmiyor (12:00 varsayıldı)' : i.time} yerel saat`],
    ['Doğum yeri', placeLabel(i.place)],
    ['Koordinat', `${Math.abs(i.place.lat).toFixed(4)}° ${i.place.lat >= 0 ? 'K' : 'G'} · ${Math.abs(i.place.lon).toFixed(4)}° ${i.place.lon >= 0 ? 'D' : 'B'}${i.place.precision ? ` · ${i.place.precision}` : ''}`],
    ...(natal ? [['UTC', `${natal.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, '')} · ${fmtOffset(natal.offsetMinutes)} (${i.timeMode === 'zone' ? i.place.tz : i.timeMode === 'lmt' ? 'LMT' : 'elle ofset'})`] as [string, string]] : []),
    ...(moment ? [[c.kind === 'solarreturn' || c.kind === 'lunarreturn' ? 'Dönüş anı' : 'Harita tarihi', `${local(moment)} (${i.place.tz})`] as [string, string]] : []),
    ['Ev sistemi', c.hasHouses ? c.houseSystemUsed : (HOUSE_SYSTEMS.find((h) => h.id === c.houseSystem)?.name ?? '') + ' · evler gösterilmiyor'],
    ['Zodyak', `${c.zodiac} · geosantrik · görünür konum`],
    ...(i.rodden ? [['Veri güvenilirliği', `Rodden ${i.rodden} — ${RODDEN.find((r) => r.id === i.rodden)?.desc}`] as [string, string]] : [])
  ]
  return <dl className="p-meta">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
}

function Legend() {
  const items: [string, string][] = [['conjunction', 'Kavuşum'], ['sextile', 'Altmışlık'], ['square', 'Kare'], ['trine', 'Üçgen'], ['opposition', 'Karşıt']]
  return (
    <div className="p-legend">
      {items.map(([t, n]) => <span key={t}><span className={`asp-g ${t}`}>{ASPECT_BY_TYPE[t as keyof typeof ASPECT_BY_TYPE].glyph}</span> {n}</span>)}
      <span className="muted">R: geri · AC/MC: köşeler</span>
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
  const EL = ['Ateş', 'Toprak', 'Hava', 'Su']
  const MO = ['Öncü', 'Sabit', 'Değişken']
  const maxIdx = (a: number[]) => a.indexOf(Math.max(...a))
  const sun = p('sun')
  const moon = p('moon')
  const phase = sun && moon ? moonPhase(sun.lon, moon.lon).name : '—'
  const patterns = chart.kind === 'harmonic' ? [] : aspectPatterns(chart)
  const rows: [string, string][] = [
    ['Güneş', sign(sun?.lon) + (chart.hasHouses && sun ? ` · ${sun.house}. ev` : '')],
    ['Ay', sign(moon?.lon) + (chart.hasHouses && moon ? ` · ${moon.house}. ev` : '')],
    ...(chart.hasHouses ? [['Yükselen', sign(chart.angles.asc)] as [string, string], ['MC', sign(chart.angles.mc)] as [string, string]] : []),
    ['Baskın element', `${EL[maxIdx(el)]} (${el.map((n, i) => `${EL[i]} ${n}`).join(', ')})`],
    ['Baskın nitelik', `${MO[maxIdx(mo)]} (${mo.map((n, i) => `${MO[i]} ${n}`).join(', ')})`],
    ['Ay evresi', phase],
    ...(patterns.length ? [['Açı kalıpları', patterns.map((x) => x.name).join(', ')] as [string, string]] : [])
  ]
  return (
    <div className="p-summary">
      <h3>Özet</h3>
      <dl className="p-meta">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </div>
  )
}

export default function PrintView({ view, sections, library, transits, modeName }: {
  view: ViewResult; sections: PdfSections; library: Library; transits?: TransitEvent[]; modeName: string
}) {
  const c = view.inner
  const i = c.input
  const who = `${view.title} · ${modeName}`
  const single = !view.outer
  const natalLike = c.kind === 'natal' || c.kind === 'draconic' || c.kind === 'composite' || c.kind === 'solarreturn' || c.kind === 'lunarreturn'
  const factors = natalLike ? chartFactors(c).filter((f) => library[f.key]) : []
  const natal = view.outer?.kind === 'natal' ? view.outer : c
  const nm = (id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : natal.points.find((p) => p.id === id)?.name ?? id)
  const gl = (id: string) => natal.points.find((p) => p.id === id)?.glyph ?? ''

  return (
    <div className="print-page">
      {sections.chart && (
        <section className="p-sec p-cover">
          <header className="p-title">
            <div>
              <h1>{view.title}</h1>
              <div className="p-kind">{view.subtitle || modeName}</div>
            </div>
            <div className="p-brand">South<b>Astra</b></div>
          </header>
          <Meta view={view} />
          <div className="p-wheel"><Wheel inner={c} outer={view.outer} cross={view.cross} hovered={null} onHover={noop} showMinor={false} print /></div>
          <Legend />
          <Summary chart={c} />
          {c.warnings.length > 0 && <div className="p-notes">{c.warnings.map((w, k) => <p key={k}>{w}</p>)}</div>}
        </section>
      )}

      {sections.positions && (
        <Section title="Konumlar" who={who}>
          <h3>{c.label}</h3>
          <PlanetTable chart={c} hovered={null} onHover={noop} />
          {view.outer && (<><h3>{view.outer.label}</h3><PlanetTable chart={view.outer} hovered={null} onHover={noop} /></>)}
          {c.hasHouses && (<><h3>Ev başlangıçları · {c.houseSystemUsed}</h3><HouseTable chart={c} /></>)}
        </Section>
      )}

      {sections.aspects && (
        <Section title={single ? 'Açılar' : 'Karşılıklı açılar'} who={who}>
          {single ? (
            <>
              <AspectGrid chart={c} showMinor hovered={null} onHover={noop} />
              <h3>Açı listesi (orba göre)</h3>
              <div className="p-cols2"><AspectList chart={c} showMinor hovered={null} onHover={noop} /></div>
            </>
          ) : <CrossList outer={view.outer!} inner={c} cross={view.cross} showMinor hovered={null} onHover={noop} />}
        </Section>
      )}

      {sections.analysis && single && c.kind !== 'harmonic' && (
        <Section title="Analiz" who={who}>
          <PatternsBlock chart={c} />
          <div className="p-two">
            <div><Distribution chart={c} /></div>
            <div><h3>Sabit yıldız kavuşumları</h3><StarsTable chart={c} /></div>
          </div>
          <h3>Orta nokta temasları (1° orb)</h3>
          <div className="p-cols2"><MidpointsPanel chart={c} initialOrb={1} /></div>
          <h3>Esas dignite (geleneksel)</h3>
          <TraditionalPanel chart={c} />
        </Section>
      )}

      {sections.transits && transits && transits.length > 0 && (
        <Section title="Transit listesi" who={who}>
          <p className="hint">{new Date(transits[0].utc).toLocaleDateString('tr-TR')} – {new Date(transits[transits.length - 1].utc).toLocaleDateString('tr-TR')} · tam açı anları, {i.place.tz} saatiyle</p>
          <table className="data p-transits">
            <thead><tr><th>Tarih</th><th>Transit</th><th>Olay</th></tr></thead>
            <tbody>
              {transits.map((e, k) => {
                const def = e.natal ? ASPECT_BY_TYPE[e.type as keyof typeof ASPECT_BY_TYPE] : undefined
                return (
                  <tr key={k}>
                    <td className="num nowrap">{new Date(e.utc).toLocaleString('tr-TR', { timeZone: i.place.tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="nowrap"><span className="sym">{gl(e.transit)}</span> {nm(e.transit)}{e.retro ? ' (R)' : ''}</td>
                    <td>{def ? `${def.name} natal ${nm(e.natal!)}` : e.type === 'station-retro' ? `Geri dönüyor · ${SIGNS[e.sign ?? 0].name}` : e.type === 'station-direct' ? `İleri dönüyor · ${SIGNS[e.sign ?? 0].name}` : `${SIGNS[e.sign ?? 0].name} burcuna geçiş`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}

      {sections.interpretations && factors.length > 0 && (
        <Section title="Yorumlar" who={who}>
          {(['Köşeler', 'Burçlar', 'Evler', 'Açılar'] as const).map((grp) => {
            const list = factors.filter((f) => f.group === grp)
            if (!list.length) return null
            return (
              <div key={grp} className="p-interp">
                <h3>{grp}</h3>
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

      {sections.notes && (i.notes || (i.sessions && i.sessions.length > 0)) && (
        <Section title="Notlar" who={who}>
          {i.notes && <p className="p-pre">{i.notes}</p>}
          {[...(i.sessions ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((s) => (
            <div key={s.id} className="p-factor">
              <div className="p-factor-t">{new Date(s.date + 'T12:00:00').toLocaleDateString('tr-TR', { dateStyle: 'long' })}</div>
              <p className="p-pre">{s.text}</p>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
