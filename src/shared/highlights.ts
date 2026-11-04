// Öne çıkanlar: hesaplanmış haritadan kural tabanlı özet (yorum katmanı; hesaplama yapmaz, yalnızca okur).
// Her madde: ne olduğu (düz dil), neden öne çıktığı (kural) ve geleneksel anlamı (öğrenme sözlüğü).
import type { ChartResult } from './types'
import { ASPECT_BY_TYPE, moonPhase, SIGNS, signOf, TRAD_RULER, norm360 } from './zodiac'
import { aspectPatterns } from './patterns'
import { essentialDignities, sectUnknown } from './dignities'
import { ASPECT_LEARN, HOUSE_LEARN, learnPoint, SIGN_LEARN } from './learn'
import { getLang, t, loc } from './i18n'

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
const dec = (x: string) => (getLang() === 'en' ? x : x.replace('.', ','))
const list = (a: string[], sep: string) => a.map((x) => t(x)).join(sep)

const nm = (c: ChartResult, id: string) => (id === 'asc' ? t('Yükselen') : id === 'mc' ? 'MC' : c.points.find((p) => p.id === id)?.name ?? id)
const dist = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

/** Rodden derecesine göre varsayılan doğum saati belirsizliği (dakika) */
export const roddenWindow = (r?: string) => (r === 'AA' ? 5 : r === 'A' ? 15 : r === 'B' ? 30 : r === 'C' || r === 'DD' ? 60 : 15)

export function chartHighlights(c: ChartResult, rulership: 'modern' | 'traditional' = 'modern'): Highlight[] {
  return chartHighlightsRaw(c, rulership).map((h) => ({ ...h, title: h.title.charAt(0).toLocaleUpperCase(loc()) + h.title.slice(1) }))
}

function chartHighlightsRaw(c: ChartResult, rulership: 'modern' | 'traditional'): Highlight[] {
  const out: Highlight[] = []
  const pts = c.points.filter((p) => TEN.includes(p.id))
  const unsureMoon = c.moonRange && signOf(c.moonRange.from) !== signOf(c.moonRange.to) ? t("Ay'ın burcu doğum saatine bağlı; Ay bu sayımda 12:00 konumuyla yer alıyor.") : undefined

  // 1) Element ve nitelik dengesi (10 gezegen, eşit ağırlık)
  const el = [0, 0, 0, 0], md = [0, 0, 0]
  for (const p of pts) { const s = signOf(p.lon); el[s % 4]++; md[s % 3]++ }
  const maxE = Math.max(...el), maxM = Math.max(...md)
  const domE = el.map((n, i) => (n === maxE ? i : -1)).filter((i) => i >= 0)
  const domM = md.map((n, i) => (n === maxM ? i : -1)).filter((i) => i >= 0)
  out.push({
    id: 'elements', group: 'Genel tablo', points: [],
    title: t('Baskın element: {names} ({plain})', { names: list(domE.map((i) => ELEM[i]), t(' ve ')), plain: list(domE.map((i) => ELEM_PLAIN[i]), '; ') }),
    rule: t('10 gezegenin burçlara göre sayımı: Ateş {a} · Toprak {b} · Hava {c} · Su {d}. En çok gezegen bulunan element baskın sayılır.', { a: el[0], b: el[1], c: el[2], d: el[3] }) + (el.some((n) => n === 0) ? ' ' + t('Hiç gezegen olmayan: {names}.', { names: list(el.map((n, i) => (n === 0 ? ELEM[i] : '')).filter(Boolean), ', ') }) : ''),
    meaning: t('Astrolojide burçlar dört elemente ayrılır. Hangi elementte çok gezegen olduğu, haritanın genel "tonu" olarak yorumlanır.'),
    uncertain: unsureMoon
  })
  out.push({
    id: 'modes', group: 'Genel tablo', points: [],
    title: t('Baskın nitelik: {names} ({plain})', { names: list(domM.map((i) => MOD[i]), t(' ve ')), plain: list(domM.map((i) => MOD_PLAIN[i]), '; ') }),
    rule: t('10 gezegenin sayımı: Öncü {a} · Sabit {b} · Değişken {c}.', { a: md[0], b: md[1], c: md[2] }),
    meaning: t('Burçlar ayrıca üç niteliğe ayrılır: öncü (başlatan), sabit (sürdüren), değişken (uyum sağlayan).'),
    uncertain: unsureMoon
  })

  // 2) Güneş, Ay, Yükselen: haritanın "üç temel taşı"
  const sun = c.points.find((p) => p.id === 'sun'), moon = c.points.find((p) => p.id === 'moon')
  if (sun && moon) {
    const ph = moonPhase(sun.lon, moon.lon)
    out.push({
      id: 'big3', group: 'Genel tablo', points: ['sun', 'moon', ...(c.hasHouses ? ['asc'] : [])],
      title: t('Güneş {sun}, Ay {moon}', { sun: SIGNS[signOf(sun.lon)].name, moon: SIGNS[signOf(moon.lon)].name }) + (c.hasHouses ? t(', Yükselen {asc}', { asc: SIGNS[signOf(c.angles.asc)].name }) : ''),
      rule: t('Haritanın en çok bakılan üç noktası. Ay evresi: {phase}.', { phase: ph.text }) + (c.hasHouses ? '' : ' ' + t('Doğum saati bilinmediği için yükselen hesaplanmadı.')),
      meaning: `${learnPoint('sun')?.text} ${learnPoint('moon')?.text}${c.hasHouses ? ' ' + learnPoint('asc')?.text : ''}`,
      uncertain: unsureMoon
    })
  }

  // 2b) Saat duyarlılığı: burç sınırına yakın Ay / Yükselen / MC
  for (const x of c.sensitivity ?? []) out.push({
    id: 'sens-' + x.id, group: 'Genel tablo', points: [x.id],
    title: x.direction === 'erken'
      ? t('{name} burç sınırında: doğum saati yaklaşık {n} dakika erken olsaydı {sign} burcunda olurdu', { name: x.name, n: Math.max(1, Math.round(x.minutes)), sign: SIGNS[x.otherSign].name })
      : t('{name} burç sınırında: doğum saati yaklaşık {n} dakika geç olsaydı {sign} burcunda olurdu', { name: x.name, n: Math.max(1, Math.round(x.minutes)), sign: SIGNS[x.otherSign].name }),
    rule: t('{name} için eşik {n} dakika. Doğum saatinin kaynağı (Rodden derecesi) bu kadar kesin değilse {name} burcu belirsiz sayılmalıdır.', { name: x.name, n: x.id === 'moon' ? '120' : '10' }),
    uncertain: t('Burç doğum saatinin kesinliğine bağlı.')
  })

  // 2c) Doğum saati duyarlılığı (±60 dk taraması): Rodden derecesine göre belirsizlik penceresi
  if (c.timeChanges?.length) {
    const win = roddenWindow(c.input.rodden)
    const inside = c.timeChanges.filter((x) => x.minutes <= win)
    out.push({
      id: 'time-changes', group: 'Genel tablo', points: [],
      title: inside.length
        ? t('Doğum saati duyarlılığı: ±{win} dakika içinde {n} değişim', { win, n: inside.length })
        : t('Doğum saati duyarlılığı: ±{win} dakika içinde değişim yok', { win }),
      rule: t('Doğum saati ±60 dakika dakika dakika tarandı: yükselen/MC burcu, gezegenlerin evleri, Şans Noktası, yükselen ve MC ile açılar. Belirsizlik penceresi Rodden derecesine göre: AA ±5, A ±15, B ±30, C/DD ±60 dakika (belirtilmemişse ±15).') + (inside.length ? ' ' + inside.map((x) => `${x.text} (${t(x.direction === 'geç' ? '{n} dk geç' : '{n} dk erken', { n: x.minutes })})`).join(' · ') : ''),
      uncertain: inside.length ? t('Bu maddeler doğum saatinin kesinliğine bağlıdır.') : undefined
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
        title: t('Harita yöneticisi: {name}{kind} · {sign}, {house}. ev', { name: p.name, kind: modern && id === trad ? '' : modern ? (id === modern ? t(' (modern)') : t(' (geleneksel)')) : '', sign: SIGNS[signOf(p.lon)].name, house: p.house }),
        rule: id === modern
          ? t('Yükselen {sign}; bu burcun modern yöneticisi {name}.', { sign: SIGNS[s].name, name: p.name })
          : t('Yükselen {sign}; bu burcun geleneksel yöneticisi {name}.', { sign: SIGNS[s].name, name: p.name }),
        meaning: t('Yükselen burcun yöneticisi "haritanın yöneticisi" sayılır; bulunduğu ev geleneksel olarak yaşamda öne çıkan alanlardan biri kabul edilir.') + ' ' + HOUSE_LEARN[p.house - 1]
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
          title: t('{name} {angle} noktasına çok yakın ({plain})', { name: p.name, angle: t(an), plain: t(plain) }),
          rule: t('{name} ile {angle} arası {d}° (sınır {limit}°). Köşelere yakın gezegenler geleneksel olarak en güçlü konumdaki gezegenler sayılır.', { name: p.name, angle: t(an), d: dec(d.toFixed(1)), limit: ANGLE_ORB }),
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
      title: t('{a} ile {b} arasında {aspect}', { a: nm(c, a.a), b: nm(c, a.b), aspect: def.name.toLowerCase() }),
      rule: t('Açı neredeyse tam: orb {orb} (sınır {limit}°). Dar açılar haritanın en belirgin bağlantıları sayılır.', { orb: `${Math.floor(a.orb)}°${String(Math.round((a.orb % 1) * 60)).padStart(2, '0')}′`, limit: TIGHT_ORB }),
      meaning: `${ASPECT_LEARN[a.type]} ${learnPoint(a.a)?.title}: ${learnPoint(a.a)?.text} ${learnPoint(a.b)?.title}: ${learnPoint(a.b)?.text}`,
      uncertain: a.certainty && a.certainty !== 'kesin' ? t('Doğum saati bilinmiyor: bu Ay açısı günün bir kısmında yok (saate bağlı).') : a.certainty === 'kesin' ? t('Doğum saati bilinmiyor ama bu açı günün her saatinde var; gerçek orb bilinmiyor.') : undefined
    })
  }

  // 6) Kalıplar (büyük üçgen, T-kare, stelyum…)
  for (const p of aspectPatterns(c)) {
    out.push({ id: 'pat-' + p.name + p.points.join(), group: 'Kalıplar', points: p.points, title: `${t(p.name)}: ${p.points.map((x) => nm(c, x)).join(', ')}`, rule: p.detail, meaning: patternLearn(p.name) })
  }

  // 7) Gezegenlerin durumu: retrograd, en güçlü / en zayıf esas dignite
  const retro = pts.filter((p) => p.retro && !['sun', 'moon'].includes(p.id))
  if (retro.length) out.push({
    id: 'retro', group: 'Gezegenlerin durumu', points: retro.map((p) => p.id),
    title: t('Geri harekette görünen gezegenler: {names}', { names: retro.map((p) => p.name).join(', ') }),
    rule: t('Doğum anında Dünya\'dan bakıldığında bu gezegenler gökyüzünde geri gidiyor gibi görünüyordu (gerçek bir geri hareket değil, görünüş).'),
    meaning: t('Geleneksel olarak retrograd gezegenin temaları daha içe dönük ya da gecikmeli işleyen konular olarak yorumlanır.')
  })
  const rows = essentialDignities(c, sectUnknown(c) ? true : undefined)
  const best = [...rows].sort((a, b) => b.score - a.score)[0]
  const worst = [...rows].sort((a, b) => a.score - b.score)[0]
  if (best && best.score >= 5) out.push({ id: 'dign-best', group: 'Gezegenlerin durumu', points: [best.id], title: t('Lilly puanına göre en yüksek: {name} ({sign})', { name: nm(c, best.id), sign: SIGNS[best.sign].name }), rule: t('Lilly esas dignite puanı +{score}: {list}. Bu yalnızca bir geleneksel puanlama yöntemidir; gezegenin haritadaki durumu açılar, ev ve diğer etkenlerle birlikte değerlendirilir.', { score: best.score, list: best.has.join(', ') }) + (sectUnknown(c) ? ' ' + t('Doğum saati bilinmiyor: üçlük puanı gündüz varsayımıyla.') : ''), meaning: t('Geleneksel astrolojide gezegen kendi burcunda ya da yücelim burcundaysa "güçlü" (rahat, etkili) sayılır.') })
  if (worst && worst.score <= -5 && worst.id !== best?.id) out.push({ id: 'dign-worst', group: 'Gezegenlerin durumu', points: [worst.id], title: t('Lilly puanına göre en düşük: {name} ({sign})', { name: nm(c, worst.id), sign: SIGNS[worst.sign].name }), rule: t('Lilly esas dignite puanı {score}: {list}. Bu bir yöntem sonucudur, mutlak bir "zayıflık" değildir: puan yalnızca burçtaki esas digniteyi ölçer; açılar, ev konumu ve karşılıklı ağırlama hesaba katılmaz.', { score: worst.score, list: worst.has.join(', ') }), meaning: t('Geleneksel astrolojide gezegen zarar ya da düşüş burcundaysa ya da hiçbir esas dignitesi yoksa (peregrine), o burçta "kendi kaynaklarından yoksun" sayılır. Modern ekollerin çoğu bu puanlamayı kullanmaz.') })
  return out
}

/** Kalıp açıklaması: anahtar Türkçe kalıp adıdır (ör. "Stelyum (burç)" → "Stelyum"); metin okunduğu anda çevrilir */
const patternLearn = (name: string): string | undefined => {
  const m = PATTERN_LEARN[name.split(' (')[0]]
  return m === undefined ? undefined : t(m)
}

const PATTERN_LEARN: Record<string, string> = {
  'Büyük üçgen': 'Aynı elementte üç gezegenin birbirine üçgen açı yapması; geleneksel olarak doğal yetenek ve kolay akış ile ilişkilendirilir.',
  'T-kare': 'İki karşıt gezegenin üçüncü bir gezegene kare yapması; gerilim ve harekete geçirici bir odak olarak yorumlanır.',
  'Büyük haç': 'Dört gezegenin karşıt ve kare açılarla bir haç oluşturması; birden çok yönden gelen gerilim olarak yorumlanır.',
  Yod: 'İki gezegenin altmışlık yapıp üçüncüsüne quincunx yapması; "özel görev" ya da ayar gerektiren bir odak olarak anılır.',
  Uçurtma: 'Büyük üçgene karşıt bir gezegenin eklenmesi; uyumun bir hedefe yönlendirilmesi olarak yorumlanır.',
  'Mistik dikdörtgen': 'İki karşıtlığın üçgen ve altmışlıklarla bağlanması; gerilimle uyumun dengesi olarak yorumlanır.',
  Stelyum: 'Aynı burçta ya da evde dört veya daha fazla gezegen; o burcun ya da evin temalarının yoğunlaşması olarak yorumlanır. Kullanılan kural: 10 ana gezegenden en az 4 (Ay düğümü ve küçük cisimler sayılmaz). Bazı ekoller 3 gezegeni de stelyum sayar ya da orb (ör. 10°) şartı koyar.'
}

/** Düz dille kısa açılış: astrolojiden anlamayan biri için haritanın ne olduğu */
export const highlightsIntro = (): string =>
  t('Doğum haritası, doğduğunuz an ve yerde gökyüzünün bir fotoğrafıdır: Güneş, Ay ve gezegenlerin hangi burçta (gökyüzünün 12 bölümünden hangisinde) ve hangi evde (o yerin ufkuna göre 12 bölümden hangisinde) olduğunu gösterir. Bu sayfa, hesaplanan haritada sayısal olarak öne çıkan noktaları listeler ve her birinin geleneksel olarak ne anlama geldiğini kısaca anlatır. Her maddenin altında neden öne çıktığının kuralı yazılıdır.')
