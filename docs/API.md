# หน้าบ้านคุยกับหลังบ้านอย่างไร (NU Volunteer)

โค้ดทั้งหมด: https://github.com/bvnixx649/nu-volunteer (public) แผนภาพตาราง: `docs/database.html`

## ภาพรวม

- **ไม่มีเซิร์ฟเวอร์ที่เขียนเอง** ไม่มี Node, Express หรือ API แยก
- **หน้าเว็บ:** React + Vite build เป็นไฟล์ static วางบน GitHub Pages ทำงานในเบราว์เซอร์ของผู้ใช้
- **หลังบ้าน:** Supabase เบราว์เซอร์คุยกับ Supabase ตรง ๆ ผ่านไลบรารี `@supabase/supabase-js`

```
มือถือ / เบราว์เซอร์ (React)
   │  HTTPS + JSON         ─►  Supabase REST (PostgREST)  ─►  ตาราง Postgres
   │  HTTPS + JSON (rpc)   ─►  Postgres function           ─►  ตาราง Postgres
   │  WebSocket            ◄─  Supabase Realtime (แจ้งว่าตารางเปลี่ยน)
   └  HTTPS                ─►  Supabase Auth (sign in แบบไม่ระบุตัวตน ได้ JWT)
```

Supabase ทำหน้าที่ 4 อย่าง คือ ฐานข้อมูล Postgres, REST API ที่สร้างจากตารางให้อัตโนมัติ, function ใน Postgres ที่เรียกแบบ rpc และ Realtime

## ไฟล์ที่ควรเปิดดู

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/data/api.ts` | สัญญากลาง (interface `Api`) ทุกคำสั่งที่หน้าจอใช้คุยกับข้อมูล หน้าจอเรียกแค่ตัวนี้ |
| `src/data/remote.ts` | ตัวที่คุยกับ Supabase จริง ทุกคำขอที่ออกจากเครื่องอยู่ไฟล์นี้ |
| `src/data/local.ts` | ตัวจำลองเก็บใน localStorage ใช้ตอนพัฒนาและเทส (ตั้ง `VITE_DATA=supabase` ถึงจะใช้ remote) |
| `src/data/rows.ts` | แปลงแถวจากฐานข้อมูลเป็น object ของแอปและกลับ |
| `src/data/types.ts` | รูปร่างข้อมูลฝั่งแอป (TypeScript) |
| `src/data/supabase.ts` | URL โปรเจกต์, anon key และการ sign in |
| `supabase/schema.sql` | ตาราง, function, RLS, realtime |

## การเชื่อมต่อและสิทธิ์

1. เปิดแอปแล้ว `supabase.auth.signInAnonymously()` ได้ JWT ของผู้ใช้ไม่ระบุตัวตน คำขอทุกตัวรอขั้นนี้ก่อน (`ready`)
2. คำขอทุกตัวส่ง header `apikey: <anon key>` และ `Authorization: Bearer <JWT>` ให้อัตโนมัติ
3. ตัวตนนิสิต (รหัส 8 หลัก) และผู้ดูแล (รหัสหน่วยงาน) **ไม่ได้อยู่ใน JWT** เก็บในเครื่อง (localStorage) แล้วส่งไปเป็นค่าในข้อมูล
4. RLS ตอนนี้ให้ทุกคนที่ sign in อ่านเขียนทุกตารางได้ ยกเว้น `orgs` ที่อ่านได้ทาง `get_org` เท่านั้น

## รูปแบบข้อมูลที่ส่งหากัน

- **JSON ทั้งหมด** ฝั่งฐานข้อมูลใช้ชื่อแบบ `snake_case` ฝั่งแอปใช้ `camelCase` แปลงใน `rows.ts`
- **เวลา:** ฐานข้อมูลเก็บ `timestamptz` ส่งเป็นข้อความ ISO (`"2026-11-20T01:00:00.000Z"`) แอปแปลงเป็นตัวเลข ms
- **ตัวนับ** `reg_count` กับ `credit_count` อยู่ในแถวกิจกรรม function เป็นคนบวกลบ แอปไม่นับเอง
- **รูป** (poster, รูปประกาศ) ตอนนี้เป็นข้อความ data URL หรือ path `./posters/...` ในคอลัมน์เลย

ตัวอย่าง แถว `activities` ที่ได้จาก REST กับ object ที่แอปใช้:

```json
// จากฐานข้อมูล
{ "id": "k3x9a", "title": "บริจาคโลหิต ครั้งที่ 2/2569", "category_key": "blood", "org": "ศูนย์จิตอาสา กองกิจการนิสิต",
  "org_code": "NUVOL69", "start_at": "2026-11-20T01:00:00+00:00", "end_at": "2026-11-20T08:00:00+00:00", "hours": 6,
  "cap_limit": true, "capacity": 300, "qr_mode": "dynamic", "loc_mode": "on", "radius": 150,
  "submitted_at": null, "recorded_at": null, "reg_count": 182, "credit_count": 128, ... }

// ในแอป (types.ts: Activity)
{ "id": "k3x9a", "title": "บริจาคโลหิต ครั้งที่ 2/2569", "categoryKey": "blood", "orgCode": "NUVOL69",
  "start": 1795136400000, "end": 1795161600000, "hours": 6, "capLimit": true, "capacity": 300,
  "regCount": 182, "creditCount": 128, ... }
```

ตัวอย่าง รับชั่วโมงตอนสแกน QR (`POST /rest/v1/rpc/claim`):

```json
// ส่งไป
{ "p_activity": "k3x9a", "p_student": "65012345", "p_name": "สมชาย ใจดี", "p_hours": 6, "p_method": "qr",
  "p_flags": [], "p_distance": 42.5, "p_accuracy": 18, "p_device": "d-7f2c", "p_ref": "qr-token", "p_by": null }

// ได้กลับ: ok = false แปลว่าเคยได้แล้ว และส่งแถวเดิมกลับมา
{ "ok": true, "credit": { "activity_id": "k3x9a", "student_id": "65012345", "name": "สมชาย ใจดี", "hours": 6,
  "full_hours": 6, "at": "2026-11-20T02:15:03+00:00", "method": "qr", "flags": [], ... } }
```

## ทุกคำสั่งที่แอปส่งไป Supabase

**อ่านเขียนตาราง** (REST: `GET/POST/PATCH/DELETE /rest/v1/<ตาราง>?<เงื่อนไข>`)

| คำสั่งในแอป | ทำอะไรกับ Supabase | ใช้ตอน |
| --- | --- | --- |
| `getStudent(id)` | select `students` where id | นิสิตเข้าแอป |
| `createStudent(s)` | upsert `students` (ซ้ำไม่ทับ) | นิสิตกรอกรหัสครั้งแรก |
| `updateStudent(id, patch)` | update `students` (reminders, notify) | ตั้งเตือน ตั้งค่าแจ้งเตือน |
| `getActivity(id)`, `listActivities()` | select `activities` | หน้าแรก หน้ากิจกรรม |
| `createActivity(a)` | insert `activities` (id สร้างในแอป) | ผู้ดูแลเผยแพร่กิจกรรม |
| `updateActivity(id, patch)` | update `activities` | แก้กิจกรรม ซ่อน ตั้งค่าเช็คชื่อ |
| `getRegistration`, `studentRegistrations` | select `registrations` | สถานะลงทะเบียนของนิสิต |
| `getCredit`, `listCredits`, `studentCredits` | select `credits` | ชั่วโมงของนิสิต รายชื่อผู้ดูแล |
| `setItems(a, s, items)` | update `credits.items` | กิจกรรมแลกขวด |
| `listNotices`, `addNotice`, `markNoticesRead` | select/insert/update `notices` | กล่องแจ้งเตือนนิสิต |
| `listAnnouncements(a)` | select `announcements` | ประกาศในหน้ากิจกรรม |
| `listMessages`, `sendMessage` | select/insert `messages` | แชทกิจกรรม (ดึงซ้ำทุก 4 วินาที) |
| `listDms`, `sendDm`, `markDmsRead` | select/insert/update `dms` | ข้อความส่วนตัว |
| `listTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate` | `templates` | เทมเพลตของหน่วยงาน |
| `markRecorded(a)` (แอดมิน) | update `activities.recorded_at` แล้ว insert `notices` ทีเดียวหลายแถว | แอดมินกด "บันทึกลงระบบแล้ว" |
| `creditHours(ids)` (แอดมิน) | select `credits(activity_id, hours)` ทีละหน้า 1000 แถว | สถิติชั่วโมงแยกหมวด |

**function ใน Postgres** (rpc: `POST /rest/v1/rpc/<ชื่อ>` งานที่สองคนอาจชนกันต้องผ่านตรงนี้ เพื่อให้ทำในครั้งเดียว)

| function | รับ | คืน | ทำอะไร |
| --- | --- | --- | --- |
| `server_now` | ไม่มี | ms | เวลาเซิร์ฟเวอร์ แอปคำนวณส่วนต่างนาฬิกาเครื่อง |
| `get_org` | `p_code` | `{code, name, admin}` | ตรวจรหัสหน่วยงานตอนผู้ดูแลเข้าระบบ |
| `claim` | ดูตัวอย่างด้านบน | `{ok, credit}` | ล็อกแถวกิจกรรม เขียนชั่วโมง บวก `credit_count` ลงทะเบียน walk-in ให้ |
| `register` | `p_activity, p_student, p_name` | true/false | ลงทะเบียน false เมื่อเต็มหรือมีอยู่แล้ว |
| `cancel_registration` | `p_activity, p_student` | ไม่มี | ยกเลิก ลด `reg_count` |
| `remove_registration` | `p_activity, p_student` | ไม่มี | ลบออกจากรายชื่อพร้อมชั่วโมง |
| `remove_credit` | `p_activity, p_student` | ไม่มี | ยกเลิกชั่วโมง |
| `set_hours` | `p_activity, p_student, p_hours, p_reason, p_by` | ไม่มี | แก้ชั่วโมงรายคน |
| `close_roster` | `p_activity` | ไม่มี | ปิดรายชื่อ |
| `submit_roster` | `p_activity` | ไม่มี | ส่งรายชื่อให้ศูนย์ |

**Realtime** (WebSocket, `src/data/remote.ts` ฟังก์ชัน `watchTable`)

| คำสั่งในแอป | ฟังตาราง | เมื่อมีการเปลี่ยน |
| --- | --- | --- |
| `watchActivities` | `activities` ทั้งตาราง | รอ 200 ms แล้วโหลดใหม่ทั้งรายการ |
| `watchActivity(id)` | `activities` แถวเดียว | โหลดแถวนั้นใหม่ |
| `watchRegistrations(a)` | `registrations` ของกิจกรรม | โหลดรายชื่อใหม่ |
| `watchCredits(a)` | `credits` ของกิจกรรม | โหลดชั่วโมงใหม่ ทำให้ตัวนับและรายชื่อสดข้ามเครื่อง |

Realtime ไม่ได้ส่งข้อมูลที่เปลี่ยนมาให้ใช้ตรง ๆ แค่บอกว่า "เปลี่ยนแล้ว" แอปไปโหลดใหม่เอง ถ้าเน็ตหลุดแล้วต่อใหม่ก็โหลดใหม่ทั้งหมด

## งานที่ยังทำในเครื่องผู้ใช้ ไม่ได้ทำที่หลังบ้าน

- **QR:** สร้างและตรวจ token ในแอป (`src/lib/qr.ts`) คนแกะโค้ดสร้าง QR เองได้
- **ตำแหน่ง:** เทียบระยะ GPS ในแอป (`src/lib/geo.ts`, `src/lib/claim.ts`) แล้วส่งผลเป็น `p_flags` และ `p_distance`
- **ตรวจรหัสหน่วยงาน:** ได้ชื่อหน่วยงานกลับมาแล้วเก็บในเครื่อง ไม่ได้อยู่ใน JWT
- **สถิติ:** โหลดกิจกรรมทั้งหมดมาคำนวณในแอป (`src/lib/home.ts`)
- **Excel:** สร้างไฟล์ในเบราว์เซอร์ (`src/lib/excel.ts`)

ถ้าจะย้ายงานพวกนี้ไปหลังบ้าน ใช้ Supabase Edge Functions หรือ Postgres function เพิ่ม แล้วปิดสิทธิ์เขียนตรงของตารางใน RLS ได้ หน้าจอไม่ต้องแก้ เพราะหน้าจอเรียกผ่าน `api.ts` อย่างเดียว แก้แค่ `remote.ts` ข้อเสนอการปรับฐานข้อมูลอยู่ใน `supabase/proposed-changes.sql`
