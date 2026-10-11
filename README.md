# 課練遊（game-platform）

公開學生個人化針對性練習遊戲平台：以**班別 + 學號**進入，按年級進度表與掌握度建議今日課題，按範疇抽題且**每次隨機**；課本課題目標鎖定不可改，教師可上載進度表並新增練習（去重＋審核）。

## 內容結構（摘要）

詳見 [`docs/content-structure.md`](docs/content-structure.md)。

1. **課程目錄（鎖定）** — 年級 → 科目 → 範疇 → 課題 → 學習目標；目標發布後唯讀  
2. **練習庫（可擴）** — 按範疇新增 Exercise；`contentHash` 防重複；審核後才給學生  
3. **學生身份** — `classCode` + `studentNo`  
4. **練習運行** — 每次 session 種子抽題，排除近期已做  
5. **個人化** — 登入推薦：本週弱項 → 先修 → 近期弱項  

## 快速開始

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

開啟 http://localhost:3000 ，示範帳號：`班別 4A` / `學號 01`。

```bash
npm test
npm run typecheck
```

## 主要 API

見 [`docs/api-outline.md`](docs/api-outline.md)。

- `POST /api/auth/student-login`  
- `GET  /api/me/recommendations`  
- `POST /api/practice/sessions`  
- `POST /api/practice/attempts`  
- `POST /api/exercises`（新增練習，不改課題目標）  
- `POST /api/curriculum/progress-plans/import`（上載進度表）  
