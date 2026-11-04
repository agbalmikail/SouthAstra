// İsteğe bağlı çevrimiçi adres arama (OpenStreetMap Nominatim). Yalnızca kullanıcı düğmeye basınca çalışır.
// Kullanım kuralları: saniyede en fazla 1 istek, tanımlayıcı User-Agent. https://operations.osmfoundation.org/policies/nominatim/
import type { Place } from '@shared/types'
import { nearest } from './cities'

let last = 0

export async function addressSearch(q: string): Promise<(Place & { display: string })[]> {
  const query = q.trim()
  if (query.length < 3) return []
  const wait = last + 1100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  last = Date.now()
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&accept-language=tr&q=${encodeURIComponent(query)}`
  let res: Response
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'SouthAstra/0.3 (desktop astrology software)' }, signal: AbortSignal.timeout(10000) })
  } catch {
    throw new Error('İnternete bağlanılamadı. Çevrimdışı yer listesini kullanın veya koordinatı elle girin.')
  }
  if (!res.ok) throw new Error(`Adres servisi yanıt vermedi (${res.status}). Biraz sonra tekrar deneyin.`)
  const data = (await res.json()) as { lat: string; lon: string; name?: string; display_name: string; address?: Record<string, string> }[]
  const seen = new Set<string>()
  return data.filter((d) => {
    // aynı yolun parçaları gibi birbirine çok yakın tekrarları ayıkla
    const k = `${d.name ?? d.display_name}|${(+d.lat).toFixed(2)}|${(+d.lon).toFixed(2)}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).map((d) => {
    const lat = +(+d.lat).toFixed(5)
    const lon = +(+d.lon).toFixed(5)
    const a = d.address ?? {}
    const n = nearest(lat, lon)
    const street = [a.road, a.house_number].filter(Boolean).join(' ')
    return {
      name: street || d.name || d.display_name.split(',')[0],
      district: a.suburb || a.quarter || a.city_district || a.town || a.village || '',
      region: a.city || a.state || '',
      country: a.country || '',
      countryCode: a.country_code?.toUpperCase(),
      lat, lon,
      tz: n?.tz ?? 'UTC',
      precision: 'Adres (OpenStreetMap)',
      display: d.display_name
    }
  })
}
