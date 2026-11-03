import { useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { Chip } from '../../ui/Chip'
import { Switch } from '../../ui/Switch'
import { Flag } from '../../ui/Flag'
import { Counter } from '../../ui/Counter'
import { Sheet } from '../../ui/Sheet'

/** Dev-only gallery of every component, for checking both themes at phone width. */
export default function Kit() {
  const [on, setOn] = useState(true)
  const [chip, setChip] = useState(6)
  const [count, setCount] = useState(287)
  const [sheet, setSheet] = useState(false)
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-10 px-4 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-24">
      <h1 className="text-3xl font-bold tracking-tight">ชุดส่วนประกอบ</h1>

      <section className="flex flex-col gap-3">
        <Button size="lg">
          รับชั่วโมง <ArrowRight size={20} weight="bold" />
        </Button>
        <Button size="lg" loading>
          กำลังบันทึก
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">เปิด QR</Button>
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

      <section className="rounded-[var(--radius-card)] bg-surface px-5 py-2 shadow-soft">
        <Switch checked={on} onChange={setOn} label="รับคนที่ไม่ได้ลงชื่อ" hint="มาสแกนรับชั่วโมงได้เลยโดยไม่ต้องลงทะเบียน" />
      </section>

      <section className="flex flex-wrap gap-2">
        <Flag kind="walkIn">มาเพิ่ม</Flag>
        <Flag kind="location">ตำแหน่งไม่ผ่าน 420 ม.</Flag>
        <Flag kind="device">เครื่องซ้ำ</Flag>
        <Flag kind="edited">3 ชม. มาสาย</Flag>
      </section>

      <section className="flex items-end justify-between">
        <button className="pressable text-6xl font-bold" onClick={() => setCount((c) => c + 1)}>
          <Counter value={count} />
        </button>
      </section>

      <Button variant="secondary" size="lg" onClick={() => setSheet(true)}>
        เปิด sheet
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
