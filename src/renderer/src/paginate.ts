// PDF sayfalaması. Rapor basılmadan önce, her sütunu bir A4 içerik alanı (186 × 271 mm) olan çok sütunlu bir düzende
// ölçülür; Chrome sütunları PDF sayfalarıyla aynı parçalama motoruyla böler, böylece hangi öğenin hangi sayfaya
// düştüğü tahmin edilmez, ölçülür. Kural ihlali bulundukça sayfa sonu eklenir ve yeniden ölçülür.
// Kurallar: (1) başlık sayfanın sonunda tek kalmaz (ilk paragraf ya da tablonun ilk satırları onunla gelir);
// (2) sayfanın son %15'inde yeni bölüm başlamaz; bölüm sayfaya sığmıyorsa son %35'te başlamaz; (3) bir sayfadan kısa kutu/öğe ve kısa tablo bölünmez;
// (4) uzun tablolar satır arasından bölünür, başlık satırı yeni sayfada tekrar eder (CSS).

const MM = 96 / 25.4
export const PAGE_W = 186 * MM
export const PAGE_H = (297 - 12 - 14) * MM
const MIN_LEFT = 0.15
const MIN_LEFT_SPLIT = 0.35 // bölüm bu sayfaya sığmıyorsa, başlaması için gereken en az boş alan
const SMALL_TABLE = 0.4 // sayfanın bu oranından kısa tablo bölünmez

export function paginate(root: HTMLElement, compact: boolean): { breaks: number; pages: number } {
  root.querySelectorAll('.pg-break').forEach((e) => e.classList.remove('pg-break'))
  root.classList.add('pg-measure')
  root.style.height = `${PAGE_H}px`
  const box = () => root.getBoundingClientRect()
  /** öğenin parçaları: [sütun (sayfa), üst, alt] */
  const frags = (e: Element) => {
    const b = box()
    return [...e.getClientRects()].filter((r) => r.height > 0).map((r) => ({ page: Math.round((r.left - b.left) / PAGE_W - 0.49), top: r.top - b.top, bottom: r.bottom - b.top }))
  }
  const first = (e: Element) => frags(e)[0]
  const last = (e: Element) => { const f = frags(e); return f[f.length - 1] }
  const heads = () => [...root.querySelectorAll('.p-sec > .p-h, .p-sec h3, .p-sec .cap')]
  const keeps = () => [...root.querySelectorAll('.p-summary-box, .p-timeline, .hl-item, .learn-item, .p-factor, .dist, .p-meta > div, .p-wheel, .p-two, table')]
  const breakTarget = (e: Element): Element => {
    // bölüm başlığı ise bölümün kendisi; başlıktan hemen sonra gelen öğe ise başlık
    if (e.matches('.p-h')) return e.parentElement!
    const prev = e.previousElementSibling
    if (prev && prev.matches('h3, .cap, .p-h')) return prev.matches('.p-h') ? prev.parentElement! : prev
    return e
  }
  let breaks = 0
  for (let iter = 0; iter < 60; iter++) {
    let changed = false
    for (const h of heads()) {
      const f = first(h)
      if (!f) continue
      const next = h.nextElementSibling
      const nf = next ? firstLineOf(next, frags) : undefined
      const sectionStart = h.matches('.p-h')
      const orphan = nf && nf.page > f.page
      // bölüm sayfanın altında başlayıp sonrakine taşıyorsa (sığmıyorsa) yeni sayfada başlasın
      const spills = sectionStart && (() => { const sf = frags(h.parentElement!); return new Set(sf.map((x) => x.page)).size > 1 })()
      const tooLow = sectionStart && f.top > 2 && (f.top > PAGE_H * (1 - MIN_LEFT) || (spills && f.top > PAGE_H * (1 - MIN_LEFT_SPLIT)))
      if ((orphan || tooLow) && !isAtPageTop(f)) { breakTarget(h).classList.add('pg-break'); breaks++; changed = true; break }
    }
    if (changed) continue
    for (const k of keeps()) {
      const fs = frags(k)
      if (fs.length < 2) continue
      const pages = new Set(fs.map((x) => x.page)).size
      if (pages < 2) continue
      const h = fs[fs.length - 1].bottom - fs[0].top + (pages - 1) * PAGE_H
      const small = k.matches('table') ? totalHeight(fs) < PAGE_H * SMALL_TABLE : totalHeight(fs) < PAGE_H * 0.95
      if (small && !isAtPageTop(fs[0]) && h > 0) { breakTarget(k).classList.add('pg-break'); breaks++; changed = true; break }
    }
    if (!changed) break
  }
  const lastFrag = [...root.children].map((c) => last(c)).filter(Boolean).pop()
  const pages = lastFrag ? lastFrag.page + 1 : 1
  root.classList.remove('pg-measure')
  root.style.height = ''
  void compact
  return { breaks, pages }
}

const isAtPageTop = (f: { top: number }) => f.top < 8
const totalHeight = (fs: { top: number; bottom: number }[]) => fs.reduce((s, x) => s + (x.bottom - x.top), 0)
/** öğenin ilk satırının konumu (tablo ise ilk veri satırı) */
function firstLineOf(e: Element, frags: (e: Element) => { page: number; top: number; bottom: number }[]) {
  const row = e.matches('table') ? e.querySelector('tbody tr') : e.querySelector('tbody tr, li, p, dt, .hl-item, .learn-item')
  return frags(row ?? e)[0] ?? frags(e)[0]
}
