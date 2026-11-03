import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { FileXls } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api } from '../../data/api'
import type { Activity, Credit, Registration } from '../../data/types'
import { downloadSupXlsx, SUP_COLUMNS, supRows } from '../../lib/excel'
import { useDevice } from '../../store'
import { BackBar } from '../../ui/BackBar'
import { Button } from '../../ui/Button'

const NUMERIC = new Set(['ลำดับ', 'ชั่วโมง'])

/** The supervisor's Excel as a web table (SPEC 12), so the roster can be checked and copied from a laptop. Live. */
export default function SupRoster() {
  const { id = '' } = useParams()
  const sup = useDevice((s) => s.sup)
  const [activity, setActivity] = useState<Activity | null | undefined>()
  const [regs, setRegs] = useState<Registration[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  useEffect(() => api.watchActivity(id, setActivity), [id])
  useEffect(() => api.watchRegistrations(id, setRegs), [id])
  useEffect(() => api.watchCredits(id, setCredits), [id])

  const rows = useMemo(() => (activity ? supRows(activity, regs, credits) : []), [activity, regs, credits])

  if (!sup) return <Navigate to="/sup/login" replace />
  if (activity === undefined) return null
  if (!activity) return <p className="p-6 text-muted">ไม่พบกิจกรรมนี้</p>

  const download = async () => {
    try {
      await downloadSupXlsx(activity, regs, credits)
      toast.success('ดาวน์โหลดไฟล์ Excel แล้ว')
    } catch {
      toast.error('สร้างไฟล์ Excel ไม่ได้')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-4 pb-12">
      <BackBar fallback={`/sup/a/${id}`} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">ตรวจสอบรายชื่อ</h1>
          <p className="mt-1 line-clamp-2 text-muted">{activity.title}</p>
          <p className="num mt-1 text-muted">{rows.length} รายชื่อ</p>
        </div>
        <Button onClick={download} disabled={!rows.length}>
          <FileXls size={20} /> โหลด Excel
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[var(--radius-card)] bg-surface px-5 py-8 text-center text-muted">ยังไม่มีรายชื่อ</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-soft">
          <table className="w-full min-w-[56rem] border-collapse text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                {SUP_COLUMNS.map((h) => (
                  <th key={h} className={`px-3 py-3 font-medium whitespace-nowrap ${NUMERIC.has(h) ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r['รหัสนิสิต']} className={r['สถานะ'] === 'ไม่มา' ? 'text-muted' : ''}>
                  {SUP_COLUMNS.map((h) => (
                    <td key={h} className={`px-3 py-2.5 ${NUMERIC.has(h) || h === 'รหัสนิสิต' || h === 'เวลายืนยัน' || h === 'วันที่' ? 'num whitespace-nowrap' : h === 'ชื่อ' ? 'whitespace-nowrap' : ''} ${NUMERIC.has(h) ? 'text-right' : ''}`}>
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
