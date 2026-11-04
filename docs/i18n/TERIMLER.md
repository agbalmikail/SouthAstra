# İngilizce çeviri: terim listesi ve kurallar

Bu dosya, SouthAstra arayüzünü İngilizceye çevirirken kullanılan ortak terimleri ve kuralları içerir.

## Kurallar

- Türkçe metin kodda kalır ve sözlük anahtarıdır: `t('Gezegenler')`. İngilizce karşılık `src/shared/i18n/en/<grup>.ts` içindedir.
- Değişkenli metin: şablon dizgesi yerine `t('{n} olay', { n })`. Anahtar ile İngilizce metindeki `{ad}` yer tutucuları aynı olmalı.
- Çevrilmez: kimlikler, nesne anahtarları, CSS sınıfları, localStorage anahtarları, IPC kanal adları, kod yorumları, `SHOTLOG` test günlükleri, `scripts/` altındaki test çıktıları.
- Tarih biçimi: `'tr-TR'` yerine `loc()` (`@shared/i18n`).
- Veri dizilerindeki adlar (burçlar, açılar, görünüm türleri…) okunduğu anda çevrilmeli: `get name() { return t('Koç') }`.
- Varsayılan dil Türkçe; Türkçe davranış ve testler değişmemeli.
- İngilizce: kısa, profesyonel, astrolojide yerleşik terimler. Tahmin dili yok ("is traditionally associated with…").

## Terimler

| Türkçe | English |
|---|---|
| Doğum haritası | Birth chart |
| Yükselen (AC) / Alçalan (DC) | Ascendant (AC) / Descendant (DC) |
| Gökyüzü ortası (MC) / IC | Midheaven (MC) / IC |
| Ev / Ev sistemi / Ev başlangıcı | House / House system / House cusp |
| Burç / Gezegen / Nokta | Sign / Planet / Point |
| Açı · Orb · Yaklaşan / Ayrılan | Aspect · Orb · Applying / Separating |
| Kavuşum, Karşıt, Kare, Üçgen, Altmışlık | Conjunction, Opposition, Square, Trine, Sextile |
| Quincunx, Yarım altmışlık, Yarım kare, Bir buçuk kare, Kuintil, Bikuintil | Quincunx, Semi-sextile, Semi-square, Sesquiquadrate, Quintile, Biquintile |
| Paralel / Kontraparalel | Parallel / Contraparallel |
| Retro (R) · Duraklama · DR / DD | Retrograde (R) · Station · SR / SD (station retrograde / direct) |
| Evinde, Yücelimde, Zararda, Düşüşte, Peregrine | Domicile, Exalted, Detriment, Fall, Peregrine |
| Üçlük, Sınır, Dekan | Triplicity, Term, Face (decan) |
| Esas dignite / Araz dignite | Essential dignity / Accidental dignity |
| Karşılıklı ağırlama · Dispozitör · Son dispozitör · Dispozitör döngüsü | Mutual reception · Dispositor · Final dispositor · Dispositor loop |
| Gündüz / gece haritası (sect) | Day / night chart (sect) |
| Arap noktaları · Şans noktası | Arabic parts (lots) · Part of Fortune |
| Ay düğümü · Kuzey / Güney Düğüm · gerçek / ortalama | Lunar node · North / South Node · true / mean |
| Transit · İkincil / Tersiyer / Minör progresyon · Solar arc | Transit · Secondary / Tertiary / Minor progression · Solar arc |
| Güneş dönüşü / Ay dönüşü | Solar return / Lunar return |
| Sinastri · Kompozit · Drakonik · Harmonik | Synastry · Composite · Draconic · Harmonic |
| Taşınma haritası · Astrokartografi | Relocated chart · Astrocartography |
| Orta noktalar · Tutulmalar · Sabit yıldızlar | Midpoints · Eclipses · Fixed stars |
| Doğum saati aralığı | Birth time range |
| Profeksiyon · Yılın yöneticisi · Firdaria | Profection · Lord of the year · Firdaria |
| Efemeris · Yıldız zamanı (YZ) | Ephemeris · Sidereal time (ST) |
| Boşluktaki Ay · Burç geçişi | Void-of-course Moon · Ingress |
| Ay evresi: Yeni Ay, Hilal, İlk dördün, Şişkin Ay, Dolunay, Yayılan Ay, Son dördün, Balsamik Ay | Lunar phase: New Moon, Crescent, First Quarter, Gibbous, Full Moon, Disseminating, Last Quarter, Balsamic |
| Ateş, Toprak, Hava, Su · Öncü, Sabit, Değişken | Fire, Earth, Air, Water · Cardinal, Fixed, Mutable |
| Kesinleşme · Etkinlik dönemi · Seri (2/3) | Exact (perfection) · Active period · Pass (2/3) |
| Kısa / Orta / Uzun (süre) | Short / Medium / Long |
| Kesin / Saate bağlı / Olası | Certain / Time-dependent / Possible |
| Öne çıkanlar · Öğren · Yorum · Yorum kütüphanesi | Highlights · Learn · Interpretation · Interpretation library |
| Seans · Danışan · Rodden derecesi | Session · Client · Rodden rating |
| Uyuyor / Kısmen / Uymuyor · Kontrol metni | Fits / Partly / Doesn't fit · Control text |
| Kör karşılaştırma | Blind comparison |
| Saat dilimi · Yaz saati · Yerel ortalama zaman | Time zone · Daylight saving time · Local mean time (LMT) |
| Simülasyon · Varsayımsal saat | Simulation · Hypothetical time |
| Yeni harita · Şu anın haritası · Hızlı arama · Araçlar · Ayarlar · Arşiv | New chart · Chart for now · Quick search · Tools · Settings · Archive |
| Kaydet · Vazgeç · Kapat · Düzenle · Sil | Save · Cancel · Close · Edit · Delete |
| Burçlar: Koç … Balık | Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces |
| Güneş, Ay, Merkür, Venüs, Mars, Jüpiter, Satürn, Uranüs, Neptün, Plüton | Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto |
