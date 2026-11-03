import { ACC_CAP_M, RADIUS_DEFAULT } from '../config'

export interface Fix {
  lat: number
  lng: number
  acc: number
  at: number
}
export type GeoError = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** The activity's radius plus each side's GPS accuracy, capped. */
export const allowedRadius = (supAcc = 0, stuAcc = 0, radius = RADIUS_DEFAULT) => radius + Math.min(ACC_CAP_M, supAcc) + Math.min(ACC_CAP_M, stuAcc)

const toFix = (p: GeolocationPosition): Fix => ({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, at: p.timestamp })
const toErr = (e: GeolocationPositionError): GeoError => (e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable')

export function getFix(timeout = 12_000): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject('unsupported')
    navigator.geolocation.getCurrentPosition((p) => resolve(toFix(p)), (e) => reject(toErr(e)), {
      enableHighAccuracy: true,
      timeout,
      maximumAge: 20_000,
    })
  })
}

export function watchFix(onFix: (f: Fix) => void, onErr: (e: GeoError) => void) {
  if (!('geolocation' in navigator)) {
    onErr('unsupported')
    return () => {}
  }
  const id = navigator.geolocation.watchPosition((p) => onFix(toFix(p)), (e) => onErr(toErr(e)), {
    enableHighAccuracy: true,
    maximumAge: 10_000,
  })
  return () => navigator.geolocation.clearWatch(id)
}
