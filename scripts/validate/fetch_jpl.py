#!/usr/bin/env python3
"""NASA JPL Horizons referans verisini bir kez, kontrollü olarak alır (internet gerekir).
Girdi: tests/reference/requests.json (npm run dogrula üretir) · Çıktı: tests/reference/jpl.json
--local: local/requests.json → local/jpl.json (kişisel haritalar; git'e girmez)
Yalnızca tarih (Jülyen günü), cisim numarası ve gerekirse yer koordinatı gönderilir; ad veya kişisel bilgi gönderilmez."""
import json, sys, time, urllib.parse, urllib.request, datetime, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
DIR = ROOT / ('local' if '--local' in sys.argv else 'tests/reference')
reqs = json.loads((DIR / 'requests.json').read_text())['requests']
out = {}
meta = {}
groups = {}
for r in reqs:
    k = (r['command'], r['scale'], r['q'], tuple(r.get('site') or ()))
    groups.setdefault(k, []).append(r)

def query(command, scale, q, site, jds):
    p = {'format': 'json', 'COMMAND': f"'{command}'", 'OBJ_DATA': 'NO', 'MAKE_EPHEM': 'YES', 'EPHEM_TYPE': 'OBSERVER',
         'TLIST_TYPE': 'JD', 'TIME_TYPE': scale, 'TLIST': ' '.join(f"'{j:.9f}'" for j in jds), 'QUANTITIES': f"'{q}'",
         'ANG_FORMAT': 'DEG', 'EXTRA_PREC': 'YES', 'CSV_FORMAT': 'YES', 'CAL_FORMAT': 'JD'}
    if site:
        p['CENTER'] = "'coord@399'"; p['COORD_TYPE'] = 'GEODETIC'; p['SITE_COORD'] = f"'{site[0]},{site[1]},{site[2]}'"
    else:
        p['CENTER'] = "'500@399'"
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(p)
    for attempt in range(4):
        try:
            res = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'SouthAstra-validation'}), timeout=90).read())
            return res
        except Exception as e:
            time.sleep(3 * (attempt + 1)); err = e
    raise err

for (command, scale, q, site), rs in groups.items():
    for i in range(0, len(rs), 40):
        chunk = rs[i:i + 40]
        res = query(command, scale, q, site, [r['jd'] for r in chunk])
        txt = res['result']
        if not meta:
            meta['Horizons API'] = f"{res['signature']['source']} {res['signature']['version']}"
        # efemeris kaynakları: "Target body name: Mars (499) {source: mar099}", "Center body name: Earth (399) {source: DE441}"
        for line in txt.splitlines():
            m = re.search(r'(Target|Center) body name:\s*(.+?)\s*\{source:\s*([^}]+)\}', line)
            if m:
                srcs = meta.setdefault('Efemeris kaynakları (Horizons)', {})
                srcs[m.group(2).strip()] = m.group(3).strip()
        body = txt[txt.index('$$SOE') + 5: txt.index('$$EOE')].strip().splitlines()
        if len(body) != len(chunk):
            raise SystemExit(f'beklenmeyen satır sayısı: {command} {len(body)} != {len(chunk)}')
        # Horizons sonuçları zaman sırasıyla döndürür: her satırı kendi Jülyen gününe göre eşle
        rows = []
        for line in body:
            cols = [c.strip() for c in line.split(',')]
            jd = float(cols[0])
            nums = [float(c) for c in cols[1:] if re.fullmatch(r'-?\d+\.\d+', c)]
            rows.append((jd, nums[:2]))
        for r in chunk:
            jd, nums = min(rows, key=lambda x: abs(x[0] - r['jd']))
            if abs(jd - r['jd']) > 1e-6:
                raise SystemExit(f"JD eşleşmedi: {r['key']} {r['jd']} ~ {jd}")
            out[r['key']] = nums
        time.sleep(0.4)
    print(f'{command:>10} {scale} Q{q}{" topo" if site else ""}: {len(rs)} değer')

meta['Alındı'] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
meta['Ayarlar'] = 'Q31: gözlemci ekliptik boylam/enlem (görünür, günün ekliptiği ve ekinoksu); Q1: astrometrik RA/Dec (ICRF); CENTER 500@399 (yer merkezi) veya coord@399; TIME_TYPE TT/UT; EXTRA_PREC'
meta['Sorgu sayısı'] = len(out)
(DIR / 'jpl.json').write_text(json.dumps({'meta': meta, 'values': out}, indent=1, ensure_ascii=False))
print('kaydedildi:', DIR / 'jpl.json', meta)
