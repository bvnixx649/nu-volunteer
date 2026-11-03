import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CaretRight, SignOut } from '@phosphor-icons/react'
import { api } from '../../data/api'
import type { Activity } from '../../data/types'
import { thDate, thTime } from '../../lib/format'
import { useDevice } from '../../store'

/** Interim supervisor home: the org's activities, newest first. The full home is P1. */
export default function SupHome() {
  const { sup, clearSup } = useDevice()
  const [list, setList] = useState<Activity[] | null>(null)
  useEffect(() => api.watchActivities(setList), [])
  if (!sup) return <Navigate to="/sup/login" replace />

  const mine = (list ?? []).filter((a) => sup.admin || a.orgCode === sup.orgCode).sort((a, b) => b.start - a.start)

  return (
    <main className="mx-auto max-w-2xl px-5 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted">{sup.orgName}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">สวัสดี {sup.name}</h1>
        </div>
        <button onClick={clearSup} className="pressable flex items-center gap-1.5 rounded-full px-3 py-2 text-muted" aria-label="ออกจากโหมดผู้คุม">
          <SignOut size={20} />
        </button>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">กิจกรรม</h2>
      {list && !mine.length && <p className="rounded-[var(--radius-card)] bg-surface p-6 text-muted">ยังไม่มีกิจกรรมของหน่วยงานนี้</p>}
      <ul className="flex flex-col gap-3">
        {mine.map((a) => (
          <li key={a.id}>
            <Link to={`/sup/a/${a.id}`} className="pressable flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft">
              <img src={a.poster} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-semibold">{a.title}</p>
                <p className="num mt-1 text-sm text-muted">
                  {thDate(a.start)} {thTime(a.start)} ถึง {thTime(a.end)} น.
                </p>
              </div>
              <CaretRight size={20} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
