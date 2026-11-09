# CopySpace 疑難排解

## 先確認服務拓撲

    Get-NetTCPConnection -State Listen -LocalPort 3923,3924,3925 |
      Format-Table LocalAddress,LocalPort,OwningProcess -AutoSize

預期是 LAN 3923、loopback 3924、loopback 3925。不要把 3924／3925 改成監聽 0.0.0.0 來解決跨裝置連線問題。

## 常見症狀

| 症狀 | 可能原因 | 建議檢查 |
|---|---|---|
| 3923 無法連線 | Gateway 未啟動、LAN IP 改變、Firewall 規則不符 | listener、主機 IP、3923 入站規則 |
| 3923 有 listener，但頁面無回應 | Next.js 3925 未就緒或 Gateway 無法連到 upstream | 直接檢查 http://127.0.0.1:3925/app、Gateway stderr |
| 3925 正常但 3923 不通 | Gateway 綁定 IP 錯誤或 Firewall 阻擋 | Gateway log、listener 位址、Firewall |
| 啟動腳本說找不到 standalone server | 尚未執行 production build | npm run build |
| 啟動腳本等不到 backend | Copyparty 未啟動、3924 listener 不正確 | http://127.0.0.1:3924/、Copyparty log |
| 400 Missing or disallowed serverUrl | Server URL 不符合 origin allowlist | 檢查 .env.local 中的 origin，並確認重新啟動 |
| 401 Unauthorized | 尚未登入、Cookie 過期／遺失或無效 | 重新登入；Cookie 有效期為 8 小時 |
| 登入回 401 | 密碼錯誤或 username 模式不符 | 目前主機未啟用 --usernames，username 應留空 |
| 403 | Copyparty 拒絕操作，或 scan route 拒絕來源／demo 請求 | 區分 API action 與 scan response |
| 429 | scan route 冷卻時間尚未結束 | 30 秒後重試 |
| 上傳／改名／刪除被拒 | Copyparty ACL 不允許該操作 | 以 Copyparty 權限為準；勿只修改前端按鈕 |

## 檢查順序

### 1. 檢查 listener

    Get-NetTCPConnection -State Listen -LocalPort 3923,3924,3925 |
      Format-Table LocalAddress,LocalPort,OwningProcess -AutoSize

### 2. 逐層檢查 HTTP

    Invoke-WebRequest 'http://127.0.0.1:3924/' -UseBasicParsing
    Invoke-WebRequest 'http://127.0.0.1:3925/app' -UseBasicParsing
    Invoke-WebRequest 'http://192.168.50.72:3923/app' -UseBasicParsing

若 3924 失敗，先修復 Copyparty；若 3924 成功但 3925 失敗，檢查 Next.js；若前兩者成功但 3923 失敗，檢查 Gateway 與 Firewall。

### 3. 檢查 log

    $log = Join-Path $env:LOCALAPPDATA 'CopySpace\logs'
    Get-Content (Join-Path $log 'frontend.stderr.log') -Tail 80
    Get-Content (Join-Path $log 'gateway.stderr.log') -Tail 80

若由 Startup folder 隱藏啟動而失敗，改用可見 PowerShell 執行：

    & 'D:\Github\Cool-CopyParty-Front-Fork\scripts\Start-CopySpace.ps1'

### 4. 檢查防火牆

確認目前規則仍限制在 TCP 3923、來源 192.168.50.0/24、目的 192.168.50.72 與 Python 3.12 程式。不要建立「所有來源、所有 Port」的暫時規則。

## 不要採取的排錯方式

- 不要將 3924 或 3925 bind 到 0.0.0.0。
- 不要把 3924／3925 加入 LAN 入站 allow rule。
- 不要設定路由器 Port Forwarding。
- 不要將密碼、Cookie、.env.local 或完整授權 Header 貼進 Issue 或聊天內容。
- 不要為了排錯直接刪除或重建 D:\Shared、帳號或 ACL。
