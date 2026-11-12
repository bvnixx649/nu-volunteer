import type { Credit, Registration } from '../data/types'

export type RosterFilter = 'all' | 'credited' | 'notScanned' | 'walkIn' | 'flagged'

/** When and by whom a credit was made: "สแกน 09:05 น." or "เพิ่มโดย พี่เต้ 09:05 น.". "แก้โดย" is added only when the hours were edited after. */
export function creditWhen(c: Pick<Credit, 'method' | 'at' | 'editedBy' | 'editedAt'>): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const d = new Date(c.at)
  const time = `${p(d.getHours())}:${p(d.getMinutes())} น.`
  const first = c.method === 'manual' ? `เพิ่มโดย ${c.editedBy ?? 'ผู้ดูแล'} ${time}` : `สแกน ${time}`
  return c.editedAt && c.editedBy ? `${first} แก้โดย ${c.editedBy}` : first
}

export interface RosterRow {
  studentId: string
  name: string
  reg?: Registration
  credit?: Credit
}

/** A whole number of hours from 0 up to the activity's full hours, or null. */
export function validHours(input: string, full: number): number | null {
  if (!/^\d+$/.test(input)) return null
  const n = Number(input)
  return n <= full ? n : null
}

const keep: Record<RosterFilter, (r: RosterRow) => boolean> = {
  all: () => true,
  credited: (r) => !!r.credit,
  notScanned: (r) => !r.credit,
  walkIn: (r) => !!r.reg?.walkIn,
  flagged: (r) => !!r.credit?.flags.length,
}

/** Merges registrations and credits into one list: newest scans first, then everyone still to scan. */
export function rosterRows(regs: Registration[], credits: Credit[], filter: RosterFilter, q: string): RosterRow[] {
  const rows = new Map<string, RosterRow>()
  for (const r of regs) if (!r.cancelledAt) rows.set(r.studentId, { studentId: r.studentId, name: r.name, reg: r })
  for (const c of credits) rows.set(c.studentId, { ...rows.get(c.studentId), studentId: c.studentId, name: c.name, credit: c })

  const query = q.trim()
  const match = (r: RosterRow) => !query || (/^\d+$/.test(query) ? r.studentId.startsWith(query) : r.name.includes(query))

  return [...rows.values()]
    .filter((r) => keep[filter](r) && match(r))
    .sort((a, b) => (b.credit?.at ?? -1) - (a.credit?.at ?? -1) || a.name.localeCompare(b.name, 'th'))
}

export interface NumberedCredit {
  n: number
  credit: Credit
}

/** The credited list in the order hours were given, numbered, then narrowed by an id prefix or a name fragment. Numbers stay put while searching. */
export function creditList(credits: Credit[], q: string): NumberedCredit[] {
  const query = q.trim()
  const all = [...credits].sort((a, b) => a.at - b.at).map((credit, i) => ({ n: i + 1, credit }))
  if (!query) return all
  return all.filter(({ credit: c }) => (/^\d+$/.test(query) ? c.studentId.startsWith(query) : c.name.includes(query)))
}
