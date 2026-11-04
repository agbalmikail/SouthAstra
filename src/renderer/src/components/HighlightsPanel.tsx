// Öne çıkanlar: kural tabanlı özet (yapay zekâ yok; hesaplanmış veriden)
import type { ChartResult } from '@shared/types'
import { chartHighlights, highlightsIntro, type Highlight } from '@shared/highlights'
import { learnDisclaimer } from '@shared/learn'
import { t } from '@shared/i18n'

const GROUPS: Highlight['group'][] = ['Genel tablo', 'Köşeler', 'Açılar', 'Kalıplar', 'Gezegenlerin durumu']
const GROUP_HINT: Record<string, string> = {
  'Genel tablo': 'Haritanın genel dağılımı ve temel noktaları',
  Köşeler: 'Ufka ve meridyene çok yakın gezegenler',
  Açılar: 'Gezegenler arasındaki en belirgin (neredeyse tam) açılar',
  Kalıplar: 'Birden çok gezegenin oluşturduğu şekiller',
  'Gezegenlerin durumu': 'Geri hareket ve burçtaki güç'
}

export function HighlightsPanel({ chart, rulership, onHover, print }: { chart: ChartResult; rulership: 'modern' | 'traditional'; onHover?: (id: string | null) => void; print?: boolean }) {
  const list = chartHighlights(chart, rulership)
  return (
    <div className="highlights">
      <p className="hl-intro">{highlightsIntro()}</p>
      {chart.input.timeUnknown && <p className="hint warn-inline">{t("Doğum saati bilinmiyor: yükselen, evler ve köşeler hesaplanmadı; Ay'a bağlı maddeler işaretlidir.")}</p>}
      {GROUPS.map((g) => {
        const items = list.filter((h) => h.group === g)
        if (!items.length) return null
        return (
          <div key={g} className="hl-group">
            <div className="cap">{t(g)} <span className="muted small" style={{ textTransform: 'none', letterSpacing: 0 }}>· {t(GROUP_HINT[g])}</span></div>
            {items.map((h) => (
              <div key={h.id} className="hl-item" onMouseEnter={() => onHover?.(h.points[0] ?? null)} onMouseLeave={() => onHover?.(null)}>
                <div className="hl-title">{h.title}{h.uncertain && <span className="tag cert-saate-bagli" title={h.uncertain}>{t('saate bağlı')}</span>}</div>
                {h.meaning && <p className="hl-meaning">{h.meaning}</p>}
                <p className="hl-rule"><b>{t('Neden öne çıktı:')}</b> {h.rule}{h.uncertain ? ` ${h.uncertain}` : ''}</p>
              </div>
            ))}
          </div>
        )
      })}
      <p className="hint">{learnDisclaimer()} {t('Bu sayfa yapay zekâ kullanmaz: maddeler programın hesapladığı konum ve açılardan sabit kurallarla seçilir.')}{print ? '' : ` ${t('Bir maddenin üstüne gelince ilgili gezegen çarkta vurgulanır.')}`}</p>
    </div>
  )
}
