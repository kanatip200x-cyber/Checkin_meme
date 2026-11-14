/**
 * ระบบเช็คชื่อออนไลน์ — Google Apps Script (เชื่อมกับ Google Sheet)
 * ชีตที่ใช้: Students, Attendance, Settings  (กดรันฟังก์ชัน setup() ครั้งแรกเพื่อสร้างให้อัตโนมัติ)
 */

// ถ้าสคริปต์ผูกกับชีต (Extensions > Apps Script) ปล่อยว่างไว้ได้
// ถ้าเป็นสคริปต์แยก ให้ใส่ ID ของ Google Sheet ที่นี่
const SPREADSHEET_ID = '1K4fN9g4O32k9214KdSYTKW4b3c8WFrtYz6TByQIlU8U';   // Checkin_meme – ฐานข้อมูลเช็คชื่อ

// เวอร์ชันฝั่งเซิร์ฟเวอร์ (ควรตรงกับ APP_VERSION ใน index.html)
const APP_VERSION = '1.7.0';

const SHEET_STUDENTS = 'Students';
const SHEET_ATT = 'Attendance';
const SHEET_SET = 'Settings';
const SHEET_MEME = 'Memes';

// รายชื่อผู้เข้าเรียน (นำเข้าจากไฟล์ลงทะเบียน 22 คน) — แก้ต่อได้ในชีต Students
const ROSTER = [
  ['P01', 'นายกิตติธัช ธูปถมพงศ์', 'Foodle Noodle Co., Ltd.'],
  ['P02', 'นางสาววิภาดา พลาธนพร', 'Foodle Noodle Co., Ltd.'],
  ['P03', 'นายวิศรุต สุดสัตย์', 'Foodle Noodle Co., Ltd.'],
  ['P04', 'นายสิริวรรณ รอดศิริ', 'Foodle Noodle Co., Ltd.'],
  ['P05', 'นายคงติภูมิ มณีโชค', 'บริษัท ซีเอ็ม พรีเมี่ยม ไรซ์ จำกัด'],
  ['P06', 'นายนรพนธ์ จิรัฐิติกาลพงศ์', 'บริษัท ซีเอ็ม พรีเมี่ยม ไรซ์ จำกัด'],
  ['P07', 'นายคณาธิป จำนงค์', 'บริษัท ลาโต้ ฟู้ดแอนด์ดริ้งส์ จำกัด'],
  ['P08', 'นางสาวพรพิมล ผลเพิ่ม', 'บริษัท ลาโต้ ฟู้ดแอนด์ดริ้งส์ จำกัด'],
  ['P09', 'นางสาวรัตติยากร ฉายหิรัญ', 'บริษัท สยาม คอนซูมเมอร์ โปรดักส์ จำกัด'],
  ['P10', 'นายวิชยุตม์ กีรติธนาภรณ์', 'บริษัท เมอร์เดียนท์ จำกัด'],
  ['P11', 'นางสาวจิตรา คำแหง', 'บริษัท โอชาฟูดแพ็ค จำกัด'],
  ['P12', 'นางสาวณัฏชา แสวงหอม', 'บริษัท โอชาฟูดแพ็ค จำกัด'],
  ['P13', 'นางสาวธนวรรณ ตั้งตรงพานิช', 'บริษัท โอชาฟูดแพ็ค จำกัด'],
  ['P14', 'นางสาวนัทธมน พุทธพรม', 'บริษัท โอชาฟูดแพ็ค จำกัด'],
  ['P15', 'นางสาวระวีวรรณ การภักดี', 'บริษัท โอชาฟูดแพ็ค จำกัด'],
  ['P16', 'นางสาววราภรณ์ หวานล้ำ', 'บริษัท โอชาฟูดแพ็ค จำกัด'],
  ['P17', 'นางสาวอรณิชา ครองศักดิ์ศิริ', 'บริษัท โอชาฟูดแพ็ค จำกัด'],
  ['P18', 'นางสาวจิดาภา ทองเกิด', 'เทพผดุงพรมะพร้าว จำกัด'],
  ['P19', 'นางสาวพิชญา พิสุทธิ์พิเชฎฐ์', 'เทพผดุงพรมะพร้าว จำกัด'],
  ['P20', 'นางสาววันทนา จุตาลานนท์', 'เทพผดุงพรมะพร้าว จำกัด'],
  ['P21', 'นางสาวสุชาดา เอี่ยมสำอางค์', 'เทพผดุงพรมะพร้าว จำกัด'],
  ['P22', 'นายภณธกร วงศ์เจริญ', 'เบทาโกร']
];

function ss_() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function tz_() {
  return Session.getScriptTimeZone() || 'Asia/Bangkok';
}

/**
 * GET  ?action=getData           → JSON ข้อมูลทั้งหมด (ใช้โดยหน้าเว็บบน GitHub Pages)
 * POST {action:'checkIn',payload} → JSON ผลการเช็คชื่อ (บันทึกลง Google Sheet)
 * GET  (ไม่มี action)            → เปิดหน้าเว็บจากไฟล์ index ใน Apps Script (ถ้ามี)
 */
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action) return json_(() => route_(action, e.parameter));
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('เช็คชื่อออนไลน์')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return json_(() => ({ message: 'API เช็คชื่อพร้อมใช้งาน', actions: ['getData', 'checkIn'] }));
  }
}

function doPost(e) {
  return json_(() => {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return route_(body.action, body.payload);
  });
}

function route_(action, payload) {
  if (action === 'getData') return getData();
  if (action === 'checkIn') return checkIn(payload);
  throw new Error('ไม่รู้จักคำสั่ง: ' + action);
}

function json_(fn) {
  let out;
  try { out = { ok: true, data: fn() }; }
  catch (err) { out = { ok: false, error: (err && err.message) || String(err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** รันครั้งแรกครั้งเดียว: สร้างชีตและหัวตาราง พร้อมรายชื่อตัวอย่าง */
function setup() {
  const s = ss_();

  let st = s.getSheetByName(SHEET_STUDENTS) || s.insertSheet(SHEET_STUDENTS);
  if (st.getLastRow() === 0) writeRoster_(st);

  let at = s.getSheetByName(SHEET_ATT) || s.insertSheet(SHEET_ATT);
  if (at.getLastRow() === 0) {
    at.appendRow(['วันที่', 'เวลา', 'รหัส', 'ชื่อ-นามสกุล', 'สถานะ', 'ลายเซ็น (base64)']);
    at.getRange('A:C').setNumberFormat('@');
    at.setFrozenRows(1);
  }

  let se = s.getSheetByName(SHEET_SET) || s.insertSheet(SHEET_SET);
  if (se.getLastRow() === 0) {
    se.getRange('B:B').setNumberFormat('@');
    se.appendRow(['ตั้งค่า', 'ค่า']);
    se.appendRow(['ชื่อวิชา', 'คอร์สสร้างเว็บแอปด้วย Claude']);
    se.appendRow(['เวลาเข้าเรียน', '08:30']);
    se.appendRow(['สายเกิน(นาที)', '15']);
    se.setFrozenRows(1);
  }
  // เติมแถวตั้งค่าที่ยังไม่มี (กรณีชีตเก่า)
  const keys = se.getRange(1, 1, Math.max(se.getLastRow(), 1), 1).getValues().map(r => String(r[0]).trim());
  if (keys.indexOf('มีมใต้คำแนะนำ') < 0) se.appendRow(['มีมใต้คำแนะนำ', '']);

  // ชีตมีม: ใส่ลิงก์รูปในคอลัมน์ B (เพิ่มได้หลายแถวต่อหมวด ระบบจะสุ่มให้แต่ละคน)
  // ใช้ {name} ในคำบรรยายเพื่อแทนด้วยชื่อเล่น/ชื่อจริงของคนนั้น
  let me = s.getSheetByName(SHEET_MEME) || s.insertSheet(SHEET_MEME);
  if (me.getLastRow() === 0) {
    me.getRange(1, 1, 1, 5).setValues([['หมวด', 'ลิงก์รูป/GIF (Tenor, ลิงก์รูปตรง หรือ Google Drive)', 'คำบรรยายบน (ใส่ - = ไม่มี)', 'คำบรรยายล่าง (ใส่ - = ไม่มี)', 'ใช้กับใคร']]).setFontWeight('bold');
    me.getRange(2, 1, 5, 5).setValues([
      ['top',   '', 'เข้ามาเรียนไว', 'ไม่มีใครให้คุยด้วย', 'มาเรียน ≥ 95%'],
      ['good',  '', '-', 'อย่าให้มีครั้งที่ 2', 'มาเรียน 80–94%'],
      ['risk',  '', 'ฉันรู้ว่าคุณต้องมา', 'ฉันอยู่นี่แล้ว', 'มาเรียน 60–79%'],
      ['ghost', '', 'ครู: {name} มาไหม', 'ทั้งห้อง: ใครอะ?', 'มาเรียน < 60%'],
      ['new',   '', 'ทุกคนดูนี่!', 'สมาชิกใหม่ของห้อง {name}', 'เรียนมาไม่ถึง 3 คาบ'],
    ]);
    me.setFrozenRows(1);
    me.setColumnWidth(2, 380);
  }
}

function readMemes_() {
  const me = ss_().getSheetByName(SHEET_MEME);
  if (!me || me.getLastRow() < 2) return [];
  return me.getRange(2, 1, me.getLastRow() - 1, 4).getValues()
    .filter(r => String(r[0]).trim() !== '')
    .map(r => ({ key: String(r[0]).trim().toLowerCase(), url: imageUrl_(String(r[1]).trim()),
                 top: String(r[2]).trim(), bot: String(r[3]).trim() }));
}

/** แปลงลิงก์ที่วางในชีตให้เป็นลิงก์รูป/GIF ที่แสดงบนเว็บได้ */
function imageUrl_(u) {
  if (!u) return '';
  if (/^https?:\/\/(www\.)?tenor\.com\//i.test(u)) return tenorUrl_(u);
  return driveUrl_(u);
}

/**
 * รองรับลิงก์หน้าเว็บ Tenor เช่น https://tenor.com/view/xxx-gif-123456 หรือลิงก์แชร์ https://tenor.com/xxxx.gif
 * ระบบจะเปิดหน้าเว็บนั้นครั้งเดียวเพื่อหาไฟล์ GIF จริง (media.tenor.com) แล้วจำไว้ ไม่ต้องโหลดซ้ำ
 */
function tenorUrl_(u) {
  const props = PropertiesService.getScriptProperties();
  const key = 'tn_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, u)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
  const hit = props.getProperty(key);
  if (hit) return hit;
  try {
    const res = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0' } });
    const type = String(res.getHeaders()['Content-Type'] || res.getHeaders()['content-type'] || '');
    let gif = '';
    if (/^image\//i.test(type)) {
      gif = u;                                   // ลิงก์ชี้ไปที่ไฟล์ GIF อยู่แล้ว
    } else {
      const html = res.getContentText();
      const pick = re => { const m = html.match(re); return m ? m[1].replace(/&amp;/g, '&') : ''; };
      gif = pick(/itemprop=["']contentUrl["'][^>]*content=["'](https:\/\/media\d*\.tenor\.com\/[^"']+\.gif)["']/i)
         || pick(/property=["']og:image["'][^>]*content=["'](https:\/\/media\d*\.tenor\.com\/[^"']+\.gif)["']/i)
         || pick(/(https:\/\/media\d*\.tenor\.com\/[^"'\s<>]+\.gif)/i);
    }
    if (gif) { props.setProperty(key, gif); return gif; }
  } catch (e) {}
  return u;
}

/** แปลงลิงก์ Google Drive ให้เป็นลิงก์รูปที่แสดงบนเว็บได้ (ไฟล์ต้องแชร์แบบ "ทุกคนที่มีลิงก์") */
function driveUrl_(u) {
  if (!u) return '';
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  return m ? 'https://lh3.googleusercontent.com/d/' + m[1] : u;
}

function writeRoster_(st) {
  st.clear();
  st.getRange('A:A').setNumberFormat('@');
  st.getRange(1, 1, 1, 3).setValues([['รหัส', 'ชื่อ-นามสกุล', 'หน่วยงาน']]).setFontWeight('bold');
  st.getRange(2, 1, ROSTER.length, 3).setValues(ROSTER);
  st.setFrozenRows(1);
  st.autoResizeColumns(1, 3);
}

/** ถ้าเคยรัน setup() ไปแล้ว ให้รันฟังก์ชันนี้เพื่อเขียนรายชื่อ ROSTER ทับชีต Students */
function importRoster() {
  const s = ss_();
  writeRoster_(s.getSheetByName(SHEET_STUDENTS) || s.insertSheet(SHEET_STUDENTS));
}

function fmt_(v, pattern) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), pattern);
  return String(v == null ? '' : v).trim();
}

function readSettings_() {
  const se = ss_().getSheetByName(SHEET_SET);
  const out = { className: 'ชั้นเรียน', startTime: '08:30', lateMinutes: 15, formMeme: '' };
  if (!se || se.getLastRow() < 2) return out;
  se.getRange(2, 1, se.getLastRow() - 1, 2).getValues().forEach(([k, v]) => {
    k = String(k).trim();
    if (k === 'ชื่อวิชา') out.className = fmt_(v, '');
    if (k === 'เวลาเข้าเรียน') out.startTime = fmt_(v, 'HH:mm').slice(0, 5);
    if (k === 'สายเกิน(นาที)') out.lateMinutes = Number(v) || 0;
    if (k === 'มีมใต้คำแนะนำ') out.formMeme = imageUrl_(String(v).trim());
  });
  return out;
}

function readStudents_() {
  const st = ss_().getSheetByName(SHEET_STUDENTS);
  if (!st || st.getLastRow() < 2) return [];
  return st.getRange(2, 1, st.getLastRow() - 1, 3).getValues()
    .filter(r => String(r[0]).trim() !== '')
    .map(r => ({ id: String(r[0]).trim(), name: String(r[1]).trim(), room: String(r[2]).trim() }));
}

function readRecords_(today) {
  const at = ss_().getSheetByName(SHEET_ATT);
  if (!at || at.getLastRow() < 2) return [];
  return at.getRange(2, 1, at.getLastRow() - 1, 6).getValues()
    .filter(r => String(r[2]).trim() !== '')
    .map(r => {
      const date = fmt_(r[0], 'yyyy-MM-dd');
      return {
        date: date,
        time: fmt_(r[1], 'HH:mm:ss'),
        id: String(r[2]).trim(),
        name: String(r[3]).trim(),
        status: String(r[4]).trim(),
        // ส่งลายเซ็นเฉพาะของวันนี้ เพื่อให้โหลดเร็ว
        sig: date === today ? String(r[5] || '') : '',
      };
    });
}

function statusFor_(hhmm, s) {
  const [h, m] = String(s.startTime).split(':').map(Number);
  const limit = h * 60 + m + Number(s.lateMinutes || 0);
  const [H, M] = hhmm.split(':').map(Number);
  return H * 60 + M <= limit ? 'ตรงเวลา' : 'สาย';
}

/** เรียกจากหน้าเว็บ: ดึงข้อมูลทั้งหมด */
function getData() {
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  return {
    settings: readSettings_(),
    students: readStudents_(),
    records: readRecords_(today),
    memes: readMemes_(),
    today: today,
    version: APP_VERSION,
  };
}

/** เรียกจากหน้าเว็บ: นักเรียนยืนยันเข้าเรียน + ลายเซ็น */
function checkIn(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const id = String((p && p.id) || '').trim();
    const sig = String((p && p.sig) || '');
    if (!id) throw new Error('กรุณาเลือกชื่อนักเรียน');
    if (!p.confirm) throw new Error('กรุณากดยืนยันว่าเข้าเรียนจริง');
    if (sig.indexOf('data:image/') !== 0) throw new Error('กรุณาเซ็นชื่อก่อนยืนยัน');
    if (sig.length > 49000) throw new Error('ลายเซ็นมีขนาดใหญ่เกินไป กรุณาเซ็นใหม่');

    const student = readStudents_().find(s => s.id === id);
    if (!student) throw new Error('ไม่พบรหัสนักเรียนนี้ในรายชื่อ');

    const now = new Date();
    const today = Utilities.formatDate(now, tz_(), 'yyyy-MM-dd');
    const time = Utilities.formatDate(now, tz_(), 'HH:mm:ss');

    const dup = readRecords_(today).find(r => r.date === today && r.id === id);
    if (dup) throw new Error(student.name + ' เช็คชื่อไปแล้วเมื่อ ' + dup.time.slice(0, 5) + ' น.');

    const status = statusFor_(time, readSettings_());
    const at = ss_().getSheetByName(SHEET_ATT);
    const row = at.getLastRow() + 1;
    at.getRange(row, 1, 1, 3).setNumberFormat('@');
    at.getRange(row, 1, 1, 6).setValues([[today, time, id, student.name, status, sig]]);

    return { record: { name: student.name, time: time, status: status }, data: getData() };
  } finally {
    lock.releaseLock();
  }
}
