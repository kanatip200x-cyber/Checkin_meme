/**
 * ตั้งค่าการเชื่อมต่อ Google Sheet
 * วางลิงก์ Web App ที่ได้จาก Apps Script (Deploy > New deployment > Web app)
 * ลิงก์จะหน้าตาประมาณ: https://script.google.com/macros/s/XXXXXXXXXXXX/exec
 * ต้องใส่ลิงก์นี้ หน้าเว็บจึงจะใช้งานได้ (ถ้าว่าง จะขึ้นหน้า "ยังไม่ได้เชื่อม Google Sheet")
 */
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwPLIGIbNp8UOqU8l_TVU6AgSbiHFsk9SBalE3Am3SLfa2h1ZOl-9kUX3nvn-qD-7UHyA/exec',

  // (ไม่บังคับ) เปลี่ยนมีมใต้ข้อความ "เลือกชื่อตัวเอง เซ็นชื่อ..." ปล่อยว่าง = ใช้มีมที่ฝังไว้ในหน้าเว็บ
  // ใส่ได้ทั้งลิงก์ Tenor, ลิงก์รูป/GIF หรือไฟล์ในโปรเจกต์ เช่น 'assets/form-meme.mp4'
  // ถ้าตั้งค่า "มีมใต้คำแนะนำ" ในชีต Settings ไว้ ค่าในชีตจะถูกใช้ก่อน
  FORM_MEME_URL: ''
};
