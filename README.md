# game-platform

本倉庫目前並存兩套入口（來自不同 PR），尚未決定以哪一套作為正式首頁：

| 入口 | 來源 | 用途 |
|------|------|------|
| Next.js `npm run dev` → http://localhost:3000 | 本分支（課練遊） | 班別學號登入、進度／掌握度推薦、每局 10 題由淺入深、結算總結與鞏固策略 |
| 靜態 `index.html` + `data/games-catalog.json` | `main`（六級共享平台） | 小一至小六遊戲目錄、同學分享網址、串接 [Game Generator](https://shamsham2026.github.io/game-generator/) |

> **待產品決策：** Next.js App Router 會服務 `/`；根目錄 `index.html` 只在靜態伺服器（如 `python3 -m http.server`）下作為首頁。兩者不會同時作為同一個 HTTP 服務的 `/`。

---

## A. 課練遊（Next.js 練習平台）

公開學生個人化針對性練習遊戲平台：以**班別 + 學號**進入，按年級進度表與掌握度建議今日課題；每局 **10 題由淺入深**，結束以一句話總結表現並給鞏固策略。課本課題目標鎖定不可改，教師可上載進度表並新增練習（去重＋審核）。

### 內容結構（摘要）

詳見 [`docs/content-structure.md`](docs/content-structure.md)。

1. **課程目錄（鎖定）** — 年級 → 科目 → 範疇 → 課題 → 學習目標；目標發布後唯讀  
2. **練習庫（可擴）** — 按範疇新增 Exercise；`contentHash` 防重複；審核後才給學生  
3. **學生身份** — `classCode` + `studentNo`  
4. **練習運行** — 每次 session 種子抽題，排除近期已做  
5. **個人化** — 登入推薦：本週弱項 → 先修 → 近期弱項  

### 快速開始

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

### 主要 API

見 [`docs/api-outline.md`](docs/api-outline.md)。

- `POST /api/auth/student-login`  
- `GET  /api/me/recommendations`  
- `POST /api/practice/sessions`  
- `POST /api/practice/attempts`  
- `POST /api/exercises`（新增練習，不改課題目標）  
- `POST /api/curriculum/progress-plans/import`（上載進度表）  

---

## B. 六級數學遊戲共享平台（靜態頁）

小一至小六的數學遊戲資源庫：匯集曾經製作的遊戲，並與 [Game Generator](https://shamsham2026.github.io/game-generator/) 串接，方便同學之間共享練習資源。

### 功能

- **六級分層**：小一至小六切換，按課題篩選
- **既有遊戲目錄**：內建已公開的 GitHub Pages 遊戲（乘法、平行線、分數、小數等）
- **同學分享**：貼上 Generator 做好的遊戲網址，寫上班別學號後加入資源庫
- **班級共享連結**：一鍵複製含分享清單的連結，其他裝置打開即可同步
- **串接 Generator**：按年級開啟 Game Generator（`?grade=p4|p5|p6`）

### 建議流程

1. 在 [Game Generator](https://shamsham2026.github.io/game-generator/) 選年級／課題／玩法，生成遊戲
2. 把完成的 HTML 遊戲放到 GitHub Pages 或學校網站
3. 回到本平台按「分享遊戲」，貼上網址
4. 按「複製共享連結」发给同學

### 本機預覽

```bash
python3 -m http.server 4173
```

開啟 http://localhost:4173/

### 資料檔

- `data/games-catalog.json`：內建遊戲清單（可繼續新增）
- 同學分享的遊戲暫存於瀏覽器 `localStorage`，並可編碼進共享連結的 `pack` 參數

### 相關專案

- [game-generator](https://github.com/shamsham2026/game-generator)
- [6B-game-platform](https://github.com/shamsham2026/6B-game-platform)
