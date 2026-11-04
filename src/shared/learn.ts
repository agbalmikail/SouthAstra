// Öğrenme modu: sembol sözlüğü (yorum katmanı). Hesaplama motorundan bağımsızdır; yalnızca hesaplanmış veriyi açıklar.
// İçerik tahmin değildir: astroloji geleneğinde yaygın kabul gören sembolik anlamları kısa ve tarafsız biçimde aktarır.
import type { AspectType } from './types'

export const LEARN_SOURCE = 'Astroloji geleneğinde yaygın sembolik anlamlar (Batı astrolojisi; klasik ve modern kaynaklarda tekrarlanan anahtar kavramlar). Kişisel bir tahmin değildir.'
export const LEARN_DISCLAIMER =
  'Bu açıklamalar astrolojik sembollerin geleneksel anlamlarını tanıtır. Gezegen konumları yüksek doğrulukla hesaplanır; ancak bu konumlardan kişilik ya da gelecek hakkında güvenilir sonuç çıkarılabildiği bilimsel olarak gösterilmemiştir. Açıklamalar olay tahmini değildir.'

export const PLANET_LEARN: Record<string, { title: string; text: string }> = {
  sun: { title: 'Güneş', text: 'Geleneksel olarak kimlik, irade, yaşam enerjisi ve kişinin kendini ifade etme biçimiyle ilişkilendirilir.' },
  moon: { title: 'Ay', text: 'Duygular, ihtiyaçlar, alışkanlıklar ve güven duygusuyla ilişkilendirilir. Gökyüzünün en hızlı cismidir; doğum saatine en duyarlı konumdur.' },
  mercury: { title: 'Merkür', text: 'Düşünme, iletişim, öğrenme, yazı ve kısa yolculuklarla ilişkilendirilir.' },
  venus: { title: 'Venüs', text: 'İlişkiler, değer verilen şeyler, uyum, estetik ve zevkle ilişkilendirilir.' },
  mars: { title: 'Mars', text: 'Eylem, istek, girişkenlik, rekabet ve sınır koyma ile ilişkilendirilir.' },
  jupiter: { title: 'Jüpiter', text: 'Büyüme, anlam arayışı, inançlar, eğitim ve fırsat temasıyla ilişkilendirilir.' },
  saturn: { title: 'Satürn', text: 'Yapı, sorumluluk, sınırlar, zaman, disiplin ve uzun vadeli hedeflerle ilişkilendirilir.' },
  uranus: { title: 'Uranüs', text: 'Modern astrolojide değişim, bağımsızlık, beklenmedik olan ve yenilikle ilişkilendirilir (1781\'de keşfedildi; geleneksel sistemde yer almaz).' },
  neptune: { title: 'Neptün', text: 'Modern astrolojide hayal gücü, idealler, belirsizlik ve sınırların çözülmesi temasıyla ilişkilendirilir.' },
  pluto: { title: 'Plüton', text: 'Modern astrolojide dönüşüm, güç, derinlik ve köklü değişim temasıyla ilişkilendirilir.' },
  chiron: { title: 'Chiron', text: 'Modern astrolojide yara ve iyileşme, öğretme ve öğrenme temasıyla ilişkilendirilen küçük bir cisimdir.' },
  northnode: { title: 'Ay düğümleri', text: 'Ay\'ın yörüngesinin ekliptiği kestiği noktalardır (gök cismi değildir). Gelişim yönü (Kuzey) ve alışılmış eğilimler (Güney) teması ile ilişkilendirilir; tutulmalar bu noktaların yakınında olur.' },
  asc: { title: 'Yükselen (AC)', text: 'Doğum anında doğu ufkunda yükselen burç derecesi. Kişinin dış dünyaya yaklaşımı ve ilk izlenimle ilişkilendirilir; doğum saatine çok duyarlıdır (yaklaşık her 4 dakikada 1°).' },
  mc: { title: 'Gökyüzü ortası (MC)', text: 'Doğum yerinin meridyeninde en yüksekteki ekliptik derecesi. Toplumsal rol, meslek ve hedeflerle ilişkilendirilir.' }
}

export const SIGN_LEARN: string[] = [
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
]

export const HOUSE_LEARN: string[] = [
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
]

export const ASPECT_LEARN: Partial<Record<AspectType, string>> = {
  conjunction: 'Kavuşum (0°): iki sembolün enerjisinin birleşmesi ve birlikte çalışması.',
  opposition: 'Karşıt (180°): iki tema arasında karşılıklılık, denge arayışı ya da gerilim.',
  square: 'Kare (90°): iki tema arasında sürtünme ve harekete geçirme; gerilimli açı olarak bilinir.',
  trine: 'Üçgen (120°): iki tema arasında kolay akış ve uyum; uyumlu açı olarak bilinir.',
  sextile: 'Altmışlık (60°): iki tema arasında fırsat ve iş birliği; hafif uyumlu açı.',
  quincunx: 'Quincunx (150°): uyumsuz iki tema arasında ayar yapma ihtiyacı.',
  semisextile: 'Yarım altmışlık (30°): komşu burçlar arası hafif bağlantı (minör açı).',
  semisquare: 'Yarım kare (45°): hafif sürtünme (minör açı).',
  sesquiquadrate: 'Bir buçuk kare (135°): hafif gerilim (minör açı).',
  quintile: 'Kuintil (72°): yetenek ve yaratıcılıkla ilişkilendirilen minör açı.',
  biquintile: 'Bikuintil (144°): yetenek ve yaratıcılıkla ilişkilendirilen minör açı.'
}

export const TRANSIT_LEARN =
  'Transit: bugünkü (ya da seçilen tarihteki) gökyüzündeki bir gezegenin doğum haritasındaki bir noktayla yaptığı açı. Kesinleşme tarihi açının tam olduğu andır; etkinlik dönemi ise gezegenin seçilen orb içinde kaldığı süredir. Yavaş gezegenlerin (Jüpiter–Plüton) transitleri aylarca sürebilir ve retrograd hareket nedeniyle aynı açı birkaç kez kesinleşebilir.'

export const learnPoint = (id: string) => PLANET_LEARN[id === 'southnode' ? 'northnode' : id]

/** Tek bir transit olayının düz dille açıklaması (hesaplanmış veriden; tahmin içermez) */
export function transitExplain(e: { transit: string; natal?: string; type: string; house?: number; pass?: { n: number; of: number }; window?: { start: string; end: string; orb: number } }, fmt: (iso: string) => string): string[] {
  const T = learnPoint(e.transit)
  const lines: string[] = []
  if (!e.natal) {
    if (e.type === 'ingress') lines.push(`${T?.title ?? e.transit} yeni bir burca geçiyor. Burç geçişleri gökyüzündeki genel değişimlerdir; herkes için aynı tarihte olur, doğum haritasına özel değildir.`)
    else lines.push(`${T?.title ?? e.transit} bu tarihte yön değiştiriyor (duraklama). Dünya'dan bakıldığında gezegen birkaç gün neredeyse duruyor gibi görünür; bu da gökyüzündeki genel bir olaydır.`)
    if (T) lines.push(`${T.title}: ${T.text}`)
    return lines
  }
  const N = learnPoint(e.natal)
  lines.push(`Gökyüzündeki ${T?.title ?? e.transit}, doğum haritanızdaki ${N?.title ?? e.natal} ile ${ASPECT_LEARN[e.type as AspectType]?.split(':')[0]?.toLowerCase() ?? ''} açısı yapıyor.`)
  if (T) lines.push(`${T.title}: ${T.text}`)
  if (N && e.natal !== e.transit) lines.push(`Doğum haritasındaki ${N.title}: ${N.text}`)
  else if (N) lines.push(`Gezegen kendi doğum konumuyla açı yapıyor ("dönüş" ve "döngü" transitleri; örneğin Satürn döngüsü yaklaşık 29,5 yıldır).`)
  const a = ASPECT_LEARN[e.type as AspectType]
  if (a) lines.push(`Açı: ${a}`)
  if (e.house) lines.push(`${T?.title ?? 'Gezegen'} bu sırada doğum haritanızın ${e.house}. evinden geçiyor; bu ev geleneksel olarak ${HOUSE_LEARN[e.house - 1].split(' · ')[1].replace(/\.$/, '')} ile ilişkilendirilir.`)
  if (e.window) lines.push(`Etkinlik dönemi: ${fmt(e.window.start)} – ${fmt(e.window.end)} (gezegen ±${e.window.orb}° orb içinde).${e.pass && e.pass.of > 1 ? ` Gezegen geri ve ileri hareket ettiği için bu açı ${e.pass.of} kez tam oluyor; bu, ${e.pass.n}. kez.` : ''}`)
  lines.push('Bu bir olay tahmini değil; astrolojik sembollerin geleneksel anlamlarının birleşimidir.')
  return lines
}
