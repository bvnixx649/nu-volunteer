import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'

const RELOADED_AT = 'nuv:reloaded-at'

/** A page chunk that no longer exists on the server: the app was updated while this tab stayed open. */
const isStaleChunk = (e: unknown) => /dynamically imported module|module script failed|Failed to fetch|ChunkLoadError/i.test(String((e as Error)?.message ?? e))

/**
 * Reloads once to pick up the new build. The timestamp stops a loop when the reload does not help (for example, no internet).
 * Returns false when it already tried a moment ago, so the caller shows the fallback screen instead.
 */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0)
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(RELOADED_AT, String(Date.now()))
  } catch {
    return false
  }
  location.reload()
  return true
}

/** Keeps a crash in one screen from leaving a blank page. Nothing saved on the device is touched by reloading. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isStaleChunk(error) && reloadForNewBuild()) return
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-5 py-10">
        <h1 className="text-2xl leading-snug font-bold">เปิดหน้านี้ไม่ได้</h1>
        <p className="text-muted">ตรวจอินเทอร์เน็ตแล้วโหลดใหม่ ข้อมูลที่บันทึกไว้ในเครื่องยังอยู่</p>
        <Button size="lg" className="mt-4 w-full" onClick={() => location.reload()}>
          โหลดใหม่
        </Button>
      </main>
    )
  }
}
