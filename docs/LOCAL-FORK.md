# 本機 Fork — CopySpace

## 目的

從上游 Cool CopyParty Front 建立獨立工作副本，以 CopySpace 作為區網入口。Copyparty 仍是檔案與權限後端；只將其 listener 調整為 loopback 3924，不改帳號、密碼、共享資料或 ACL。

## 位置與服務

- 工作目錄：D:\Github\Cool-CopyParty-Front-Fork
- 工作分支：zien/media-library-ui
- origin：https://github.com/zien0709/cool-copyparty-front.git
- upstream：https://github.com/andrecrjr/cool-copyparty-front.git（fetch only，push URL 為 DISABLED）
- CopySpace 區網入口：http://192.168.50.72:3923（Python TCP Gateway）
- CopySpace Next.js：http://127.0.0.1:3925（loopback only）
- Copyparty API：http://127.0.0.1:3924（loopback only）
- 共享資料：D:\Shared（保持不變）

## 不可違反的邊界

1. Copyparty 的設定只允許為整合入口調整 listener 位址／埠；不得改動帳號、密碼、共享資料或 D:\Shared ACL。
2. CopySpace 使用 Next.js loopback 3925 與 Python Gateway LAN 3923；Copyparty API 僅 loopback 3924。
3. 不得提交密碼、Cookie、API 憑證、.env.local 或機器專屬秘密。
4. Copyparty 是認證與權限的最終來源；前端不得將唯讀帳號呈現為可寫入。
5. 其他裝置只需要瀏覽器，不要求安裝桌面客戶端。
6. 未確認上游授權條款前，不公開散布衍生版本。

## Git 工作流程

- 在自己的 Fork 開發；push 只允許到 origin。
- upstream 只用於 fetch，push URL 必須維持 DISABLED。
- 使用 Conventional Commits，按認證、安全、UI、部署與文件拆分。
- Commit 前執行 lint、typecheck、build 與 git diff --check。
- 確認 .env.local 被忽略；禁止提交機器專用備份。

## 部署與回退

- 啟動：scripts/Start-CopySpace.ps1。
- 停止：scripts/Stop-CopySpace.ps1。
- 區網防火牆：沿用限定 Python 3.12 TCP 3923 的規則；只有在規則遺失時才執行 scripts/Allow-CopySpace-LAN.ps1。
- 日誌：%LOCALAPPDATA%\CopySpace\logs。
- 主機專用回退腳本：D:\Copyparty\Rollback-CopySpace-Entry.ps1。
- 原始 Copyparty 設定備份：D:\Copyparty\backups\copyparty.conf.before-copyspace-entry.bak。

回退腳本與備份不在 repository，因為它們包含固定機器路徑與部署前設定。使用前必須確認備份存在且屬於本次部署。

## 目前狀態（2026-11-09）

- CopySpace 唯一 LAN 入口為 3923；Next.js 只監聽 loopback 3925。
- Copyparty API 只監聽 loopback 3924。
- Host 端已檢查三個 listener 與 HTTP smoke response。
- 未登入 API 回 401；不在 allowlist 的 upstream origin 回 400。
- 尚未完成另一台實體 LAN 裝置的端到端測試，也尚未完成真實帳號密碼登入與完整 ACL 驗收。
- Fork PR #1、#2、#3 已合併至自己的 main；目前文件變更會以新 PR 送入同一 Fork。
