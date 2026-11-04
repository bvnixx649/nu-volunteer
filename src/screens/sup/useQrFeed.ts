import { useEffect, useMemo, useState } from 'react'
import { now } from '../../data/api'
import type { Activity } from '../../data/types'
import { qrWindowMs } from '../../config'
import { checkinOf } from '../../lib/checkin'
import { watchFix, type Fix, type GeoError } from '../../lib/geo'
import { claimUrl, makeToken, windowOf } from '../../lib/qr'

/** The current QR window in server time. Re-renders once per window, and at once when the interval changes. */
function useWindow(enabled: boolean, interval: number) {
  const [, setTick] = useState(0)
  const w = windowOf(now(), interval)
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => windowOf(now(), interval) !== w && setTick((n) => n + 1), 250)
    return () => clearInterval(t)
  }, [enabled, interval, w])
  return w
}

/**
 * Everything a screen needs to show the real QR: the GPS fix (when the activity checks location),
 * the window that rotates the token, and the claim URL. Timers and the location watch live only
 * as long as the component that calls it is mounted, and `locate: false` holds the GPS back.
 */
export function useQrFeed(activity: Activity | null | undefined, { locate = true }: { locate?: boolean } = {}) {
  const [fix, setFix] = useState<Fix | null>(null)
  const [geoErr, setGeoErr] = useState<GeoError | null>(null)
  const { locMode, qrInterval: interval } = checkinOf(activity ?? {})
  const checksLocation = !!activity && locMode === 'on'
  useEffect(() => {
    if (!checksLocation || !locate) return
    return watchFix(
      (f) => {
        setFix(f)
        setGeoErr(null)
      },
      setGeoErr,
    )
  }, [checksLocation, locate])

  const dynamic = activity?.qrMode !== 'static'
  const w = useWindow(dynamic, interval)
  // A static QR only changes once, when the first GPS fix arrives.
  const coords = fix && checksLocation ? { la: +fix.lat.toFixed(6), lo: +fix.lng.toFixed(6), ac: Math.round(fix.acc) } : null
  const coordKey = dynamic ? JSON.stringify(coords) : coords ? 'fixed' : 'none'
  const token = useMemo(
    () => (activity ? makeToken({ a: activity.id, h: activity.hours, ...coords }, activity.qrMode, w * qrWindowMs(interval), interval) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activity?.id, activity?.hours, activity?.qrMode, w, interval, coordKey],
  )
  return { token, url: claimUrl(token), interval, dynamic, window: w, checksLocation, fix, geoErr }
}
