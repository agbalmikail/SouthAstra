# Geleneksel yöntemler: kullanılan kurallar ve testleri

Gezegen boylamlarının doğru olması, geleneksel tekniklerin doğru olduğu anlamına gelmez; formül ve ekol kuralı ayrıca sınanmalıdır. Aşağıdaki her kural `scripts/verify.ts` içinde, beklenen sonucu **yayımlanmış tablolardan elle türetilmiş** örneklerle test edilir. Beklenen değerler programdan alınmaz, testin içine yazılıdır.

## Esas dignite (puanlama)

| Konu | Kural | Kaynak |
|---|---|---|
| Puanlar | Ev +5, yücelim +4, üçlük +3, sınır +2, dekan +1; zarar −5, düşüş −4; hiçbir olumlu esas dignitesi yoksa peregrine −5 (cezalar birlikte sayılır) | William Lilly, *Christian Astrology* (1647), "Table of the Essential Dignities" |
| Sınırlar | Mısır sınırları (Ptolemaios'un aktardığı); her gezegenin toplamı Satürn 57, Jüpiter 79, Mars 66, Venüs 82, Merkür 76 derece | Ptolemaios, *Tetrabiblos* I.21 |
| Dekanlar | Kalde sırası (Koç 0° Mars'tan başlar: Mars, Güneş, Venüs, Merkür, Ay, Satürn, Jüpiter) | Lilly; geleneksel |
| Üçlükler | Lilly'nin iki yöneticili sistemi: ateş Güneş/Jüpiter, toprak Venüs/Ay, hava Satürn/Merkür, su Mars (gündüz ve gece) | Lilly |
| Gündüz/gece | Güneş ufkun üstündeyse gündüz. Doğum saati bilinmiyorsa belirlenmez; kullanıcı varsayım seçer ve bu raporda yazılır | — |

Elle hesaplanmış test örnekleri:

| Konum | Beklenen | Hesap |
|---|---|---|
| Güneş 15° Aslan, gündüz | +8 | ev +5, üçlük +3; sınır Satürn, dekan Jüpiter |
| Mars 5° Oğlak, gece | +4 | yücelim +4; üçlük Ay, sınır Merkür, dekan Jüpiter |
| Venüs 3° Başak, gündüz | −1 | düşüş −4, üçlük +3 |
| Satürn 25° Koç, gece | −2 | düşüş −4, sınır (25–30 Satürn) +2 |
| Ay 20° Yay, gece | −5 | peregrine: üçlük Jüpiter, sınır Merkür, dekan Satürn |
| Jüpiter 10° İkizler, gündüz | −3 | zarar −5, sınır (6–12 Jüpiter) +2 |

## Karşılıklı ağırlama ve dispozitörler

- **Karşılıklı ağırlama:** iki gezegen birbirinin ev burcunda (ev ile), yücelim burcunda (yücelim ile) ya da biri ev öteki yücelim (karma). Yalnızca yedi geleneksel gezegen.
- **Dispozitör zinciri:** her gezegenden burç yöneticisine gidilir; geleneksel (7 gezegen) veya modern (Akrep Plüton, Kova Uranüs, Balık Neptün).
- **Dispozitör döngüsü:** üç ya da daha çok gezegenin kapalı zinciri; karşılıklı ağırlama olarak adlandırılmaz.

Test örnekleri: Venüs Koç / Mars Boğa (ev ile); Mars Yengeç / Jüpiter Oğlak (yücelim ile); Ay Koç / Mars Boğa (karma); Venüs Aslan / Güneş İkizler (yok); Venüs Yay → Jüpiter Koç → Mars Terazi → Venüs (3 gezegenli döngü).

## Arap noktaları (Hermetik noktalar)

Paulus Alexandrinus, *Eisagogika* bölüm 23. Gündüz AC + A − B; gece fark ters (AC + B − A).

| Nokta | Gündüz |
|---|---|
| Şans (Fortuna) | AC + Ay − Güneş |
| Ruh (Daimon) | AC + Güneş − Ay |
| Eros | AC + Venüs − Ruh |
| Zorunluluk (Ananke) | AC + Şans − Merkür |
| Cesaret (Tolma) | AC + Şans − Mars |
| Zafer (Nike) | AC + Jüpiter − Ruh |
| Nemesis | AC + Şans − Satürn |

Test: gündüz ve gece haritasında yedi noktanın tamamı bu formüllerle bağımsız yeniden hesaplanır (fark 0,0000″).

## Sabit yıldızlar

- Konumlar Swiss Ephemeris yıldız kataloğundan (sefstars.txt, Hipparcos tabanlı), özhareket ve presesyonla tarihe taşınır.
- Test: 8 parlak yıldızın (Aldebaran, Regulus, Spica, Antares, Sirius, Fomalhaut, Vega, Algol) J2000 ICRS konumları SIMBAD değerleriyle karşılaştırılır (en büyük fark 0,24″, sınır 1″).
- Kavuşum kuralı: yalnızca ekliptik boylam farkı (enlem dikkate alınmaz), sınır Ayarlar'daki sabit yıldız orbu (varsayılan 1°). Bu, yıldızı ekliptiğe "dik iz düşüm" ile değerlendirmek demektir; bazı ekoller paran ya da enlemli yöntem kullanır, SouthAstra kullanmaz.

## Firdaria

- Abu Ma'shar: gezegen yılları Güneş 10, Venüs 8, Merkür 13, Ay 9, Satürn 11, Jüpiter 12, Mars 7, Kuzey Düğüm 3, Güney Düğüm 2 (toplam 75).
- Gündüz sırası Güneş'ten, gece sırası Ay'dan Kalde sırasıyla; gece haritasında düğümler yedi gezegenden sonra (Abu Ma'shar) ya da Mars'tan sonra (Bonatti), seçilebilir.
- Alt dönemler: her gezegen dönemi 7 eşit parça, dönemin yöneticisinden başlayıp Kalde sırasıyla; düğüm dönemlerinin alt dönemi yok.
- Dönemler doğum gününde (takvim yıl dönümü) başlar; alt dönem sınırları tropikal yıl oranıyla bölünür.

Test: gündüz, gece (Abu Ma'shar) ve gece (Bonatti) için bütün dönemlerin başlangıç yaşları elle hesaplanmış listelerle; Merkür döneminin 7 alt dönemi ve 13/7 yıllık süresi.

## Yıllık profeksiyon

Yükselen burç her doğum gününde bir burç ilerler (tüm burç evleri); yılın yöneticisi o burcun geleneksel yöneticisi. Test: 0 ve 12 yaşta yükselen burç, 13 yaşta 2. ev; yıl başlangıcı doğum günü.
