# CopySpace

**CopySpace** 是 Cool CopyParty Front 的本機獨立工作分支，使用 Next.js 16、React 19 與 shadcn/ui，為既有 Copyparty 檔案伺服器提供更清楚的繁體中文瀏覽介面。

本專案只替換瀏覽器前端，不取代 Copyparty，也不搬動或修改原始檔案。

## 目前部署

| 項目 | 位址／路徑 |
|---|---|
| CopySpace 前端 | http://192.168.50.72:3925 |
| 原始 Copyparty | http://192.168.50.72:3923 |
| 工作目錄 | `D:\Github\Cool-CopyParty-Front-Fork` |
| Git 分支 | `zien/media-library-ui` |
| 共享資料 | `D:\Shared`（不由本專案修改） |

原始 Copyparty 的 3923 埠保留作為 fallback。CopySpace 使用獨立 Node.js 程序與 3925 埠。

## 功能

- 目錄瀏覽、麵包屑導覽、網格／清單檢視與目前資料夾搜尋。
- 圖片、影片、音訊及文字檔預覽；實際播放能力仍取決於瀏覽器支援的格式與 codec。
- 檔案上傳進度、建立資料夾、重新命名與刪除。
- 依 Copyparty 回傳的權限旗標決定是否顯示寫入操作；唯讀帳號不會看到上傳入口。
- 繁體中文登入與工作區介面。
- 登入狀態由加密的 HttpOnly Cookie 保存；瀏覽器不會把 Copyparty 密碼放進 localStorage。

## 登入方式

預設使用 Copyparty 的密碼模式：

1. 輸入 Copyparty 伺服器位址。
2. **目前主機未啟用 `--usernames`，使用者名稱欄位請留空。**
3. 在「密碼」欄輸入該 Copyparty 帳號所設定的密碼。

只有當 Copyparty 確實以 `--usernames` 啟動時，才在「使用者名稱」欄位填入帳號；這時認證值會以 `username:password` 傳給伺服器。

## 技術與需求

- Node.js **20.9 或更新版本**（Next.js 16 系統需求）。
- npm。
- Next.js 16.1.6、React 19.2、TypeScript 5、Tailwind CSS 4。
- 正在執行且允許此帳號存取的 Copyparty 伺服器。

## 本機開發

```powershell
npm install
npm run dev
```

開啟 http://localhost:3925。

## Windows production 部署

建立本機 `.env.local`（已由 Git 忽略，**不可提交**）：

```dotenv
COOKIE_SECRET=<至少 32 字元的隨機值>
COPYPARTY_ALLOWED_ORIGINS=http://192.168.50.72:3923
```

建置並啟動：

```powershell
npm run lint
.\node_modules\.bin\tsc.cmd --noEmit
npm run build
.\scripts\Start-CopySpace.ps1
```

停止服務：

```powershell
.\scripts\Stop-CopySpace.ps1
```

啟動腳本會從 `.env.local` 載入 Cookie 金鑰、準備 standalone 靜態資產，並只在 `192.168.50.72:3925` 啟動服務。日誌位於：

```text
%LOCALAPPDATA%\CopySpace\logs
```

### 其他區網裝置連線

目前 Windows 網路設定檔是 Public。若要讓同一個 `192.168.50.0/24` 區網內的其他裝置連線，請在主機上以**系統管理員身分**執行一次：

```powershell
.\scripts\Allow-CopySpace-LAN.ps1
```

此腳本只允許來源 `192.168.50.0/24` 連入本機 `192.168.50.72:3925/TCP`，不會開放其他連接埠或設定路由器 Port Forwarding。若只在主機本機使用，不需要建立此規則。

> 目前前端與 Copyparty 使用 HTTP。HTTP 不會加密區網傳輸內容；請把它限制在可信任的私人網路，不要直接暴露到公網。正式對外使用前應先配置 HTTPS。

## 認證與安全設計

- 前端 API 透過 Copyparty 支援的 `PW` HTTP Header 認證，不把密碼附加到上游 URL query string。
- 登入時先執行唯讀的 `GET /?ls` 驗證，再簽發 8 小時的 AES-256-GCM 加密 HttpOnly Cookie。
- `COOKIE_SECRET` 在 production 必須設定；缺少或過短時不允許啟動認證流程。
- production 必須設定 `COPYPARTY_ALLOWED_ORIGINS`。API 只會代理白名單內的 Copyparty origin，以限制 SSRF 風險。
- Cookie 使用 `HttpOnly`、`SameSite=Lax`；只有經 HTTPS 存取時才設定 `Secure`。
- Copyparty 是權限的最終來源。前端隱藏或停用操作只是 UX 保護，伺服器端仍會再次執行權限檢查。

詳細認證契約與部署設定請參考 [docs/COPYPARTY-AUTH.md](docs/COPYPARTY-AUTH.md)。

## 架構

- `app/`：App Router 頁面與 API。
- `components/`：登入、檔案工作區、清單、上傳與媒體預覽。
- `app/api/action/route.ts`：伺服器端 Copyparty API proxy。
- `lib/crypto.ts`：Cookie 憑證的 AES-256-GCM 加解密。
- `types/copyparty.ts`：Copyparty JSON listing 型別。
- `scripts/`：Windows 啟停與區網防火牆腳本。

不再使用舊版 middleware 複製 Cookie header；API Route 直接讀取 HttpOnly Cookie。

## Git 與上游

- 本機工作分支：`zien/media-library-ui`。
- `upstream` 只用於 fetch；push URL 已設為 `DISABLED`，避免誤推回原作者 repository。
- 目前尚未設定使用者自己的 GitHub `origin`，也尚未推送遠端 Fork。
- 在確認上游授權條款前，維持本機私人工作副本，不公開散布衍生版本。
- 使用 Conventional Commits，將認證、安全、UI 與部署文件拆成獨立 commit。
