// Öne çıkanlar: hesaplanmış haritadan kural tabanlı özet (yorum katmanı; hesaplama yapmaz, yalnızca okur).
// Her madde: ne olduğu (düz dil), neden öne çıktığı (kural) ve geleneksel anlamı (öğrenme sözlüğü).
import type { ChartResult } from './types'
import { ASPECT_BY_TYPE, moonPhase, SIGNS, signOf, TRAD_RULER, norm360 } from './zodiac'
import { aspectPatterns } from './patterns'
import { essentialDignities, sectUnknown } from './dignities'
import { ASPECT_LEARN, HOUSE_LEARN, learnPoint, SIGN_LEARN } from './learn'

export interface Highlight {
  id: string
  group: 'Genel tablo' | 'Köşeler' | 'Açılar' | 'Kalıplar' | 'Gezegenlerin durumu'
  title: string // düz dille başlık
  rule: string // neden öne çıktı (sayısal kural)
  meaning?: string // geleneksel anlam (öğrenme sözlüğü)
  points: string[]
  uncertain?: string // doğum saati belirsizliği notu
}

const TEN = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
const ELEM = ['Ateş', 'Toprak', 'Hava', 'Su']
const ELEM_PLAIN = ['harekete geçme, coşku', 'somut işler, beden, düzen', 'düşünce, iletişim, ilişki kurma', 'duygular, sezgi, bağ kurma']
const MOD = ['Öncü', 'Sabit', 'Değişken']
const MOD_PLAIN = ['başlatma', 'sürdürme, kararlılık', 'uyum sağlama, değişim']
export const ANGLE_ORB = 5 // köşeye yakınlık sınırı (derece)
export const TIGHT_ORB = 1 // "çok dar açı" sınırı (derece)

const nm = (c: ChartResult, id: string) => (id === 'asc' ? 'Yükselen' : id === 'mc' ? 'MC' : c.points.find((p) => p.id === id)?.name ?? id)
const dist = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

export function chartHighlights(c: ChartResult, rulership: 'modern' | 'traditional' = 'modern'): Highlight[] {
  const out: Highlight[] = []
  const pts = c.points.filter((p) => TEN.includes(p.id))
  const unsureMoon = c.moonRange && signOf(c.moonRange.from) !== signOf(c.moonRange.to) ? "Ay'ın burcu doğum saatine bağlı; Ay bu sayımda 12:00 konumuyla yer alıyor." : undefined

  // 1) Element ve nitelik dengesi (10 gezegen, eşit ağırlık)
  const el = [0, 0, 0, 0], md = [0, 0, 0]
  for (const p of pts) { const s = signOf(p.lon); el[s % 4]++; md[s % 3]++ }
  const maxE = Math.max(...el), maxM = Math.max(...md)
  const domE = el.map((n, i) => (n === maxE ? i : -1)).filter((i) => i >= 0)
  const domM = md.map((n, i) => (n === maxM ? i : -1)).filter((i) => i >= 0)
  out.push({
    id: 'elements', group: 'Genel tablo', points: [],
    title: `Baskın element: ${domE.map((i) => ELEM[i]).join(' ve ')} (${domE.map((i) => ELEM_PLAIN[i]).join('; ')})`,
    rule: `10 gezegenin burçlara göre sayımı: Ateş ${el[0]} · Toprak ${el[1]} · Hava ${el[2]} · Su ${el[3]}. En çok gezegen bulunan element baskın sayılır.${el.some((n) => n === 0) ? ` Hiç gezegen olmayan: ${el.map((n, i) => (n === 0 ? ELEM[i] : '')).filter(Boolean).join(', ')}.` : ''}`,
    meaning: 'Astrolojide burçlar dört elemente ayrılır. Hangi elementte çok gezegen olduğu, haritanın genel "tonu" olarak yorumlanır.',
    uncertain: unsureMoon
  })
  out.push({
    id: 'modes', group: 'Genel tablo', points: [],
    title: `Baskın nitelik: ${domM.map((i) => MOD[i]).join(' ve ')} (${domM.map((i) => MOD_PLAIN[i]).join('; ')})`,
    rule: `10 gezegenin sayımı: Öncü ${md[0]} · Sabit ${md[1]} · Değişken ${md[2]}.`,
    meaning: 'Burçlar ayrıca üç niteliğe ayrılır: öncü (başlatan), sabit (sürdüren), değişken (uyum sağlayan).',
    uncertain: unsureMoon
  })

  // 2) Güneş, Ay, Yükselen: haritanın "üç temel taşı"
  const sun = c.points.find((p) => p.id === 'sun'), moon = c.points.find((p) => p.id === 'moon')
  if (sun && moon) {
    const ph = moonPhase(sun.lon, moon.lon)
    out.push({
      id: 'big3', group: 'Genel tablo', points: ['sun', 'moon', ...(c.hasHouses ? ['asc'] : [])],
      title: `Güneş ${SIGNS[signOf(sun.lon)].name}, Ay ${SIGNS[signOf(moon.lon)].name}${c.hasHouses ? `, Yükselen ${SIGNS[signOf(c.angles.asc)].name}` : ''}`,
      rule: `Haritanın en çok bakılan üç noktası. Ay evresi: ${ph.name} (Ay Güneş'ten ${ph.angle.toFixed(0)}° ileride).${c.hasHouses ? '' : ' Doğum saati bilinmediği için yükselen hesaplanmadı.'}`,
      meaning: `${learnPoint('sun')?.text} ${learnPoint('moon')?.text}${c.hasHouses ? ' ' + learnPoint('asc')?.text : ''}`,
      uncertain: unsureMoon
    })
  }

  // 3) Harita yöneticisi (yükselen burcun yöneticisi)
  if (c.hasHouses) {
    const s = signOf(c.angles.asc)
    const trad = TRAD_RULER[s]
    const modern = rulership === 'modern' ? ({ 10: 'uranus', 11: 'neptune', 7: 'pluto' } as Record<number, string>)[s] : undefined
    for (const id of [modern, trad].filter(Boolean) as string[]) {
      const p = c.points.find((x) => x.id === id)
      if (!p) continue
      out.push({
        id: 'ruler-' + id, group: 'Genel tablo', points: [id, 'asc'],
        title: `Harita yöneticisi: ${p.name}${modern && id === trad ? '' : modern ? (id === modern ? ' (modern)' : ' (geleneksel)') : ''} · ${SIGNS[signOf(p.lon)].name}, ${p.house}. ev`,
        rule: `Yükselen ${SIGNS[s].name}; bu burcun ${id === modern ? 'modern' : 'geleneksel'} yöneticisi ${p.name}.`,
        meaning: `Yükselen burcun yöneticisi "haritanın yöneticisi" sayılır; bulunduğu ev geleneksel olarak yaşamda öne çıkan alanlardan biri kabul edilir. ${HOUSE_LEARN[p.house - 1]}`
      })
    }
  }

  // 4) Köşelerdeki gezegenler (ASC, DSC, MC, IC'ye 5°'den yakın)
  if (c.hasHouses) {
    const angles: [string, number, string][] = [['Yükselen', c.angles.asc, 'kişinin kendisi ve dışa dönük tavrı'], ['Alçalan (DSC)', norm360(c.angles.asc + 180), 'ilişkiler ve ortaklıklar'], ['MC', c.angles.mc, 'meslek ve toplumsal rol'], ['IC', norm360(c.angles.mc + 180), 'ev, aile, kökler']]
    for (const p of pts) {
      for (const [an, lon, plain] of angles) {
        const d = dist(p.lon, lon)
        if (d <= ANGLE_ORB) out.push({
          id: `angle-${p.id}-${an}`, group: 'Köşeler', points: [p.id],
          title: `${p.name} ${an} noktasına çok yakın (${plain})`,
          rule: `${p.name} ile ${an} arası ${d.toFixed(1).replace('.', ',')}° (sınır ${ANGLE_ORB}°). Köşelere yakın gezegenler geleneksel olarak en güçlü konumdaki gezegenler sayılır.`,
          meaning: learnPoint(p.id)?.text
        })
      }
    }
  }

  // 5) Çok dar majör açılar (orb < 1°)
  // yalnızca 10 ana gezegen ve Yükselen/MC (küçük cisimler ve düğüm burada sayılmaz)
  const MAIN = new Set([...TEN, 'asc', 'mc'])
  for (const a of c.aspects.filter((x) => ['conjunction', 'opposition', 'square', 'trine', 'sextile'].includes(x.type) && x.orb < TIGHT_ORB && x.certainty !== 'olasi' && MAIN.has(x.a) && MAIN.has(x.b))) {
    const def = ASPECT_BY_TYPE[a.type]
    out.push({
      id: `asp-${a.a}-${a.b}-${a.type}`, group: 'Açılar', points: [a.a, a.b],
      title: `${nm(c, a.a)} ile ${nm(c, a.b)} arasında ${def.name.toLowerCase()}`,
      rule: `Açı neredeyse tam: orb ${Math.floor(a.orb)}°${String(Math.round((a.orb % 1) * 60)).padStart(2, '0')}′ (sınır ${TIGHT_ORB}°). Dar açılar haritanın en belirgin bağlantıları sayılır.`,
      meaning: `${ASPECT_LEARN[a.type]} ${learnPoint(a.a)?.title}: ${learnPoint(a.a)?.text} ${learnPoint(a.b)?.title}: ${learnPoint(a.b)?.text}`,
      uncertain: a.certainty && a.certainty !== 'kesin' ? 'Doğum saati bilinmiyor: bu Ay açısı günün bir kısmında yok (saate bağlı).' : a.certainty === 'kesin' ? 'Doğum saati bilinmiyor ama bu açı günün her saatinde var; gerçek orb bilinmiyor.' : undefined
    })
  }

  // 6) Kalıplar (büyük üçgen, T-kare, stelyum…)
  for (const p of aspectPatterns(c)) {
    out.push({ id: 'pat-' + p.name + p.points.join(), group: 'Kalıplar', points: p.points, title: `${p.name}: ${p.points.map((x) => nm(c, x)).join(', ')}`, rule: p.detail, meaning: PATTERN_LEARN[p.name.split(' (')[0]] })
  }

  // 7) Gezegenlerin durumu: retrograd, en güçlü / en zayıf esas dignite
  const retro = pts.filter((p) => p.retro && !['sun', 'moon'].includes(p.id))
  if (retro.length) out.push({
    id: 'retro', group: 'Gezegenlerin durumu', points: retro.map((p) => p.id),
    title: `Geri harekette görünen gezegenler: ${retro.map((p) => p.name).join(', ')}`,
    rule: 'Doğum anında Dünya\'dan bakıldığında bu gezegenler gökyüzünde geri gidiyor gibi görünüyordu (gerçek bir geri hareket değil, görünüş).',
    meaning: 'Geleneksel olarak retrograd gezegenin temaları daha içe dönük ya da gecikmeli işleyen konular olarak yorumlanır.'
  })
  const rows = essentialDignities(c, sectUnknown(c) ? true : undefined)
  const best = [...rows].sort((a, b) => b.score - a.score)[0]
  const worst = [...rows].sort((a, b) => a.score - b.score)[0]
  if (best && best.score >= 5) out.push({ id: 'dign-best', group: 'Gezegenlerin durumu', points: [best.id], title: `Burcunda en güçlü gezegen: ${nm(c, best.id)} (${SIGNS[best.sign].name})`, rule: `Lilly puanı +${best.score}: ${best.has.join(', ')}.${sectUnknown(c) ? ' Doğum saati bilinmiyor: üçlük puanı gündüz varsayımıyla.' : ''}`, meaning: 'Geleneksel astrolojide gezegen kendi burcunda ya da yücelim burcundaysa "güçlü" (rahat, etkili) sayılır.' })
  if (worst && worst.score <= -5 && worst.id !== best?.id) out.push({ id: 'dign-worst', group: 'Gezegenlerin durumu', points: [worst.id], title: `Burcunda en zorlanan gezegen: ${nm(c, worst.id)} (${SIGNS[worst.sign].name})`, rule: `Lilly puanı ${worst.score}: ${worst.has.join(', ')}.`, meaning: 'Gezegen zarar ya da düşüş burcundaysa ya da hiçbir dignitesi yoksa (peregrine) geleneksel olarak "zorlanan" sayılır.' })
  return out
}

const PATTERN_LEARN: Record<string, string> = {
  'Büyük üçgen': 'Aynı elementte üç gezegenin birbirine üçgen açı yapması; geleneksel olarak doğal yetenek ve kolay akış ile ilişkilendirilir.',
  'T-kare': 'İki karşıt gezegenin üçüncü bir gezegene kare yapması; gerilim ve harekete geçirici bir odak olarak yorumlanır.',
  'Büyük haç': 'Dört gezegenin karşıt ve kare açılarla bir haç oluşturması; birden çok yönden gelen gerilim olarak yorumlanır.',
  Yod: 'İki gezegenin altmışlık yapıp üçüncüsüne quincunx yapması; "özel görev" ya da ayar gerektiren bir odak olarak anılır.',
  Uçurtma: 'Büyük üçgene karşıt bir gezegenin eklenmesi; uyumun bir hedefe yönlendirilmesi olarak yorumlanır.',
  'Mistik dikdörtgen': 'İki karşıtlığın üçgen ve altmışlıklarla bağlanması; gerilimle uyumun dengesi olarak yorumlanır.',
  Stelyum: 'Aynı burçta ya da evde dört veya daha fazla gezegen; o burcun ya da evin temalarının yoğunlaşması olarak yorumlanır.'
}

/** Düz dille kısa açılış: astrolojiden anlamayan biri için haritanın ne olduğu */
export const HIGHLIGHTS_INTRO =
  'Doğum haritası, doğduğunuz an ve yerde gökyüzünün bir fotoğrafıdır: Güneş, Ay ve gezegenlerin hangi burçta (gökyüzünün 12 bölümünden hangisinde) ve hangi evde (o yerin ufkuna göre 12 bölümden hangisinde) olduğunu gösterir. Bu sayfa, hesaplanan haritada sayısal olarak öne çıkan noktaları listeler ve her birinin geleneksel olarak ne anlama geldiğini kısaca anlatır. Her maddenin altında neden öne çıktığının kuralı yazılıdır.'
