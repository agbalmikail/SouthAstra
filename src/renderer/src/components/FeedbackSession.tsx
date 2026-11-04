// Seans geri bildirimi: metinler etken adı olmadan, kontrol metinleriyle karışık gösterilir
import { useMemo, useState } from 'react'
import type { ChartResult, Library } from '@shared/types'
import { chartFactors, keyTitle } from '@shared/factors'
import { t } from '@shared/i18n'
import { buildSession, feedbackStats, fitShare, feedbackMethod, RATING_NAME, rng, type FeedbackEntry, type Rating } from '@shared/feedback'

export default function FeedbackSession({ chart, library, onSave, onClose }: { chart: ChartResult; library: Library; onSave: (e: FeedbackEntry[]) => void; onClose: () => void }) {
  const items = useMemo(() => buildSession(chartFactors(chart).map((f) => f.key), Object.keys(library).filter((k) => library[k]?.text), rng(Date.now() % 2147483647)), [chart, library])
  const [ratings, setRatings] = useState<Record<number, Rating>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState(false)
  const all = items.length > 0 && items.every((_, i) => ratings[i])
  const session = useMemo(() => crypto.randomUUID(), [])
  const entries: FeedbackEntry[] = items.map((it, i) => ({ key: it.key, control: it.control, rating: ratings[i], date: new Date().toISOString(), session, ...(notes[i] ? { note: notes[i] } : {}) })).filter((e) => e.rating)
  const st = feedbackStats(entries)
  return (
    <div className="modal-back">
      <div className="modal wide fb-modal" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <h2>{t('Seans geri bildirimi')}</h2>
        <p className="hint" style={{ marginTop: -6 }}>{feedbackMethod()}</p>
        {items.length === 0 ? (
          <p className="empty-note">{t('Bu haritanın etkenleri için kütüphanede yorum yok. Önce “Yorum” sekmesinden birkaç yorum yazın.')}</p>
        ) : (
          <ol className="fb-list">
            {items.map((it, i) => (
              <li key={i} className={revealed ? (it.control ? 'fb-control' : 'fb-real') : ''}>
                <p className="fb-text">{library[it.key]?.text}</p>
                {revealed && <p className="fb-reveal">{it.control ? <><b>{t('Kontrol metni')}</b> · {t('bu haritada olmayan etken:')} {keyTitle(it.key).title}</> : <>{t('Haritada var:')} {keyTitle(it.key).title}</>}</p>}
                <div className="fb-actions">
                  {(['fit', 'partial', 'nofit'] as Rating[]).map((r) => (
                    <button key={r} disabled={revealed} className={`btn ghost small ${ratings[i] === r ? 'on rate-' + r : ''}`} onClick={() => setRatings((p) => ({ ...p, [i]: r }))}>{RATING_NAME[r]}</button>
                  ))}
                  <input className="fb-note" placeholder={t('Not (isteğe bağlı)')} value={notes[i] ?? ''} disabled={revealed} onChange={(e) => { const v = e.target.value; setNotes((p) => ({ ...p, [i]: v })) }} />
                </div>
              </li>
            ))}
          </ol>
        )}
        {revealed && (
          <div className="fb-result">
            <b>{t('Bu oturum:')}</b> {t('haritadaki metinler {n} · uyum %{p} — kontrol metinleri {cn} · uyum %{cp}.', { n: st.real.n, p: Math.round(fitShare(st.real) * 100), cn: st.control.n, cp: Math.round(fitShare(st.control) * 100) })}
            <span className="muted small"> {st.control.n < 3 ? t('Tek oturumda kontrol sayısı az; anlamlı karşılaştırma için birçok oturum gerekir.') : fitShare(st.control) >= fitShare(st.real) ? t('Kontrol metinleri en az gerçekler kadar uydu: bu oturumda metinler kişiyi ayırt etmedi.') : t('Gerçek metinler kontrollerden daha çok uydu.')}</span>
          </div>
        )}
        <div className="actions">
          <button className="btn ghost" onClick={onClose}>{t('Vazgeç')}</button>
          {!revealed ? <button className="btn primary" disabled={!all} onClick={() => setRevealed(true)}>{all ? t('Bitir ve kontrolleri göster') : t('{n} / {total} işaretlendi', { n: Object.keys(ratings).length, total: items.length })}</button>
            : <button className="btn primary" onClick={() => { onSave(entries); onClose() }}>{t('Kaydet')}</button>}
        </div>
      </div>
    </div>
  )
}
