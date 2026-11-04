import { useState } from 'react'
import type { AspectType, Settings } from '@shared/types'
import { ASPECTS, AYANAMSAS, DEFAULT_SETTINGS, ORB_PROFILES } from '@shared/zodiac'
import { HOUSE_SYSTEMS } from '@shared/types'
import type { HouseSystem } from '@shared/types'

const OPTIONAL_POINTS: [string, string][] = [['chiron', 'Chiron'], ['lilith', 'Lilith (ortalama)'], ['northnode', 'Kuzey Ay Düğümü'], ['southnode', 'Güney Ay Düğümü'], ['fortune', 'Şans Noktası'], ['uranus', 'Uranüs'], ['neptune', 'Neptün'], ['pluto', 'Plüton']]

export default function SettingsModal({ initial, onClose, onSave, onAbout }: { initial: Settings; onClose: () => void; onSave: (s: Settings) => void; onAbout?: () => void }) {
  const [s, setS] = useState<Settings>(initial)
  const profile = s.orbProfileId === 'custom' ? s.customOrbs : ORB_PROFILES.find((p) => p.id === s.orbProfileId) ?? ORB_PROFILES[0]
  const editable = s.orbProfileId === 'custom'
  const setOrb = (t: AspectType, v: number) => setS({ ...s, customOrbs: { ...s.customOrbs, orbs: { ...s.customOrbs.orbs, [t]: v } } })
  const num = (v: string) => Math.max(0, Math.min(15, Number(v.replace(',', '.')) || 0))
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal wide" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <h2>Ayarlar</h2>
        <p className="hint" style={{ marginTop: -6 }}>Ayarlar bilgisayarınızda saklanır ve uygulama kapansa da korunur; arşivi dışa aktardığınızda yedeğe de dahil edilir.</p>

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

            <div className="cap">Yeni haritalar için varsayılanlar</div>
            <div className="row2">
              <label className="field"><span>Ev sistemi</span>
                <select id="s-hsys" value={s.defaultHouseSystem} onChange={(e) => setS({ ...s, defaultHouseSystem: e.target.value as HouseSystem })}>
                  {HOUSE_SYSTEMS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Ay düğümü</span>
                <select id="s-node" value={s.defaultNodeType} onChange={(e) => setS({ ...s, defaultNodeType: e.target.value as 'true' | 'mean' })}>
                  <option value="true">Gerçek düğüm</option>
                  <option value="mean">Ortalama düğüm</option>
                </select>
              </label>
            </div>

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
          {onAbout && <button className="link small" style={{ marginRight: 'auto' }} onClick={onAbout}>Hakkında ve lisanslar</button>}
          <button className="btn ghost" onClick={() => setS({ ...DEFAULT_SETTINGS, customOrbs: s.customOrbs })} title="Özel orb değerleriniz korunur">Varsayılanlara dön</button>
          <button className="btn ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" onClick={() => onSave(s)}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}
