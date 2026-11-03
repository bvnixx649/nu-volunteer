import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { api, now, type ClaimInput } from '../../data/api'
import type { Credit, Student } from '../../data/types'
import { precheck, type FailReason } from '../../lib/claim'
import { getFix, type GeoError } from '../../lib/geo'
import { haptic } from '../../lib/device'
import { verifyToken } from '../../lib/qr'
import { forgetPending, keyOf, onPendingOutcome, queueClaim, type Pending } from '../../lib/pending'
import { identify, useDevice } from '../../store'
import { Button } from '../../ui/Button'
import { IdentityForm } from './IdentityForm'
import { Checking, type Stage } from './Checking'
import { Success } from './Success'
import { Failure } from './Failure'
import { Waiting } from './Waiting'

type View =
  | { kind: 'form' }
  | { kind: 'confirm'; student: Student }
  | { kind: 'checking'; stage: Stage }
  | { kind: 'pending'; entry: Pending }
  | { kind: 'success'; credit: Credit }
  | { kind: 'fail'; reason: FailReason | 'offline'; credit?: Credit }

const ME_KEY = 'nuv:me'
const remember = (s: Student) => {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify({ id: s.id, name: s.name }))
  } catch {}
}
const recall = (): { id: string; name: string } | null => {
  try {
    return JSON.parse(localStorage.getItem(ME_KEY) ?? 'null')
  } catch {
    return null
  }
}

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
  // When the QR was scanned: the page opening is the scan, not the moment the form was filled in.
  const scannedAt = useRef(now())

  useEffect(() => {
    if (payload) api.getActivity(payload.a).then((a) => setTitle(a?.title ?? ''), () => setTitle(''))
  }, [payload])

  const run = useCallback(
    async (s: Student) => {
      setCurrent(s)
      setView({ kind: 'checking', stage: 'saving' })
      remember(s)
      // Set once the claim is fully worked out; if the write then fails the same input is kept for later.
      let ready: ClaimInput | undefined
      let activityTitle = title ?? ''
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
        activityTitle = activity.title
        ready = {
          activityId: activity.id,
          student: { id: s.id, name: s.name },
          hours: activity.hours,
          method: 'qr',
          flags: pre.flags,
          distance: pre.distance,
          accuracy: pre.accuracy,
          deviceId,
          ref: verified.ok ? verified.ref : undefined,
        }
        const res = await api.claim(ready)
        if (!res.ok && res.reason === 'offline') return keep(ready, activityTitle)
        if (res.ok) {
          forgetPending(activity.id, s.id)
          haptic.success()
          // The inbox note is a convenience; it must never hold up or break the success screen.
          api.addNotice({ studentId: s.id, kind: 'credit', title: `ได้รับ ${res.credit.hours} ชั่วโมง`, body: activity.title, activityId: activity.id }).catch(() => {})
          setView({ kind: 'success', credit: res.credit })
        } else fail({ reason: res.reason, credit: res.credit })
      } catch {
        // The QR itself was fine; the network or server was not. Keep the scan instead of losing it.
        if (ready) return keep(ready, activityTitle)
        if (first.ok && payload) {
          // The activity could not even be read. Location can still be checked against the QR; registration is checked on send.
          const fix = await getFix(5000).catch((e: GeoError) => e)
          const pre = precheck({ verified: first, activity: { walkIn: true }, hasCredit: false, registration: null, fix })
          return keep(
            {
              activityId: payload.a,
              student: { id: s.id, name: s.name },
              hours: payload.h,
              method: 'qr',
              flags: pre.ok ? pre.flags : [],
              distance: pre.ok ? pre.distance : undefined,
              accuracy: pre.ok ? pre.accuracy : undefined,
              deviceId,
              ref: first.ref,
            },
            activityTitle,
            true,
          )
        }
        fail({ reason: 'offline' })
      }
    },
    [payload, token, deviceId, first, title],
  )

  function keep(input: ClaimInput, activityTitle: string, unchecked?: boolean) {
    const entry = { input, scannedAt: scannedAt.current, token, title: activityTitle, unchecked }
    queueClaim(entry)
    const saved = { ...entry, tries: 0, nextAt: 0 }
    haptic.error()
    setView({ kind: 'pending', entry: saved })
  }

  // The kept scan reached the server while this screen is open: show what a normal claim shows.
  useEffect(() => {
    return onPendingOutcome((o) => {
      if (view.kind !== 'pending' || keyOf(o.entry) !== keyOf(view.entry)) return
      if (o.kind === 'sent') {
        haptic.success()
        setView({ kind: 'success', credit: o.credit })
      } else fail({ reason: o.reason === 'notRegistered' ? 'notRegistered' : o.reason === 'invalid' ? 'invalid' : 'offline' })
    })
  }, [view])

  function fail(f: { reason: FailReason | 'offline'; credit?: Credit }) {
    haptic.error()
    setView({ kind: 'fail', ...f })
  }

  // A phone that already knows its student goes straight to checking.
  useEffect(() => {
    if (started.current || !studentId || view.kind !== 'form') return
    started.current = true
    api
      .getStudent(studentId)
      .then((s) => (s ? run(s) : setView({ kind: 'form' })))
      // No connection to look the student up: the name saved on this phone is enough to keep the scan.
      .catch(() => {
        const me = recall()
        if (me && me.id === studentId) run({ id: me.id, name: me.name, createdAt: 0 })
        else fail({ reason: 'offline' })
      })
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
      {payload && view.kind !== 'success' && view.kind !== 'pending' && (
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
              <p className="text-muted">พบรหัส {view.student.id} ในระบบ</p>
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

          {view.kind === 'pending' && <Waiting entry={view.entry} />}

          {view.kind === 'success' && <Success credit={view.credit} title={title ?? ''} activityId={payload?.a ?? ''} />}

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
