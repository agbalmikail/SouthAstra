#!/usr/bin/env python3
"""Saat dilimi referansı: Python zoneinfo + işletim sistemi tzdata (SouthAstra'nın luxon/ICU uygulamasından bağımsız).
Girdi: tests/reference/tz-cases.json · Çıktı: tests/reference/tz.json"""
import json, pathlib, datetime, platform
from zoneinfo import ZoneInfo, TZPATH

ROOT = pathlib.Path(__file__).resolve().parents[2]
cases = json.loads((ROOT / 'tests/reference/tz-cases.json').read_text())
vals = []
for zone, date, time in cases:
    y, m, d = map(int, date.split('-')); hh, mm = map(int, time.split(':'))
    off = datetime.datetime(y, m, d, hh, mm, tzinfo=ZoneInfo(zone)).utcoffset()
    vals.append([zone, date, time, int(off.total_seconds() // 60)])
ver = '?'
for p in TZPATH:
    f = pathlib.Path(p) / '+VERSION'
    if f.exists(): ver = f.read_text().strip(); break
(ROOT / 'tests/reference/tz.json').write_text(json.dumps({'meta': {'engine': f'Python {platform.python_version()} zoneinfo', 'tzdata': ver, 'tzpath': list(TZPATH), 'fetched': datetime.date.today().isoformat()}, 'values': vals}, indent=1))
print(len(vals), 'vaka, tzdata', ver)
