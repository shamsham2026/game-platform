# Game Platform — 內容結構分析

本文件定義「公開學生個人化針對性練習遊戲」的內容層級、鎖定規則、連線關係與資料庫邊界。

## 1. 設計目標（對應需求）

| 需求 | 結構對策 |
|------|----------|
| 溫習於娛樂 | 課題 → 練習題庫 → 遊戲模板（多形式），內容與玩法分離 |
| 加強連線效果 | Topic / Domain / Exercise 以關聯邊連接；遊戲可做配對／連線玩法 |
| 強化 Database | 單一真相來源；課題鎖定、練習可擴、作答可追蹤 |
| 持續練習與分析 | Attempt + Mastery；登入時推薦弱項課題 |
| 上載年級進度表 | ProgressPlan 可匯入；不改動課題目標 |
| 課題目標不可改 | Topic / LearningObjective 發布後唯讀 |
| 按範疇新增練習 | Exercise 掛在 Domain + Topic，可增不可覆寫課題 |
| 內容準確、無重複 | 審核狀態 + contentHash / 正規化比對 |
| 班別學號進入 | StudentIdentity = classCode + studentNo |
| 每次題目隨機 | 每次 session 以種子抽題，排除近期已做 |

## 2. 五層內容模型

```
┌─────────────────────────────────────────────────────────┐
│ L1 課程目錄（Curriculum）— 教師上載，課題目標鎖定        │
│  Grade → Subject → Domain(範疇) → Topic(課題) → Objective │
│  ProgressPlan（年級進度表／時間軸）                        │
└───────────────────────────┬─────────────────────────────┘
                            │ 只讀引用
┌───────────────────────────▼─────────────────────────────┐
│ L2 練習庫（Practice Bank）— 可按範疇新增，須審核無重複    │
│  Exercise + GameTemplate + ConnectionEdge                │
└───────────────────────────┬─────────────────────────────┘
                            │ 運行時組合
┌───────────────────────────▼─────────────────────────────┐
│ L3 學生身份（Identity）— 班別 + 學號                      │
│  ClassRoom → Student                                     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ L4 練習運行（Runtime）— 每次隨機出題                      │
│  PracticeSession → SessionItem → Attempt                 │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ L5 個人化與分析（Personalization）                        │
│  MasterySnapshot + LoginRecommendation + GeneratedGame   │
└─────────────────────────────────────────────────────────┘
```

### L1 課程目錄（鎖定層）

- **GradeLevel**：年級（如 P4、S1）。
- **Subject**：科目（中文、英文、數學等）。
- **Domain**：範疇（如「數與代數」「閱讀理解」）。新增練習必須掛範疇。
- **Topic**：課本課題。`objectivesLocked = true` 後，標題／目標不可改，只可停用。
- **LearningObjective**：課題目標條文；發布後不可修改文案，只可標記 `retired`。
- **ProgressPlan / ProgressPlanItem**：教師上載的年級進度表（週次／單元順序）。進度表只影響「建議先練什麼」，**不改寫**課題目標。

### L2 練習庫（可擴層）

- **Exercise**：練習題；必連 `topicId` + `domainId`；可選連一個或多個 `objectiveId`。
- **GameTemplate**：遊戲形式（quiz、match/連線、fill-blank、timed-rush 等）。
- **ConnectionEdge**：課題／練習之間的連線（先修、相關、易混淆），供「連線遊戲」與推薦路徑使用。
- **去重**：`normalizedStem` + `contentHash`；同 Topic 內 hash 衝突拒絕寫入。
- **準確性**：`reviewStatus = draft | pending_review | approved | rejected`；學生端只抽 `approved`。

### L3 學生身份

- 進入畫面憑證：**班別代碼 + 學號**（不必電郵密碼）。
- `ClassRoom.code` 全校唯一；`Student.studentNo` 在班內唯一。

### L4 練習運行（由淺入深 + 隨機）

- 每次開始練習建立 `PracticeSession`，預設 **10 題**。
- 按難度 1→5 配額抽題（每檔約 2 題），檔內隨機；整局順序由淺入深。
- 優先排除該生最近 N 次 session 已出現的題，仍不夠才放寬。
- 選項順序仍以種子隨機打亂。
- 結束後產生**一句表現總結** + **2–3 條鞏固策略**（見 `session-feedback`）。

### L5 個人化與分析

- **MasterySnapshot**：每生每課題掌握度（正確率、近因、練習量）。
- **LoginRecommendation**：登入時建議「現在先練」的課題清單：
  1. 進度表上「本週應學」且掌握度低
  2. 近期錯題相關課題
  3. 先修未穩的連線課題
- **GeneratedGame**：依弱項課題 + 遊戲模板組出個人化短局。

## 3. 不可變規則（業務不變式）

1. **課題目標鎖定**：`Topic.objectivesLocked` 後，禁止更新 `LearningObjective.text`；API 回 409。
2. **進度表不覆寫目標**：匯入 ProgressPlan 只寫週次／順序／建議時數。
3. **練習可增不可替題目標**：新 Exercise 只能引用既有 Topic/Objective。
4. **無重複**：同 Topic 下 `contentHash` 唯一；建立前跑正規化比對。
5. **學生可見內容**：僅 `approved` + Topic 未停用。
6. **每次隨機**：禁止固定題序；session 必有 `rngSeed`。

## 4. 連線效果（Connection）

「連線」同時服務教學與娛樂：

- **資料連線**：`ConnectionEdge`（topic↔topic、exercise↔exercise）支撐推薦與知識路徑。
- **遊戲連線**：`GameTemplate.kind = match` 用邊或配對項生成連連看／配對關。
- **學習連線**：登入建議沿「弱項 → 先修 → 本週進度」串成一條練習路徑。

## 5. 教師／學生流程

### 教師

1. 上載年級進度表 → ProgressPlan  
2. 確認／匯入課題與目標 → 鎖定  
3. 按範疇新增練習 → 審核通過後入庫  
4. 檢視班別掌握度報表  

### 學生

1. 輸入班別 + 學號進入  
2. 看見「今日建議課題」  
3. 進入個人化遊戲／練習（題目隨機）  
4. 作答寫入 Attempt → 更新 Mastery → 下次建議更準  

## 6. 建議遊戲形式（可插拔）

| kind | 說明 | 內容來源 |
|------|------|----------|
| `quiz` | 選擇／判斷 | Exercise.options |
| `match` | 連線／配對 | ConnectionEdge 或 matchPairs |
| `fill_blank` | 填空 | Exercise.stem + blanks |
| `timed_rush` | 限時闖關 | 同上，加時間盒 |
| `review_mix` | 弱項混合包 | 推薦引擎選 Topic 後抽題 |

## 7. 匯入進度表格式（草案）

CSV / JSON 欄位：

- `gradeCode`, `subjectCode`, `weekNo`, `topicCode`, `suggestedMinutes`, `note`  
- **不包含**可覆寫的 objective 文案；若帶 objective，只能用於「對帳」，不符則警告、不覆蓋。

## 8. 六級遊戲庫（Hub）

與個人練習同一產品入口（`/hub`）：

- 內建目錄：`public/data/games-catalog.json`  
- 同學分享：瀏覽器 `localStorage` + 共享連結 `?pack=`  
- 串接 Game Generator（`?grade=p4|p5|p6`）  

## 9. 實作對應

- Prisma schema：`prisma/schema.prisma`  
- 領域規則：`src/lib/curriculum-guards.ts`、`src/lib/normalize.ts`、`src/lib/random-session.ts`、`src/lib/recommend.ts`、`src/lib/session-feedback.ts`  
- 遊戲庫：`src/lib/game-hub.ts`、`src/app/hub/page.tsx`  
- API 草案：`docs/api-outline.md`  
