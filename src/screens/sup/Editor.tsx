import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CaretLeft, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api } from '../../data/api'
import type { Activity, CategoryKey, NewTemplate, Template } from '../../data/types'
import { ADVANCED_FIELDS, applyCategory, applyTemplate, blankDraft, check, DEFAULT_KEYS, draftOf, isDirty, STEP_COUNT, toEdit, toNewActivity, type Draft } from '../../lib/draft'
import { canEdit } from '../../lib/stage'
import { useDevice, type SupSession } from '../../store'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { StepCategory, StepDetails, StepReview, TITLES } from './EditorSteps'
import { TemplateForm } from './TemplateForm'

const slide = {
  enter: (dir: number) => ({ x: dir * 36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -36, opacity: 0, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] as const } }),
}

/** Create (/sup/new) and edit (/sup/edit/:id) share this flow. Edit skips the template and starts on the details. */
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

const DRAFT_KEY = 'nuv:draft'
const readDraft = (): Draft | null => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null
    return d && d.categoryKey ? { ...blankDraft(), ...d } : null
  } catch {
    return null
  }
}
const writeDraft = (d: Draft | null) => {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Storage can be blocked; the flow works without a saved draft.
  }
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
  const phone = useDevice((s) => s.supPhone)
  const setSupPhone = useDevice((s) => s.setSupPhone)
  const initial = useRef<Draft>(saved ? draftOf(saved) : blankDraft(sup.name, phone))
  // A new activity picks up where an unfinished one stopped (autosaved on this device).
  const [restored] = useState(() => (saved ? null : readDraft()))
  const [draft, setDraft] = useState<Draft>(restored ?? initial.current)
  // Fields the supervisor changed by hand. A saved or restored draft counts as all touched, so a category change never rewrites it.
  const touched = useRef(new Set<string>(edit || restored ? DEFAULT_KEYS : []))
  const [step, setStep] = useState(edit || restored ? 2 : 1)
  const [attempted, setAttempted] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [dir, setDir] = useState(1)
  const [leaving, setLeaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [form, setForm] = useState<{ open: boolean; editing: Template | null }>({ open: false, editing: null })
  const [menuFor, setMenuFor] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState<Template | null>(null)

  useEffect(() => {
    if (edit) return
    let live = true
    api.listTemplates(sup.orgCode).then((l) => live && setTemplates(l), () => {})
    return () => {
      live = false
    }
  }, [edit, sup.orgCode])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  useEffect(() => {
    if (!edit && draft.categoryKey) writeDraft(draft)
  }, [draft, edit])

  const exit = () => {
    if (!edit) writeDraft(null)
    nav(saved ? `/sup/a/${saved.id}` : '/sup', { replace: true })
  }
  const close = () => (isDirty(draft, initial.current) ? setLeaving(true) : exit())

  const set = (p: Partial<Draft>) => {
    for (const k of Object.keys(p)) touched.current.add(k)
    setDraft((d) => ({ ...d, ...p }))
  }
  const go = (n: number) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }
  const pick = (k: CategoryKey) => {
    setDraft((d) => applyCategory(d, k, touched.current))
    setAttempted(false)
    go(2)
  }

  const pickTemplate = (t: Template) => {
    setDraft((d) => applyTemplate(d, t, touched.current))
    setAttempted(false)
    go(2)
  }
  /** Saves a new or edited template. The saved one is preselected in the grid, without moving on. */
  const saveTemplate = async (input: NewTemplate, id?: string) => {
    let saved: Template
    if (id) {
      await api.updateTemplate(id, { title: input.title, poster: input.poster, description: input.description, hours: input.hours, settings: input.settings })
      saved = { ...(templates.find((t) => t.id === id) as Template), ...input }
      setTemplates((l) => l.map((t) => (t.id === id ? saved : t)))
      if (draft.templateId === id) setDraft((d) => applyTemplate(d, saved, touched.current))
      toast.success('บันทึกเทมเพลตแล้ว')
    } else {
      saved = await api.createTemplate(input)
      setTemplates((l) => [...l, saved])
      setDraft((d) => applyTemplate(d, saved, touched.current))
      toast.success('เพิ่มกิจกรรมแล้ว')
    }
    setForm((f) => ({ ...f, open: false }))
  }
  const removeTemplate = async (t: Template) => {
    try {
      await api.deleteTemplate(t.id)
    } catch {
      toast.error('ลบไม่ได้ ลองอีกครั้ง')
      return
    }
    setTemplates((l) => l.filter((x) => x.id !== t.id))
    if (draft.templateId === t.id) setDraft((d) => ({ ...d, categoryKey: null, templateId: null }))
    setDeleting(null)
    toast.success('ลบเทมเพลตแล้ว')
  }

  const here = check(step, draft)
  const shown = attempted ? { ...here.missing, ...here.errors } : here.errors
  const publish = async () => {
    setBusy(true)
    try {
      if (draft.phone.trim()) setSupPhone(draft.phone.trim())
      if (saved) {
        await api.updateActivity(saved.id, toEdit(draft))
        toast.success('บันทึกแล้ว')
        nav(`/sup/a/${saved.id}`, { replace: true })
      } else {
        const id = await api.createActivity(toNewActivity(draft, { orgCode: sup.orgCode, orgName: sup.orgName }))
        writeDraft(null)
        toast.success('เผยแพร่กิจกรรมแล้ว')
        nav(`/sup/a/${id}`, { replace: true })
      }
    } catch {
      toast.error('บันทึกไม่ได้ ลองอีกครั้ง')
      setBusy(false)
    }
  }
  const next = () => {
    if (step === 2) {
      if (!here.ok) {
        setAttempted(true)
        const fields = Object.keys({ ...here.missing, ...here.errors })
        if (fields.some((f) => ADVANCED_FIELDS.includes(f))) setAdvancedOpen(true)
        // Wait for the section to open, then bring the first wrong field into view.
        setTimeout(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
        return
      }
      go(3)
    } else if (step === STEP_COUNT) publish()
    else go(step + 1)
  }
  const back = () => go(step - 1)
  const canBack = edit ? step > 2 : step > 1

  const body = [
    <StepCategory
      key={1}
      d={draft}
      templates={templates}
      onPick={pick}
      onPickTemplate={pickTemplate}
      onAdd={() => setForm({ open: true, editing: null })}
      onMenu={setMenuFor}
    />,
    <StepDetails key={2} d={draft} set={set} errors={shown} advancedOpen={advancedOpen} onAdvanced={setAdvancedOpen} />,
    <StepReview key={3} d={draft} templateName={templates.find((t) => t.id === draft.templateId)?.title} />,
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

      <footer className={`sticky bottom-0 z-10 gap-3 border-t border-line bg-bg px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] ${canBack || step > 1 || draft.categoryKey ? 'flex' : 'hidden'}`}>
        {canBack && (
          <Button size="lg" variant="secondary" onClick={back} disabled={busy}>
            <CaretLeft size={20} weight="bold" /> ย้อนกลับ
          </Button>
        )}
        {(step > 1 || draft.categoryKey) && (
          <Button size="lg" className="flex-1" loading={busy} onClick={next}>
            {step < STEP_COUNT ? 'ถัดไป' : edit ? 'บันทึก' : 'เผยแพร่'}
          </Button>
        )}
      </footer>

      <TemplateForm open={form.open} onClose={() => setForm((f) => ({ ...f, open: false }))} editing={form.editing} who={{ orgCode: sup.orgCode, name: sup.name }} onSave={saveTemplate} />

      <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor?.title ?? 'เทมเพลต'}>
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              setForm({ open: true, editing: menuFor })
              setMenuFor(null)
            }}
          >
            แก้ไข
          </Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              setDeleting(menuFor)
              setMenuFor(null)
            }}
          >
            ลบ
          </Button>
        </div>
      </Sheet>

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="ลบเทมเพลตนี้ไหม">
        <p className="mb-6 text-muted">{deleting?.title} จะหายไปจากทุกเครื่องของหน่วยงาน กิจกรรมที่สร้างไปแล้วไม่เปลี่ยน</p>
        <div className="flex flex-col gap-3">
          <Button size="lg" variant="danger" onClick={() => deleting && removeTemplate(deleting)}>
            ลบเทมเพลต
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setDeleting(null)}>
            ยกเลิก
          </Button>
        </div>
      </Sheet>

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
