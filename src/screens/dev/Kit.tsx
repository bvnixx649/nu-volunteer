import { useState } from 'react'
import { QrCode } from '@phosphor-icons/react'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { Chip } from '../../ui/Chip'
import { Switch } from '../../ui/Switch'
import { Flag } from '../../ui/Flag'
import { Counter } from '../../ui/Counter'
import { Segmented } from '../../ui/Segmented'
import { Sheet } from '../../ui/Sheet'
import { StatusTag } from '../../ui/StatusTag'

/** Dev-only gallery of every component, for checking the dark theme at phone width. */
export default function Kit() {
  const [on, setOn] = useState(true)
  const [chip, setChip] = useState(6)
  const [every, setEvery] = useState(10)
  const [count, setCount] = useState(287)
  const [sheet, setSheet] = useState(false)
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-10 px-4 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-24">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight">ชุดส่วนประกอบ</h1>

      {/* White is the main action of a page. Orange only scans or gives hours. */}
      <section className="flex flex-col gap-3">
        <Button size="lg">บันทึก</Button>
        <Button size="lg" variant="accent">
          <QrCode size={22} weight="bold" /> แสดง QR รับชั่วโมง
        </Button>
        <Button size="lg" loading>
          กำลังบันทึก
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">เพิ่มรายชื่อ</Button>
          <Button variant="ghost">ยกเลิก</Button>
          <Button variant="danger">ยกเลิกชั่วโมง</Button>
          <Button disabled>บันทึก</Button>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <Field label="รหัสนิสิต" inputMode="numeric" placeholder="8 หลัก" />
        <Field label="ชื่อ-นามสกุล" error="กรอกชื่อ-นามสกุล" />
      </section>

      <section className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[1, 5, 6, 9, 18].map((h) => (
          <Chip key={h} selected={chip === h} onClick={() => setChip(h)}>
            {h} ชม.
          </Chip>
        ))}
      </section>

      <Segmented label="เปลี่ยนทุก" value={every} onChange={setEvery} options={[5, 10, 30].map((n) => ({ value: n, label: `ทุก ${n} วิ` }))} />

      <section className="rounded-[var(--radius-card)] bg-surface px-5 py-1">
        <Switch checked={on} onChange={setOn} label="รับผู้ไม่ได้ลงทะเบียน" />
      </section>

      <section className="flex flex-wrap gap-2">
        <StatusTag stage="open" />
        <StatusTag stage="live" />
        <StatusTag stage="closing" />
        <StatusTag stage="submit" />
        <StatusTag stage="waiting" />
      </section>

      <section className="flex flex-wrap gap-2">
        <Flag kind="walkIn">ไม่ได้ลงทะเบียน</Flag>
        <Flag kind="location">อยู่นอกพื้นที่ 420 ม.</Flag>
        <Flag kind="device">ใช้เครื่องซ้ำ</Flag>
        <Flag kind="edited">มาสาย</Flag>
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-5">
        <button className="pressable block text-left" onClick={() => setCount((c) => c + 1)}>
          <Counter value={count} className="block text-[52px] leading-none font-semibold tracking-tight" />
        </button>
        <p className="mt-2 text-[15px] text-ink/80">ได้รับชั่วโมงแล้ว</p>
      </section>

      <Button variant="secondary" size="lg" onClick={() => setSheet(true)}>
        เปิดแผ่นล่าง
      </Button>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="แก้ชั่วโมง">
        <p className="pb-6 text-muted">ณัฐวุฒิ แก้วประเสริฐ 65012345</p>
        <Button size="lg" className="w-full" onClick={() => setSheet(false)}>
          บันทึก
        </Button>
      </Sheet>
    </main>
  )
}
