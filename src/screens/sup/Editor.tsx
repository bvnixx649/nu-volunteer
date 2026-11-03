import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CaretLeft, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api } from '../../data/api'
import type { Activity, CategoryKey } from '../../data/types'
import { applyCategory, blankDraft, check, DEFAULT_KEYS, draftOf, isDirty, STEP_COUNT, toEdit, toNewActivity, type Draft } from '../../lib/draft'
import { canEdit } from '../../lib/stage'
import { useDevice, type SupSession } from '../../store'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { StepCategory, StepCheckin, StepContact, StepPeople, StepReview, StepTitle, StepWhen, TITLES } from './EditorSteps'

const slide = {
  enter: (dir: number) => ({ x: dir * 36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -36, opacity: 0, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] as const } }),
}

/** Create (/sup/new) and edit (/sup/edit/:id) share this flow. Edit starts on the review step. */
export default function Editor() {
  const { id } = useParams()
  const sup = useDevice((s) => s.sup)
  const [saved, setSaved] = useState<Activity | null | undefined>(id ? undefined : null)

  useEffect(() => {
    if (id) api.getActivity(id).then(setSaved)
  }, [id])

  if (!sup) return <Navigate to="/sup/login" replace />
  if (id && saved === undefined) return null
  if (id && !saved) return <Blocked text="ไม่พบกิจกรรมนี้" to="/sup" back="กลับหน้าแรก" />
  if (id && saved && !canEdit(saved)) return <Blocked text="ส่งรายชื่อแล้ว แก้ไขกิจกรรมไม่ได้" to={`/sup/a/${id}`} back="กลับไปหน้ากิจกรรม" />
  return <Flow sup={sup} saved={saved ?? null} />
}

function Blocked({ text, to, back }: { text: string; to: string; back: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-5 py-10">
      <h1 className="text-2xl leading-snug font-bold">{text}</h1>
      <Link to={to} replace>
        <Button size="lg" className="w-full">
          {back}
        </Button>
      </Link>
    </main>
  )
}

function Flow({ sup, saved }: { sup: SupSession; saved: Activity | null }) {
  const nav = useNavigate()
  const edit = saved !== null
  const initial = useRef<Draft>(saved ? draftOf(saved) : blankDraft(sup.name))
  const [draft, setDraft] = useState<Draft>(initial.current)
  // Fields the supervisor changed by hand. A saved activity counts as all touched, so a category change never rewrites it.
  const touched = useRef(new Set<string>(edit ? DEFAULT_KEYS : []))
  const [step, setStep] = useState(edit ? STEP_COUNT : 1)
  const [dir, setDir] = useState(1)
  const [fromReview, setFromReview] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  const exit = () => nav(saved ? `/sup/a/${saved.id}` : '/sup', { replace: true })
  const close = () => (isDirty(draft, initial.current) ? setLeaving(true) : exit())

  const set = (p: Partial<Draft>) => {
    for (const k of Object.keys(p)) touched.current.add(k)
    setDraft((d) => ({ ...d, ...p }))
  }
  const go = (n: number) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }
  const jump = (n: number) => {
    setFromReview(true)
    go(n)
  }
  const pick = (k: CategoryKey) => {
    setDraft((d) => applyCategory(d, k, touched.current))
    if (fromReview) {
      setFromReview(false)
      go(STEP_COUNT)
    } else go(2)
  }

  const here = check(step, draft)
  const publish = async () => {
    setBusy(true)
    try {
      if (saved) {
        await api.updateActivity(saved.id, toEdit(draft))
        toast.success('บันทึกแล้ว')
        nav(`/sup/a/${saved.id}`, { replace: true })
      } else {
        const id = await api.createActivity(toNewActivity(draft, { orgCode: sup.orgCode, orgName: sup.orgName }))
        toast.success('เผยแพร่กิจกรรมแล้ว')
        nav(`/sup/a/${id}`, { replace: true })
      }
    } catch {
      toast.error('บันทึกไม่ได้ ลองอีกครั้ง')
      setBusy(false)
    }
  }
  const next = () => {
    if (fromReview) {
      setFromReview(false)
      go(STEP_COUNT)
    } else if (step === STEP_COUNT) publish()
    else go(step + 1)
  }
  const back = () => {
    if (fromReview) {
      setFromReview(false)
      go(STEP_COUNT)
    } else go(step - 1)
  }

  const props = { d: draft, set, errors: here.errors }
  const body = [
    <StepCategory key={1} d={draft} onPick={pick} />,
    <StepTitle key={2} {...props} />,
    <StepWhen key={3} {...props} />,
    <StepPeople key={4} {...props} />,
    <StepCheckin key={5} {...props} />,
    <StepContact key={6} {...props} />,
    <StepReview key={7} d={draft} onJump={jump} />,
  ][step - 1]

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-10 bg-bg px-5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3">
        <button type="button" onClick={close} aria-label="ปิด" className="pressable -ml-2.5 grid size-11 place-items-center rounded-full text-ink">
          <X size={24} weight="bold" />
        </button>
        <div className="mt-2 flex gap-1.5" role="progressbar" aria-label="ความคืบหน้า" aria-valuemin={1} aria-valuemax={STEP_COUNT} aria-valuenow={step}>
          {TITLES.map((t, i) => (
            <span key={t} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <motion.span
                className="block h-full origin-left rounded-full bg-accent-strong"
                initial={false}
                animate={{ scaleX: i < step ? 1 : 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              />
            </span>
          ))}
        </div>
      </header>

      <main className="flex-1 px-5 pt-5 pb-8">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <h1 className="mb-6 text-3xl leading-tight font-bold tracking-tight">{TITLES[step - 1]}</h1>
            {body}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-0 z-10 flex gap-3 border-t border-line bg-bg px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        {(step > 1 || fromReview) && (
          <Button size="lg" variant="secondary" onClick={back} disabled={busy}>
            <CaretLeft size={20} weight="bold" /> ย้อนกลับ
          </Button>
        )}
        <Button size="lg" className="flex-1" disabled={!here.ok} loading={busy} onClick={next}>
          {fromReview || step < STEP_COUNT ? 'ถัดไป' : edit ? 'บันทึก' : 'เผยแพร่'}
        </Button>
      </footer>

      <Sheet open={leaving} onClose={() => setLeaving(false)} title="ทิ้งที่กรอกไว้ไหม">
        <p className="mb-6 text-muted">{edit ? 'การแก้ไขที่ยังไม่บันทึกจะหายไป' : 'กิจกรรมนี้ยังไม่ได้เผยแพร่ ที่กรอกไว้จะหายไป'}</p>
        <div className="flex flex-col gap-3">
          <Button size="lg" variant="danger" onClick={exit}>
            ทิ้งและออก
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setLeaving(false)}>
            กรอกต่อ
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
