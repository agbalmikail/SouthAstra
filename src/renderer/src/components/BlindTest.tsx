// Kör karşılaştırma penceresi
import { useMemo, useState } from 'react'
import type { Library, SavedChart } from '@shared/types'
import { chartFactors } from '@shared/factors'
import { chartHighlights } from '@shared/highlights'
import { rng, shuffle } from '@shared/feedback'
import { BLIND_METHOD, buildSheets, chanceP, chanceText, isSunSignKey, type BlindTrial, type Sheet } from '@shared/blind'

const MAX_TEXTS = 8

export default function BlindTest({ charts, current, library, rulership, onSave, onClose }: {
  charts: SavedChart[]; current?: string; library: Library; rulership: 'modern' | 'traditional'
  onSave: (chartId: string, t: BlindTrial) => void; onClose: () => void
}) {
  const [who, setWho] = useState(current ?? charts[0]?.id ?? '')
  const [n, setN] = useState(Math.min(3, Math.max(1, charts.length - 1)))
  const [hideSun, setHideSun] = useState(true)
  const [useLib, setUseLib] = useState(true)
  const [sheets, setSheets] = useState<Sheet[] | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [used, setUsed] = useState('')
  const all = useMemo(() => charts.flatMap((c) => c.blindTrials ?? []), [charts])
  const summary = chanceText(chanceP(all), all.length)
  const source = `${used || (useLib ? 'kütüphane yorumları' : 'öne çıkanlar')}${hideSun ? ' · Güneş burcu hariç' : ''}`

  // her harita için iki kaynak ayrı hazırlanır; sayfalar mutlaka aynı kaynaktan olmalı (yazım biçimi ipucu olmasın)
  const textsFor = async (c: SavedChart): Promise<{ lib: string[]; hl: string[] }> => {
    const v = await window.southastra.view(c, { mode: 'natal' })
    const ch = v.inner
    const lib = chartFactors(ch).filter((f) => !(hideSun && isSunSignKey(f.key))).map((f) => library[f.key]?.text).filter((t): t is string => !!t)
    // öne çıkanlardan yalnızca anlam metni: başlıklardaki burç/gezegen adları ipucu vermesin
    const hl = [...new Set(chartHighlights(ch, rulership).filter((h) => !(hideSun && (h.id === 'big3' || h.id === 'ruler-sun'))).map((h) => h.meaning ?? '').filter(Boolean))]
    return { lib, hl }
  }
  const prepare = async () => {
    setError(''); setBusy(true); setNote('')
    try {
      const target = charts.find((c) => c.id === who)!
      const rand = rng(Date.now() % 2147483647)
      const others = charts.filter((c) => c.id !== who).map((c) => ({ c, r: rand() })).sort((a, b) => a.r - b.r).slice(0, n).map((x) => x.c)
      const raw = await Promise.all([target, ...others].map(async (c) => ({ chartId: c.id, ...(await textsFor(c)) })))
      const libOk = useLib && raw.every((r) => r.lib.length >= 3)
      if (useLib && !libOk) setNote('Seçilen haritaların bazılarında yeterli kütüphane yorumu (en az 3) olmadığı için, adil olması için bütün sayfalar öne çıkanların genel açıklamalarından hazırlandı.')
      const src = raw.map((r) => ({ chartId: r.chartId, texts: libOk ? r.lib : r.hl }))
      setUsed(libOk ? 'kütüphane yorumları' : 'öne çıkanlar (genel açıklamalar)')
      // sayfa uzunluğu ipucu olmasın: hepsi aynı sayıda metin
      const k = Math.min(MAX_TEXTS, ...src.map((x) => x.texts.length))
      if (k < 3) throw new Error('Sayfa başına en az 3 metin gerekiyor. Kütüphanede bu haritalar için daha fazla yorum yazın.')
      setSheets(buildSheets(src.map((x) => ({ ...x, texts: shuffle(x.texts, rand).slice(0, k) })), rand))
      setPick(null); setRevealed(false)
    } catch (e) { setError((e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')) }
    setBusy(false)
  }
  const nameOf = (id: string) => charts.find((c) => c.id === id)?.name ?? '?'
  const correct = sheets && pick ? sheets.find((s) => s.label === pick)?.chartId === who : false

  return (
    <div className="modal-back">
      <div className="modal wide blind-modal" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <h2>Kör karşılaştırma</h2>
        <p className="hint" style={{ marginTop: -6 }}>{BLIND_METHOD}</p>
        <div className="fb-summary"><b>Şimdiye kadar:</b> {summary}</div>
        {!sheets ? (
          <>
            {charts.length < 2 ? <p className="empty-note">Kör karşılaştırma için arşivde en az iki harita gerekiyor.</p> : (
              <div className="blind-setup">
                <label className="field"><span>Katılımcı (kendi haritası)</span>
                  <select id="bl-who" value={who} onChange={(e) => setWho(e.target.value)}>{charts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </label>
                <label className="field"><span>Diğer sayfa sayısı (arşivden rastgele)</span>
                  <select id="bl-n" value={n} onChange={(e) => setN(Number(e.target.value))}>{[1, 2, 3].filter((x) => x <= charts.length - 1).map((x) => <option key={x} value={x}>{x} (toplam {x + 1} sayfa · şans %{Math.round(100 / (x + 1))})</option>)}</select>
                </label>
                <label className="inline"><input type="checkbox" checked={useLib} onChange={(e) => setUseLib(e.target.checked)} /> Kendi kütüphane yorumlarımı kullan <span className="muted small">(her haritada en az 3 yorum gerekir; yoksa bütün sayfalar genel açıklamalardan hazırlanır)</span></label>
                <label className="inline"><input type="checkbox" checked={hideSun} onChange={(e) => setHideSun(e.target.checked)} /> Güneş burcu metinlerini çıkar (önerilir)</label>
              </div>
            )}
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button className="btn ghost" onClick={onClose}>Kapat</button>
              <button className="btn primary" disabled={charts.length < 2 || busy} onClick={() => { void prepare() }}>{busy ? 'Hazırlanıyor…' : 'Sayfaları hazırla'}</button>
            </div>
          </>
        ) : (
          <>
            <p className="hint">Sayfaları katılımcıya gösterin ve kendisini en iyi anlatan sayfayı seçmesini isteyin. Sayfalarda kimlik bilgisi ve burç adı yoktur; bütün sayfalar aynı kaynaktan ({used}) ve aynı sayıda metinle hazırlandı.</p>
            {note && <p className="hint warn-inline">{note}</p>}
            <div className="blind-sheets" style={{ gridTemplateColumns: `repeat(${sheets.length}, minmax(0, 1fr))` }}>
              {sheets.map((s) => (
                <div key={s.label} className={['blind-sheet', pick === s.label ? 'picked' : '', revealed && s.chartId === who ? 'is-target' : ''].join(' ')}>
                  <div className="blind-h">Sayfa {s.label}{revealed && <span className="muted small"> · {s.chartId === who ? 'katılımcının haritası' : nameOf(s.chartId)}</span>}</div>
                  <ul>{s.texts.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  {!revealed && <button className={pick === s.label ? 'btn primary small' : 'btn ghost small'} onClick={() => setPick(s.label)}>Bu beni anlatıyor</button>}
                </div>
              ))}
            </div>
            {revealed && <div className={`fb-result ${correct ? 'ok' : ''}`}><b>{correct ? 'İsabet.' : 'İsabet değil.'}</b> Katılımcı sayfa {pick} dedi; kendi sayfası {sheets.find((s) => s.chartId === who)?.label}. Tek bir deneme tek başına bir şey göstermez; sonuç birçok denemenin toplamına göre değerlendirilir.</div>}
            <div className="actions">
              <button className="btn ghost" onClick={() => setSheets(null)}>Baştan</button>
              {!revealed ? <button className="btn primary" disabled={!pick} onClick={() => setRevealed(true)}>Seçimi onayla ve açıkla</button>
                : <button className="btn primary" onClick={() => { onSave(who, { date: new Date().toISOString(), options: sheets.length, correct: !!correct, source }); setSheets(null) }}>Denemeyi kaydet</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
