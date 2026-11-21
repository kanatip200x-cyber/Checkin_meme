/**
 * ตั้งค่าการเชื่อมต่อ Supabase (ฐานข้อมูล + ล็อกอินด้วย Google)
 * ค่าเหล่านี้เปิดเผยได้ (publishable key) ความปลอดภัยของข้อมูลคุมด้วย Row Level Security ในฐานข้อมูล
 * ห้ามใส่ service_role key หรือ secret key ในไฟล์นี้เด็ดขาด
 */
window.APP_CONFIG = {
  SUPABASE_URL: 'https://ikevmgalkqpynhyvjqtx.supabase.co',
  SUPABASE_KEY: 'sb_publishable_XFgRvFSL_2lYePAXooBqdw_xYR5zG6a'
};
