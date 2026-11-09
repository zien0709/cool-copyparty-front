# 本機 Fork — CopySpace

## 目的

從上游 Cool CopyParty Front 建立獨立工作副本，為既有 Copyparty 提供更易用的瀏覽器介面；不修改原本伺服器、共享資料或帳號設定。

## 位置與服務

- 工作目錄：`D:\Github\Cool-CopyParty-Front-Fork`
- 工作分支：`zien/media-library-ui`
- 上游遠端：`upstream` → `https://github.com/andrecrjr/cool-copyparty-front.git`
- 原始 Copyparty：`http://192.168.50.72:3923`（保持不變）
- CopySpace 前端：`http://192.168.50.72:3925`
- 共享資料：`D:\Shared`（保持不變）

## 不可違反的邊界

1. 前端開發不得修改、停止或重新設定 `D:\Copyparty`。
2. 不得修改 `D:\Shared` 的內容或 ACL。
3. CopySpace 使用自己的 Node.js 程序與 3925 埠。
4. 不得提交密碼、Cookie、API 憑證、`.env*` 或機器專屬秘密。
5. Copyparty 是認證與權限的最終來源；前端不得把唯讀帳號顯示成可寫入。
6. 其他裝置只用瀏覽器，不要求安裝桌面客戶端。
7. 未確認上游授權條款前，不公開散布衍生版本。

## Git 工作流程

- 在 `zien/media-library-ui` 工作，不直接在 `main` 開發。
- `upstream` 只用於 fetch，push URL 已封鎖為 `DISABLED`；使用者自己的 GitHub Fork／`origin` 尚未設定。
- 使用 Conventional Commits，按認證、安全、UI、部署文件拆分。
- 每個里程碑至少執行 Biome lint、TypeScript typecheck 與 production build。
- commit 前執行 `git diff --check`，確認 `.env.local` 被忽略。

## 部署

- 啟動：`scripts/Start-CopySpace.ps1`
- 停止：`scripts/Stop-CopySpace.ps1`
- 區網防火牆：`scripts/Allow-CopySpace-LAN.ps1`（需管理員權限，僅允許 `192.168.50.0/24` 到 TCP 3925）。
- 日誌：`%LOCALAPPDATA%\CopySpace\logs`
- 原始 Copyparty 3923 埠保持可用，作為 rollback／fallback。

## 目前狀態

- CopySpace 已在主機本機 3925 啟動，HTTP smoke test 通過。
- 原 Copyparty 3923 回應 HTTP 200。
- 未登入 API 回傳 401；不在 allow-list 的 upstream origin 回傳 400。
- 尚未完成真實使用者密碼登入測試。
- 目前 Windows 網路設定檔為 Public；建立限定區網範圍的 3925 防火牆規則需要系統管理員權限。
