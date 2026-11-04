import { useState } from 'react'
import type { AspectType, Settings } from '@shared/types'
import { ASPECTS, AYANAMSAS, ORB_PROFILES } from '@shared/zodiac'

const OPTIONAL_POINTS: [string, string][] = [['chiron', 'Chiron'], ['lilith', 'Lilith (ortalama)'], ['northnode', 'Kuzey Ay Düğümü'], ['southnode', 'Güney Ay Düğümü'], ['fortune', 'Şans Noktası'], ['uranus', 'Uranüs'], ['neptune', 'Neptün'], ['pluto', 'Plüton']]

export default function SettingsModal({ initial, onClose, onSave }: { initial: Settings; onClose: () => void; onSave: (s: Settings) => void }) {
  const [s, setS] = useState<Settings>(initial)
  const profile = s.orbProfileId === 'custom' ? s.customOrbs : ORB_PROFILES.find((p) => p.id === s.orbProfileId) ?? ORB_PROFILES[0]
  const editable = s.orbProfileId === 'custom'
  const setOrb = (t: AspectType, v: number) => setS({ ...s, customOrbs: { ...s.customOrbs, orbs: { ...s.customOrbs.orbs, [t]: v } } })
  const num = (v: string) => Math.max(0, Math.min(15, Number(v.replace(',', '.')) || 0))
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal wide" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <h2>Ayarlar</h2>

        <div className="settings-grid">
          <section>
            <div className="cap">Zodyak</div>
            <div className="seg">
              <label><input type="radio" name="z" checked={s.zodiac === 'tropical'} onChange={() => setS({ ...s, zodiac: 'tropical' })} />Tropikal</label>
              <label><input type="radio" name="z" checked={s.zodiac === 'sidereal'} onChange={() => setS({ ...s, zodiac: 'sidereal' })} />Sideral</label>
            </div>
            {s.zodiac === 'sidereal' && (
              <label className="field" style={{ marginTop: 8 }}>
                <span>Ayanamsa</span>
                <select id="s-aya" value={s.ayanamsa} onChange={(e) => setS({ ...s, ayanamsa: Number(e.target.value) })}>
                  {AYANAMSAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
            )}

            <div className="cap">Karşılaştırmalı haritalar</div>
            <label className="field-row">Transit orbu <input id="s-torb" className="short" value={s.transitOrb} onChange={(e) => setS({ ...s, transitOrb: num(e.target.value) })} />°</label>
            <label className="field-row">Progresyon / solar arc orbu <input id="s-porb" className="short" value={s.progressionOrb} onChange={(e) => setS({ ...s, progressionOrb: num(e.target.value) })} />°</label>
            <label className="field-row">Sabit yıldız orbu <input id="s-sorb" className="short" value={s.fixedStarOrb} onChange={(e) => setS({ ...s, fixedStarOrb: num(e.target.value) })} />°</label>
            <label className="inline"><input id="s-par" type="checkbox" checked={s.showParallels} onChange={(e) => setS({ ...s, showParallels: e.target.checked })} /> Paralel ve kontraparalelleri hesapla (1°)</label>

            <div className="cap">Gösterilecek noktalar</div>
            <p className="hint">İşareti kaldırılan noktalar çarkta, tablolarda ve açı listelerinde gösterilmez.</p>
            <div className="point-opts">
              {OPTIONAL_POINTS.map(([id, name]) => (
                <label key={id} className="inline"><input type="checkbox" checked={!s.hiddenPoints.includes(id)} onChange={(e) => setS({ ...s, hiddenPoints: e.target.checked ? s.hiddenPoints.filter((x) => x !== id) : [...s.hiddenPoints, id] })} /> {name}</label>
              ))}
            </div>
          </section>

          <section>
            <div className="cap">Natal orb profili</div>
            <select id="s-prof" value={s.orbProfileId} onChange={(e) => setS({ ...s, orbProfileId: e.target.value })}>
              {ORB_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="custom">Özel (kendi değerlerim)</option>
            </select>
            <table className="data orb-table">
              <thead><tr><th>Açı</th><th className="r">Orb</th></tr></thead>
              <tbody>
                {ASPECTS.map((a) => (
                  <tr key={a.type}>
                    <td><span className={`asp-g ${a.type}`}>{a.glyph}</span> {a.name} <span className="muted small">{a.angle}°</span></td>
                    <td className="r">
                      {editable
                        ? <input className="short" value={profile.orbs[a.type] ?? 0} onChange={(e) => setOrb(a.type, num(e.target.value))} />
                        : <span className="num">{profile.orbs[a.type] ?? '—'}°</span>}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>Güneş ve Ay için ek orb</td>
                  <td className="r">
                    {editable
                      ? <input className="short" value={s.customOrbs.luminaryBonus} onChange={(e) => setS({ ...s, customOrbs: { ...s.customOrbs, luminaryBonus: num(e.target.value) } })} />
                      : <span className="num">+{profile.luminaryBonus}°</span>}
                  </td>
                </tr>
              </tbody>
            </table>
            {!editable && <p className="hint">Değerleri değiştirmek için “Özel” profili seçin.</p>}
          </section>
        </div>

        <div className="actions">
          <button className="btn ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" onClick={() => onSave(s)}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}
