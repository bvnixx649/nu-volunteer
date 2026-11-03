import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { api, now } from '../../data/api'
import type { Credit, Student } from '../../data/types'
import { precheck, type FailReason } from '../../lib/claim'
import { getFix, type GeoError } from '../../lib/geo'
import { haptic } from '../../lib/device'
import { verifyToken } from '../../lib/qr'
import { identify, useDevice } from '../../store'
import { Button } from '../../ui/Button'
import { IdentityForm } from './IdentityForm'
import { Checking, type Stage } from './Checking'
import { Success } from './Success'
import { Failure } from './Failure'

type View =
  | { kind: 'form' }
  | { kind: 'confirm'; student: Student }
  | { kind: 'checking'; stage: Stage }
  | { kind: 'success'; credit: Credit }
  | { kind: 'fail'; reason: FailReason | 'offline'; credit?: Credit }

/** The page a phone camera opens from the supervisor's QR. Everything happens here, no sign-up first. */
export default function Claim() {
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  const { studentId, deviceId, setStudent } = useDevice()
  // Read the card details from the QR itself so they show before anything loads.
  const first = useMemo(() => verifyToken(token, now()), [token])
  const payload = first.ok ? first.p : null
  // A broken or expired dynamic QR fails right away instead of asking for details first.
  const [view, setView] = useState<View>(() =>
    !first.ok && (first.reason === 'invalid' || first.reason === 'expired') ? { kind: 'fail', reason: first.reason } : { kind: 'form' },
  )
  const [student, setCurrent] = useState<Student | null>(null)
  // The QR carries only the id and hours (a short QR scans from further away); the title comes from storage.
  const [title, setTitle] = useState<string>()
  const started = useRef(false)

  useEffect(() => {
    if (payload) api.getActivity(payload.a).then((a) => setTitle(a?.title ?? ''), () => setTitle(''))
  }, [payload])

  const run = useCallback(
    async (s: Student) => {
      setCurrent(s)
      setView({ kind: 'checking', stage: 'saving' })
      try {
        const activityId = payload?.a ?? ''
        const activity = await api.getActivity(activityId)
        if (!activity) return setView({ kind: 'fail', reason: 'invalid' })
        const verified = verifyToken(token, now(), activity)
        const [credit, registration] = await Promise.all([api.getCredit(activity.id, s.id), api.getRegistration(activity.id, s.id)])

        // Cheap checks first, so nobody waits for GPS just to hear the QR expired.
        const early = precheck({ verified, activity: { ...activity, locMode: 'off' }, hasCredit: !!credit, registration, fix: null })
        if (!early.ok) return fail(early.reason === 'already' ? { reason: 'already', credit: credit ?? undefined } : early)

        let fix = null
        if (activity.locMode !== 'off') {
          setView({ kind: 'checking', stage: 'locating' })
          fix = await getFix().catch((e: GeoError) => e)
        }
        const pre = precheck({ verified, activity, hasCredit: false, registration, fix })
        if (!pre.ok) return fail(pre)

        setView({ kind: 'checking', stage: 'saving' })
        const res = await api.claim({
          activityId: activity.id,
          student: { id: s.id, name: s.name },
          hours: activity.hours,
          method: 'qr',
          flags: pre.flags,
          distance: pre.distance,
          accuracy: pre.accuracy,
          deviceId,
          ref: verified.ok ? verified.ref : undefined,
        })
        if (res.ok) {
          haptic.success()
          setView({ kind: 'success', credit: res.credit })
        } else fail({ reason: res.reason, credit: res.credit })
      } catch {
        fail({ reason: 'offline' })
      }
    },
    [payload, token, deviceId],
  )

  function fail(f: { reason: FailReason | 'offline'; credit?: Credit }) {
    haptic.error()
    setView({ kind: 'fail', ...f })
  }

  // A phone that already knows its student goes straight to checking.
  useEffect(() => {
    if (started.current || !studentId || view.kind !== 'form') return
    started.current = true
    api.getStudent(studentId).then((s) => (s ? run(s) : setView({ kind: 'form' })))
  }, [studentId, view.kind, run])

  const submit = async (id: string, name: string) => {
    // Looking the student up needs the network too; without it nobody gets a ticket.
    let r: Awaited<ReturnType<typeof identify>>
    try {
      r = await identify(id, name)
    } catch {
      return fail({ reason: 'offline' })
    }
    if (r.kind === 'existing') return setView({ kind: 'confirm', student: r.student })
    setStudent(r.student.id)
    run(r.student)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      {payload && view.kind !== 'success' && (
        <header className="mb-8 flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">กำลังรับชั่วโมงจาก</p>
            {title === undefined ? (
              <span className="mt-1 block h-5 w-48 max-w-full animate-pulse rounded-full bg-surface-2" />
            ) : (
              <p className="line-clamp-2 font-semibold">{title || 'กิจกรรมจิตอาสา'}</p>
            )}
          </div>
          <p className="num shrink-0 rounded-full bg-accent-soft px-3 py-1.5 font-bold text-accent-strong">{payload.h} ชม.</p>
        </header>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={view.kind}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          {view.kind === 'form' && <IdentityForm onSubmit={submit} />}

          {view.kind === 'confirm' && (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-bold">ใช่ {view.student.name} ไหม</h1>
              <p className="text-muted">รหัส {view.student.id} ลงชื่อไว้ในระบบแล้ว</p>
              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={() => {
                  setStudent(view.student.id)
                  run(view.student)
                }}
              >
                ใช่ รับชั่วโมง
              </Button>
              <Button size="lg" variant="secondary" className="w-full" onClick={() => setView({ kind: 'form' })}>
                ไม่ใช่ แก้รหัส
              </Button>
            </div>
          )}

          {view.kind === 'checking' && <Checking stage={view.stage} />}

          {view.kind === 'success' && <Success credit={view.credit} title={title ?? ''} />}

          {view.kind === 'fail' && (
            <Failure
              reason={view.reason}
              onRetry={() => (student ? run(student) : setView({ kind: 'form' }))}
              onShowTicket={() => view.credit && setView({ kind: 'success', credit: view.credit })}
            />
          )}
        </motion.section>
      </AnimatePresence>
    </main>
  )
}
