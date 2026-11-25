# BuildFlow ERP Dashboard (React)

ต้นแบบ ERP Dashboard สำหรับธุรกิจรับเหมาก่อสร้าง อ้างอิงหน้าตาจากภาพตัวอย่าง

## วิธีเปิดใช้งาน
1. ติดตั้ง Node.js เวอร์ชัน 18 ขึ้นไป
2. แตกไฟล์ ZIP
3. เปิด Terminal ในโฟลเดอร์โปรเจกต์ แล้วรัน:

```bash
npm install
npm run dev
```

4. เปิด URL ที่ Vite แสดง (โดยปกติคือ http://localhost:5173)

## ฟังก์ชันในต้นแบบ
- Dashboard KPI และกราฟโครงการ
- แผนภูมิสถานะโครงการ
- ตารางโครงการล่าสุด พร้อมค้นหา
- เมนู ERP หลักและหน้าโมดูลตัวอย่าง
- Notification และ User Profile popover
- Modal สร้างโครงการตัวอย่าง
- พิมพ์ Dashboard

## หมายเหตุ
ข้อมูลทั้งหมดเป็น Mock Data เพื่อแสดงหน้าตาและการทำงานฝั่ง Frontend เท่านั้น
ยังไม่ได้เชื่อมต่อ Backend, Database, ระบบ Login จริง หรือสิทธิ์ผู้ใช้งาน
