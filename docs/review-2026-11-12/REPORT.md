# รายงานผลการทดสอบระบบจิตอาสา มน.

วันที่จัดทำ: 12 พฤศจิกายน 2569
ระบบที่ทดสอบ: volunteerapp.dmodeve.com (API: volunteerapi.dmodeve.com)
กำหนดใช้งานจริง: งานบริจาคโลหิต 20 พฤศจิกายน 2569

## วิธีอ่านรายงานนี้

รายงานนี้พูดถึงโค้ดสองชุด ซึ่งเป็นคนละที่กัน

| ชื่อที่ใช้ในรายงาน | คืออะไร | อยู่ที่ไหน |
| --- | --- | --- |
| โปรเจกต์ production | โค้ดที่ deploy อยู่ที่ volunteerapp.dmodeve.com และต่อกับ REST API ที่ volunteerapi.dmodeve.com | เครื่องของผู้ดูแลระบบ production ผู้จัดทำรายงานไม่เห็น source code ชุดนี้ |
| repo ชุดใหม่ | Frontend ที่แก้และปรับแล้ว ต่อกับ Supabase และ local adapter ไม่ได้ต่อกับ REST API ของ production | https://github.com/bvnixx649/nu-volunteer branch `main` (commit `e52c0dc`) |

ข้อตกลงในการอ้างอิง

- path ของไฟล์ทุกรายการในรายงานนี้ (เช่น `src/lib/excel.ts`) คือไฟล์ใน repo ชุดใหม่ branch `main` ทุก path กดเปิดบน GitHub ได้ ตัวเลขหลัง `:` คือเลขบรรทัด
- ไม่มี path ใดในรายงานนี้ที่ชี้ไปยังไฟล์ของโปรเจกต์ production เพราะผู้จัดทำไม่เห็นโค้ดชุดนั้น ชื่อไฟล์ในโปรเจกต์ production อาจตรงกันเฉพาะส่วนที่ยังไม่ถูกแก้หลัง commit `a0203ff` ซึ่งเป็นจุดที่สองชุดแยกจากกัน
- หมวด 1 คือสิ่งที่ต้องแก้ในโปรเจกต์ production ไฟล์ที่อ้างในหมวดนี้เป็นเพียงตัวอย่างวิธีแก้จาก repo ชุดใหม่
- หมวด 2 ถึง 4 คือสิ่งที่ทำเสร็จแล้วใน repo ชุดใหม่ column "PR" บอกว่าดู diff ได้จาก Pull Request ใด
  - PR #1 (commit `a847534`): https://github.com/bvnixx649/nu-volunteer/pull/1/files
  - PR #2 (commit `9f4eec7`): https://github.com/bvnixx649/nu-volunteer/pull/2/files
- ดูผลลัพธ์ของ repo ชุดใหม่ได้ที่ https://bvnixx649.github.io/nu-volunteer/ (ข้อมูลตัวอย่าง ไม่ใช่ข้อมูล production)

## สรุป

| หมวด | จำนวน | แก้ที่ไหน | สถานะ |
| --- | --- | --- | --- |
| 1. Bug ฝั่ง Backend และ data layer | 7 | โปรเจกต์ production | ยังไม่ได้แก้ |
| 2. Bug ฝั่ง Frontend | 18 | repo ชุดใหม่ | แก้แล้ว รอ merge เข้าโปรเจกต์ production |
| 3. ส่วนที่เพิ่มใหม่ฝั่ง Frontend | 8 | repo ชุดใหม่ | เสร็จแล้ว รอ merge เข้าโปรเจกต์ production |
| 4. ส่วนที่ปรับ UX/UI และข้อความ | 12 | repo ชุดใหม่ | เสร็จแล้ว รอ merge เข้าโปรเจกต์ production |

## 1. Bug ฝั่ง Backend และ data layer (ต้องแก้ในโปรเจกต์ production)

เรียงตามความเร่งด่วน B1 ถึง B3 กระทบวันงานโดยตรง

### B1 จำนวนผู้ลงทะเบียนนับรวมผู้ที่ scan โดยไม่ได้ลงทะเบียน

- อาการ: ผู้ที่ scan รับชั่วโมงโดยไม่ได้ลงทะเบียนถูกนับรวมใน field `regCount` ของกิจกรรม
- เห็นได้ที่: หน้าแรกผู้ดูแลและหน้าจัดการกิจกรรม แสดง "จากผู้ลงทะเบียน 1 คน" และ 100% ตั้งแต่คนแรกที่ scan งานวันที่ 20 พ.ย. ไม่มีการลงทะเบียน จึงจะแสดง 100% ตลอดงาน
- แก้ที่: Backend ของ production ส่วนที่บันทึกการรับชั่วโมง การยกเลิกลงทะเบียน และการลบรายชื่อ ให้ `regCount` นับเฉพาะผู้ลงทะเบียน แล้ว backfill ค่าของกิจกรรมที่มีอยู่
- ตัวอย่างใน repo ชุดใหม่ (เป็น SQL ของ Supabase ใช้ดู logic ไม่ได้ใช้รันกับ production): function `claim` ที่ [`supabase/schema.sql:177`](https://github.com/bvnixx649/nu-volunteer/blob/main/supabase/schema.sql#L177), `cancel_registration` ที่ [`supabase/schema.sql:260`](https://github.com/bvnixx649/nu-volunteer/blob/main/supabase/schema.sql#L260), `remove_registration` ที่ [`supabase/schema.sql:276`](https://github.com/bvnixx649/nu-volunteer/blob/main/supabase/schema.sql#L276) และคำสั่ง backfill ที่ [`supabase/proposed-changes.sql:6`](https://github.com/bvnixx649/nu-volunteer/blob/main/supabase/proposed-changes.sql#L6)

### B2 studentId ในเครื่องไม่ตรงกับ token แล้วแอปค้าง

- อาการ: เมื่อ `studentId` ใน localStorage key `nuv:device` ไม่ตรงกับเจ้าของ token request `GET /students/:id` และ `GET /students/:id/strikes` ตอบ 403
- เห็นได้ที่: หน้าแรกนิสิตค้างที่ "โหลดกิจกรรมไม่ได้" หน้าโปรไฟล์ว่าง หน้ารับชั่วโมงแจ้งว่า "ไม่มีอินเทอร์เน็ต"
- แก้ที่: data layer ของ production ส่วนที่เรียก `GET /students/:id` ให้จัดการ 403 เช่นเดียวกับ 401 คือล้างข้อมูลตัวตนและให้กรอกใหม่ ล้าง state failed เมื่อโหลดรายการกิจกรรมสำเร็จ และแยกข้อความของ 403 ออกจากกรณี network error
- ตัวอย่างใน repo ชุดใหม่: การกันไม่ให้ tab อื่นเขียนทับ `nuv:device` ทั้งก้อนอยู่ที่ [`src/store.ts:48`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/store.ts#L48) ส่วนการจัดการ 403 ไม่มีตัวอย่าง เพราะ repo ชุดใหม่ไม่ได้ต่อกับ REST API นี้

### B3 Excel และตารางรายชื่อแสดงสถานะผิด และไม่มีวันที่

- อาการ: ผู้ที่ได้รับชั่วโมงโดยไม่ได้ลงทะเบียนแสดงสถานะ "ไม่ได้ลงทะเบียน" และ column "เวลายืนยัน" มีแต่เวลา ไม่มีวันที่
- เห็นได้ที่: ไฟล์ Excel ที่ export จากหน้าจัดการกิจกรรม และตารางรายชื่อในหน้าเดียวกัน
- แก้ที่: ส่วนที่สร้างไฟล์ Excel และตารางรายชื่อของ production เปลี่ยนสถานะเป็น "ได้ชั่วโมง (ไม่ได้ลงทะเบียน)" และแสดงวันที่คู่กับเวลา
- ตัวอย่างใน repo ชุดใหม่: [`src/lib/excel.ts:30`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/excel.ts#L30) และ [`src/lib/roster.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/roster.ts)

### B4 ผู้ดูแลได้รับ 401 แล้วถูก logout ทันที

- อาการ: เมื่อ request ของผู้ดูแลได้รับ 401 ระบบล้าง token และ logout ทันที
- เห็นได้ที่: ทุกหน้าของผู้ดูแล ข้อมูลที่กรอกค้างไว้ (เช่น ระหว่างสร้างกิจกรรม) สูญหาย
- แก้ที่: data layer ของ production ไม่ล้าง session ทันที ให้แสดง login dialog ซ้อนบนหน้าเดิม แล้ว retry request เดิมหลัง login สำเร็จ
- ตัวอย่างใน repo ชุดใหม่: ไม่มี
- หมายเหตุ: ตรวจจาก JavaScript bundle ที่ deploy อยู่ ยังไม่ได้ทดสอบด้วยการใช้งานจริง

### B5 หน้ารับชั่วโมงรอ GPS ทุกครั้ง

- อาการ: หน้ารับชั่วโมงรอ GPS ก่อนเรียก API ทุกครั้ง และไม่ตรวจก่อนว่าได้รับชั่วโมงแล้วหรือไม่
- เห็นได้ที่: หน้าที่เปิดหลัง scan QR ผู้ใช้ต้องรอนานโดยไม่จำเป็น
- แก้ที่: หน้ารับชั่วโมงของ production ตรวจชั่วโมงที่มีอยู่ก่อน ขอ GPS เฉพาะกิจกรรมที่กำหนดให้ตรวจตำแหน่ง และกำหนด timeout
- ตัวอย่างใน repo ชุดใหม่: [`src/screens/claim/Claim.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/claim/Claim.tsx) และ [`src/lib/geo.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/geo.ts)
- หมายเหตุ: ตรวจจาก JavaScript bundle ที่ deploy อยู่ ยังไม่ได้ทดสอบด้วยการใช้งานจริง

### B6 มีกิจกรรมทดสอบค้างใน production

- อาการ: Server มีกิจกรรมทดสอบ 11 รายการในหน่วยงานทดสอบ เช่น "asdfasdfasdf" และ "ทดสอบ Claude ..."
- เห็นได้ที่: หน้าแรกผู้ดูแลของหน่วยงานทดสอบ
- แก้ที่: database ของ production ลบก่อนวันงาน

### B7 manifest ไม่มี icon และ favicon ผิด

- อาการ: `manifest` ไม่มี icon และ `/favicon.ico` ตอบกลับเป็น index.html
- เห็นได้ที่: icon ของแอปเมื่อ Add to Home Screen และ icon บน tab ของ browser
- แก้ที่: folder `public/` ของ production
- ตัวอย่างใน repo ชุดใหม่: [`public/manifest.webmanifest`](https://github.com/bvnixx649/nu-volunteer/blob/main/public/manifest.webmanifest), [`public/favicon.svg`](https://github.com/bvnixx649/nu-volunteer/blob/main/public/favicon.svg), [`public/icon-192.png`](https://github.com/bvnixx649/nu-volunteer/blob/main/public/icon-192.png), [`public/icon-512.png`](https://github.com/bvnixx649/nu-volunteer/blob/main/public/icon-512.png), [`public/apple-touch-icon.png`](https://github.com/bvnixx649/nu-volunteer/blob/main/public/apple-touch-icon.png)

## 2. Bug ฝั่ง Frontend (แก้แล้วใน repo ชุดใหม่)

ทุกรายการอยู่ใน PR #1

| ลำดับ | เรื่อง | หน้าที่เห็น | ไฟล์ |
| --- | --- | --- | --- |
| F1 | เปิดหน้าใหม่แล้ว scroll position ค้างกลางหน้า | ทุกหน้า | [`src/App.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/App.tsx) |
| F2 | ช่องตัวเลขรับค่าทศนิยมและค่าติดลบผิด (2.5 เป็น 25, -3 เป็น 3) | สร้างกิจกรรม | [`src/lib/draft.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/draft.ts), [`src/screens/sup/EditorSteps.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/EditorSteps.tsx) |
| F3 | ช่องเบอร์โทรรับตัวอักษร | สร้างกิจกรรม, แก้ไข template | [`src/screens/sup/EditorSteps.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/EditorSteps.tsx), [`src/screens/sup/TemplateForm.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/TemplateForm.tsx) |
| F4 | รายชื่อที่เพิ่มเองแสดงว่า "สแกน" และ "แก้โดย" | รายชื่อในหน้าจัดการ | [`src/lib/roster.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/roster.ts), [`src/screens/sup/Roster.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Roster.tsx), [`src/screens/sup/SupRoster.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupRoster.tsx) |
| F5 | สถานะและวันที่ใน Excel (เรื่องเดียวกับ B3) | ไฟล์ Excel | [`src/lib/excel.ts:30`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/excel.ts#L30) |
| F6 | เปิดหน้าจัดการหรือแก้ไขกิจกรรมของหน่วยงานอื่นได้จาก link | จัดการกิจกรรม, แก้ไขกิจกรรม | [`src/lib/stage.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/stage.ts), [`src/screens/sup/NotYours.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/NotYours.tsx), [`src/screens/sup/Manage.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Manage.tsx), [`src/screens/sup/Editor.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Editor.tsx) |
| F7 | Logout ผู้ดูแลโดยไม่ถามยืนยัน | บัญชีผู้ดูแล | [`src/screens/sup/SupMe.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupMe.tsx) |
| F8 | หลาย tab เขียนทับข้อมูลตัวตนกัน | ฝั่งนิสิตทุกหน้า | [`src/store.ts:48`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/store.ts#L48) |
| F9 | จอ QR ยังแสดง QR หลังปิดกิจกรรม | จอ QR ของผู้ดูแล | [`src/screens/sup/QrPanel.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/QrPanel.tsx), [`src/screens/sup/QrScreen.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/QrScreen.tsx) |
| F10 | ปุ่ม login ผู้ดูแลถูก disable โดยไม่แจ้งเหตุผล | Login ผู้ดูแล | [`src/screens/sup/Login.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Login.tsx) |
| F11 | Card แลกขวดชวนให้ scan QR | หน้าแรกนิสิต | [`src/screens/Home.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/Home.tsx) |
| F12 | หน้ารับชั่วโมงไม่สำเร็จ ไม่ตรวจว่ามีชื่อนิสิตในเครื่องแล้ว | รับชั่วโมง (ไม่สำเร็จ) | [`src/screens/claim/Failure.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/claim/Failure.tsx) |
| F13 | ข้อความซ้ำและข้อความถูกตัด | รายละเอียดกิจกรรมฝั่งนิสิต | [`src/screens/student/ActivityDetail.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/student/ActivityDetail.tsx) |
| F14 | วันที่ไม่มีกิจกรรมในปฏิทินดูเหมือนกดไม่ได้ | ปฏิทินผู้ดูแล | [`src/screens/sup/home/MonthCalendar.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/home/MonthCalendar.tsx), [`src/screens/sup/home/OverviewCalendar.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/home/OverviewCalendar.tsx) |
| F15 | ปุ่มลอย "สร้างกิจกรรม" บังรายการ | หน้าแรกผู้ดูแล | [`src/screens/sup/SupShell.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupShell.tsx), [`src/screens/sup/SupHome.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupHome.tsx) |
| F16 | รูป template จัดสถานที่ไม่เหมาะสม | เลือกประเภทกิจกรรม | [`src/data/categories.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/data/categories.ts), folder `public/posters/` |
| F17 | ตัวอักษรย่อใน avatar เป็นสระนำหน้า | ทุกที่ที่มี avatar | [`src/lib/format.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/format.ts) |
| F18 | สรุปการเช็กชื่ออ่านติดกัน | หน้าจัดการ | [`src/lib/checkin.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/checkin.ts) |

## 3. ส่วนที่เพิ่มใหม่ฝั่ง Frontend

ทุกรายการไม่เปลี่ยน API และ schema

| ลำดับ | เรื่อง | รายละเอียด | PR | ไฟล์ |
| --- | --- | --- | --- | --- |
| N1 | QR scanner สำรอง | ใช้ library `jsqr` บน iPhone Safari และ in-app browser ของ LINE ซึ่งไม่มี `BarcodeDetector` ยังไม่ได้ทดสอบบน iPhone จริง | #1 | [`src/lib/scanner.ts:12`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/scanner.ts#L12) |
| N2 | Error boundary | แสดงหน้าแจ้งข้อผิดพลาดแทนหน้าขาว และ reload อัตโนมัติหนึ่งครั้งเมื่อมีการ deploy ระหว่างใช้งาน | #1 | [`src/ui/ErrorBoundary.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/ui/ErrorBoundary.tsx), [`src/main.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/main.tsx) |
| N3 | ปุ่ม "ลองอีกครั้ง" | แสดงในหน้าแรกนิสิตเมื่อโหลดกิจกรรมไม่สำเร็จ | #1 | [`src/screens/Home.tsx:258`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/Home.tsx#L258) |
| N4 | ค้นหาและ filter ในหน้าแรกผู้ดูแล | ช่องค้นหา และ filter ทั้งหมด, ต้องดำเนินการ, จะจัดขึ้น | #2 | [`src/screens/sup/SupHome.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupHome.tsx), [`src/lib/home.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/home.ts) |
| N5 | ปักหมุดกิจกรรม | ปักหมุดจากเมนูท้ายแถว เก็บใน localStorage key `nuv:pins` ต่อเครื่อง ไม่ส่งขึ้น server | #2 | [`src/lib/pins.ts:8`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/pins.ts#L8) |
| N6 | Tab รายการของผู้ดูแล | Route `/sup/list` แสดงกิจกรรมที่จบแล้วแบ่งตามเดือน filter ได้เป็น รอบันทึก และ บันทึกแล้ว | #2 | [`src/screens/sup/SupList.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupList.tsx), [`src/App.tsx:76`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/App.tsx#L76) |
| N7 | กิจกรรมแบบกำหนดเอง | Card "กำหนดเอง" ในขั้นเลือกประเภท สร้างกิจกรรมได้โดยไม่ต้องสร้าง template ก่อน ต้องมีรูปปก | #2 | [`src/screens/sup/EditorSteps.tsx:165`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/EditorSteps.tsx#L165), [`src/screens/sup/Editor.tsx:107`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Editor.tsx#L107), [`src/lib/draft.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/draft.ts) |
| N8 | Switch "บันทึกเป็นเทมเพลต" | อยู่ในขั้นตรวจทาน บันทึก template หลัง publish สำเร็จ ค่าเริ่มต้นปิด | #2 | [`src/screens/sup/EditorSteps.tsx:571`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/EditorSteps.tsx#L571), [`src/screens/sup/Editor.tsx:107`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Editor.tsx#L107) |

## 4. ส่วนที่ปรับ UX/UI และข้อความ

| ลำดับ | เรื่อง | รายละเอียด | PR | ไฟล์ |
| --- | --- | --- | --- | --- |
| U1 | Color palette | Background `#0c0c0e` card `#17171a` ไม่มี shadow และ glow ใช้ชุดเดียวกันทั้งฝั่งนิสิตและผู้ดูแล | #1 | [`src/styles.css`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/styles.css) |
| U2 | สีปุ่ม | Primary button เป็นสีขาว สีส้มใช้เฉพาะการ scan และการได้รับชั่วโมง | #1 | [`src/styles.css`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/styles.css), [`src/ui/Button.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/ui/Button.tsx) |
| U3 | Tab bar นิสิต | หน้าแรก, ของฉัน, ปุ่ม scan ตรงกลาง, แจ้งเตือน, โปรไฟล์ icon ของ "ของฉัน" เป็นปฏิทิน | #1 และ #2 | [`src/screens/student/Shell.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/student/Shell.tsx) |
| U4 | Tab bar ผู้ดูแล | กิจกรรม, รายการ, ปุ่มสร้างกิจกรรมตรงกลาง, ปฏิทิน, บัญชี | #2 | [`src/screens/sup/SupShell.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupShell.tsx), [`src/ui/TabBar.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/ui/TabBar.tsx) |
| U5 | หน้าต้อนรับ | รวมคำแนะนำและช่องกรอกรหัสนิสิตไว้ในหน้าเดียว | #1 | [`src/screens/student/Welcome.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/student/Welcome.tsx) |
| U6 | หน้าแรกผู้ดูแล | กิจกรรมแสดงเป็นแถวเล็ก card ใหญ่ใช้เฉพาะกิจกรรมที่กำลังจัด ไฟล์ `home/HeroCard.tsx` ถูกลบ | #2 | [`src/screens/sup/home/ActivityList.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/home/ActivityList.tsx), [`src/screens/sup/home/LiveCards.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/home/LiveCards.tsx), [`src/screens/sup/home/parts.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/home/parts.tsx) |
| U7 | สถิติ | ถอด tab สถิติออก ย้ายเป็น card สรุปในหน้าบัญชี route `/sup/stats` ยังอยู่ | #2 | [`src/screens/sup/SupMe.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupMe.tsx), [`src/screens/sup/SupStats.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupStats.tsx), [`src/App.tsx:78`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/App.tsx#L78) |
| U8 | หน้าจัดการ | กิจกรรมที่ไม่มีผู้ลงทะเบียนแสดงเฉพาะจำนวนผู้ได้รับชั่วโมง | #1 | [`src/screens/sup/ManageSummary.tsx:32`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/ManageSummary.tsx#L32) |
| U9 | หน้าสร้างกิจกรรม | หัวข้อขั้นแรกเป็น "เลือกประเภทกิจกรรม" template แลกขวดใช้ช่อง "จำนวนขวด" คู่กับ "ชั่วโมงที่ได้" และ "สูงสุดต่อคน (ชั่วโมง)" | #2 | [`src/screens/sup/EditorSteps.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/EditorSteps.tsx) |
| U10 | ข้อความสถานะ | นิสิตเห็น รอผู้จัดยืนยัน, รอบันทึกชั่วโมง, บันทึกแล้ว ผู้ดูแลเห็น "ยังไม่ส่งรายชื่อ" | #2 | [`src/screens/student/Me.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/student/Me.tsx), [`src/screens/student/ActivityDetail.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/student/ActivityDetail.tsx), [`src/lib/stage.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/stage.ts) |
| U11 | Filter วันในหน้าแรกนิสิต | ทั้งหมด, วันนี้, อาทิตย์นี้ (7 วันข้างหน้า) | #2 | [`src/screens/Home.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/Home.tsx), [`src/lib/student.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/student.ts) |
| U12 | ระบบข้อความ และ app icon | ซ่อนข้อความฝั่งนิสิตด้วย `MESSAGES_ON = false` เพราะฝั่งผู้ดูแลยังไม่มีหน้าอ่านและตอบ app icon, favicon และ manifest ชุดใหม่ | #1 | [`src/config.ts:44`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/config.ts#L44), [`public/manifest.webmanifest`](https://github.com/bvnixx649/nu-volunteer/blob/main/public/manifest.webmanifest) |

## 5. ขั้นตอนการ merge เข้าโปรเจกต์ production

1. Pull branch `main` ของ https://github.com/bvnixx649/nu-volunteer แล้ว merge เข้าโปรเจกต์ production จุดที่สองชุดแยกจากกันคือ commit `a0203ff`
2. ไฟล์ที่โปรเจกต์ production ไม่เคยแก้ไขหลัง `a0203ff` ให้ใช้ของ repo ชุดใหม่ทั้งไฟล์
3. ไฟล์ที่โปรเจกต์ production แก้ data layer ไว้ ต้อง resolve conflict ด้วยมือ ให้คงการเรียก API เดิมไว้ และรับส่วน UI ข้อความ และ logic ใน `src/lib` จาก repo ชุดใหม่ ไฟล์ที่คาดว่าจะ conflict ได้แก่
   - [`src/store.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/store.ts)
   - [`src/lib/excel.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/lib/excel.ts)
   - [`src/screens/Home.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/Home.tsx) (หน้าแรกนิสิต)
   - [`src/screens/student/Me.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/student/Me.tsx)
   - [`src/screens/student/ActivityDetail.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/student/ActivityDetail.tsx)
   - [`src/screens/sup/Login.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Login.tsx)
   - [`src/screens/sup/Manage.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Manage.tsx)
   - [`src/screens/sup/SupHome.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupHome.tsx)
   - [`src/screens/sup/SupMe.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/SupMe.tsx)
   - [`src/screens/sup/Editor.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/Editor.tsx)
   - [`src/screens/sup/QrScreen.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/QrScreen.tsx)
   - [`src/screens/sup/useQrFeed.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/useQrFeed.ts)
4. ไฟล์ต่อไปนี้ไม่ต้องนำไปใช้โดยตรง ใช้เป็น reference ของ business rule เท่านั้น: [`src/data/local.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/data/local.ts), [`src/data/supabase.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/data/supabase.ts), [`src/data/remote.ts`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/data/remote.ts), [`supabase/schema.sql`](https://github.com/bvnixx649/nu-volunteer/blob/main/supabase/schema.sql), [`supabase/proposed-changes.sql`](https://github.com/bvnixx649/nu-volunteer/blob/main/supabase/proposed-changes.sql)
5. รัน `npm install` (dependency ใหม่: `jsqr` และ `@fontsource-variable/geist`) จากนั้น `npx tsc --noEmit`, `npx vitest run` และ `npx vite build` ต้องผ่านทั้งหมด

## 6. รายการที่ยังไม่ได้ทดสอบ

ต้องทดสอบบน production server ก่อนวันที่ 20 พฤศจิกายน 2569

- การ scan ในแอปบน iPhone Safari, in-app browser ของ LINE และ Android Chrome (เกี่ยวกับ N1)
- Flow ฝั่งนิสิตครบขั้นตอน: กรอกชื่อ scan ได้รับ 6 ชั่วโมง และกรณี offline แล้วส่งภายหลัง
- การปิดกิจกรรม การส่งรายชื่อ และไฟล์ Excel ของแอดมิน (เกี่ยวกับ B3)
- Token ของผู้ดูแลหมดอายุระหว่างเปิดจอ QR (เกี่ยวกับ B4)
- สิทธิ์แอดมิน และการเปิด link ข้ามหน่วยงาน (เกี่ยวกับ F6)
- รายการ "สแกนล่าสุด" ของหน้าจัดการ ([`src/screens/sup/LiveFeed.tsx`](https://github.com/bvnixx649/nu-volunteer/blob/main/src/screens/sup/LiveFeed.tsx)): ใน local adapter ไม่แสดงผู้ที่เพิ่ง scan จนกว่าจะ reload อาการนี้มีอยู่ก่อนงานรอบนี้ และยังไม่ได้ตรวจกับ Backend จริง
