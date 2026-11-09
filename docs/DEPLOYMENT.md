# Windows 部署指南

本指南對應目前 Windows 11 主機的 CopySpace deployment profile。由於啟動腳本含有主機 IP 與 Python 絕對路徑，其他主機不能直接照抄而不檢查設定。

## 1. 前置需求

- Windows 11。
- Node.js 20.9 或更新版本、npm。
- Python 3.12，且目前腳本預期執行檔位於 C:\Program Files\Python312\python.exe。
- Copyparty 已安裝並可正常啟動。
- 本機可存取 repository 與依賴套件。
- 已確認主機 LAN IPv4 為 192.168.50.72，或已同步修改部署腳本中的主機 IP。

## 2. 安裝依賴

在 repository 根目錄執行：

    npm ci

## 3. 設定環境變數

複製範本並編輯：

    Copy-Item .env.example .env.local
    notepad .env.local

| 變數 | 必要性 | 說明 |
|---|---|---|
| COOKIE_SECRET | 必要 | 至少 32 字元的隨機秘密；不可使用範例 placeholder |
| COPYPARTY_ALLOWED_ORIGINS | production 必要 | 逗號分隔的精確 origin allowlist；本機部署需包含 http://127.0.0.1:3924 |
| NEXT_PUBLIC_SITE_URL | 部署設定 | 本機目前填入 http://192.168.50.72:3923 |

不要將 .env.local、真實 Cookie secret、Copyparty 密碼或其他憑證提交到 Git。根目錄的 .env.example 是不含秘密的範本。

## 4. 建置與靜態檢查

    npm run lint
    npx tsc --noEmit
    npm run build

Next.js 設定 output: standalone。建置完成後，啟動腳本會確認 .next\standalone\server.js 存在，並將 .next\static 與 public 複製到 standalone 目錄。

## 5. 服務與設定檢查

本機 Copyparty 設定應只將 listener 調整為：

    [global]
    i: 127.0.0.1
    p: 3924

這是目前主機設定，不是供所有 Copyparty 安裝照抄的完整設定檔。其他帳號、共享目錄與 ACL 應由既有 Copyparty 設定管理。

## 6. Windows Firewall

目前主機已有啟用中的入站規則：

- 名稱：Copyparty LAN TCP 3923
- 方向／動作：Inbound / Allow
- Profile：Public
- Protocol／Local Port：TCP / 3923
- Local Address：192.168.50.72
- Remote Address：192.168.50.0/24
- Program：C:\Program Files\Python312\python.exe

這條規則供 Gateway 使用相同 Python 執行檔。若規則遺失，使用系統管理員 PowerShell 執行：

    .\scripts\Allow-CopySpace-LAN.ps1

此腳本建立專用名稱 CopySpace Gateway LAN TCP 3923 的規則。它不會開放 3924／3925，也不會設定路由器 Port Forwarding。不要用「開放所有來源／所有 Port」的規則取代它。

## 7. 啟動與停止

啟動：

    .\scripts\Start-CopySpace.ps1

停止 frontend 與 gateway：

    .\scripts\Stop-CopySpace.ps1

啟動腳本會：

1. 驗證 standalone server、環境檔、Gateway script 與 Python 路徑。
2. 從 .env.local 載入環境變數，檢查 Cookie secret 與 backend origin。
3. 等待主機取得預期 LAN IPv4，最久 120 秒。
4. 等待 Copyparty http://127.0.0.1:3924/ 回應 HTTP 200，最久 120 秒。
5. 準備 standalone 靜態資產。
6. 啟動或檢查 Next.js 127.0.0.1:3925。
7. 啟動或檢查 Python Gateway 192.168.50.72:3923。

Startup folder 中的 CopySpace.vbs 會以隱藏 PowerShell 啟動此腳本。另一個 Copyparty.vbs 負責啟動 Copyparty；Windows Startup 項目執行順序不保證，因此 CopySpace 會等待 backend ready。

## 8. 部署後驗證

在主機 PowerShell 執行：

    Get-NetTCPConnection -State Listen -LocalPort 3923,3924,3925 |
      Format-Table LocalAddress,LocalPort,OwningProcess -AutoSize

    Invoke-WebRequest http://127.0.0.1:3924/ -UseBasicParsing
    Invoke-WebRequest http://127.0.0.1:3925/app -UseBasicParsing
    Invoke-WebRequest http://192.168.50.72:3923/app -UseBasicParsing

預期 listener：

| 位址 | Port |
|---|---:|
| 192.168.50.72 | 3923 |
| 127.0.0.1 | 3924 |
| 127.0.0.1 | 3925 |

從主機對自己的 LAN IP 發出請求不能取代第二台實體 LAN 裝置的驗收。跨裝置驗收應在另一台裝置開啟 http://192.168.50.72:3923。

## 9. 日誌

    %LOCALAPPDATA%\CopySpace\logs\frontend.stdout.log
    %LOCALAPPDATA%\CopySpace\logs\frontend.stderr.log
    %LOCALAPPDATA%\CopySpace\logs\gateway.stdout.log
    %LOCALAPPDATA%\CopySpace\logs\gateway.stderr.log

隱藏 Startup 啟動時若 PowerShell 前置檢查失敗，錯誤不一定會寫入上述服務日誌。排查時請在可見的 PowerShell 視窗中手動執行啟動腳本，以取得完整錯誤訊息。
