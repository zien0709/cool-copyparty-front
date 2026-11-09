# 貢獻指南

## 工作原則

- 先閱讀 README.md、docs/ARCHITECTURE.md、docs/SECURITY.md 與相關 ADR。
- 先確認變更是否符合「Copyparty 負責儲存與最終 ACL，CopySpace 負責瀏覽器體驗」的責任分界。
- 不要為了 UI 方便而繞過 Copyparty 的授權。
- 不要直接修改部署主機的共享資料、帳號、密碼或 ACL。

## 開發環境

    npm ci
    npm run dev

## 品質門檻

提交前至少執行：

    npm run lint
    npx tsc --noEmit
    npm run build
    git diff --check

目前 package.json 沒有 test script。若新增測試框架或 test script，請同步更新 docs/TESTING.md。

## Git 工作流程

1. 從自己的 Fork origin 更新工作分支。
2. 使用功能／修正分支或目前指定的工作分支，不直接在原作者 upstream 開發。
3. 使用 Conventional Commits，例如 docs: add deployment runbook、fix(auth): reject invalid origin。
4. 一個 commit 聚焦一個可審查單位；文件、程式與部署變更應合理拆分。
5. Push 只允許到自己的 origin。
6. 透過 Pull Request 合併到自己的 main；不要 push 到 upstream。

目前 remote 約定：

- origin：https://github.com/zien0709/cool-copyparty-front.git
- upstream：https://github.com/andrecrjr/cool-copyparty-front.git，push URL 必須維持 DISABLED。

提交前檢查：

    git status --short
    git diff --check
    git check-ignore .env.local
    git remote -v

不得提交 .env.local、任何真實秘密、Cookie、帳號密碼、機器專屬備份或私人使用者檔案。

## 文件維護

下列變更必須同步更新文件：

- Port、listener、Gateway 或 backend topology：README.md、docs/ARCHITECTURE.md、ADR。
- 環境變數、啟動、停止、Firewall：docs/DEPLOYMENT.md、docs/RUNBOOK.md。
- Route、operation、參數或狀態碼：docs/API.md。
- 認證、Cookie、網路暴露與快取政策：docs/SECURITY.md、docs/COPYPARTY-AUTH.md。
- 新增測試命令：docs/TESTING.md。
- 使用者可見功能或部署里程碑：CHANGELOG.md。

## 授權注意

上游 repository 目前沒有宣告 License。GitHub 上可建立 Fork 不等於上游程式碼取得 MIT 或其他獨立再授權。未釐清權利前，不得擅自新增上游程式碼的授權聲明，也不要公開散布衍生版本。
