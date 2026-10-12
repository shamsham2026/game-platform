# 六級數學遊戲共享平台

小一至小六的數學遊戲資源庫：匯集曾經製作的遊戲，並與 [Game Generator](https://shamsham2026.github.io/game-generator/) 串接，方便同學之間共享練習資源。

## 功能

- **六級分層**：小一至小六切換，按課題篩選
- **既有遊戲目錄**：內建已公開的 GitHub Pages 遊戲（乘法、平行線、分數、小數等）
- **同學分享**：貼上 Generator 做好的遊戲網址，寫上班別學號後加入資源庫
- **班級共享連結**：一鍵複製含分享清單的連結，其他裝置打開即可同步
- **串接 Generator**：按年級開啟 Game Generator（`?grade=p4|p5|p6`）

## 建議流程

1. 在 [Game Generator](https://shamsham2026.github.io/game-generator/) 選年級／課題／玩法，生成遊戲
2. 把完成的 HTML 遊戲放到 GitHub Pages 或學校網站
3. 回到本平台按「分享遊戲」，貼上網址
4. 按「複製共享連結」发给同學

## 本機預覽

```bash
python3 -m http.server 4173
```

開啟 http://localhost:4173/

## 資料檔

- `data/games-catalog.json`：內建遊戲清單（可繼續新增）
- 同學分享的遊戲暫存於瀏覽器 `localStorage`，並可編碼進共享連結的 `pack` 參數

## 相關專案

- [game-generator](https://github.com/shamsham2026/game-generator)
- [6B-game-platform](https://github.com/shamsham2026/6B-game-platform)
