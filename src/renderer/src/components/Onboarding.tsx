import { useEffect, useState } from 'react'
import type { HouseSystem, Settings } from '@shared/types'
import { HOUSE_SYSTEMS } from '@shared/types'
import { ORB_PROFILES } from '@shared/zodiac'
import { kbd } from '../platform'
import logoMark from '../assets/logo-mark.svg'

/** İlk açılış rehberi: ne olduğu, verilerin yeri, temel ayarlar, nasıl kullanılır */
export default function Onboarding({ settings, onSaveSettings, onNewChart, onNowChart, onClose }: {
  settings: Settings
  onSaveSettings: (s: Settings) => Promise<void>
  onNewChart: () => void
  onNowChart: () => void
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [s, setS] = useState(settings)
  const [dataDir, setDataDir] = useState('')
  useEffect(() => { window.southastra.info().then((i) => setDataDir(i.dataDir)).catch(() => undefined) }, [])
  const next = async () => {
    if (step === 1 && JSON.stringify(s) !== JSON.stringify(settings)) await onSaveSettings(s)
    setStep(step + 1)
  }
  const STEPS = ['Hoş geldiniz', 'Temel ayarlar', 'Nasıl çalışır', 'Başlayalım']
  return (
    <div className="modal-back">
      <div className="modal onboarding" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <div className="ob-steps">{STEPS.map((t, i) => <span key={t} className={i === step ? 'on' : i < step ? 'done' : ''}>{i + 1}. {t}</span>)}</div>

        {step === 0 && (
          <div className="ob-body">
            <div className="ob-brand"><img src={logoMark} alt="" /><span>South<b>Astra</b></span></div>
            <p>Profesyonel astrologlar için açık kaynaklı bir masaüstü programı. Konumlar Swiss Ephemeris ile hesaplanır, NASA JPL değerleriyle ve bağımsız formüllerle düzenli olarak doğrulanır.</p>
            <ul className="ob-list">
              <li><b>Verileriniz bu bilgisayarda kalır.</b> Haritalar, notlar ve yorumlarınız hiçbir sunucuya gönderilmez. İnternet yalnızca isteğe bağlı adres araması ve sürüm denetimi için kullanılır.</li>
              <li><b>Hazır yorum yoktur.</b> Yorumları kendi kütüphanenize siz yazarsınız; program onları ilgili haritalarda size gösterir.</li>
              <li><b>Her değer açıktır.</b> Bir gezegene tıklayınca boylam, hız, deklinasyon, Jülyen günü ve kullanılan saat dilimi kuralı görünür.</li>
            </ul>
            {dataDir && <p className="hint">Kayıtların klasörü: <span className="num">{dataDir}</span> · her gün otomatik yedek alınır.</p>}
          </div>
        )}

        {step === 1 && (
          <div className="ob-body">
            <p>Bu seçimler yeni haritalar için varsayılan olur. Hepsi daha sonra Ayarlar'dan ({kbd(',')}) değiştirilebilir; her harita için ev sistemi ayrıca seçilebilir.</p>
            <div className="ob-grid">
              <label className="field"><span>Zodyak</span>
                <select id="ob-zod" value={s.zodiac} onChange={(e) => setS({ ...s, zodiac: e.target.value as Settings['zodiac'] })}>
                  <option value="tropical">Tropikal</option>
                  <option value="sidereal">Sideral (ayanamsa Ayarlar'dan)</option>
                </select>
              </label>
              <label className="field"><span>Ev sistemi</span>
                <select id="ob-hsys" value={s.defaultHouseSystem} onChange={(e) => setS({ ...s, defaultHouseSystem: e.target.value as HouseSystem })}>
                  {HOUSE_SYSTEMS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Orb profili</span>
                <select id="ob-orb" value={s.orbProfileId} onChange={(e) => setS({ ...s, orbProfileId: e.target.value })}>
                  {ORB_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Burç yöneticiliği</span>
                <select id="ob-rul" value={s.rulership} onChange={(e) => setS({ ...s, rulership: e.target.value as Settings['rulership'] })}>
                  <option value="modern">Modern (♅ ♆ ♇ dahil)</option>
                  <option value="traditional">Geleneksel (yedi gezegen)</option>
                </select>
              </label>
              <label className="field"><span>Ay düğümü</span>
                <select id="ob-node" value={s.defaultNodeType} onChange={(e) => setS({ ...s, defaultNodeType: e.target.value as 'true' | 'mean' })}>
                  <option value="true">Gerçek düğüm</option>
                  <option value="mean">Ortalama düğüm</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-body">
            <ol className="ob-list">
              <li><b>Yeni harita</b> ({kbd('N')}): doğum yerini yazın ve listeden seçin, ya da Google Haritalar'dan koordinat yapıştırın. Saat dilimi ve o tarihteki yaz saati kuralı otomatik bulunur; ekranda gösterilir.</li>
              <li><b>Harita türü</b>: üstteki seçiciden natal, transit, progresyon, dönüşler, sinastri, kompozit, astrokartografi ve diğerleri. Yanındaki seçiciyle ikinci bir çarkı yan yana açabilirsiniz.</li>
              <li><b>Çark</b>: gezegene tıklayınca açıları öne çıkar ve tüm hesap ayrıntıları sağ panelde açılır. ⌘ / Ctrl + tekerlek ile yakınlaşır.</li>
              <li><b>Hızlı arama</b> ({kbd('K')}): harita, görünüm, araç veya komut adını yazıp Enter'a basın.</li>
              <li><b>Araçlar</b> menüsü: geleneksel analiz, profeksiyon ve firdaria, orta noktalar, tutulmalar, saat aralığı, seans notları. Efemeris ({kbd('E', { shift: true })}) kenar çubuğunun altındadır.</li>
              <li><b>PDF</b> ({kbd('P')}): hangi bölümlerin gireceğini seçersiniz; danışana verilecek çıktıda notlar varsayılan olarak kapalıdır.</li>
            </ol>
          </div>
        )}

        {step === 3 && (
          <div className="ob-body ob-start">
            <p>Hazırsınız. Bu rehberi istediğiniz zaman Yardım menüsünden yeniden açabilirsiniz.</p>
            <div className="ob-actions">
              <button className="btn primary" onClick={() => { onClose(); onNewChart() }}>İlk haritayı oluştur</button>
              <button className="btn ghost" onClick={() => { onClose(); onNowChart() }}>Şu anın haritasıyla dene</button>
            </div>
          </div>
        )}

        <div className="actions">
          <button className="btn ghost" onClick={onClose}>{step === 3 ? 'Kapat' : 'Atla'}</button>
          {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Geri</button>}
          {step < 3 && <button className="btn primary" autoFocus onClick={() => { void next() }}>İleri</button>}
        </div>
      </div>
    </div>
  )
}
