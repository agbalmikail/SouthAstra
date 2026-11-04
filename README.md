<p align="center"><img src="build/icon.png" width="128" alt="SouthAstra logosu"></p>

<h1 align="center">SouthAstra</h1>

Profesyonel astrologlar için masaüstü astroloji programı. Mac ve Windows'ta çalışır. Arayüz Türkçe ve İngilizce.

Hesaplamalar, Astrodienst'in **Swiss Ephemeris** motoruyla yapılır (NASA JPL efemerislerine dayanır; astro.com ile aynı motor).

## Ekran görüntüleri

Görsellerdeki haritalar uydurma örneklerdir.

| | |
|---|---|
| ![Doğum haritası](docs/ekran/natal.png) | ![Transitler ve transit listesi](docs/ekran/transit.png) |
| **Doğum haritası** — çark, düz dille öne çıkanlar, hesaplama bilgileri | **Transitler** — natal ev, retrograd serisi, etkinlik dönemi ve satır açıklamasıyla transit listesi |
| ![Sinastri](docs/ekran/sinastri.png) | ![Geleneksel analiz](docs/ekran/geleneksel.png) |
| **Sinastri** — iki harita ve karşılıklı açılar | **Geleneksel analiz** — esas dignite tablosu, karşılıklı ağırlama, dispozitörler |
| ![Doğum yeri seçimi](docs/ekran/dogum-yeri.png) | ![Astrokartografi](docs/ekran/astrokartografi.png) |
| **Doğum yeri** — ülke / il / ilçe süzgeci, koordinat ve GeoNames kimliği | **Astrokartografi** — gezegen çizgileri ve şehir uzaklıkları |

<p align="center"><img src="docs/ekran/pdf-rapor.png" width="640" alt="PDF raporu"><br><b>PDF raporu</b> — kapak ve öne çıkanlar; bölümlü, sayfa numaralı A4 çıktı, teknik ek</p>

## Özellikler

**Yeni başlayanlar ve sunum**
- Öne çıkanlar: haritanın düz dille, kural tabanlı özeti (yapay zekâ yok; her maddede "neden öne çıktı" kuralı)
- Öğrenme modu: gezegen, burç, ev ve açıların geleneksel anlamları (tahmin içermez); transit satırlarında "Bu ne anlama geliyor?"
- Rapor türleri: Temel, Profesyonel, Öğrenme; teknik ekte efemeris, saat dilimi, orb ve doğrulama bilgileri

**Zamanlama**
- Transit listesi: natal ev, retrograd serileri (1/3, 2/3, 3/3), orba giriş–çıkış dönemleri, kısa/orta/uzun süre, kuralı yazılı önem sırası, PDF zaman çizelgesi
- Yıllık profeksiyon, firdaria (Abu Ma'shar veya Bonatti); efemeris tablosu, Ay'ın boşlukta olduğu dönemler ve burç geçişleri
- Taşınma haritası, dönüşlerin istenen yerde kurulması, yan yana iki çark

**Yorum kalitesi**
- Seans geri bildirimi (Uyuyor / Kısmen / Uymuyor) kontrol metinleriyle; "fazla genel olabilir" uyarısı
- Kör karşılaştırma: kimlik bilgisi olmayan sayfalarla, şans düzeyine karşı tam p-değeri

**Haritalar**
- Natal, drakonik, harmonik (4–16), astrokartografi (ACG dünya haritası, şehir–çizgi uzaklıkları)
- Transit, ikincil / tersiyer / minör progresyon, solar arc (çift çark)
- Güneş dönüşü, Ay dönüşü, sinastri, kompozit (orta nokta)
- 11 ev sistemi, tropikal veya sideral zodyak (Lahiri, Fagan/Bradley, Raman, KP ve diğerleri)
- Gezegenler, Chiron, Lilith, gerçek/ortalama Ay düğümleri, Şans Noktası (gündüz/gece), AC/MC/Vertex

**Analiz**
- Majör ve minör açılar, paralel/kontraparalel, ayarlanabilir orb profilleri (Standart, Dar, Geniş, Özel)
- Transit listesi: tam açı anları, duraklamalar ve burç geçişleri (dakika hassasiyetinde)
- Açı kalıpları: büyük üçgen, T-kare, büyük haç, Yod, uçurtma, mistik dikdörtgen, stelyum
- Esas dignite tablosu (ev, yücelim, üçlük, Mısır sınırları, Kalde dekanları; Lilly puanlaması), karşılıklı ağırlama, dispozitör zincirleri
- Orta nokta temasları (90° kadran), tutulmalar (doğum öncesi ve yaklaşanların natal temasları)
- Element/nitelik/yarımküre dağılımı, Ay evresi, sabit yıldız kavuşumları
- Ev sistemi karşılaştırması: hangi gezegenin evi değişiyor
- Gezegen detay paneli: ekliptik ve ekvatoral koordinatlar, hız, uzaklık, azimut/yükseklik, ondalık ev, JD (UT/TT), ΔT, eğim, yerel yıldız zamanı

**Doğum saati**
- Tarihsel saat dilimi ve yaz saati (IANA tz), belirsiz/atlanan saat uyarıları, LMT, elle ofset
- Saat bilinmiyorsa evler gizlenir, Ay'ın olası aralığı gösterilir
- Saat aralığı tablosu ve dakika dakika saat kaydırıcı (basit rektifikasyon)
- Rodden güvenilirlik derecesi

**Yer**
- Çevrimdışı veritabanı: dünyada 170 binden fazla yerleşim; Türkiye ve Almanya köy/semt düzeyinde
- Ülke ve il/eyalet süzgeci, GeoNames kimliği, konum doğruluğu, elle kesin koordinat
- Hesaplama öncesi doğrulama ekranı

**Danışan ve iş akışı**
- Kişisel yorum kütüphanesi: her etken için astrologun kendi metni; aynı etken başka haritada çıktığında otomatik gelir (hazır yorum metni yoktur)
- Seans notları ve hayat olayları (olaydan tek tıkla transit / progresyon / solar arc)
- Arşiv: etiketler, Rodden ve metin araması; günlük otomatik yedek (son 30 gün); JSON dışa/içe aktarma
- Bölümlü A4 PDF raporu: harita ve özet, konumlar, açılar, analiz, transit listesi, yorumlar, notlar; sayfa numaralı
- Görünüm ayarı: istenmeyen noktaları (Chiron, Lilith, düğümler…) gizleme
- Klavye kısayolları: ⌘K hızlı arama (harita, görünüm, araç, komut), ⌘F arşivde filtrele, ⌘N yeni, ⌘T şu an, ⌘E düzenle, ⌘L yorum kütüphanesi, ⌘P PDF, ⇧⌘C çarkı resim olarak kopyala, ⇧⌘E efemeris, ⌘, ayarlar
- Türkçe ve İngilizce arayüz ve rapor
- Gece Profesyonel (koyu) ve Sade Profesyonel (açık) tema

## Doğruluk

Hesaplamalar Swiss Ephemeris'ten bağımsız kaynaklarla düzenli olarak karşılaştırılır. Sonuçlar GitHub'daki otomatik derlemede her sürümde yeniden çalışır.

- **`npm run dogrula`** — [bağımsız doğrulama raporu](docs/dogrulama/RAPOR.md): NASA JPL Horizons (DE441) referansıyla gezegenler, Ay ve Chiron (görünür ve astrometrik, TT ve UT), toposentrik Ay, progresyonlar ve transit kesinleşme anları; Meeus formülleriyle (Swiss Ephemeris kullanılmadan) yıldız zamanı, ASC, MC ve 7 ev sistemi; ortalama düğüm; açılar; saat dilimleri ayrı bir tzdata uygulamasıyla. 1959, 1988, 1990'dan üç referans haritada 94 kontrolün tamamı geçer; gezegenlerde en büyük fark 0,2″. [Yöntem](docs/dogrulama/README.md)
- **`npm run verify`** — 170'i aşkın test: saat dilimleri ve yaz saati, ev sistemleri, dönüşler, transitler, progresyonlar, sideral, tutulmalar, saat bilinmeyen haritaların Ay belirsizliği, saat duyarlılığı, geleneksel yöntemler ([kurallar ve elle türetilmiş örnekler](docs/dogrulama/GELENEKSEL.md): Lilly dignite puanları, karşılıklı ağırlama, Arap noktaları, SIMBAD ile sabit yıldızlar, firdaria).
- **`npm run denetim`** — örnek bir haritadaki her değer: 12 cismin konumu NASA JPL ile, hızlar sayısal türevle, 11 ev sisteminin bütün başlangıçları ders kitabı formülleriyle, bütün açılar.
- **Uygulamada:** "NASA JPL ile karşılaştır" düğmesi bir haritanın kendi gezegenlerini Horizons'a sorar ve sonucu PDF'in teknik ekine tablo olarak ekler (yalnızca tarih ve saat gönderilir).

Gerçek (oskülatör) Ay düğümü için bağımsız bir referans bulunamadı; doğrulanmış sayılmaz.

Saat dilimi kayıtlarının geçmişi bazı ülkeler ve yıllar için tartışmalıdır. 1985 öncesi Türkiye bunlardan biridir. Program kullandığı ofseti her haritada gösterir, gerekirse elle düzeltilebilir.

## Kurulum (kullanıcılar için)

Hazır kurulum dosyaları GitHub'daki **[Releases](https://github.com/agbalmikail/SouthAstra/releases)** sayfasındadır. Yeni bir sürüm yayınlandığında uygulama açılışta bunu bildirir ve indirme bağlantısı sunar (Ayarlar'dan kapatılabilir).

- **Mac:** `.dmg` dosyasını açın ve SouthAstra'yı Uygulamalar klasörüne sürükleyin. Uygulama imzalı olmadığı için ilk açılışta uygulamaya sağ tıklayın ve **Aç**'ı seçin.
- **Windows:** `.exe` dosyasını çalıştırın. "Windows bilgisayarınızı korudu" uyarısı çıkarsa **Ek bilgi → Yine de çalıştır**'a tıklayın.

## Geliştirme

```bash
npm install
npm run dev        # geliştirme modunda aç
npm run verify     # doğruluk testleri
npm run denetim    # örnek haritada her değerin bağımsız denetimi
npm run icon       # build/icon.svg → build/icon.png
npm run dist:mac   # Mac kurulum dosyası (dist/)
npm run dist:win   # Windows kurulum dosyası (dist/)
```

Bir sürüm etiketi gönderildiğinde (`git tag v0.1.0 && git push --tags`) GitHub, Mac ve Windows kurulum dosyalarını otomatik üretir.

Yer veritabanını yenilemek için GeoNames'ten `cities1000.txt`, `TR.txt`, `admin1CodesASCII.txt`, `admin2Codes.txt` ve `countryInfo.txt` dosyalarını bir klasöre indirin, sonra `node scripts/build-cities.mjs <klasör>` komutunu çalıştırın.

## Lisans

© 2026 SouthAstra katkıcıları.

SouthAstra, **GNU Affero General Public License v3.0** (AGPL-3.0) ile lisanslanmıştır. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

Kullanılan kaynaklar:

- **Swiss Ephemeris** © Astrodienst AG, Zürih. AGPL-3.0 ile kullanılmaktadır. https://www.astro.com/swisseph/
- **GeoNames** yer verisi, CC BY 4.0. https://www.geonames.org/
- **Natural Earth** dünya haritası verisi, kamu malı. https://www.naturalearthdata.com/
- **IBM Plex** ve **Noto Sans Symbols** yazı tipleri, SIL Open Font License 1.1

Bütün üçüncü taraf bileşenlerin lisans metinleri [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) dosyasındadır; uygulamada **Hakkında** penceresinden de görülebilir.
