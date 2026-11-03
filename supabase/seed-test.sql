-- Test data that mirrors src/data/fixture.ts, with times relative to now(). Paste into the SQL Editor and Run;
-- running it again resets the test data. supabase/clean-test.sql removes it.
do $seed$
declare
  today timestamptz := date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok';
  ended timestamptz := now() - interval '2 hours';
begin
  delete from activities where id in ('test-blood', 'test-ended');

  insert into orgs (code, name, admin) values
    ('NUVOL69', 'ศูนย์จิตอาสา กองกิจการนิสิต', false),
    ('NUADMIN', 'ศูนย์จิตอาสา กองกิจการนิสิต', true)
  on conflict (code) do update set name = excluded.name, admin = excluded.admin;

  -- Blood donation running today
  insert into activities (
    id, title, category_key, org, org_code, poster, description, place, lat, lng, start_at, end_at, hours,
    cap_limit, capacity, walk_in, qr_mode, loc_mode, radius, qr_interval, supervisor_name, supervisor_phone,
    chat_enabled, created_at, reg_count, credit_count
  ) values (
    'test-blood', 'บริจาคโลหิต ครั้งที่ 2/2569', 'blood', 'ศูนย์จิตอาสา กองกิจการนิสิต', 'NUVOL69', './posters/blood.jpg',
    'สิ่งที่ต้องเตรียม: บัตรนิสิต นอนหลับให้พอ และทานอาหารก่อนมา
ผู้บริจาคอายุ 17 ปีขึ้นไป น้ำหนัก 45 กิโลกรัมขึ้นไป สุขภาพแข็งแรง
คนที่ไม่ผ่านการคัดกรองก็ได้ชั่วโมงเต็ม',
    'อาคารอเนกประสงค์ มหาวิทยาลัยนเรศวร', 16.7466, 100.1948, today + interval '8 hours', today + interval '16 hours', 6,
    false, 0, true, 'dynamic', 'on', 150, 10, 'ศูนย์จิตอาสา', '055961234',
    false, today, 0, 0
  );

  -- River clean-up that ended 2 hours ago; the roster is still open and one person never came
  insert into activities (
    id, title, category_key, org, org_code, poster, description, place, lat, lng, start_at, end_at, hours,
    cap_limit, capacity, walk_in, qr_mode, loc_mode, radius, qr_interval, supervisor_name, supervisor_phone,
    chat_enabled, created_at, reg_count, credit_count
  ) values (
    'test-ended', 'เก็บขยะริมแม่น้ำน่าน', 'environment', 'ศูนย์จิตอาสา กองกิจการนิสิต', 'NUVOL69', './posters/river.jpg',
    'สิ่งที่ต้องเตรียม: ชุดที่เปื้อนได้ หมวก และขวดน้ำ
อุปกรณ์ทำงานมีให้ที่จุดนัดพบ',
    'ท่าน้ำหน้ามหาวิทยาลัยนเรศวร', 16.7466, 100.1948, ended - interval '5 hours', ended, 5,
    true, 50, false, 'dynamic', 'on', 150, 10, 'ศูนย์จิตอาสา', '055961234',
    false, ended - interval '72 hours', 4, 3
  );

  insert into registrations (activity_id, student_id, name, at, walk_in) values
    ('test-ended', '65030011', 'สมชาย ใจดี', ended - interval '48 hours', false),
    ('test-ended', '65030012', 'สมหญิง รักเรียน', ended - interval '47 hours', false),
    ('test-ended', '65030013', 'ธนากร แสงทอง', ended - interval '46 hours', true),
    ('test-ended', '65030014', 'ปวีณา มาสาย', ended - interval '45 hours', false);

  insert into credits (activity_id, student_id, name, hours, full_hours, at, method, flags, edited_by, edited_at, reason) values
    ('test-ended', '65030011', 'สมชาย ใจดี', 5, 5, ended - interval '5 hours' + interval '20 minutes', 'qr', '{}', null, null, null),
    ('test-ended', '65030012', 'สมหญิง รักเรียน', 3, 5, ended - interval '5 hours' + interval '40 minutes', 'qr', '{}', 'ศูนย์จิตอาสา', ended, 'กลับก่อน'),
    ('test-ended', '65030013', 'ธนากร แสงทอง', 5, 5, ended - interval '5 hours' + interval '60 minutes', 'manual', '{}', 'ศูนย์จิตอาสา', null, null);
end
$seed$;
