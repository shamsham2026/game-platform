# API 大綱（v1）

## 身份

- `POST /api/auth/student-login` `{ classCode, studentNo }` → session token  
- `POST /api/auth/logout`

## 課程（教師；課題鎖定）

- `POST /api/curriculum/progress-plans/import` 上載年級進度表  
- `GET  /api/curriculum/grades/:gradeCode/topics` 唯讀課題樹  
- `POST /api/curriculum/topics/:id/lock` 鎖定目標（不可逆）  
- ~~`PATCH topics/:id/objectives`~~ **禁止**（鎖定後）

## 練習庫

- `POST /api/exercises` 按範疇新增（自動去重／待審）  
- `POST /api/exercises/:id/approve`  
- `GET  /api/exercises?topicId=&domainId=`

## 學生練習

- `GET  /api/me/recommendations` 登入後建議課題  
- `POST /api/practice/sessions` `{ topicIds?, gameKind? }` → 隨機題包  
- `POST /api/practice/sessions/:id/attempts` 提交作答  
- `GET  /api/me/mastery` 掌握度分析  

## 遊戲生成

- `POST /api/games/generate` 依弱項 + 模板產生個人化短局  
