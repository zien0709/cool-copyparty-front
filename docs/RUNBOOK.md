# CopySpace 維運手冊

本手冊用於目前 Windows 11 主機的日常檢查與故障復原。執行破壞性操作前，先確認目前 listener、設定檔與備份狀態。

## 服務清單

| 元件 | Port | 預期 listener | 啟動責任 |
|---|---:|---|---|
| Copyparty | 3924 | 127.0.0.1 | D:\Copyparty\Start-Copyparty.ps1 |
| Next.js CopySpace | 3925 | 127.0.0.1 | scripts\Start-CopySpace.ps1 |
| Python Gateway | 3923 | 192.168.50.72 | scripts\Start-CopySpace.ps1 |

## 啟動

如果 Copyparty 已經運作：

    Set-Location 'D:\Github\Cool-CopyParty-Front-Fork'
    .\scripts\Start-CopySpace.ps1

如果 Copyparty 未啟動，先啟動 backend：

    & 'D:\Copyparty\Start-Copyparty.ps1'

再啟動 CopySpace。CopySpace 啟動腳本會等待 backend ready；等待上限為 120 秒。

## 停止與重新啟動

停止只會停止 CopySpace Gateway 與 Next.js，不會停止 Copyparty：

    Set-Location 'D:\Github\Cool-CopyParty-Front-Fork'
    .\scripts\Stop-CopySpace.ps1

重新啟動：

    .\scripts\Stop-CopySpace.ps1
    .\scripts\Start-CopySpace.ps1

## Listener 檢查

    Get-NetTCPConnection -State Listen -LocalPort 3923,3924,3925 |
      Sort-Object LocalPort |
      Format-Table LocalAddress,LocalPort,OwningProcess -AutoSize

應看到：

- 192.168.50.72:3923 — Python Gateway。
- 127.0.0.1:3925 — Next.js。
- 127.0.0.1:3924 — Copyparty。

若 3923 被非 Gateway 程序占用，不要直接終止未知 PID；先用 Get-Process -Id <PID> 確認程序身分。

## HTTP 健康檢查

    Invoke-WebRequest 'http://127.0.0.1:3924/' -UseBasicParsing
    Invoke-WebRequest 'http://127.0.0.1:3925/app' -UseBasicParsing
    Invoke-WebRequest 'http://192.168.50.72:3923/app' -UseBasicParsing

預期三者皆回 HTTP 200。第三項在主機本機成功仍不能證明另一台 LAN 裝置能連線。

未登入的 API 應拒絕存取；例如未帶有效 Cookie 的檔案操作不應成功。請勿把密碼或 Cookie 貼到終端輸出、Issue 或聊天記錄。

## 日誌

    $log = Join-Path $env:LOCALAPPDATA 'CopySpace\logs'
    Get-Content (Join-Path $log 'frontend.stderr.log') -Tail 80
    Get-Content (Join-Path $log 'gateway.stderr.log') -Tail 80

stdout 日誌為 frontend.stdout.log 與 gateway.stdout.log。如果 Startup 使用隱藏 PowerShell 時前置檢查失敗，請手動在可見 PowerShell 執行 Start-CopySpace.ps1 取得錯誤。

## 防火牆檢查

    Get-NetFirewallRule -DisplayName 'Copyparty LAN TCP 3923' |
      Format-List DisplayName,Enabled,Direction,Action,Profile

    Get-NetFirewallRule -DisplayName 'Copyparty LAN TCP 3923' |
      Get-NetFirewallPortFilter

    Get-NetFirewallRule -DisplayName 'Copyparty LAN TCP 3923' |
      Get-NetFirewallAddressFilter

    Get-NetFirewallRule -DisplayName 'Copyparty LAN TCP 3923' |
      Get-NetFirewallApplicationFilter

預期只允許 TCP 3923、來源 192.168.50.0/24、目的 192.168.50.72，程式為 Python 3.12。不要為了排錯而開放所有來源或額外開放 3924／3925。

## 完整回退到原生 Copyparty

此部署主機有一份主機專用的回退腳本，不在本 repository：

    D:\Copyparty\Rollback-CopySpace-Entry.ps1

執行前先確認下列檔案仍存在且是本次部署前的正確備份：

    D:\Copyparty\backups\copyparty.conf.before-copyspace-entry.bak

在可見 PowerShell 中執行：

    & 'D:\Copyparty\Rollback-CopySpace-Entry.ps1'

該腳本會停止 CopySpace gateway/frontend、停止 Copyparty、還原備份設定、重新啟動原生 Copyparty，並將 Startup folder 的 CopySpace.vbs 改名為 .disabled。它不應修改 D:\Shared 檔案或 ACL。

**重要：** 回退腳本使用固定主機路徑與固定備份檔，不是通用解除安裝程式。不要在其他主機執行，也不要在沒有驗證備份內容時執行。
