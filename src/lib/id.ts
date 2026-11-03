/** Short random id for new activities: 10 characters from 0-9 and a-z, about 52 bits. Appears in URLs and QR codes. */
export function newId(len = 10) {
  const abc = '0123456789abcdefghijklmnopqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => abc[b % abc.length]).join('')
}
