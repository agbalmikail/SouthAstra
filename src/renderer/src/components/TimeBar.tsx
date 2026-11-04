import { pad2 } from '@shared/zodiac'
import { t } from '@shared/i18n'

/** Tarih tabanlı görünümler (transit, progresyon, dönüşler) için zaman kontrolü */
export function DateBar({ ms, tz, onChange, label }: { ms: number; tz: string; onChange: (ms: number) => void; label: string }) {
  // datetime-local değeri: harita yerinin saat diliminde yerel saat
  const local = new Date(ms).toLocaleString('sv-SE', { timeZone: tz }).replace(' ', 'T').slice(0, 16)
  const fromLocal = (v: string) => {
    // yerel saati UTC'ye çevir: önce UTC sanıp farkı ölç
    const guess = Date.parse(v + ':00Z')
    if (!Number.isFinite(guess)) return
    const off = Date.parse(new Date(guess).toLocaleString('sv-SE', { timeZone: tz }).replace(' ', 'T') + 'Z') - guess
    onChange(guess - off)
  }
  const add = (unit: 'd' | 'w' | 'm' | 'y', n: number) => {
    const d = new Date(ms)
    if (unit === 'd') d.setUTCDate(d.getUTCDate() + n)
    if (unit === 'w') d.setUTCDate(d.getUTCDate() + 7 * n)
    if (unit === 'm') d.setUTCMonth(d.getUTCMonth() + n)
    if (unit === 'y') d.setUTCFullYear(d.getUTCFullYear() + n)
    onChange(d.getTime())
  }
  return (
    <div className="timebar">
      <span className="muted small">{label}</span>
      <div className="tb-group">
        <button className="tb" onClick={() => add('y', -1)} title={t('1 yıl geri')}>{t('−1y')}</button>
        <button className="tb" onClick={() => add('m', -1)} title={t('1 ay geri')}>{t('−1a')}</button>
        <button className="tb" onClick={() => add('w', -1)} title={t('1 hafta geri')}>{t('−1h')}</button>
        <button className="tb" onClick={() => add('d', -1)} title={t('1 gün geri')}>{t('−1g')}</button>
      </div>
      <input id="tb-date" type="datetime-local" value={local} onChange={(e) => fromLocal(e.target.value)} />
      <div className="tb-group">
        <button className="tb" onClick={() => add('d', 1)} title={t('1 gün ileri')}>{t('+1g')}</button>
        <button className="tb" onClick={() => add('w', 1)} title={t('1 hafta ileri')}>{t('+1h')}</button>
        <button className="tb" onClick={() => add('m', 1)} title={t('1 ay ileri')}>{t('+1a')}</button>
        <button className="tb" onClick={() => add('y', 1)} title={t('1 yıl ileri')}>{t('+1y')}</button>
      </div>
      <button className="tb" onClick={() => onChange(Date.now())}>{t('Bugün')}</button>
    </div>
  )
}

/** Natal görünümde doğum saatini dakika dakika kaydırma (rektifikasyon) */
export function ShiftBar({ shift, onChange, baseTime, onApply, unknown }: { shift: number; onChange: (m: number) => void; baseTime: string; onApply: () => void; unknown?: boolean }) {
  const [h, m] = baseTime.split(':').map(Number)
  const mins = (((h * 60 + m + shift) % 1440) + 1440) % 1440
  const shown = `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`
  return (
    <div className="timebar">
      <span className="muted small" title={unknown ? t('Doğum saati bilinmiyor: burada seçilen saat yalnızca bir varsayımdır.') : undefined}>{unknown ? t('Varsayımsal saati incele') : t('Doğum saatini kaydır')}</span>
      <input id="shift" type="range" min={-180} max={180} step={1} value={shift} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="num">{shown}</span>
      <span className="muted small num">({shift > 0 ? '+' : ''}{shift} {t('dk')})</span>
      <div className="tb-group">
        <button className="tb" onClick={() => onChange(shift - 1)} title={t('1 dakika geri')}>−1</button>
        <button className="tb" onClick={() => onChange(shift + 1)} title={t('1 dakika ileri')}>+1</button>
      </div>
      {shift !== 0 && <>
        <button className="tb" onClick={() => onChange(0)}>{t('Sıfırla')}</button>
        <button className="tb accent" onClick={onApply} title={unknown ? t('Kayıt "saat bilinmiyor" olmaktan çıkar; yalnızca saat bir kaynaktan doğrulandıysa kullanın.') : undefined}>{unknown ? t('Doğum saati olarak kaydet') : t('Bu saati kaydet')}</button>
      </>}
    </div>
  )
}
