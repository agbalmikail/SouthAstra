# SouthAstra · bağımsız astronomik doğrulama

Oluşturuldu: 2026-11-04T13:57:32.412Z · Swiss Ephemeris 2.10.03 (sepl_18/semo_18; JPL DE431 tabanlı Swiss Ephemeris dosyaları) · Node ICU tzdata 2026a

## Referans: NASA JPL Horizons

- **Horizons API**: NASA/JPL Horizons API 1.2
- **Efemeris kaynakları (Horizons)**: {"Sun (10)":"DE441","Earth (399)":"DE441","Moon (301)":"DE441","Mercury (199)":"DE441","Venus (299)":"DE441","Mars (499)":"mar099","Jupiter (599)":"jup365_merged","Saturn (699)":"sat441l","Uranus (799)":"ura184_merged","Neptune (899)":"nep098_merged","Pluto (999)":"plu060_merged","2060 Chiron (1977 UB)":"JPL#171"}
- **Alındı**: 2026-11-04T12:45:16+00:00
- **Ayarlar**: Q31: gözlemci ekliptik boylam/enlem (görünür, günün ekliptiği ve ekinoksu); Q1: astrometrik RA/Dec (ICRF); CENTER 500@399 (yer merkezi) veya coord@399; TIME_TYPE TT/UT; EXTRA_PREC
- **Sorgu sayısı**: 175

## Eşitlenen ayarlar

| Karşılaştırma | NASA JPL Horizons | Swiss Ephemeris / SouthAstra |
|---|---|---|
| Görünür ekliptik, TT | QUANTITIES=31 (gözlemci ekliptik boylam/enlem, görünür, günün ekliptiği ve ekinoksu, nütasyon dahil), CENTER=500@399 (yer merkezi), TIME_TYPE=TT | `swe_calc(jd_TT, SEFLG_SWIEPH)` — görünür, gerçek ekinoks, nütasyon dahil, yer merkezi |
| Görünür ekliptik, UT (uygulamanın kendisi) | aynı, TIME_TYPE=UT | SouthAstra harita çıktısı (`swe_calc_ut`, UT1; ΔT Swiss Ephemeris modeli) |
| Astrometrik RA/Dec, TT | QUANTITIES=1 (astrometrik, ICRF) | `SEFLG_EQUATORIAL·J2000·ICRS·NOABERR·NOGDEFL` |
| Ay, yer yüzeyinden (toposentrik) | CENTER=coord@399, SITE_COORD=boylam,enlem,0 | `swe_set_topo` + `SEFLG_TOPOCTR` (uygulama yer merkezli kullanır; bu satır yalnızca karşılaştırma içindir) |

## 1959 · İstanbul (genel tarih)

Yerel 1959-03-15 10:00 (Europe/Istanbul) → UTC 1959-03-15 08:00:00 · JD(UT1) 2436642.833333 · JD(TT) 2436642.833713 · ΔT 32.78 s · 41.0138°, 28.9497°

| Cisim | JPL TT (°) | SwissEph TT (°) | fark (″) | JPL UT (°) | SouthAstra (°) | fark (″) | RA/Dec astrometrik fark (″) |
|---|---|---|---|---|---|---|---|
| ✓  sun | 353.994336 | 353.994354 | 0.06 | 353.994335 | 353.994354 | 0.07 | 0.00 / 0.00 |
| ✓  moon | 58.763348 | 58.763366 | 0.06 | 58.763344 | 58.763366 | 0.08 | 0.00 / 0.00 |
| ✓  mercury | 11.662015 | 11.662032 | 0.06 | 11.662015 | 11.662032 | 0.06 | 0.00 / 0.00 |
| ✓  venus | 23.200671 | 23.200689 | 0.06 | 23.200671 | 23.200689 | 0.07 | 0.00 / 0.00 |
| ✓  mars | 75.830148 | 75.830165 | 0.06 | 75.830148 | 75.830165 | 0.06 | 0.00 / 0.00 |
| ✓  jupiter | 241.969967 | 241.969980 | 0.05 | 241.969967 | 241.969980 | 0.05 | 0.02 / 0.00 |
| ✓  saturn | 276.216253 | 276.216273 | 0.07 | 276.216253 | 276.216273 | 0.07 | 0.01 / 0.02 |
| ✓  uranus | 132.778328 | 132.778383 | 0.20 | 132.778328 | 132.778383 | 0.20 | 0.13 / 0.04 |
| ✓  neptune | 216.617540 | 216.617560 | 0.07 | 216.617540 | 216.617560 | 0.07 | 0.01 / 0.00 |
| ✓  pluto | 152.454485 | 152.454505 | 0.07 | 152.454485 | 152.454505 | 0.07 | 0.02 / 0.07 |
| ✓  chiron | 324.809593 | 324.809579 | 0.05 | 324.809593 | 324.809579 | 0.05 | 0.16 / 0.14 |

✓ Ay toposentrik: JPL 59.302152° · SwissEph 59.302152° · fark 0.00″ (sınır 2″). Yer merkezli konumdan farkı (paralaks) 32.33′.

**Köşeler ve evler (bağımsız: Meeus yıldız zamanı + IAU 1980 nütasyon + ev formülleri).** RAMC 321.130218° (SwissEph 321.130252°, fark 0.12″) · ε 23.442245° (SwissEph 23.442236°, fark 0.03″)

✓ ASC formül 73.558244° · SouthAstra 73.558270° · fark 0.09″ — MC formül 318.699359° · SouthAstra 318.699396° · fark 0.13″ (sınır 5″)

✓ Ev sistemi P (Placidus): 12 başlangıcın en büyük farkı 0.16″ (sınır 5″)
✓ Ev sistemi K (Koch): 12 başlangıcın en büyük farkı 0.15″ (sınır 5″)
✓ Ev sistemi R (Regiomontanus): 12 başlangıcın en büyük farkı 0.17″ (sınır 5″)
✓ Ev sistemi C (Campanus): 12 başlangıcın en büyük farkı 0.17″ (sınır 5″)
✓ Ev sistemi O (Porphyry): 12 başlangıcın en büyük farkı 0.13″ (sınır 5″)
✓ Ev sistemi E (Eşit (Equal)): 12 başlangıcın en büyük farkı 0.09″ (sınır 5″)
✓ Ev sistemi W (Tam Burç (Whole Sign)): 12 başlangıcın en büyük farkı 0.00″ (sınır 5″)

✓ Ortalama Ay düğümü: Meeus 194.171980° · SouthAstra 194.171997° · fark 0.06″ (sınır 3″). Gerçek (oskülatör) düğüm: bağımsız referans yok — DOĞRULANMADI.

✓ Açılar (10 gezegen, standart orb profili): JPL konumlarından 19 açı · SouthAstra 19 · eksik 0 · fazla 0 · en büyük orb farkı 0.13″

✓ İkincil progresyon (1989-03-15; progresif an JD 2436672.835799): 11 cisim, en büyük fark 0.19″ (sınır 1,5″)

## 1988 · Kadıköy (Örnek A, uydurma kişi)

Yerel 1988-07-14 06:45 (Europe/Istanbul) → UTC 1988-07-14 03:45:00 · JD(UT1) 2447356.656251 · JD(TT) 2447356.656900 · ΔT 56.07 s · 40.9823°, 29.0903°

| Cisim | JPL TT (°) | SwissEph TT (°) | fark (″) | JPL UT (°) | SouthAstra (°) | fark (″) | RA/Dec astrometrik fark (″) |
|---|---|---|---|---|---|---|---|
| ✓  sun | 111.923089 | 111.923102 | 0.05 | 111.923090 | 111.923102 | 0.04 | 0.00 / 0.00 |
| ✓  moon | 114.690030 | 114.690043 | 0.05 | 114.690046 | 114.690043 | 0.01 | 0.00 / 0.00 |
| ✓  mercury | 92.631957 | 92.631970 | 0.05 | 92.631959 | 92.631970 | 0.04 | 0.00 / 0.00 |
| ✓  venus | 75.584345 | 75.584357 | 0.05 | 75.584345 | 75.584357 | 0.04 | 0.00 / 0.00 |
| ✓  mars | 0.148780 | 0.148795 | 0.05 | 0.148781 | 0.148795 | 0.05 | 0.00 / 0.00 |
| ✓  jupiter | 58.603734 | 58.603753 | 0.07 | 58.603734 | 58.603753 | 0.07 | 0.02 / 0.01 |
| ✓  saturn | 267.580565 | 267.580576 | 0.04 | 267.580565 | 267.580576 | 0.04 | 0.01 / 0.02 |
| ✓  uranus | 268.115059 | 268.115072 | 0.05 | 268.115058 | 268.115072 | 0.05 | 0.00 / 0.00 |
| ✓  neptune | 278.445805 | 278.445820 | 0.05 | 278.445805 | 278.445820 | 0.05 | 0.00 / 0.00 |
| ✓  pluto | 219.769448 | 219.769459 | 0.04 | 219.769448 | 219.769459 | 0.04 | 0.00 / 0.05 |
| ✓  chiron | 92.097604 | 92.097609 | 0.02 | 92.097604 | 92.097609 | 0.02 | 0.03 / 0.15 |

✓ Ay toposentrik: JPL 115.471450° · SwissEph 115.471435° · fark 0.05″ (sınır 2″). Yer merkezli konumdan farkı (paralaks) 46.88′.

**Köşeler ve evler (bağımsız: Meeus yıldız zamanı + IAU 1980 nütasyon + ev formülleri).** RAMC 17.572649° (SwissEph 17.572661°, fark 0.05″) · ε 23.443115° (SwissEph 23.443105°, fark 0.04″)

✓ ASC formül 123.148146° · SouthAstra 123.148151° · fark 0.02″ — MC formül 19.043989° · SouthAstra 19.044001° · fark 0.04″ (sınır 5″)

✓ Ev sistemi P (Placidus): 12 başlangıcın en büyük farkı 0.05″ (sınır 5″)
✓ Ev sistemi K (Koch): 12 başlangıcın en büyük farkı 0.04″ (sınır 5″)
✓ Ev sistemi R (Regiomontanus): 12 başlangıcın en büyük farkı 0.04″ (sınır 5″)
✓ Ev sistemi C (Campanus): 12 başlangıcın en büyük farkı 0.04″ (sınır 5″)
✓ Ev sistemi O (Porphyry): 12 başlangıcın en büyük farkı 0.04″ (sınır 5″)
✓ Ev sistemi E (Eşit (Equal)): 12 başlangıcın en büyük farkı 0.02″ (sınır 5″)
✓ Ev sistemi W (Tam Burç (Whole Sign)): 12 başlangıcın en büyük farkı 0.00″ (sınır 5″)

✓ Ortalama Ay düğümü: Meeus 346.834480° · SouthAstra 346.834490° · fark 0.04″ (sınır 3″). Gerçek (oskülatör) düğüm: bağımsız referans yok — DOĞRULANMADI.

✓ Açılar (10 gezegen, standart orb profili): JPL konumlarından 19 açı · SouthAstra 19 · eksik 0 · fazla 0 · en büyük orb farkı 0.08″

✓ İkincil progresyon (2018-07-14; progresif an JD 2447386.656464): 11 cisim, en büyük fark 0.10″ (sınır 1,5″)

✓ Transit kesinleşme anları: 40 olay (2024-01-01 – 2025-12-31). Açısal fark (kesinleşme anında JPL'e göre açının tam değerden sapması): en büyük 0.08″ (pluto sextile natal mars, 2024-01-25T14:44 UT) · sınır 1,5″. Zaman farkı (açısal farkın gezegenin o andaki hızına bölünmesi; kesinleşme anının saniye cinsinden belirsizliği): en büyük 58.58 s (pluto sextile natal mars, hız 0.0324°/gün)

## 1990 · Berlin (genel tarih, yaz saati)

Yerel 1990-09-15 08:30 (Europe/Berlin) → UTC 1990-09-15 06:30:00 · JD(UT1) 2448149.770831 · JD(TT) 2448149.771495 · ΔT 57.35 s · 52.5244°, 13.4105°

| Cisim | JPL TT (°) | SwissEph TT (°) | fark (″) | JPL UT (°) | SouthAstra (°) | fark (″) | RA/Dec astrometrik fark (″) |
|---|---|---|---|---|---|---|---|
| ✓  sun | 172.167597 | 172.167610 | 0.05 | 172.167595 | 172.167610 | 0.05 | 0.00 / 0.00 |
| ✓  moon | 126.040147 | 126.040161 | 0.05 | 126.040122 | 126.040161 | 0.14 | 0.00 / 0.00 |
| ✓  mercury | 159.980077 | 159.980090 | 0.05 | 159.980078 | 159.980090 | 0.04 | 0.00 / 0.00 |
| ✓  venus | 159.807002 | 159.807015 | 0.05 | 159.806999 | 159.807015 | 0.06 | 0.00 / 0.00 |
| ✓  mars | 66.685676 | 66.685689 | 0.05 | 66.685675 | 66.685689 | 0.05 | 0.00 / 0.00 |
| ✓  jupiter | 125.589840 | 125.589852 | 0.04 | 125.589840 | 125.589852 | 0.04 | 0.01 / 0.00 |
| ✓  saturn | 288.756439 | 288.756443 | 0.01 | 288.756439 | 288.756443 | 0.01 | 0.03 / 0.01 |
| ✓  uranus | 275.600640 | 275.600655 | 0.05 | 275.600640 | 275.600655 | 0.05 | 0.00 / 0.00 |
| ✓  neptune | 281.817612 | 281.817626 | 0.05 | 281.817612 | 281.817626 | 0.05 | 0.00 / 0.00 |
| ✓  pluto | 225.694433 | 225.694439 | 0.02 | 225.694433 | 225.694439 | 0.02 | 0.01 / 0.10 |
| ✓  chiron | 115.176236 | 115.176248 | 0.05 | 115.176235 | 115.176248 | 0.05 | 0.04 / 0.18 |

✓ Ay toposentrik: JPL 126.409371° · SwissEph 126.409380° · fark 0.03″ (sınır 2″). Yer merkezli konumdan farkı (paralaks) 22.15′.

**Köşeler ve evler (bağımsız: Meeus yıldız zamanı + IAU 1980 nütasyon + ev formülleri).** RAMC 104.875435° (SwissEph 104.875445°, fark 0.04″) · ε 23.442113° (SwissEph 23.442102°, fark 0.04″)

✓ ASC formül 190.350230° · SouthAstra 190.350239° · fark 0.03″ — MC formül 103.695836° · SouthAstra 103.695847° · fark 0.04″ (sınır 5″)

✓ Ev sistemi P (Placidus): 12 başlangıcın en büyük farkı 0.04″ (sınır 5″)
✓ Ev sistemi K (Koch): 12 başlangıcın en büyük farkı 0.04″ (sınır 5″)
✓ Ev sistemi R (Regiomontanus): 12 başlangıcın en büyük farkı 0.05″ (sınır 5″)
✓ Ev sistemi C (Campanus): 12 başlangıcın en büyük farkı 0.05″ (sınır 5″)
✓ Ev sistemi O (Porphyry): 12 başlangıcın en büyük farkı 0.04″ (sınır 5″)
✓ Ev sistemi E (Eşit (Equal)): 12 başlangıcın en büyük farkı 0.03″ (sınır 5″)
✓ Ev sistemi W (Tam Burç (Whole Sign)): 12 başlangıcın en büyük farkı 0.00″ (sınır 5″)

✓ Ortalama Ay düğümü: Meeus 304.838712° · SouthAstra 304.838721° · fark 0.03″ (sınır 3″). Gerçek (oskülatör) düğüm: bağımsız referans yok — DOĞRULANMADI.

✓ Açılar (10 gezegen, standart orb profili): JPL konumlarından 22 açı · SouthAstra 22 · eksik 0 · fazla 0 · en büyük orb farkı 0.10″

✓ İkincil progresyon (2020-09-15; progresif an JD 2448179.773469): 11 cisim, en büyük fark 0.17″ (sınır 1,5″)

## Tarihsel saat dilimleri (IANA tzdb)

Bağımsız uygulama: Python 3.14.9 zoneinfo · tzdata 2026f · alındı 2026-11-04. SouthAstra: luxon + Node ICU tzdata 2026a.

| Saat dilimi | Yerel | Python zoneinfo (dk) | SouthAstra (dk) | |
|---|---|---|---|---|
| Europe/Istanbul | 1959-03-15 10:00 | 120 | 120 | ✓ |
| Europe/Istanbul | 1959-07-15 12:00 | 120 | 120 | ✓ |
| Europe/Istanbul | 1964-06-01 12:00 | 180 | 180 | ✓ |
| Europe/Istanbul | 1978-07-01 12:00 | 180 | 180 | ✓ |
| Europe/Istanbul | 1983-07-31 12:00 | 240 | 240 | ✓ |
| Europe/Istanbul | 1985-04-20 12:00 | 180 | 180 | ✓ |
| Europe/Istanbul | 1988-07-14 06:45 | 180 | 180 | ✓ |
| Europe/Istanbul | 1999-12-31 23:00 | 120 | 120 | ✓ |
| Europe/Istanbul | 2010-07-01 12:00 | 180 | 180 | ✓ |
| Europe/Istanbul | 2016-11-01 12:00 | 180 | 180 | ✓ |
| Europe/Istanbul | 2024-01-01 12:00 | 180 | 180 | ✓ |
| Europe/Berlin | 1946-07-01 12:00 | 120 | 120 | ✓ |
| Europe/Berlin | 1947-06-01 12:00 | 180 | 180 | ✓ |
| Europe/Berlin | 1949-07-01 12:00 | 120 | 120 | ✓ |
| Europe/Berlin | 1975-07-01 12:00 | 60 | 60 | ✓ |
| Europe/Berlin | 1980-07-01 12:00 | 120 | 120 | ✓ |
| Europe/Berlin | 1990-03-24 12:00 | 60 | 60 | ✓ |
| Europe/Berlin | 1990-03-26 12:00 | 120 | 120 | ✓ |
| Europe/Berlin | 1990-09-15 08:30 | 120 | 120 | ✓ |
| Europe/Berlin | 1990-09-29 12:00 | 120 | 120 | ✓ |
| Europe/Berlin | 1990-10-01 12:00 | 60 | 60 | ✓ |
| Europe/Berlin | 2024-07-01 12:00 | 120 | 120 | ✓ |
| America/New_York | 1990-07-01 12:00 | -240 | -240 | ✓ |
| Europe/London | 1990-06-01 12:00 | 60 | 60 | ✓ |

## Özet

- Geçen: **94** · Başarısız: **0** · Referansı olmadığı için doğrulanmayan kalem: **0**

Sınırlar: gezegenler 1″, Chiron 3″, toposentrik Ay 2″, köşeler ve evler 5″ (bağımsız nütasyon serisi kısaltılmış: ~0,1″), ortalama düğüm 3″, transit ve progresyon 1,5″.
