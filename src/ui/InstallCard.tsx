import { useState } from 'react'
import { toast } from 'sonner'
import { DotsThreeVertical, DownloadSimple, Export, PlusSquare } from '@phosphor-icons/react'
import { isIOS, openInBrowser, promptInstall, useInstallMode } from '../lib/install'
import { Button } from './Button'
import { Sheet } from './Sheet'

const Step = ({ n, icon, title, children }: { n?: number; icon: React.ReactNode; title: string; children?: React.ReactNode }) => (
  <div className="flex gap-4">
    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2">{icon}</span>
    <div>
      <p className="font-semibold">
        {n && <span className="num mr-1.5 text-muted">{n}.</span>}
        {title}
      </p>
      {children && <p className="text-sm text-muted">{children}</p>}
    </div>
  </div>
)

/** Offers to put the app on the home screen. Hidden once it is installed. */
export function InstallCard() {
  const mode = useInstallMode()
  const [help, setHelp] = useState(false)
  if (mode === 'installed') return null

  const install = async () => {
    if (mode !== 'prompt') return setHelp(true)
    if (await promptInstall()) toast.success('ติดตั้งแล้ว เปิดได้จากหน้าจอโฮม')
  }

  return (
    <>
      <section className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">ติดตั้งแอพลงเครื่อง</p>
          <p className="text-sm text-muted">เปิดจากหน้าจอโฮมได้ทันที ไม่ต้องหาลิงก์</p>
        </div>
        <Button onClick={install}>ติดตั้ง</Button>
      </section>

      <Sheet open={help} onClose={() => setHelp(false)} title={mode === 'in-app' ? `เปิดใน${isIOS ? ' Safari ' : ' Chrome '}ก่อน` : mode === 'ios' ? 'เพิ่มลงหน้าจอโฮม' : 'ติดตั้งจากเมนูเบราว์เซอร์'}>
        <div className="flex flex-col gap-5">
          {mode === 'in-app' ? (
            <>
              <p className="text-muted">เปิดจากในแอพ LINE หรือ Facebook จะติดตั้งไม่ได้</p>
              <Button size="lg" className="w-full" onClick={openInBrowser}>
                เปิดใน{isIOS ? ' Safari' : ' Chrome'}
              </Button>
            </>
          ) : mode === 'ios' ? (
            <>
              <Step n={1} icon={<Export size={22} />} title="แตะปุ่มแชร์">
                ถ้าไม่เห็นปุ่มแชร์ ให้แตะปุ่ม ... ที่แถบด้านล่างก่อน
              </Step>
              <Step n={2} icon={<PlusSquare size={22} />} title='เลือก "เพิ่มไปยังหน้าจอโฮม"' />
              <Step n={3} icon={<DownloadSimple size={22} />} title='แตะ "เพิ่ม" ที่มุมขวาบน' />
            </>
          ) : (
            <>
              <Step n={1} icon={<DotsThreeVertical size={22} weight="bold" />} title="แตะเมนูมุมขวาบนของเบราว์เซอร์" />
              <Step n={2} icon={<DownloadSimple size={22} />} title='เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"' />
            </>
          )}
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setHelp(false)}>
            เข้าใจแล้ว
          </Button>
        </div>
      </Sheet>
    </>
  )
}
