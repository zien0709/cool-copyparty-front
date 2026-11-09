# 本機 Fork — CopySpace

## 目的

從上游 Cool CopyParty Front 建立獨立工作副本，以 CopySpace 作為區網入口。Copyparty 仍是檔案與權限後端；只將其監聽位址／埠調整為 loopback 3924，不改帳號、密碼、共享資料或 ACL。

## 位置與服務

- 工作目錄：`D:\Github\Cool-CopyParty-Front-Fork`
- 工作分支：`zien/media-library-ui`
- 上游遠端：`upstream` → `https://github.com/andrecrjr/cool-copyparty-front.git`
- CopySpace 區網入口：`http://192.168.50.72:3923`（Python TCP gateway）
- CopySpace Next.js：`http://127.0.0.1:3925`（loopback only）
- Copyparty API：`http://127.0.0.1:3924`（loopback only）
- 共享資料：`D:\Shared`（保持不變）

## 不可違反的邊界

1. Copyparty 的設定只允許為整合入口調整監聽位址／埠；不得改動帳號、密碼、共享資料或 `D:\Shared` ACL。
2. 不得修改 `D:\Shared` 的內容或 ACL。
3. CopySpace 使用 Next.js loopback 3925 與 Python TCP gateway LAN 3923；Copyparty API 僅 loopback 3924。
4. 不得提交密碼、Cookie、API 憑證、`.env*` 或機器專屬秘密。
5. Copyparty 是認證與權限的最終來源；前端不得把唯讀帳號顯示成可寫入。
6. 其他裝置只用瀏覽器，不要求安裝桌面客戶端。
7. 未確認上游授權條款前，不公開散布衍生版本。

## Git 工作流程

- 在 `zien/media-library-ui` 工作，不直接在 `main` 開發。
- `origin` 指向 `https://github.com/zien0709/cool-copyparty-front`；`upstream` 只用於 fetch，push URL 已封鎖為 `DISABLED`。
- 使用 Conventional Commits，按認證、安全、UI、部署文件拆分。
- 每個里程碑至少執行 Biome lint、TypeScript typecheck 與 production build。
- commit 前執行 `git diff --check`，確認 `.env.local` 被忽略。

## 部署

- 啟動：`scripts/Start-CopySpace.ps1`
- 停止：`scripts/Stop-CopySpace.ps1`
- 區網防火牆：沿用既有 Python 3.12 TCP 3923 限定規則；只有在該規則遺失時才執行 `scripts/Allow-CopySpace-LAN.ps1`。
- 日誌：`%LOCALAPPDATA%\CopySpace\logs`
- 回退腳本：`D:\Copyparty\Rollback-CopySpace-Entry.ps1`，會停止 gateway、還原 Copyparty 原始設定並重新啟動原生介面。

## 目前狀態

- CopySpace 的公開入口是 3923；Next.js 只監聽 loopback 3925。
- Copyparty API 只監聽 loopback 3924。
- 未登入 API 回傳 401；不在 allow-list 的 upstream origin 回傳 400。
- 尚未完成真實使用者密碼登入測試。
- Windows Public 網路沿用原有 Python 3.12 TCP 3923 限定規則；不需系統管理員新增 3925 規則。


## 入口整合紀錄（2026-11-09）

- Startup 資料夾含 `Copyparty.vbs` 與 `CopySpace.vbs`；CopySpace 啟動腳本會等待 loopback 後端就緒，避免開機競速。
- GitHub PR #1 與 PR #2 均已合併至自己的 Fork `main`；最新入口整合 commit 為 `a66a5ce`（PR #2 merge commit `584405f`）。
- LAN 唯一入口：`192.168.50.72:3923` → Python TCP gateway → `127.0.0.1:3925` CopySpace。
- CopySpace API upstream：`127.0.0.1:3924`，僅 loopback。
- Copyparty 設定只修改 `[global]` 的 bind address 與 port；帳號、認證、`D:\Shared` 路徑及 ACL 維持原樣。
- 原始設定備份：`D:\Copyparty\backups\copyparty.conf.before-copyspace-entry.bak`。
- 回退腳本：`D:\Copyparty\Rollback-CopySpace-Entry.ps1`。
- 回退時會停止 CopySpace gateway／前端、還原備份設定、重新啟動原生 Copyparty，並停用 CopySpace 啟動項。
- Host 端 HTTP smoke test：3923 CopySpace 200；3924 backend 200；未登入 API 401；不允許的 upstream 400。
- 三個 listener 分別為 `192.168.50.72:3923`、`127.0.0.1:3924`、`127.0.0.1:3925`。
- 尚未從另一台實體 LAN 裝置完成外部連線測試，也尚未以真實帳號密碼執行登入流程。