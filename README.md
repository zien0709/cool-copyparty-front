# CopySpace

**CopySpace** 是 Cool CopyParty Front 的獨立 Fork，使用 Next.js 16、React 19 與 shadcn/ui，為既有 Copyparty 檔案伺服器提供繁體中文檔案瀏覽介面。

本專案替換瀏覽器前端，不取代 Copyparty，也不搬動或修改原始共享檔案。

## 目前部署

| 元件 | 位址／路徑 | 網路範圍 |
|---|---|---|
| CopySpace 主入口 | http://192.168.50.72:3923 | 指定區網 |
| Python TCP Gateway | 192.168.50.72:3923 → 127.0.0.1:3925 | 區網入口 |
| Next.js 前端 | http://127.0.0.1:3925 | 僅主機本機 |
| Copyparty API | http://127.0.0.1:3924 | 僅主機本機 |
| 工作目錄 | D:\Github\Cool-CopyParty-Front-Fork | Windows 主機 |
| 共享資料 | D:\Shared | Copyparty 管理；本專案不修改 |

目前請其他區網裝置只連到 http://192.168.50.72:3923。不要將 3924 或 3925 開放到區網，也不要設定路由器 Port Forwarding。

## 功能

- 目錄瀏覽、麵包屑導覽、網格／清單檢視與目前資料夾搜尋。
- 圖片、影片、音訊及文字檔預覽；實際播放能力仍取決於瀏覽器支援的格式與 codec。
- 檔案上傳進度、建立資料夾、重新命名與刪除。
- 依 Copyparty 回傳的權限旗標決定是否顯示寫入操作；最終授權仍由 Copyparty 執行。
- 繁體中文登入與工作區介面。
- 登入狀態以 AES-256-GCM 加密的 HttpOnly Cookie 保存；瀏覽器不會把 Copyparty 密碼放進 localStorage。

## 登入方式

目前這台主機未啟用 Copyparty --usernames：

1. 伺服器位址使用 http://127.0.0.1:3924。
2. 使用者名稱欄位留空。
3. 在密碼欄輸入 Copyparty 該帳號的密碼。

只有當 Copyparty 確實以 --usernames 啟動時，才填寫使用者名稱。

## 技術與需求

- Windows 11（目前部署環境）。
- Node.js 20.9 或更新版本、npm。
- Python 3.12；目前啟動腳本預期路徑為 C:\Program Files\Python312\python.exe。
- Next.js 16.1.6、React 19.2、TypeScript 5、Tailwind CSS 4。
- 已啟動且允許該帳號存取的 Copyparty。

## 本機開發

    npm ci
    npm run dev

開啟 http://localhost:3925。開發伺服器不等同正式的 LAN Gateway 部署方式。

## Windows Production 部署

1. 建立本機 .env.local，可由 .env.example 複製。
2. 將 COOKIE_SECRET 替換成至少 32 字元的隨機秘密。
3. 保持 COPYPARTY_ALLOWED_ORIGINS 包含 http://127.0.0.1:3924。
4. 執行 lint、typecheck 與 production build。
5. 執行 scripts/Start-CopySpace.ps1。

    Copy-Item .env.example .env.local
    # 編輯 .env.local，換掉 COOKIE_SECRET 範例值
    npm ci
    npm run lint
    npx tsc --noEmit
    npm run build
    .\scripts\Start-CopySpace.ps1

停止 CopySpace 前端與 Gateway（不會停止 Copyparty）：

    .\scripts\Stop-CopySpace.ps1

啟動腳本會等待主機取得預期 LAN IP、等待 Copyparty loopback API 就緒，再啟動 Next.js standalone server 與 Python Gateway。它也會檢查既有程序，避免重複啟動健康的服務。

日誌位於：

    %LOCALAPPDATA%\CopySpace\logs

其他區網裝置使用主入口 http://192.168.50.72:3923。目前主機沿用既有的 Python 3.12 TCP 3923 入站防火牆規則。若該規則遺失，才以系統管理員執行：

    .\scripts\Allow-CopySpace-LAN.ps1

該腳本建立的規則只允許指定 LAN 子網連入指定主機位址的 TCP 3923；不會開放 3924／3925，也不會修改路由器。

> 目前入口使用 HTTP，區網傳輸沒有 TLS 加密。此部署僅供可信任私人網路；不要直接暴露到公網。需要跨不可信網路使用時，應先設計 HTTPS、憑證與反向代理。

## 文件索引

| 文件 | 用途 |
|---|---|
| [架構說明](docs/ARCHITECTURE.md) | 元件、資料流、Port 與信任邊界 |
| [部署指南](docs/DEPLOYMENT.md) | Windows 環境、環境變數、建置與啟動 |
| [維運手冊](docs/RUNBOOK.md) | 啟停、檢查、重啟與回退 |
| [疑難排解](docs/TROUBLESHOOTING.md) | 常見連線、認證與部署故障 |
| [API 契約](docs/API.md) | 前端 API 路由、參數與狀態碼 |
| [安全說明](docs/SECURITY.md) | 威脅模型、保護措施與已知限制 |
| [測試與驗收](docs/TESTING.md) | 自動化檢查與人工驗收邊界 |
| [貢獻指南](docs/CONTRIBUTING.md) | 分支、Commit、PR 與品質門檻 |
| [Copyparty 認證](docs/COPYPARTY-AUTH.md) | PW Header、Cookie 與權限契約 |
| [本機 Fork 規範](docs/LOCAL-FORK.md) | 主機部署邊界、Git 遠端與回退 |
| [架構決策紀錄](docs/adr/) | 已接受與被取代的架構決策 |

## 專案架構

- app/：Next.js App Router 頁面與 API。
- app/api/action/route.ts：登入、檔案操作與 Copyparty API proxy。
- app/api/scan/route.ts：僅檢查本機 Copyparty backend 的連線狀態。
- components/：登入、檔案工作區、清單、上傳與媒體預覽。
- lib/crypto.ts：Cookie 憑證 AES-256-GCM 加解密。
- scripts/：Windows 啟停腳本、Python TCP Gateway 與防火牆規則重建腳本。

## Git 與上游

- 工作分支：zien/media-library-ui；遠端 Fork：origin。
- origin 指向 https://github.com/zien0709/cool-copyparty-front。
- upstream 指向原作者 repository，僅供 fetch；push URL 設為 DISABLED。
- PR #1、#2、#3 已合併到自己的 Fork main；後續文件修改仍應透過 PR 合併。
- 使用 Conventional Commits；避免把環境秘密、Cookie、密碼或機器備份加入 Git。
- 上游 repository 未宣告 License。GitHub Fork 關係不等於取得獨立再授權；公開散布衍生版本前必須先釐清授權。
