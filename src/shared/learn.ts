// Öğrenme modu: sembol sözlüğü (yorum katmanı). Hesaplama motorundan bağımsızdır; yalnızca hesaplanmış veriyi açıklar.
// İçerik tahmin değildir: astroloji geleneğinde yaygın kabul gören sembolik anlamları kısa ve tarafsız biçimde aktarır.
import type { AspectType } from './types'
import { t, tc } from './i18n'

/** Okunduğu anda çevrilen liste (dizi indeksleri getter) */
function lazyList(src: string[]): string[] {
  const a: string[] = []
  src.forEach((s, i) => Object.defineProperty(a, i, { get: () => t(s), enumerable: true }))
  return a
}
const entry = (title: string, text: string) => ({ get title() { return t(title) }, get text() { return t(text) } })

export const learnSource = (): string => t('Astroloji geleneğinde yaygın sembolik anlamlar (Batı astrolojisi; klasik ve modern kaynaklarda tekrarlanan anahtar kavramlar). Kişisel bir tahmin değildir.')
export const learnDisclaimer = (): string =>
  t('Bu açıklamalar astrolojik sembollerin geleneksel anlamlarını tanıtır. Gezegen konumları yüksek doğrulukla hesaplanır; ancak bu konumlardan kişilik ya da gelecek hakkında güvenilir sonuç çıkarılabildiği bilimsel olarak gösterilmemiştir. Açıklamalar olay tahmini değildir.')

export const PLANET_LEARN: Record<string, { title: string; text: string }> = {
  sun: entry('Güneş', 'Geleneksel olarak kimlik, irade, yaşam enerjisi ve kişinin kendini ifade etme biçimiyle ilişkilendirilir.'),
  moon: entry('Ay', 'Duygular, ihtiyaçlar, alışkanlıklar ve güven duygusuyla ilişkilendirilir. Gökyüzünün en hızlı cismidir; doğum saatine en duyarlı konumdur.'),
  mercury: entry('Merkür', 'Düşünme, iletişim, öğrenme, yazı ve kısa yolculuklarla ilişkilendirilir.'),
  venus: entry('Venüs', 'İlişkiler, değer verilen şeyler, uyum, estetik ve zevkle ilişkilendirilir.'),
  mars: entry('Mars', 'Eylem, istek, girişkenlik, rekabet ve sınır koyma ile ilişkilendirilir.'),
  jupiter: entry('Jüpiter', 'Büyüme, anlam arayışı, inançlar, eğitim ve fırsat temasıyla ilişkilendirilir.'),
  saturn: entry('Satürn', 'Yapı, sorumluluk, sınırlar, zaman, disiplin ve uzun vadeli hedeflerle ilişkilendirilir.'),
  uranus: entry('Uranüs', 'Modern astrolojide değişim, bağımsızlık, beklenmedik olan ve yenilikle ilişkilendirilir (1781\'de keşfedildi; geleneksel sistemde yer almaz).'),
  neptune: entry('Neptün', 'Modern astrolojide hayal gücü, idealler, belirsizlik ve sınırların çözülmesi temasıyla ilişkilendirilir.'),
  pluto: entry('Plüton', 'Modern astrolojide dönüşüm, güç, derinlik ve köklü değişim temasıyla ilişkilendirilir.'),
  chiron: entry('Chiron', 'Modern astrolojide yara ve iyileşme, öğretme ve öğrenme temasıyla ilişkilendirilen küçük bir cisimdir.'),
  northnode: entry('Ay düğümleri', 'Ay\'ın yörüngesinin ekliptiği kestiği noktalardır (gök cismi değildir). Gelişim yönü (Kuzey) ve alışılmış eğilimler (Güney) teması ile ilişkilendirilir; tutulmalar bu noktaların yakınında olur.'),
  asc: entry('Yükselen (AC)', 'Doğum anında doğu ufkunda yükselen burç derecesi. Kişinin dış dünyaya yaklaşımı ve ilk izlenimle ilişkilendirilir; doğum saatine çok duyarlıdır (yaklaşık her 4 dakikada 1°).'),
  mc: entry('Gökyüzü ortası (MC)', 'Doğum yerinin meridyeninde en yüksekteki ekliptik derecesi. Toplumsal rol, meslek ve hedeflerle ilişkilendirilir.')
}

export const SIGN_LEARN: string[] = lazyList([
  'Koç · ateş, öncü: başlatma, cesaret, doğrudanlık.',
  'Boğa · toprak, sabit: istikrar, beden ve duyular, sahip olunanlar.',
  'İkizler · hava, değişken: merak, iletişim, çok yönlülük.',
  'Yengeç · su, öncü: koruma, aidiyet, aile ve duygusal güvenlik.',
  'Aslan · ateş, sabit: yaratıcılık, kendini ifade, görünür olma.',
  'Başak · toprak, değişken: düzen, ayrıntı, hizmet ve beceri.',
  'Terazi · hava, öncü: denge, ilişki, adalet ve estetik.',
  'Akrep · su, sabit: yoğunluk, derinlik, bağlılık ve dönüşüm.',
  'Yay · ateş, değişken: anlam arayışı, keşif, inanç ve öğrenme.',
  'Oğlak · toprak, öncü: yapı, hedef, sorumluluk ve sabır.',
  'Kova · hava, sabit: topluluk, fikirler, bağımsızlık ve yenilik.',
  'Balık · su, değişken: duyarlılık, hayal gücü, şefkat ve sınırların belirsizleşmesi.'
])

export const HOUSE_LEARN: string[] = lazyList([
  '1. ev · kişinin kendisi, bedeni ve dünyaya yaklaşımı.',
  '2. ev · kaynaklar, para, değer verilen şeyler.',
  '3. ev · iletişim, kardeşler, yakın çevre, öğrenme.',
  '4. ev · ev, aile, kökler, özel yaşam.',
  '5. ev · yaratıcılık, eğlence, aşk ilişkileri, çocuklar.',
  '6. ev · günlük işler, çalışma düzeni, sağlık alışkanlıkları.',
  '7. ev · ortaklıklar, evlilik, açık ilişkiler.',
  '8. ev · paylaşılan kaynaklar, krizler, dönüşüm.',
  '9. ev · uzak yolculuk, yüksek öğrenim, inanç ve felsefe.',
  '10. ev · meslek, toplumsal konum, hedefler.',
  '11. ev · arkadaşlar, topluluklar, umutlar.',
  '12. ev · geri planda kalan, yalnızlık, iç dünya.'
])

export const ASPECT_LEARN: Partial<Record<AspectType, string>> = {
  get conjunction() { return t('Kavuşum (0°): iki sembolün enerjisinin birleşmesi ve birlikte çalışması.') },
  get opposition() { return t('Karşıt (180°): iki tema arasında karşılıklılık, denge arayışı ya da gerilim.') },
  get square() { return t('Kare (90°): iki tema arasında sürtünme ve harekete geçirme; gerilimli açı olarak bilinir.') },
  get trine() { return t('Üçgen (120°): iki tema arasında kolay akış ve uyum; uyumlu açı olarak bilinir.') },
  get sextile() { return t('Altmışlık (60°): iki tema arasında fırsat ve iş birliği; hafif uyumlu açı.') },
  get quincunx() { return t('Quincunx (150°): uyumsuz iki tema arasında ayar yapma ihtiyacı.') },
  get semisextile() { return t('Yarım altmışlık (30°): komşu burçlar arası hafif bağlantı (minör açı).') },
  get semisquare() { return t('Yarım kare (45°): hafif sürtünme (minör açı).') },
  get sesquiquadrate() { return t('Bir buçuk kare (135°): hafif gerilim (minör açı).') },
  get quintile() { return t('Kuintil (72°): yetenek ve yaratıcılıkla ilişkilendirilen minör açı.') },
  get biquintile() { return t('Bikuintil (144°): yetenek ve yaratıcılıkla ilişkilendirilen minör açı.') }
}

export const transitLearn = (): string =>
  t('Transit: bugünkü (ya da seçilen tarihteki) gökyüzündeki bir gezegenin doğum haritasındaki bir noktayla yaptığı açı. Kesinleşme tarihi açının tam olduğu andır; etkinlik dönemi ise gezegenin seçilen orb içinde kaldığı süredir. Yavaş gezegenlerin (Jüpiter–Plüton) transitleri aylarca sürebilir ve retrograd hareket nedeniyle aynı açı birkaç kez kesinleşebilir.')

export const learnPoint = (id: string) => PLANET_LEARN[id === 'southnode' ? 'northnode' : id]

/** Tek bir transit olayının düz dille açıklaması (hesaplanmış veriden; tahmin içermez) */
export function transitExplain(e: { transit: string; natal?: string; type: string; house?: number; pass?: { n: number; of: number }; window?: { start: string; end: string; orb: number; segments?: { start: string; end: string }[] } }, fmt: (iso: string) => string): string[] {
  const T = learnPoint(e.transit)
  const lines: string[] = []
  const planet = T?.title ?? e.transit
  if (!e.natal) {
    if (e.type === 'ingress') lines.push(t('{planet} yeni bir burca geçiyor. Burç geçişleri gökyüzündeki genel değişimlerdir; herkes için aynı tarihte olur, doğum haritasına özel değildir.', { planet }))
    else lines.push(t("{planet} bu tarihte yön değiştiriyor (duraklama). Dünya'dan bakıldığında gezegen birkaç gün neredeyse duruyor gibi görünür; bu da gökyüzündeki genel bir olaydır.", { planet }))
    if (T) lines.push(`${T.title}: ${T.text}`)
    return lines
  }
  const N = learnPoint(e.natal)
  lines.push(t('Gökyüzündeki {planet}, doğum haritanızdaki {natal} ile {aspect} açısı yapıyor.', { planet, natal: N?.title ?? e.natal, aspect: ASPECT_LEARN[e.type as AspectType]?.split(':')[0]?.toLowerCase() ?? '' }))
  if (T) lines.push(`${T.title}: ${T.text}`)
  if (N && e.natal !== e.transit) lines.push(t('Doğum haritasındaki {title}: {text}', { title: N.title, text: N.text }))
  else if (N) lines.push(t('Gezegen kendi doğum konumuyla açı yapıyor ("dönüş" ve "döngü" transitleri; örneğin Satürn döngüsü yaklaşık 29,5 yıldır).'))
  const a = ASPECT_LEARN[e.type as AspectType]
  if (a) lines.push(t('Açı: {text}', { text: a }))
  if (e.house) lines.push(t('{planet} bu sırada doğum haritanızın {house}. evinden geçiyor; bu ev geleneksel olarak {theme} ile ilişkilendirilir.', { planet: T?.title ?? tc('cümle', 'Gezegen'), house: e.house, theme: HOUSE_LEARN[e.house - 1].split(' · ')[1].replace(/\.$/, '') }))
  if (e.window) lines.push(t('Etkinlik dönemi: {start} – {end} (gezegen ±{orb}° orb içinde).', { start: fmt(e.window.start), end: fmt(e.window.end), orb: e.window.orb }) + (e.pass && e.pass.of > 1 ? ' ' + t('Gezegen geri ve ileri hareket ettiği için bu açı {of} kez tam oluyor; bu, {n}. kez.', { of: e.pass.of, n: e.pass.n }) : ''))
  if (e.window?.segments) lines.push(t('Gezegen bu süre içinde orb dışına çıkıp yeniden giriyor; orb içinde kaldığı parçalar: {parts}.', { parts: e.window.segments.map((s) => `${fmt(s.start)} – ${fmt(s.end)}`).join(' · ') }))
  lines.push(t('Bu bir olay tahmini değil; astrolojik sembollerin geleneksel anlamlarının birleşimidir.'))
  return lines
}
