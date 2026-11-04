// Öğrenme modu paneli: hesaplanmış haritayı sembol sözlüğüyle açıklar (tahmin değil)
import type { Aspect, ChartResult } from '@shared/types'
import { ASPECT_BY_TYPE, SIGNS, signOf } from '@shared/zodiac'
import { ASPECT_LEARN, HOUSE_LEARN, learnDisclaimer, learnSource, learnPoint, SIGN_LEARN, transitLearn } from '@shared/learn'
import { fmtOrb } from '../format'
import { t } from '@shared/i18n'

const ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'northnode']
const MAJOR = new Set(['conjunction', 'opposition', 'square', 'trine', 'sextile'])
const CERT: Record<string, string> = { kesin: 'kesin', 'saate-bagli': 'saate bağlı', olasi: 'olası' }

function AspectLearn({ a, la, lb, from, to }: { a: Aspect; la: string; lb: string; from: ChartResult; to: ChartResult }) {
  const def = ASPECT_BY_TYPE[a.type]
  const g = (c: ChartResult, id: string) => (id === 'asc' ? 'AC' : id === 'mc' ? 'MC' : c.points.find((p) => p.id === id)?.glyph ?? '')
  const A = learnPoint(a.a)
  const B = learnPoint(a.b)
  return (
    <div className="learn-item">
      <div className="learn-h">
        <span className="sym">{g(from, a.a)}</span> <span className={`asp-g ${a.type}`}>{def.glyph}</span> <span className={g(to, a.b).length > 2 ? 'axis-txt' : 'sym'}>{g(to, a.b)}</span>{' '}
        <b>{la}{A?.title ?? a.a} {def.name.toLowerCase()} {lb}{B?.title ?? a.b}</b>
        <span className="muted small"> · orb {fmtOrb(a.orb)}{a.certainty ? ` · ${t(CERT[a.certainty])} (${t('doğum saati bilinmiyor')})` : ''}</span>
      </div>
      <p>{ASPECT_LEARN[a.type]}</p>
      <p className="muted small">{A?.title}: {A?.text} {B?.title}: {B?.text}</p>
    </div>
  )
}

export function LearnPanel({ chart, outer, cross, print }: { chart: ChartResult; outer?: ChartResult; cross?: Aspect[]; print?: boolean }) {
  const isTransit = outer?.kind === 'transit'
  const pts = chart.points.filter((p) => ORDER.includes(p.id))
  const asp = chart.aspects.filter((a) => MAJOR.has(a.type) && a.certainty !== 'olasi' && ORDER.concat(['asc', 'mc']).includes(a.a) && ORDER.concat(['asc', 'mc']).includes(a.b)).slice(0, print ? 10 : 12)
  return (
    <div className="learn">
      <p className="hint learn-note">{learnDisclaimer()}</p>
      {isTransit && outer && cross ? (
        <>
          <div className="cap">{t('Transit nedir?')}</div>
          <p>{transitLearn()}</p>
          <div className="cap">{t('Şu anki transitlerin sembolleri (en dar 8 açı)')}</div>
          {cross.filter((a) => MAJOR.has(a.type)).slice(0, 8).map((a, i) => <AspectLearn key={i} a={a} la="Transit " lb="natal " from={outer} to={chart} />)}
        </>
      ) : (
        <>
          <div className="cap">{t('Gezegenler: burç ve ev')}</div>
          {chart.hasHouses && (
            <div className="learn-item">
              <div className="learn-h"><span className="axis-txt">AC</span> <b>{t('Yükselen {sign}', { sign: SIGNS[signOf(chart.angles.asc)].name })}</b> · <span className="axis-txt">MC</span> <b>{SIGNS[signOf(chart.angles.mc)].name}</b></div>
              <p>{learnPoint('asc')?.text}</p>
              <p className="muted small">{learnPoint('mc')?.text}</p>
            </div>
          )}
          {pts.map((p) => {
            const s = signOf(p.lon)
            const L = learnPoint(p.id)
            const moonUnsure = p.id === 'moon' && chart.moonRange && signOf(chart.moonRange.from) !== signOf(chart.moonRange.to)
            return (
              <div key={p.id} className="learn-item">
                <div className="learn-h"><span className="sym">{p.glyph}</span> <b>{L?.title ?? p.name} · {SIGNS[s].name}{chart.hasHouses && p.house ? ` · ${t('{n}. ev', { n: p.house })}` : ''}</b>{moonUnsure && <span className="tag cert-saate-bagli">{t('burcu saate bağlı')}</span>}</div>
                <p>{L?.text}</p>
                <p className="muted small">{t('Burç:')} {SIGN_LEARN[s]}{chart.hasHouses && p.house ? ` ${t('Ev:')} ${HOUSE_LEARN[p.house - 1]}` : ''}</p>
              </div>
            )
          })}
          <div className="cap">{t('Ana açılar (en dar {n})', { n: asp.length })}</div>
          {asp.map((a, i) => <AspectLearn key={i} a={a} la="" lb="" from={chart} to={chart} />)}
        </>
      )}
      <p className="hint">{t('Kaynak:')} {learnSource()} {t('Bu açıklamalar programın hesapladığı konum ve açılara dayanır; yorum katmanı hesaplamadan ayrıdır.')}{print ? '' : ' ' + t('Kendi yorumlarınız “Yorum” sekmesindeki kütüphanede kalır.')}</p>
    </div>
  )
}
