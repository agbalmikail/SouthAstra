#!/usr/bin/env python3
"""Tutarlılık denetimi: saklanan NASA referansları gerçekten NASA'nın yanıtı mı ve dosyalar birbirini tutuyor mu?
1) tests/reference/jpl.json'dan rastgele seçilen kayıtlar NASA JPL Horizons'tan canlı olarak yeniden istenir.
2) scripts/audit.ts ve scripts/verify.ts içine elle yazılmış NASA değerleri canlı yanıtla karşılaştırılır.
3) Aynı harita ve an için iki dosyada da değer varsa (Örnek A, 1988) birbirine eşit olmalı.
Çıktı: docs/dogrulama/TUTARLILIK.md"""
import json, re, random, urllib.parse, urllib.request, datetime, pathlib, hashlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
ref = json.loads((ROOT / 'tests/reference/jpl.json').read_text())
reqs = {r['key']: r for r in json.loads((ROOT / 'tests/reference/requests.json').read_text())['requests']}

def horizons(cmd, jd, scale, q, site=None):
    p = {'format': 'json', 'COMMAND': f"'{cmd}'", 'OBJ_DATA': 'NO', 'MAKE_EPHEM': 'YES', 'EPHEM_TYPE': 'OBSERVER', 'TLIST_TYPE': 'JD', 'TIME_TYPE': scale,
         'TLIST': f"'{jd:.9f}'", 'QUANTITIES': f"'{q}'", 'ANG_FORMAT': 'DEG', 'EXTRA_PREC': 'YES', 'CSV_FORMAT': 'YES', 'CAL_FORMAT': 'JD'}
    if site: p.update({'CENTER': "'coord@399'", 'COORD_TYPE': 'GEODETIC', 'SITE_COORD': f"'{site[0]},{site[1]},{site[2]}'"})
    else: p['CENTER'] = "'500@399'"
    txt = json.loads(urllib.request.urlopen('https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(p), timeout=90).read())['result']
    line = txt[txt.index('$$SOE') + 5: txt.index('$$EOE')].strip()
    return [float(c) for c in [x.strip() for x in line.split(',')][1:] if re.fullmatch(r'-?\d+\.\d+', c)]

arc = lambda a, b: abs(((a - b + 540) % 360) - 180) * 3600
rows, worst = [], 0.0
random.seed(20261104)
for key in sorted(random.sample(sorted(ref['values']), 25)):
    r = reqs[key]
    live = horizons(r['command'], r['jd'], r['scale'], r['q'], r.get('site'))
    d = max(arc(ref['values'][key][0], live[0]), abs(ref['values'][key][1] - live[1]) * 3600)
    worst = max(worst, d); rows.append((key, ref['values'][key][0], live[0], d))

# audit.ts: Örnek A (1988-07-14 03:45 UT) elle yazılmış JPL tablosu: [ra, dec, lon, lat]
audit = (ROOT / 'scripts/audit.ts').read_text()
tbl = dict((m.group(1), [float(x) for x in m.group(2).split(',')]) for m in re.finditer(r'(\w+): \[([-\d.,\s]+)\]', audit[audit.index('const JPL'):audit.index("console.log('\\n1)")]))
HZ = {'sun': '10', 'moon': '301', 'mercury': '199', 'venus': '299', 'mars': '499', 'jupiter': '599', 'saturn': '699', 'uranus': '799', 'neptune': '899', 'pluto': '999', 'chiron': '2060;', 'ceres': '1;'}
jd88 = 2447356.65625  # 1988-07-14 03:45 UT
arows, aw = [], 0.0
for b, (ra, dec, lon, lat) in tbl.items():
    live = horizons(HZ[b], jd88, 'UT', '31')
    d = max(arc(lon, live[0]), abs(lat - live[1]) * 3600); aw = max(aw, d); arows.append((b, lon, live[0], d))
# aynı an iki dosyada: jpl.json R1988 (JD UT1) ile audit.ts (JD UTC) arasında 0,1 s fark vardır; Ay'da ~0,05″
cross = []
for b in ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron']:
    k = f'R1988|{b}|UT|31'
    if k in ref['values']: cross.append((b, tbl[b][2], ref['values'][k][0], arc(tbl[b][2], ref['values'][k][0])))
cw = max(x[3] for x in cross)

# verify.ts: 2000-01-01 12:00 UT elle yazılmış boylamlar
ver = (ROOT / 'scripts/verify.ts').read_text()
seg = ver[ver.index('const jplRef'):ver.index(']\n', ver.index('const jplRef'))]
vrows, vw = [], 0.0
VID = {'SUN': '10', 'MOON': '301', 'MERCURY': '199', 'VENUS': '299', 'MARS': '499', 'JUPITER': '599', 'SATURN': '699', 'URANUS': '799', 'NEPTUNE': '899', 'PLUTO': '999'}
for m in re.finditer(r'\[C\.SE_(\w+), \'[^\']+\', ([\d.]+)\]', seg):
    live = horizons(VID[m.group(1)], 2451545.0, 'UT', '31')
    d = arc(float(m.group(2)), live[0]); vw = max(vw, d); vrows.append((m.group(1).lower(), float(m.group(2)), live[0], d))

now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
sha = hashlib.sha256((ROOT / 'tests/reference/jpl.json').read_bytes()).hexdigest()
L = [f'# Tutarlılık denetimi: saklanan NASA referansları ve canlı NASA yanıtı', '', f'Çalıştırıldı: {now} · tests/reference/jpl.json SHA-256 `{sha}` · referans alındı {ref["meta"].get("Alındı")}', '',
     'Fark: saklanan değer ile şimdi NASA JPL Horizons\'tan alınan değer arasında (yay saniyesi). Sıfıra çok yakın olması, saklanan dosyanın gerçekten NASA yanıtı olduğunu ve NASA tarafında o günden beri bir değişiklik olmadığını gösterir.', '',
     f'## 1. Referans dosyasından rastgele 25 kayıt (en büyük fark {worst:.4f}″)', '', '| Anahtar | Saklanan | Canlı | Fark (″) |', '|---|---|---|---|']
L += [f'| {k.replace("|", " · ")} | {a:.7f} | {b:.7f} | {d:.4f} |' for k, a, b, d in rows]
L += ['', f'## 2. Değer denetimindeki (audit.ts) elle yazılmış 1988 değerleri (en büyük fark {aw:.4f}″)', '', '| Cisim | audit.ts | Canlı | Fark (″) |', '|---|---|---|---|']
L += [f'| {k} | {a:.7f} | {b:.7f} | {d:.4f} |' for k, a, b, d in arows]
L += ['', f'## 3. Testlerdeki (verify.ts) elle yazılmış 2000-01-01 değerleri (en büyük fark {vw:.4f}″)', '', '| Cisim | verify.ts | Canlı | Fark (″) |', '|---|---|---|---|']
L += [f'| {k} | {a:.7f} | {b:.7f} | {d:.4f} |' for k, a, b, d in vrows]
L += ['', f'## 4. İki dosyadaki aynı an: audit.ts (1988, JD UTC) ile jpl.json R1988 (JD UT1) (en büyük fark {cw:.4f}″)', '', 'İki dosya aynı anı biraz farklı Jülyen günüyle sorar: audit.ts UTC, jpl.json UT1 (fark 0,11 s). Bu sürede Ay ~0,05″ ilerler; diğer cisimlerde fark sıfıra yakındır.', '', '| Cisim | audit.ts | jpl.json | Fark (″) |', '|---|---|---|---|']
L += [f'| {k} | {a:.7f} | {b:.7f} | {d:.4f} |' for k, a, b, d in cross]
ok = worst < 0.01 and aw < 0.01 and vw < 0.01 and cw < 0.1
L += ['', f'**Sonuç: {"tutarlı" if ok else "TUTARSIZLIK VAR"}** (sınırlar: saklanan/canlı 0,01″; iki dosya arası 0,1″)']
(ROOT / 'docs/dogrulama/TUTARLILIK.md').write_text('\n'.join(L) + '\n')
print(f'rastgele 25 kayıt {worst:.4f}″ · audit.ts {aw:.4f}″ · verify.ts {vw:.4f}″ · iki dosya arası {cw:.4f}″ ·', 'TUTARLI' if ok else 'TUTARSIZ')
