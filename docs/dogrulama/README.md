# Bağımsız astronomik doğrulama

SouthAstra'nın hesapları Swiss Ephemeris ile yapılır. Bu klasördeki rapor, hesapları **Swiss Ephemeris'ten bağımsız kaynaklarla** karşılaştırır. Program çalışırken hiçbir dış servise bağlanmaz; referans verileri bir kez alınıp sabit dosyalara kaydedilir.

## Kaynaklar

| Ne | Bağımsız referans | Dosya |
|---|---|---|
| Gezegenler, Ay, Chiron (görünür ekliptik TT ve UT; astrometrik RA/Dec; toposentrik Ay) | NASA JPL Horizons (DE441 ve uydu/küçük cisim çözümleri; sürümler rapor başında) | `tests/reference/jpl.json` |
| Progresyonlar, transit kesinleşme anları | NASA JPL Horizons, SouthAstra'nın bulduğu anlarda | `tests/reference/jpl.json` |
| Yıldız zamanı, ekliptik eğimi, nütasyon, ASC, MC, 7 ev sistemi | Meeus, *Astronomical Algorithms* (2. baskı) formülleri, Swiss Ephemeris kullanılmadan | `scripts/validate/independent.ts` |
| Ortalama Ay düğümü | Meeus 47.7 | aynı |
| Gerçek (oskülatör) Ay düğümü | NASA JPL Horizons'tan Ay'ın yer merkezli konum ve hız vektörü (ICRF); yörünge normali h = r × v, IAU 1976 presesyon + IAU 1980 nütasyonla günün ekliptiğine taşınır, düğüm = atan2(hₓ, −h_y). Sınır 2″: yörünge ekliptiğe 5° eğik olduğundan normaldeki küçük model farkları düğümde ~11 kat büyür | `tests/reference/jpl.json`, `scripts/validate/independent.ts` |
| Açılar | NASA konumlarından yeniden hesap | aynı betik |
| Tarihsel saat dilimleri | Python `zoneinfo` + işletim sistemi tzdata (SouthAstra luxon + ICU kullanır) | `tests/reference/tz.json` |

## Çalıştırma

```
npm run dogrula                        # çevrimdışı karşılaştırma → docs/dogrulama/RAPOR.md
python3 scripts/validate/fetch_jpl.py  # referansı NASA'dan yeniden al (internet gerekir)
python3 scripts/validate/fetch_tz.py   # saat dilimi referansını yeniden üret
```

`npm run dogrula` önce gerekli sorguları `tests/reference/requests.json`'a yazar. Referans dosyası yoksa ilgili bölüm başarılı değil **DOĞRULANMADI** olarak raporlanır.

## Tutarlılık

`python3 scripts/validate/consistency.py` saklanan referansları NASA'dan canlı olarak yeniden ister ve karşılaştırır: referans dosyasından rastgele kayıtlar, `audit.ts` ve `verify.ts` içindeki elle yazılmış NASA değerleri, iki dosyada birden bulunan aynı anlar. Sonuç: [TUTARLILIK.md](TUTARLILIK.md).

## Raporda ve uygulamada

- **PDF teknik eki** referans haritalardaki NASA karşılaştırmasının özetini yazar: kontrol sayısı, en büyük farklar, Horizons sürümü ve efemeris kaynakları, referansın alındığı tarih, `tests/reference/jpl.json` dosyasının SHA-256 parmak izi ve bu raporun adresi. Parmak izi, raporu okuyan kişinin aynı referans dosyasıyla sonucu yeniden üretebilmesi içindir.
- **Haritanın kendisi için:** uygulamada "Hesaplama bilgileri" altındaki *NASA JPL ile karşılaştır* düğmesi o haritanın 11 cismini Horizons'a sorar ve sonucu kayda yazar; PDF teknik ekinde cisim cisim NASA değeri, SouthAstra değeri ve farkı tablo olarak çıkar. Doğum bilgisi değişirse sonuç geçersiz sayılır. NASA'ya yalnızca Jülyen günü (UT) ve cisim numarası gider.
- **Geleneksel yöntemler** (dignite puanları, karşılıklı ağırlama, dispozitör döngüleri, Arap noktaları, sabit yıldızlar, firdaria, profeksiyon) için kullanılan kurallar ve elle türetilmiş test örnekleri: [GELENEKSEL.md](GELENEKSEL.md).

## Kişisel haritalar

Gerçek doğum verileri depoya girmez. `local/validate-charts.json` (git dışında) varsa:

```
npm run dogrula:yerel
python3 scripts/validate/fetch_jpl.py --local
npm run dogrula:yerel                  # → local/DOGRULAMA.md
```

NASA'ya bu sorgularda yalnızca Jülyen günü ve cisim numarası gider; ad gönderilmez.

## Sınırlar

Gezegenler 1″, Chiron 3″, toposentrik Ay 2″, köşeler ve evler 5″, ortalama düğüm 3″, transit ve progresyon 1,5″. Başarısız bir kontrolde rapor beklenen değeri, hesaplanan değeri, farkı ve kullanılan parametreleri (JD TT/UT1, RAMC, ε) yazar.
