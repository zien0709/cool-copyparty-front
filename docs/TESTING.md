# 測試與驗收

本專案目前設定 lint、TypeScript typecheck 與 production build。**目前 package.json 沒有 test script**；不要把 lint 或 build 描述成完整的單元／整合測試。

## 自動化品質檢查

在 repository 根目錄執行：

    npm run lint
    npx tsc --noEmit
    npm run build
    git diff --check

用途：

| 命令 | 驗證範圍 |
|---|---|
| npm run lint | Biome lint |
| npx tsc --noEmit | TypeScript 型別檢查 |
| npm run build | Next.js production build 與 route compilation |
| git diff --check | whitespace 與 patch 格式問題 |

部署腳本的靜態檢查：

    $files = @(
      'scripts\Start-CopySpace.ps1',
      'scripts\Stop-CopySpace.ps1',
      'scripts\Allow-CopySpace-LAN.ps1'
    )
    foreach ($file in $files) {
      $tokens = $null
      $errors = $null
      [System.Management.Automation.Language.Parser]::ParseFile(
        (Join-Path (Get-Location) $file), [ref]$tokens, [ref]$errors
      ) | Out-Null
      if ($errors.Count -gt 0) { throw ($errors | Out-String) }
    }
    python -c "import ast,pathlib; ast.parse(pathlib.Path('scripts/CopySpace-Gateway.py').read_text(encoding='utf-8'))"

這只檢查語法，不會執行防火牆修改或啟停服務。

## Host smoke checks

    Get-NetTCPConnection -State Listen -LocalPort 3923,3924,3925
    Invoke-WebRequest 'http://127.0.0.1:3924/' -UseBasicParsing
    Invoke-WebRequest 'http://127.0.0.1:3925/app' -UseBasicParsing
    Invoke-WebRequest 'http://192.168.50.72:3923/app' -UseBasicParsing

另應確認未登入 API 不會回傳私人檔案資料，以及不允許的 upstream origin 會被拒絕。測試時不得使用或記錄真實密碼。

## 人工驗收清單

- [ ] 從另一台實體 LAN 裝置開啟 http://192.168.50.72:3923。
- [ ] 使用正確 Copyparty 密碼完成登入（目前 username 留空）。
- [ ] 確認登出後需要重新登入。
- [ ] 以唯讀帳號確認不會出現可用的寫入操作。
- [ ] 以有權限帳號確認允許的操作可由 Copyparty 正確執行。
- [ ] 驗證圖片、影片、音訊、文字檔預覽與大檔案串流。
- [ ] 驗證手機尺寸與桌面尺寸的主要操作。
- [ ] 確認 3924／3925 無法從另一台 LAN 裝置直接連線。
- [ ] 確認重開機後 Startup 項目能正確啟動兩個服務。
- [ ] 確認回退流程與原生 Copyparty 可恢復。

## 驗收紀錄原則

紀錄日期、commit SHA、執行命令、結果與未執行項目。不要把「主機 localhost 測試成功」寫成「LAN 端到端測試成功」。若人工驗收尚未執行，應明確標示 Pending。
