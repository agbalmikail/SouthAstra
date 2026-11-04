# Tutarlılık denetimi: saklanan NASA referansları ve canlı NASA yanıtı

Çalıştırıldı: 2026-11-04T13:47:56+00:00 · tests/reference/jpl.json SHA-256 `e72841b8e1212cc9b0a1dd48b67e979eef947bfe2c01771d2f4bd3cd4c2b075b` · referans alındı 2026-11-04T12:45:16+00:00

Fark: saklanan değer ile şimdi NASA JPL Horizons'tan alınan değer arasında (yay saniyesi). Sıfıra çok yakın olması, saklanan dosyanın gerçekten NASA yanıtı olduğunu ve NASA tarafında o günden beri bir değişiklik olmadığını gösterir.

## 1. Referans dosyasından rastgele 25 kayıt (en büyük fark 0.0000″)

| Anahtar | Saklanan | Canlı | Fark (″) |
|---|---|---|---|
| R1959|chiron|TT|31 | 324.8095925 | 324.8095925 | 0.0000 |
| R1959|jupiter|TT|31 | 241.9699667 | 241.9699667 | 0.0000 |
| R1959|jupiter|prog | 240.9268184 | 240.9268184 | 0.0000 |
| R1959|moon|UT|31 | 58.7633440 | 58.7633440 | 0.0000 |
| R1959|saturn|TT|1 | 277.3382039 | 277.3382039 | 0.0000 |
| R1959|venus|TT|1 | 22.1284885 | 22.1284885 | 0.0000 |
| R1988|jupiter|tr|2460351.510413 | 38.4458107 | 38.4458107 | 0.0000 |
| R1988|mars|TT|31 | 0.1487803 | 0.1487803 | 0.0000 |
| R1988|mars|tr|2460310.867095 | 267.5805637 | 267.5805637 | 0.0000 |
| R1988|mars|tr|2460373.941809 | 315.5843455 | 315.5843455 | 0.0000 |
| R1988|mars|tr|2460389.381277 | 327.5805635 | 327.5805635 | 0.0000 |
| R1988|mars|tr|2460420.695519 | 351.9230897 | 351.9230897 | 0.0000 |
| R1988|moon|TT|31 | 114.6900302 | 114.6900302 | 0.0000 |
| R1988|moon|UT|31|topo | 115.4714497 | 115.4714497 | 0.0000 |
| R1988|neptune|TT|31 | 278.4458053 | 278.4458053 | 0.0000 |
| R1988|saturn|tr|2460358.452089 | 338.4457988 | 338.4457988 | 0.0000 |
| R1988|sun|TT|1 | 113.8601349 | 113.8601349 | 0.0000 |
| R1988|sun|prog | 140.6141240 | 140.6141240 | 0.0000 |
| R1988|venus|TT|31 | 75.5843446 | 75.5843446 | 0.0000 |
| R1990|mars|TT|1 | 65.2365620 | 65.2365620 | 0.0000 |
| R1990|mars|UT|31 | 66.6856754 | 66.6856754 | 0.0000 |
| R1990|moon|prog | 162.5412402 | 162.5412402 | 0.0000 |
| R1990|neptune|TT|1 | 282.8994987 | 282.8994987 | 0.0000 |
| R1990|pluto|prog | 226.6786886 | 226.6786886 | 0.0000 |
| R1990|saturn|UT|31 | 288.7564390 | 288.7564390 | 0.0000 |

## 2. Değer denetimindeki (audit.ts) elle yazılmış 1988 değerleri (en büyük fark 0.0000″)

| Cisim | audit.ts | Canlı | Fark (″) |
|---|---|---|---|
| sun | 111.9230891 | 111.9230891 | 0.0000 |
| moon | 114.6900302 | 114.6900302 | 0.0000 |
| mercury | 92.6319567 | 92.6319567 | 0.0000 |
| venus | 75.5843446 | 75.5843446 | 0.0000 |
| mars | 0.1487803 | 0.1487803 | 0.0000 |
| jupiter | 58.6037338 | 58.6037338 | 0.0000 |
| saturn | 267.5805655 | 267.5805655 | 0.0000 |
| uranus | 268.1150586 | 268.1150586 | 0.0000 |
| neptune | 278.4458053 | 278.4458053 | 0.0000 |
| pluto | 219.7694483 | 219.7694483 | 0.0000 |
| chiron | 92.0976035 | 92.0976035 | 0.0000 |
| ceres | 1.1986683 | 1.1986683 | 0.0000 |

## 3. Testlerdeki (verify.ts) elle yazılmış 2000-01-01 değerleri (en büyük fark 0.0000″)

| Cisim | verify.ts | Canlı | Fark (″) |
|---|---|---|---|
| sun | 280.3689092 | 280.3689092 | 0.0000 |
| moon | 223.3237860 | 223.3237860 | 0.0000 |
| mercury | 271.8892699 | 271.8892699 | 0.0000 |
| venus | 241.5657794 | 241.5657794 | 0.0000 |
| mars | 327.9632921 | 327.9632921 | 0.0000 |
| jupiter | 25.2530685 | 25.2530685 | 0.0000 |
| saturn | 40.3956366 | 40.3956366 | 0.0000 |
| uranus | 314.8091680 | 314.8091680 | 0.0000 |
| neptune | 303.1930007 | 303.1930007 | 0.0000 |

## 4. İki dosyadaki aynı an: audit.ts (1988, JD UTC) ile jpl.json R1988 (JD UT1) (en büyük fark 0.0562″)

İki dosya aynı anı biraz farklı Jülyen günüyle sorar: audit.ts UTC, jpl.json UT1 (fark 0,11 s). Bu sürede Ay ~0,05″ ilerler; diğer cisimlerde fark sıfıra yakındır.

| Cisim | audit.ts | jpl.json | Fark (″) |
|---|---|---|---|
| sun | 111.9230891 | 111.9230903 | 0.0043 |
| moon | 114.6900302 | 114.6900458 | 0.0562 |
| mercury | 92.6319567 | 92.6319586 | 0.0068 |
| venus | 75.5843446 | 75.5843451 | 0.0018 |
| mars | 0.1487803 | 0.1487809 | 0.0022 |
| jupiter | 58.6037338 | 58.6037341 | 0.0011 |
| saturn | 267.5805655 | 267.5805654 | 0.0004 |
| uranus | 268.1150586 | 268.1150585 | 0.0004 |
| neptune | 278.4458053 | 278.4458052 | 0.0004 |
| pluto | 219.7694483 | 219.7694483 | 0.0000 |
| chiron | 92.0976035 | 92.0976036 | 0.0004 |

**Sonuç: tutarlı** (sınırlar: saklanan/canlı 0,01″; iki dosya arası 0,1″)
