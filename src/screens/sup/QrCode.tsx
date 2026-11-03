import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** Renders `value` as a crisp SVG QR that scales to its box. Dark modules on white, always. */
export function QrCode({ value, token, className = '' }: { value: string; token: string; className?: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let live = true
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1a1918', light: '#ffffff' } }).then((s) => live && setSvg(s))
    return () => {
      live = false
    }
  }, [value])
  return (
    <div
      data-token={token}
      role="img"
      aria-label="QR รับชั่วโมง"
      className={`aspect-square [&>svg]:size-full ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
