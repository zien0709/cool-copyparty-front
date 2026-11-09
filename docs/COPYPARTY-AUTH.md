# Copyparty 認證與部署契約

## 認證格式

前端以 Copyparty 支援的 HTTP PW Header 認證，不會把密碼拼進上游 URL。

- 一般密碼模式：PW: <password>
- Copyparty 啟用 --usernames：PW: <username>:<password>

目前這台主機的啟動參數沒有 --usernames，因此登入時請保持「伺服器有啟用 --usernames」未勾選，帳號名稱留空，只在密碼欄輸入該 Copyparty 帳號所設定的密碼。

## 登入流程

1. 前端把伺服器位址、帳號模式與密碼送到同源 POST /api/action?op=login。
2. API 驗證伺服器位址是否符合 COPYPARTY_ALLOWED_ORIGINS。
3. API 以唯讀 GET /?ls 加上 PW Header 驗證憑證。
4. 成功後使用 AES-256-GCM 加密認證值，寫入 8 小時 HttpOnly、SameSite=Lax Cookie。
5. 後續 API Route 直接讀取 Cookie、解密認證值，再用 PW Header 代理請求。

瀏覽器只把伺服器 URL 存在 localStorage，不保存密碼或解密後的認證值。

## Cookie 傳輸

Cookie 只有在實際 HTTPS request 時才設定 Secure。這台主機目前透過 HTTP 在私人 LAN 提供入口；HTTP 不會加密傳輸內容。

此部署僅供可信任私人網路。不要直接公開到公網。正式對外使用前先配置 HTTPS 與可信任的反向代理。

## Production 環境變數

在被 Git 忽略的本機 .env.local 設定，**不要提交此檔案**：

    COOKIE_SECRET=<至少 32 字元的隨機值>
    COPYPARTY_ALLOWED_ORIGINS=http://127.0.0.1:3924
    NEXT_PUBLIC_SITE_URL=http://192.168.50.72:3923

production 沒有設定有效的 COOKIE_SECRET 或 COPYPARTY_ALLOWED_ORIGINS 時，認證／proxy 請求會失敗關閉。origin 必須完全符合 scheme、host、port；多個 origin 以逗號分隔。

## 權限處理

Copyparty 回傳的權限旗標由前端解析：

- r：讀取
- w：寫入／上傳
- m：移動／重新命名
- d：刪除
- a：管理功能
- A：全部權限（相當於 rwmda.）

前端只有在伺服器回傳相應權限時才顯示操作入口。真正的授權仍由 Copyparty 後端執行。

## 本機部署位置

- 區網入口：http://192.168.50.72:3923（Python raw TCP Gateway）。
- CopySpace Next.js：http://127.0.0.1:3925（loopback only）。
- Copyparty API：http://127.0.0.1:3924（loopback only）。
- 區網防火牆：限定來源 192.168.50.0/24、目的 192.168.50.72、TCP 3923、Python 3.12。
