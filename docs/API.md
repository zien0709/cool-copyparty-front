# CopySpace API 契約

此文件描述 repository 目前實作的 Next.js Route Handler，不是完整 Copyparty API 文件。所有端點皆位於同源 /api。

## 認證模型

- 登入端點以 Copyparty PW HTTP Header 驗證密碼。
- 成功後，伺服器設定名為 copyparty_auth 的 HttpOnly、SameSite=Lax Cookie，期限 8 小時。
- 後續受保護的 action 端點從 Cookie 取得認證值，解密後以 PW Header 代理至 Copyparty。
- upstream origin 必須符合 COPYPARTY_ALLOWED_ORIGINS。
- 本機目前允許的 origin：http://127.0.0.1:3924。

不要從瀏覽器或外部工具自行構造 Copyparty 密碼 Header；應透過應用程式登入流程。

## /api/action

### GET

| 操作 | Query 參數 | 認證 | 說明 |
|---|---|---|---|
| op=ls（預設） | serverUrl、path | Cookie | 代理 Copyparty directory listing |
| op=metrics | serverUrl | Cookie；上游可能要求管理權限 | 代理 /.cpr/metrics |
| op=file | serverUrl、path、可選 download=1、cache=1、thumb=1 | Cookie | 代理檔案內容；Range header 會在非縮圖請求時轉送 |

一般 ls、metrics 與 file 請求都會先驗證 server origin。未提供或不允許的 serverUrl 回 400；缺少有效認證回 401。

### POST

| 操作 | Query／Body | 認證 | 說明 |
|---|---|---|---|
| op=login | JSON body：serverUrl、password，可選 username | 不需要既有 Cookie | 以唯讀 listing 驗證密碼，成功後設定 8 小時 Cookie |
| op=upload（預設） | Query：serverUrl、path；multipart body | Cookie | 串流轉送上傳內容 |
| op=move | Query：serverUrl、path、dest | Cookie | 轉送 Copyparty move 操作 |
| op=copy | Query：serverUrl、path、dest | Cookie | 轉送 Copyparty copy 操作 |

登入 body 範例（僅示意，不含真實密碼）：

    {
      "serverUrl": "http://127.0.0.1:3924",
      "username": "",
      "password": "<your-copyparty-password>"
    }

username 有值時，伺服器會組成 username:password 認證值；空白時只使用 password。

### DELETE

| 操作 | Query 參數 | 認證 | 說明 |
|---|---|---|---|
| op=logout | 無 | 不需要 | 清除 copyparty_auth Cookie |
| op=delete（預設） | serverUrl、path | Cookie | 代理 Copyparty delete 操作 |

## /api/scan

### GET

- 不掃描 LAN；只測試主機自身的 127.0.0.1:3924 TCP 可連線狀態。
- demo mode 回 403。
- 有提供 Origin 時會比對 request origin；Sec-Fetch-Site 存在時只接受 same-origin。
- 掃描啟動後設有 30 秒 cooldown。
- backend 可連線時回傳 {"targets":["127.0.0.1"]}；否則回傳空陣列。

## 主要狀態碼

| HTTP | 意義 |
|---:|---|
| 200 | 操作完成或 upstream 成功 |
| 400 | 缺少／不允許的 serverUrl、缺少必要參數或不支援的操作 |
| 401 | 缺少有效 Cookie 或 Copyparty 認證失敗 |
| 403 | demo mode、scan 來源檢查拒絕或 Copyparty 權限拒絕 |
| 429 | scan route 冷卻時間尚未結束 |
| 其他 upstream status | 部分 proxy 操作會保留 Copyparty 回傳的 HTTP status |

## 實作限制

此文件依目前 app/api/action/route.ts 與 app/api/scan/route.ts 撰寫。新增操作、改變 query 名稱、Cookie 名稱、狀態碼或 streaming 行為時，必須同步更新此文件與測試。
