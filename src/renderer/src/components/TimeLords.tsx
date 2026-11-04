import { useMemo, useState } from 'react'
import type { ChartResult } from '@shared/types'
import { SIGNS } from '@shared/zodiac'
import { isDayChart, sectUnknown } from '@shared/dignities'
import { addYears, firdaria, profections, type NightNodes } from '@shared/timelords'
import { usePanelParam } from '../panelParams'

const GL: Record<string, string> = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', northnode: '☊', southnode: '☋' }
const NAME: Record<string, string> = { sun: 'Güneş', moon: 'Ay', mercury: 'Merkür', venus: 'Venüs', mars: 'Mars', jupiter: 'Jüpiter', saturn: 'Satürn', northnode: 'Kuzey Düğüm', southnode: 'Güney Düğüm' }
const g = (id: string) => (GL[id] ?? id) + '︎'
const d = (x: Date) => x.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Yıllık profeksiyon ve firdaria; seçili tarih (varsayılan bugün) vurgulanır */
export function TimeLordsPanel({ chart, at, print }: { chart: ChartResult; at?: Date; print?: boolean }) {
  const birth = Date.parse(chart.utc)
  const now = (at ?? new Date()).getTime()
  let ageNow = 0
  while (addYears(birth, ageNow + 1) <= now) ageNow++
  const [tl, setTl] = usePanelParam('timelords')
  const { span, nightNodes } = tl
  const setSpan = (v: number) => setTl({ ...tl, span: v })
  const setNightNodes = (v: NightNodes) => setTl({ ...tl, nightNodes: v })
  const unknown = sectUnknown(chart)
  const [assume, setAssume] = usePanelParam('sectAssume')
  const day = unknown ? assume === 'day' : isDayChart(chart)
  const prof = useMemo(() => profections(chart, birth, Math.max(0, ageNow - Math.floor(span / 2)), Math.max(0, ageNow - Math.floor(span / 2)) + span), [chart, birth, ageNow, span])
  const fird = useMemo(() => { const all = firdaria(chart, birth, 2, nightNodes, unknown ? day : undefined); return print ? all.filter((f) => +f.major.from < addYears(birth, 90)) : all }, [chart, birth, nightNodes, print, unknown, day])
  const curMajor = fird.find((f) => +f.major.from <= now && now < +f.major.to)
  const [open, setOpen] = useState<number | null>(null)
  const openIdx = open ?? (curMajor ? fird.indexOf(curMajor) : null)
  const natal = (id: string) => chart.points.find((p) => p.id === id)
  const where = (id: string) => {
    const p = natal(id)
    if (!p) return ''
    return `${SIGNS[Math.floor(p.lon / 30)].name}${chart.hasHouses && p.house ? ` · ${p.house}. ev` : ''}${p.retro ? ' · R' : ''}`
  }

  return (
    <div>
      <div className="cap">Yıllık profeksiyon</div>
      {!chart.hasHouses ? (
        <p className="hint">Doğum saati bilinmediği için yükselen yok; profeksiyon hesaplanamaz.</p>
      ) : (
        <>
          <p className="hint">Yükselen her doğum gününde bir burç ilerler (tüm burç evleri). Profekte burcun geleneksel yöneticisi yılın yöneticisidir. Her profeksiyon yılı doğum gününde başlar.</p>
          <table className="data">
            <thead><tr><th className="r">Yaş</th><th>Başlangıç</th><th>Ev</th><th>Burç</th><th>Yılın yöneticisi</th><th>Natalde</th></tr></thead>
            <tbody>
              {prof.map((p) => (
                <tr key={p.age} className={p.age === ageNow ? 'hl' : ''}>
                  <td className="r num">{p.age}</td>
                  <td className="num">{d(p.from)}</td>
                  <td className="num">{p.house}.</td>
                  <td><span className="sym">{SIGNS[p.sign].glyph}</span> {SIGNS[p.sign].name}</td>
                  <td><span className="sym">{g(p.lord)}</span> {NAME[p.lord]}</td>
                  <td className="muted">{where(p.lord)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!print && <div className="tl-more">
            <button className="link small" onClick={() => setSpan(span === 12 ? 36 : span === 36 ? 96 : 12)}>{span === 96 ? 'Daha az göster' : 'Daha fazla yıl göster'}</button>
          </div>}
        </>
      )}

      <div className="cap">Firdaria</div>
      <p className="hint">{day ? 'Gündüz haritası: Güneş ile başlar' : 'Gece haritası: Ay ile başlar'}. Ana dönem yılları: Güneş 10, Venüs 8, Merkür 13, Ay 9, Satürn 11, Jüpiter 12, Mars 7, Kuzey Düğüm 3, Güney Düğüm 2 (toplam 75). Gezegen dönemleri yedi eşit alt döneme bölünür; alt dönemler dönemin yöneticisinden başlayıp Kalde sırasıyla (♄ ♃ ♂ ☉ ♀ ☿ ☽) ilerler. Düğüm dönemlerinin alt dönemi yoktur. Ana dönemler doğum gününde başlar; alt dönem sınırları tropikal yıl (365,2422 gün) oranıyla bölünür.</p>
      {!day && print && <p className="hint">Gece haritasında düğümler: {nightNodes === 'end' ? "yedi gezegenden sonra (Abu Ma'shar)" : "Mars'tan sonra (Bonatti)"}.</p>}
      {!day && !print && (
        <div className="tl-opt"><span className="muted small">Gece haritasında düğümler</span>
          <div className="seg-btn" role="group" aria-label="Gece haritasında düğümler">
          <button className={nightNodes === 'end' ? 'on' : ''} onClick={() => setNightNodes('end')}>Sonda (Abu Ma'shar)</button>
          <button className={nightNodes === 'afterMars' ? 'on' : ''} onClick={() => setNightNodes('afterMars')}>Mars'tan sonra (Bonatti)</button>
          </div>
        </div>
      )}
      {unknown && (
        <div className="sect-unknown">
          <p className="hint warn-inline">Doğum saati bilinmiyor: gündüz/gece haritası belirlenemez, bu yüzden firdaria sırası kesin değildir. Aşağıdaki tablo seçilen <b>varsayıma</b> göredir; iki sıra birbirinden tamamen farklıdır.</p>
          {!print && <div className="seg-btn small"><button className={assume === 'day' ? 'on' : ''} onClick={() => setAssume('day')}>Varsayım: gündüz (☉ ile başlar)</button><button className={assume === 'night' ? 'on' : ''} onClick={() => setAssume('night')}>Varsayım: gece (☽ ile başlar)</button></div>}
          {print && <p className="hint">Bu raporda kullanılan varsayım: <b>{day ? 'gündüz haritası' : 'gece haritası'}</b>.</p>}
        </div>
      )}
      <table className="data">
        <thead><tr><th>Dönem</th><th>Başlangıç</th><th>Bitiş</th><th className="r">Yıl</th></tr></thead>
        <tbody>
          {fird.map((f, i) => {
            const cur = f === curMajor
            const expanded = openIdx === i && f.subs.length > 0
            return [
              <tr key={i} className={`${cur ? 'hl' : ''} ${f.subs.length ? 'click' : ''}`} onClick={() => f.subs.length && setOpen(expanded ? -1 : i)}>
                <td>{print ? '' : f.subs.length ? (expanded ? '▾ ' : '▸ ') : '  '}<span className="sym">{g(f.major.lord)}</span> {NAME[f.major.lord]}{i >= 9 && <span className="muted small"> · 2. tur</span>}</td>
                <td className="num">{d(f.major.from)}</td>
                <td className="num">{d(f.major.to)}</td>
                <td className="r num">{f.major.years}</td>
              </tr>,
              ...(expanded ? f.subs.map((s, k) => {
                const sc = +s.from <= now && now < +s.to
                return (
                  <tr key={`${i}-${k}`} className={sc ? 'hl tl-sub' : 'tl-sub'}>
                    <td style={{ paddingLeft: print ? 16 : 26 }}><span className="sym">{g(s.lord)}</span>/<span className="sym">{g(s.sub!)}</span> <span className="muted">{NAME[s.sub!]}</span></td>
                    <td className="num">{d(s.from)}</td>
                    <td className="num">{d(s.to)}</td>
                    <td className="r num muted">{s.years.toFixed(2).replace('.', ',')}</td>
                  </tr>
                )
              }) : [])
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}
