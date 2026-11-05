# 🤖 AGENTS.md - AI Guidelines and Commands

## 🎯 System Overview
- **Project Objective:** [Briefly describe the system in 1–2 sentences]
- **Core Stack:** Key technologies and versions (e.g., Next.js 16, Python 3.12, PostgreSQL)
- **Architecture:** Summary of the folder structure/architectural pattern (e.g., Clean Architecture, Monorepo)

## 🛠️ Development Commands
> *Golden Rule: Every command must be an executable command—ready to copy, paste, and run. Avoid vague or general descriptions.*

### 1. Setup & Dev Loop
- Install dependencies: `npm install` or `uv sync`
- Start the development server: `npm run dev` or `fastapi dev`

### 2. Testing
- Run all unit tests: `npm run test` or `uv run pytest`
- Run specific tests: `uv run pytest tests/unit/test_handlers.py`

### 3. Linting & Formatting
- Check code quality: `npm run lint` or `uv run ruff check`

## 🎨 Coding Standards & Conventions
- **General Style:** Follow the KISS (Keep It Simple, Stupid) principle; code should be self-explanatory.
- **Commenting:** Avoid excessive or redundant comments. If code is difficult to read, refactor it—unless it involves a truly complex algorithm.
- **Language:** Always use English for naming functions and variables, and for writing commit messages.

## ⚠️ Security & Boundaries
- **Secret Management:** Never hardcode API keys, passwords, or tokens. Always retrieve them via environment variables (`.env`).
- **Permission Boundaries:**
- **Allowed immediately:** Fixing bugs, adding unit tests, and improving code formatting.
- **Requires human approval:** Installing new software/dependencies, modifying the database schema, or changing CI/CD configuration files.

## 🧭 Escape Hatches
- If tests fail more than three consecutive times, stop and summarize the issue so a human can review it.
- If task requirements are ambiguous, ask clarifying questions before you begin writing any code.

📐 กฎกติกาและ Flow ของเกม
หน้าสร้างห้อง: ผู้เล่นคนที่ 1 กดสร้างห้อง ระบบสุ่มรหัส (เช่น XYZ123) และรอผู้เล่นคนที่ 2 นำรหัสมากรอกเพื่อเข้าร่วม

เริ่มเกม: ทั้งสองฝั่งมี HP = 3 และมีการ์ดบนมือ 3 ใบ (ค้อน, กรรไกร, กระดาษ)

การเล่นในแต่ละเทิร์น:

ผู้เล่นเลือกการ์ด 1 ใบแล้วกด "ยืนยัน" (ระบบจะคว่ำการ์ดไว้ ฝั่งตรงข้ามจะไม่รู้ว่าเลือกอะไร จนกว่าจะกดยืนยันทั้งคู่)

เมื่อทั้งคู่กดยืนยัน ระบบจะหงายการ์ดพร้อมกัน

คำนวณผลลัพธ์:

แพ้: ถูกหัก 1 HP

ชนะ/เสมอ: HP เท่าเดิม

เริ่มเทิร์นใหม่โดยดึงการ์ดที่ใช้ไปกลับขึ้นมือ (ให้มี 3 ใบเท่าเดิม)

จบเกม: ใคร HP ลดเหลือ 0 ก่อนเป็นฝ่ายแพ้