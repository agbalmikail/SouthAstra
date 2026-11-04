// Bu haritanın gezegenlerini NASA JPL Horizons ile karşılaştırır (isteğe bağlı, internet gerekir).
// NASA'ya yalnızca Jülyen günü (UT) ve cisim numarası gönderilir: ad, yer veya başka kişisel bilgi gönderilmez
// (yer merkezli konumlar istendiği için koordinat da gerekmez).
import type { ChartInput, JplCheck } from '@shared/types'
import { natalChart } from './engine'
import { t } from '@shared/i18n'
import { jplKey } from '@shared/jplkey'

const HZ: Record<string, string> = { sun: '10', moon: '301', mercury: '199', venus: '299', mars: '499', jupiter: '599', saturn: '699', uranus: '799', neptune: '899', pluto: '999', chiron: '2060;' }


export async function jplCheck(input: ChartInput): Promise<JplCheck> {
  const c = natalChart(input)
  const rows: JplCheck['rows'] = []
  const sources: Record<string, string> = {}
  let api = ''
  for (const [id, cmd] of Object.entries(HZ)) {
    const p = c.points.find((x) => x.id === id)
    if (!p) continue
    const q = new URLSearchParams({ format: 'json', COMMAND: `'${cmd}'`, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'OBSERVER', CENTER: "'500@399'", TLIST_TYPE: 'JD', TIME_TYPE: 'UT', TLIST: `'${c.jdUt.toFixed(9)}'`, QUANTITIES: "'31'", ANG_FORMAT: 'DEG', EXTRA_PREC: 'YES', CSV_FORMAT: 'YES', CAL_FORMAT: 'JD' })
    const res = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${q}`, { headers: { 'User-Agent': 'SouthAstra' }, signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(t('NASA JPL yanıt vermedi ({status}).', { status: res.status }))
    const j = (await res.json()) as { result: string; signature?: { source: string; version: string } }
    api = j.signature ? `${j.signature.source} ${j.signature.version}` : api
    const txt = j.result
    const m = txt.match(/Target body name:\s*(.+?)\s*\{source:\s*([^}]+)\}/)
    if (m) sources[m[1].trim()] = m[2].trim()
    const i0 = txt.indexOf('$$SOE'), i1 = txt.indexOf('$$EOE')
    if (i0 < 0 || i1 < 0) throw new Error(t('NASA JPL yanıtı okunamadı ({body}).', { body: p.name }))
    const cols = txt.slice(i0 + 5, i1).trim().split(',').map((x) => x.trim())
    const nums = cols.slice(1).filter((x) => /^-?\d+\.\d+$/.test(x)).map(Number)
    const jpl = nums[0]
    const diff = Math.abs(((p.lon - jpl + 540) % 360) - 180) * 3600
    rows.push({ id, jpl, sa: p.lon, diff })
  }
  return { date: new Date().toISOString(), key: jplKey(input), jdUt: c.jdUt, api, sources, rows, max: Math.max(...rows.filter((r) => r.id !== 'chiron').map((r) => r.diff)) }
}
