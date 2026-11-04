/** Türkçe karakterleri sadeleştirerek arama yapar ("şükrü" ↔ "sukru") */
export function fold(s: string): string {
  return s
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
