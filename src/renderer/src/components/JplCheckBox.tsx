// Bu haritayı NASA JPL Horizons ile karşılaştır (isteğe bağlı; internet gerekir)
import { useState } from 'react'
import type { ChartInput, ChartResult, JplCheck } from '@shared/types'
import { jplKey } from '@shared/jplkey'
import { t, loc } from '@shared/i18n'

export const jplValid = (input: ChartInput) => !!input.jplCheck && input.jplCheck.key === jplKey(input)
const sec = (x: number) => x.toFixed(2)

export function JplCheckBox({ input, chart, canSave, onSave }: { input: ChartInput; chart: ChartResult; canSave: boolean; onSave: (c: JplCheck) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const valid = jplValid(input)
  const c = valid ? input.jplCheck! : null
  const run = async () => {
    if (!window.confirm(t("Bu haritanın gezegen konumları NASA JPL Horizons'a sorulacak ve SouthAstra'nın değerleriyle karşılaştırılacak (internet gerekir).\n\nNASA'ya yalnızca doğum anının Jülyen günü (UT) ve cisim numaraları gönderilir; ad, yer ya da başka bir kişisel bilgi gönderilmez. Sonuç bu kayda ve PDF'in teknik ekine eklenir.\n\nDevam edilsin mi?"))) return
    setBusy(true); setError('')
    try { await onSave(await window.southastra.jplCheck(input)); setOpen(true) } catch (e) { setError((e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')) }
    setBusy(false)
  }
  const name = (id: string) => chart.points.find((p) => p.id === id)?.name ?? id
  return (
    <div className="jpl-box">
      {c ? (
        <>
          <p className="small">
            <b>{t('NASA JPL karşılaştırması')}:</b> {t('{n} cisim, en büyük fark {d}″ (gezegenler) · {date}', { n: c.rows.length, d: sec(c.max), date: new Date(c.date).toLocaleDateString(loc()) })}{' '}
            <button className="link small" onClick={() => setOpen(!open)}>{open ? t('gizle') : t('ayrıntılar')}</button>
          </p>
          {open && (
            <table className="data small">
              <thead><tr><th>{t('Cisim')}</th><th className="r">NASA JPL</th><th className="r">SouthAstra</th><th className="r">{t('Fark')}</th></tr></thead>
              <tbody>{c.rows.map((r) => <tr key={r.id}><td>{name(r.id)}</td><td className="r num">{r.jpl.toFixed(6)}°</td><td className="r num">{r.sa.toFixed(6)}°</td><td className="r num">{sec(r.diff)}″</td></tr>)}</tbody>
            </table>
          )}
        </>
      ) : (
        <p className="small muted">{input.jplCheck ? t('Doğum bilgisi değiştiği için önceki NASA karşılaştırması geçersiz.') + ' ' : ''}
          <button className="btn ghost small" disabled={busy || !canSave} title={canSave ? '' : t('Önce haritayı arşive kaydedin')} onClick={() => { void run() }}>{busy ? t('NASA JPL sorgulanıyor…') : t('NASA JPL ile karşılaştır…')}</button>
        </p>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  )
}
