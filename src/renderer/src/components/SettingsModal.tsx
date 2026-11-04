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
              <label className="field"><span>Burç yöneticiliği</span>
                <select id="s-rul" value={s.rulership} onChange={(e) => setS({ ...s, rulership: e.target.value as 'modern' | 'traditional' })}>
                  <option value="modern">Modern (♅ Kova, ♆ Balık, ♇ Akrep)</option>
                  <option value="traditional">Geleneksel (yalnız yedi gezegen)</option>
                </select>
              </label>
            </div>
            <p className="hint">Burç yöneticiliği gezegen tablosundaki Evinde / Zararda etiketlerini belirler. Geleneksel analiz paneli, profeksiyon ve firdaria her zaman geleneksel yöneticileri kullanır.</p>

            <div className="cap">Karşılaştırmalı haritalar</div>
            <label className="field-row">Transit orbu <input id="s-torb" className="short" value={s.transitOrb} onChange={(e) => setS({ ...s, transitOrb: num(e.target.value) })} /><span>°</span></label>
            <label className="field-row">Progresyon / solar arc orbu <input id="s-porb" className="short" value={s.progressionOrb} onChange={(e) => setS({ ...s, progressionOrb: num(e.target.value) })} /><span>°</span></label>
            <label className="field-row">Sabit yıldız orbu <input id="s-sorb" className="short" value={s.fixedStarOrb} onChange={(e) => setS({ ...s, fixedStarOrb: num(e.target.value) })} /><span>°</span></label>
            <label className="inline"><input id="s-upd" type="checkbox" checked={s.updateCheck} onChange={(e) => setS({ ...s, updateCheck: e.target.checked })} /> Açılışta yeni sürümü denetle <span className="muted small">(GitHub'a istek gönderilir; kişisel veri gönderilmez)</span></label>
            <label className="inline"><input id="s-par" type="checkbox" checked={s.showParallels} onChange={(e) => setS({ ...s, showParallels: e.target.checked })} /> Paralel ve kontraparalelleri hesapla (1°)</label>

            <div className="cap">Gösterilecek noktalar</div>
            <p className="hint">İşareti kaldırılan noktalar çarkta, tablolarda ve açı listelerinde gösterilmez.</p>
            <div className="point-opts">
              <label className="inline"><input id="s-ast" type="checkbox" checked={s.asteroids} onChange={(e) => setS({ ...s, asteroids: e.target.checked })} /> Ana asteroitler: Ceres ⚳, Pallas ⚴, Juno ⚵, Vesta ⚶ <span className="muted small">(açılarında orb en fazla 3°)</span></label>
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

            <div className="cap">Çark görünümü</div>
            <label className="field-row">İşaret boyutu <span className="range-wrap"><input id="s-gs" type="range" min={0.8} max={1.4} step={0.05} value={s.appearance.glyphScale} onChange={(e) => setS({ ...s, appearance: { ...s.appearance, glyphScale: Number(e.target.value) } })} /><span className="num small">%{Math.round(s.appearance.glyphScale * 100)}</span></span></label>
            <label className="field-row">Açı çizgisi kalınlığı <span className="range-wrap"><input id="s-lw" type="range" min={0.6} max={2} step={0.1} value={s.appearance.aspectLineWidth} onChange={(e) => setS({ ...s, appearance: { ...s.appearance, aspectLineWidth: Number(e.target.value) } })} /><span className="num small">{s.appearance.aspectLineWidth.toFixed(1)}</span></span></label>
            <div className="point-opts">
              <label className="inline"><input id="s-deg" type="checkbox" checked={s.appearance.showDegrees} onChange={(e) => setS({ ...s, appearance: { ...s.appearance, showDegrees: e.target.checked } })} /> Gezegenlerin yanında derece</label>
              <label className="inline"><input id="s-asp" type="checkbox" checked={s.appearance.showAspectLines} onChange={(e) => setS({ ...s, appearance: { ...s.appearance, showAspectLines: e.target.checked } })} /> Açı çizgileri</label>
              <label className="inline"><input id="s-hn" type="checkbox" checked={s.appearance.showHouseNumbers} onChange={(e) => setS({ ...s, appearance: { ...s.appearance, showHouseNumbers: e.target.checked } })} /> Ev numaraları</label>
              <label className="inline"><input id="s-col" type="checkbox" checked={s.appearance.coloredSigns} onChange={(e) => setS({ ...s, appearance: { ...s.appearance, coloredSigns: e.target.checked } })} /> Burç işaretleri element renginde</label>
            </div>
            <p className="hint">Görünüm ayarları ekrandaki çarka ve PDF'e birlikte uygulanır.</p>
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
