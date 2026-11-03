import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { PaperPlaneRight } from '@phosphor-icons/react'
import { haptic } from '../../lib/device'
import { thDate, thTime } from '../../lib/format'
import { BackBar } from '../../ui/BackBar'

export interface Bubble {
  id: string
  mine: boolean
  text: string
  at: number
  /** Shown above a run of messages from someone else. */
  name?: string
  sup?: boolean
  readMark?: boolean
}

interface Props {
  fallback: string
  title: string
  subtitle?: string
  intro?: string
  empty?: string
  messages: Bubble[]
  quick?: { label: string; text: string }[]
  placeholder: string
  onSend: (text: string) => Promise<void>
  footer?: ReactNode
}

/** Shared by the group chat and the private thread: messages, quick replies and a composer pinned above the keyboard. */
export function Thread({ fallback, title, subtitle, intro, empty, messages, quick, placeholder, onSend, footer }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const first = useRef(true)

  useLayoutEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: first.current ? 'auto' : 'smooth' })
    if (messages.length) first.current = false
  }, [messages.length])

  const send = async () => {
    const t = text.trim()
    if (!t || busy) return
    haptic.tap()
    setBusy(true)
    try {
      await onSend(t)
      setText('')
      if (input.current) input.current.style.height = 'auto'
    } catch {
      /* the caller already told the student; keep the text so it can be sent again */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <header className="shrink-0 border-b border-line bg-bg px-5 pt-[calc(0.25rem+env(safe-area-inset-top,0px))] pb-3">
        <BackBar fallback={fallback} />
        <h1 className="mt-1 truncate text-xl font-bold">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </header>

      <div ref={list} className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {intro && <p className="mx-4 mb-4 text-center text-sm text-muted">{intro}</p>}
        {messages.length === 0 && empty && <p className="mt-10 text-center text-muted">{empty}</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString()
          return (
            <div key={m.id}>
              {newDay && <p className="num my-4 text-center text-xs text-muted">{thDate(m.at)}</p>}
              {m.name && (
                <p className="mt-3 mb-1 ml-1 text-sm text-muted">
                  {m.name}
                  {m.sup && <span className="font-semibold text-accent-strong"> ผู้ดูแล</span>}
                </p>
              )}
              <div className={`mt-1 flex ${m.mine ? 'justify-end' : ''}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 break-words whitespace-pre-wrap ${m.mine ? 'rounded-br-md bg-accent-strong text-on-accent' : m.sup ? 'rounded-bl-md bg-accent-soft' : 'rounded-bl-md bg-surface shadow-soft'}`}>
                  {m.text}
                  <p className="num mt-0.5 text-right text-[11px] opacity-70">
                    {thTime(m.at)}
                    {m.readMark && ' อ่านแล้ว'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {footer}
      {quick && (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-5 pb-2">
          {quick.map((q) => (
            <button
              key={q.label}
              onClick={() => {
                setText(q.text)
                input.current?.focus()
              }}
              className="pressable min-h-10 shrink-0 rounded-full bg-surface px-4 text-[15px] font-medium ring-1 ring-line"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex shrink-0 items-end gap-2 border-t border-line bg-bg px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <textarea
          ref={input}
          rows={1}
          value={text}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="send"
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          className="max-h-30 min-h-12 flex-1 resize-none rounded-3xl bg-surface px-4 py-3 ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        />
        <button onClick={send} disabled={!text.trim() || busy} aria-label="ส่ง" className="pressable grid size-12 shrink-0 place-items-center rounded-full bg-accent-strong text-on-accent disabled:opacity-45">
          <PaperPlaneRight size={22} weight="fill" />
        </button>
      </div>
    </div>
  )
}
