import { useEffect, useState } from 'react'
import logoMark from '../assets/logo-mark.svg'
import { t } from '@shared/i18n'

const REPO = 'https://github.com/agbalmikail/SouthAstra'

/** Hakkında: sürüm, kaynak kodu (AGPL gereği), veri kaynakları ve tüm lisans metinleri */
export default function AboutModal({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<{ version: string; sweph: string; platform: string } | null>(null)
  const [docs, setDocs] = useState<{ license: string; thirdParty: string } | null>(null)
  const [show, setShow] = useState<'' | 'third' | 'agpl'>('')
  useEffect(() => {
    window.southastra.info().then(setInfo)
    window.southastra.notices().then(setDocs)
  }, [])
  const link = (url: string, text: string) => <button className="link" onClick={() => window.southastra.openExternal(url)}>{text}</button>
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal wide about" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <div className="about-head">
          <img src={logoMark} alt={t('SouthAstra logosu')} className="about-logo" />
          <div>
            <h2>South<b>Astra</b></h2>
            <p className="muted small">{t('Sürüm')} {info?.version ?? '…'} · Swiss Ephemeris {info?.sweph ?? '…'}</p>
          </div>
        </div>
        <p>{t('Profesyonel astrologlar için açık kaynaklı astroloji programı.')} <b>GNU Affero General Public License v3.0</b> (AGPL-3.0) {t('ile lisanslanmıştır: programı kullanabilir, inceleyebilir, değiştirebilir ve aynı lisansla paylaşabilirsiniz.')}</p>
        <p className="small">{t('Kaynak kodu:')} {link(REPO, REPO.replace('https://', ''))}</p>
        <div className="cap">{t('Kullanılan veriler')}</div>
        <ul className="mini-list about-list">
          <li><b>Swiss Ephemeris</b> © Astrodienst AG, Zürih — AGPL-3.0 · {link('https://www.astro.com/swisseph/', 'astro.com/swisseph')}</li>
          <li><b>GeoNames</b> {t('yer verisi')} — CC BY 4.0 · {link('https://www.geonames.org/', 'geonames.org')}</li>
          <li><b>Natural Earth</b> {t('harita verisi')} — {t('kamu malı')} · {link('https://www.naturalearthdata.com/', 'naturalearthdata.com')}</li>
          <li><b>IANA</b> {t('saat dilimi veritabanı')} — {t('kamu malı')}</li>
          <li><b>OpenStreetMap</b> {t('(yalnızca isteğe bağlı adres aramasında)')} — ODbL · {link('https://www.openstreetmap.org/copyright', 'openstreetmap.org/copyright')}</li>
          <li><b>IBM Plex</b> {t('ve')} <b>Noto Sans Symbols</b> {t('yazı tipleri')} — SIL Open Font License 1.1</li>
        </ul>
        <div className="toolbar">
          <button className={show === 'third' ? 'btn primary small-btn' : 'btn ghost small-btn'} onClick={() => setShow(show === 'third' ? '' : 'third')}>{t('Üçüncü taraf lisansları')}</button>
          <button className={show === 'agpl' ? 'btn primary small-btn' : 'btn ghost small-btn'} onClick={() => setShow(show === 'agpl' ? '' : 'agpl')}>{t('AGPL-3.0 lisans metni')}</button>
        </div>
        {show && <pre className="license-text">{show === 'third' ? docs?.thirdParty : docs?.license}</pre>}
        <p className="muted small">{t('Bu program hiçbir garanti olmaksızın sunulur. Hesaplamaların doğruluğu NASA JPL Horizons ve astronomi literatürüyle sınanmıştır; yorum ve kararlar kullanıcıya aittir.')}</p>
        <div className="actions"><button className="btn primary" onClick={onClose}>{t('Kapat')}</button></div>
      </div>
    </div>
  )
}
