# 課練遊（game-platform）

統一入口的學生數學練習平台：

1. **個人練習**（`/`）— 班別 + 學號進入，按進度表／掌握度建議課題；每局 **10 題由淺入深**，結束一句總結 + 鞏固策略  
2. **六級遊戲庫**（`/hub`）— 小一至小六既有遊戲目錄，串接 [Game Generator](https://shamsham2026.github.io/game-generator/)，同學可分享網址與班級連結  

課本課題目標鎖定不可改；教師可上載進度表並按範疇新增練習（去重＋審核）。

## 內容結構（摘要）

詳見 [`docs/content-structure.md`](docs/content-structure.md)。

1. **課程目錄（鎖定）** — 年級 → 科目 → 範疇 → 課題 → 學習目標  
2. **練習庫（可擴）** — Exercise + `contentHash` 去重 + 審核  
3. **學生身份** — `classCode` + `studentNo`  
4. **練習運行** — 10 題由淺入深；選項隨機  
5. **個人化** — 登入推薦 + 結算策略  
6. **遊戲庫** — `public/data/games-catalog.json` + 本機／共享連結中的同學作品  

## 快速開始

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

- 個人練習：http://localhost:3000/ （示範 `4A` / `01`）  
- 六級遊戲庫：http://localhost:3000/hub  

```bash
npm test
npm run typecheck
```

## 主要 API

見 [`docs/api-outline.md`](docs/api-outline.md)。

## 相關專案

- [game-generator](https://github.com/shamsham2026/game-generator)
- [6B-game-platform](https://github.com/shamsham2026/6B-game-platform)
