# 🐸 เช็คชื่อ หรือ โดนเช็คบิล — ระบบเช็คชื่อออนไลน์

เว็บเช็คชื่อเข้าเรียน **ล็อกอินด้วย Google (Gmail)** แล้วเซ็นชื่อยืนยันเข้าเรียน ข้อมูลทั้งหมดเก็บใน **Supabase**
ธีมดำ-เขียวสไตล์มีม ใช้ได้ทั้ง PC, แท็บเล็ต และมือถือ

🌐 **เว็บไซต์:** https://kanatip200x-cyber.github.io/Checkin_meme/
📦 **เวอร์ชันปัจจุบัน:** v2.0.0 — ดู [CHANGELOG.md](CHANGELOG.md)

## ความสามารถ

- 🔐 ล็อกอินด้วยบัญชี Google ผ่าน Supabase Auth
- 🐣 ล็อกอินครั้งแรกเลือกชื่อตัวเองครั้งเดียว ระบบผูกบัญชีกับชื่อนั้น ครั้งต่อไปไม่ต้องเลือกอีก
- ✍️ เช็คชื่อได้เฉพาะชื่อตัวเอง (เพื่อนเซ็นแทนไม่ได้) วันละครั้ง เวลาและสถานะ "ตรงเวลา/สาย" คิดที่เซิร์ฟเวอร์ตามเวลาไทย
- 👥 รายชื่อทั้งหมด กรอง/ค้นหา แสดงทีละ 60 คน รองรับหลักพันคน
- 📊 สถิติรายบุคคล + การ์ดมีม GIF ตามยศการเข้าเรียน
- 🛠️ แผงควบคุมครู (เฉพาะแอดมิน): ตั้งเวลาเรียน/สาย, เพิ่ม-ลบรายชื่อ, ยกเลิกการผูกบัญชี, ลบการเช็คชื่อ, ดาวน์โหลด CSV

## โครงสร้าง

```
├── index.html              หน้าเว็บทั้งหมด (ขึ้น GitHub Pages)
├── config.js               SUPABASE_URL + publishable key
├── supabase/schema.sql     ตาราง, Row Level Security, ฟังก์ชัน RPC
├── assets/                 ไฟล์ต้นฉบับมีม (ในหน้าเว็บฝังไว้แล้ว)
├── data/                   รายชื่อผู้เข้าเรียน (ไฟล์อ้างอิง)
└── CHANGELOG.md
```

## ฐานข้อมูล (Supabase project `checkin-meme`, ภูมิภาคสิงคโปร์)

| ตาราง | เก็บอะไร | ใครอ่าน/เขียนได้ |
|---|---|---|
| `students` | รหัส, ชื่อ, หน่วยงาน, บัญชีที่ผูก | ทุกคนที่ล็อกอินอ่านได้ · แก้ได้เฉพาะแอดมิน |
| `attendance` | วันที่, เวลา, สถานะ, ลายเซ็น | ของตัวเอง หรือแอดมิน · บันทึกผ่าน `check_in()` เท่านั้น |
| `settings` | ชื่อวิชา, เวลาเข้าเรียน, สายเกินกี่นาที, มีม | อ่านได้ทุกคน · แก้ได้เฉพาะแอดมิน |
| `memes` | ลิงก์รูป/GIF ตามยศ | อ่านได้ทุกคน · แก้ได้เฉพาะแอดมิน |
| `admins` | อีเมลแอดมิน | เฉพาะแอดมิน |

ทุกตารางเปิด Row Level Security ผู้ใช้ที่ไม่ล็อกอินเข้าถึงข้อมูลไม่ได้เลย

**ฟังก์ชัน (RPC):** `get_dashboard()` ข้อมูลทั้งหน้า · `claim_student(id)` ผูกบัญชีกับชื่อ · `check_in(signature)` เช็คชื่อ · `admin_unlink(id)` ยกเลิกการผูก (แอดมิน)

**เพิ่มแอดมิน:** Supabase Dashboard → SQL Editor →
```sql
insert into public.admins (email) values ('someone@gmail.com');
```

## ตั้งค่าล็อกอินด้วย Google (ทำครั้งเดียว)

1. **Google Cloud Console** → APIs & Services → Credentials → Create credentials → **OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://kanatip200x-cyber.github.io`
   - Authorized redirect URIs: `https://ikevmgalkqpynhyvjqtx.supabase.co/auth/v1/callback`
   - (ถ้ายังไม่เคยตั้ง OAuth consent screen ให้ตั้งเป็น External และเพิ่มอีเมลตัวเองเป็น test user หรือกด Publish)
2. **Supabase Dashboard** → Authentication → Sign In / Providers → **Google** → เปิดใช้ → วาง Client ID และ Client Secret → Save
3. **Supabase Dashboard** → Authentication → URL Configuration
   - Site URL: `https://kanatip200x-cyber.github.io/Checkin_meme/`
   - Redirect URLs: เพิ่ม `https://kanatip200x-cyber.github.io/Checkin_meme/**`

## ติดตั้งใหม่ในโปรเจกต์ Supabase อื่น

1. สร้างโปรเจกต์ใน Supabase → SQL Editor → วาง `supabase/schema.sql` → Run
2. เพิ่มอีเมลแอดมินในตาราง `admins` และรายชื่อในตาราง `students` (หรือเพิ่มจากแผงควบคุมครูบนเว็บ)
3. แก้ `config.js` ให้เป็น Project URL และ **publishable key** ของโปรเจกต์ใหม่ (ห้ามใช้ service_role / secret key)
4. ตั้งค่าล็อกอินด้วย Google ตามหัวข้อด้านบน
5. อัปโหลดขึ้น GitHub → Settings → Pages → Deploy from branch `main` / root

## หมายเหตุด้านความปลอดภัย

- `config.js` มีแค่ publishable key ซึ่งเปิดเผยได้ ข้อมูลถูกป้องกันด้วย RLS ในฐานข้อมูล
- ใครก็ล็อกอินด้วย Google ได้ แต่จะเห็นข้อมูลก็ต่อเมื่อล็อกอินแล้ว และผูกได้เฉพาะชื่อที่ยังไม่มีคนผูก ถ้ามีคนผูกผิด แอดมินกด "ยกเลิกการผูกบัญชี" ได้
- รายชื่อจริงอยู่ใน `data/` ของ repo ถ้า repository เป็น Public ควรพิจารณาลบโฟลเดอร์นี้
