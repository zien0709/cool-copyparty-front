# CopySpace 安全說明

本文件是目前部署的安全設計與已知限制，不代表已完成正式滲透測試或第三方安全認證。

## 安全目標

1. 讓 Next.js 與 Copyparty backend 不直接暴露到 LAN。
2. 不將 Copyparty 密碼放入 URL query、localStorage 或前端可讀 Cookie。
3. 限制 Next.js 可代理的 upstream origin。
4. 由 Copyparty 作為帳號、ACL 與檔案操作的最終授權來源。
5. 不改動共享資料與既有 ACL。

## 信任邊界

| 邊界 | 保護方式 | 限制 |
|---|---|---|
| LAN → Gateway 3923 | Windows Firewall 限定來源子網、目的 IP、TCP Port 與 Python 程式 | 同一允許子網內的裝置仍可連入口 |
| LAN → Next.js 3925 | Next.js 只 bind 127.0.0.1 | 不構成本機程序隔離 |
| LAN → Copyparty 3924 | Copyparty 只 bind 127.0.0.1 | 不構成本機程序隔離 |
| Browser → session | HttpOnly、SameSite=Lax Cookie；AES-256-GCM 加密認證值 | HTTP 下 Cookie 與其他流量仍可被同網段觀察 |
| Next.js → upstream | COPYPARTY_ALLOWED_ORIGINS 精確 origin allowlist | 新 backend origin 必須經審查後明確加入 |
| 檔案權限 | Copyparty ACL 與後端授權 | 前端按鈕隱藏不是安全邊界 |

## 認證與 Cookie

- Copyparty 認證使用 PW HTTP Header，不使用 URL query 參數傳遞密碼。
- 認證值經 AES-256-GCM 加密後放入 copyparty_auth Cookie。
- Cookie 設為 HttpOnly、SameSite=Lax、8 小時到期；只有 HTTPS request 才會加上 Secure。
- Production 必須提供至少 32 字元的 COOKIE_SECRET。
- COOKIE_SECRET、.env.local、Cookie 與真實密碼不得提交到 Git 或貼入 Issue。
- 更換 COOKIE_SECRET 會使既有 Cookie 無法解密，使用者需要重新登入。

## 網路與防火牆

- 區網入口只有 192.168.50.72:3923/TCP。
- Next.js 只聽 127.0.0.1:3925。
- Copyparty 只聽 127.0.0.1:3924。
- 目前啟用的防火牆規則限定來源 192.168.50.0/24、目的 192.168.50.72、TCP 3923 與 Python 3.12 執行檔。
- 沒有為 3924／3925 建立 LAN 入站 allow rule。
- 目前部署沒有設定 router Port Forwarding。

**目前是 HTTP，不是 HTTPS。** Cookie 加密不等於整條網路連線加密。登入密碼、Cookie 與檔案內容在 LAN 傳輸時沒有 TLS 保護，因此只能放在可信任私人網路使用，不應直接暴露公網或不可信 Wi-Fi。

## API 與 SSRF 邊界

- production 的 COPYPARTY_ALLOWED_ORIGINS 必須非空。
- serverUrl 必須是 HTTP／HTTPS URL，不能包含 userinfo、query 或 fragment，且 origin 必須符合 allowlist。
- /api/scan 只測試 loopback 127.0.0.1:3924，並設有 30 秒冷卻時間；它不會遍歷區網位址。
- scan route 會檢查存在的 Origin 與 Sec-Fetch-Site 標頭；不可把它視為取代登入或網路隔離的安全控制。
- Gateway 不解析 HTTP，也不提供 TLS、應用層 rate limit 或額外登入機制。

## 已知限制與後續審查項目

1. **HTTP 明文傳輸：** 最重要的部署限制。跨不可信網路前，必須先導入 HTTPS 與憑證管理。
2. **本機程序信任：** Loopback listener 仍可被同一台主機上的本機程序連線；請維持 Windows 主機本身的帳號與程序安全。
3. **媒體快取：** op=file&cache=1 目前會回傳 Cache-Control: public, max-age=604800, immutable。若內容具有機密性，應在部署前評估改為 private／更嚴格的快取政策，避免共用快取保存私人內容。
4. **掃描端點：** scan route 的來源判斷是輔助防護，不應作為唯一 CSRF 或授權邊界。
5. **未完成的端到端驗收：** 主機本機 HTTP smoke test 不代表第二台 LAN 裝置、真實使用者登入與實際 ACL 操作均已驗證。

## 安全回報原則

回報漏洞時不要附上密碼、Cookie、Authorization／PW Header、.env.local、私人檔案內容或可重現存取的連結。提供最小化的請求資訊、狀態碼、時間與已遮蔽日誌即可。
