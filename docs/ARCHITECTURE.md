# CopySpace 系統架構

**文件狀態：** 反映 2026-11-09 Windows 主機部署
**相關 ADR：** [ADR-0002](adr/ADR-0002-lan-gateway-loopback-services.md)

## 目標與非目標

CopySpace 提供 Copyparty 的繁體中文瀏覽器介面。Copyparty 仍負責檔案儲存、帳號認證與實際 ACL；CopySpace 不搬移共享資料，也不另建一套檔案權限系統。

本部署的目標是讓區網用戶只需要一個入口，同時讓 Next.js 與 Copyparty backend 不直接監聽 LAN 網卡。

## 元件拓撲

    LAN Browser
      ── HTTP :3923 ──> Python TCP Gateway (192.168.50.72:3923)
      ── raw TCP forward ──> Next.js standalone (127.0.0.1:3925)
      ── HTTP + PW Header ──> Copyparty API (127.0.0.1:3924)
      ──> D:\Shared

Gateway 不解析 HTTP，也不終止 TLS；它只轉送雙向 TCP bytes。HTTP request、Cookie、Range、串流上傳與其他協定資料由 Next.js／Copyparty 原本的端點處理。

## Listener 與網路邊界

| Port | Listener | 用途 | 遠端 LAN 直連 |
|---:|---|---|---|
| 3923/TCP | 192.168.50.72 | Python Gateway 唯一入口 | 允許指定 LAN 子網，受 Windows Firewall 規則限制 |
| 3925/TCP | 127.0.0.1 | Next.js frontend | 不可直接從其他裝置連入 |
| 3924/TCP | 127.0.0.1 | Copyparty API | 不可直接從其他裝置連入 |

Loopback bind 與 Firewall 是不同控制：

- 3924／3925 只綁定 127.0.0.1，因此不會在 LAN 網卡上建立 listener。
- 3923 綁定指定 LAN IP；Windows Firewall 目前允許 TCP 3923，來源限定 192.168.50.0/24，目的限定 192.168.50.72，程式限定 Python 3.12。
- Loopback bind 不是程序隔離。同一台 Windows 主機上的其他本機程序仍可能連到 3924／3925。

目前啟用的防火牆規則名稱為 Copyparty LAN TCP 3923。重建腳本建立的專用規則名稱為 CopySpace Gateway LAN TCP 3923；不要因名稱不同就額外開放更寬的來源或 Port。

## 請求與認證資料流

1. 瀏覽器透過 http://192.168.50.72:3923 連至 Gateway。
2. Gateway 將 TCP 流量轉送到 127.0.0.1:3925。
3. 使用者透過同源 POST /api/action?op=login 送出伺服器位址與密碼。
4. Next.js 只接受環境變數 COPYPARTY_ALLOWED_ORIGINS 列出的 upstream origin。
5. Next.js 以 Copyparty 的 PW HTTP Header 做唯讀驗證；成功後將認證值以 AES-256-GCM 加密並放入 HttpOnly Cookie。
6. 後續 API Route 解密 Cookie，再將 PW Header 傳給 Copyparty。
7. Copyparty 執行實際權限判斷與檔案操作。

/api/scan 不會掃描整個 LAN；它只檢查主機自己的 127.0.0.1:3924，並有 30 秒冷卻時間。

## 主要程式位置

| 路徑 | 職責 |
|---|---|
| app/api/action/route.ts | 登入、列表、metrics、檔案 proxy、upload、move、copy、delete、logout |
| app/api/scan/route.ts | loopback backend 可用性檢查 |
| lib/crypto.ts | AES-256-GCM Cookie 認證值加解密 |
| scripts/CopySpace-Gateway.py | LAN 3923 到 loopback 3925 的 raw TCP forwarding |
| scripts/Start-CopySpace.ps1 | 檢查環境、等待服務依賴、啟動 frontend 與 gateway |
| scripts/Stop-CopySpace.ps1 | 停止 frontend 與 gateway，不停止 Copyparty |
| scripts/Allow-CopySpace-LAN.ps1 | 以系統管理員建立限定來源的 TCP 3923 規則 |

## 部署耦合與限制

- 目前啟動腳本將主機 LAN IP 固定為 192.168.50.72，Python 路徑固定為 C:\Program Files\Python312\python.exe。
- Copyparty 設定在這台主機上調整為 loopback 127.0.0.1:3924；設定檔本身不在此 repository。
- 目前入口為 HTTP，沒有 TLS 加密。
- Gateway 是單一 TCP forwarding process；它不是負載平衡器，也沒有額外的應用層認證。
- 本文件描述目前部署，不代表已完成第二台 LAN 裝置的端到端驗收。
