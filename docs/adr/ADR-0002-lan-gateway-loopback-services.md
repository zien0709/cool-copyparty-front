# ADR-0002: 以 LAN TCP Gateway 作為唯一入口，內部服務僅監聽 Loopback

**Status:** Accepted
**Date:** 2026-11-09
**Deciders:** Project maintainer

## Context

原始部署規劃讓 Copyparty 使用 3923，Next.js 使用 3925。要讓 CopySpace 成為使用者唯一入口，同時避免 Next.js 與 Copyparty 直接暴露在 LAN，需要調整 listener 與流量路徑。

主機條件是 Windows 11，既有 Copyparty、共享目錄與 ACL 必須保留；區網使用者不應被要求安裝桌面客戶端。既有入站 Firewall 規則已限定 Python 程式、TCP 3923、指定 LAN IP 與來源子網。

## Decision

採用以下拓撲：

    LAN Browser
      -> 192.168.50.72:3923 (Python raw TCP Gateway)
      -> 127.0.0.1:3925 (Next.js standalone)
      -> 127.0.0.1:3924 (Copyparty API)

- 3923 是唯一 LAN listener。
- Next.js 只 bind 127.0.0.1:3925。
- Copyparty 只 bind 127.0.0.1:3924。
- Gateway 使用 raw TCP forwarding，保持 HTTP request、Cookie、Range、streaming 與雙向資料的原樣轉送。
- Copyparty 繼續負責帳號、密碼與 ACL；CopySpace 使用 PW Header 作為 upstream 認證方式。
- 只允許指定 LAN 子網連入 3923，不開放 3924／3925，也不設定 Router Port Forwarding。

## Options considered

### A. 讓 Next.js 直接監聽 LAN 3923

優點是少一個 Gateway process；缺點是 Next.js 直接暴露在 LAN，並需要改動入口與防火牆程式篩選方式。

### B. 使用 Python TCP Gateway 作唯一 LAN listener — Selected

優點是 Next.js 與 Copyparty 可維持 loopback-only，且沿用既有 Python 執行檔與受限的 3923 Firewall 規則。缺點是多一個需要啟動、監控與排錯的程序。

### C. 以反向代理或 TLS termination proxy 取代 Gateway

可提供更完整的 HTTP 層控制與 TLS，但會增加部署、憑證與維護複雜度。本階段先不導入；跨不可信網路使用前必須重新評估 HTTPS 方案。

## Trade-offs

- 額外的 TCP Gateway 增加一個故障點，但縮小了 LAN 可直接連線的服務範圍。
- Loopback bind 可限制遠端網路直接連線，不能隔離同一台主機上的其他程序。
- raw TCP Gateway 不解析 HTTP、不提供 TLS、不做應用層認證或 rate limiting。
- 目前仍使用 HTTP；因此只適合可信任私人 LAN。
- 主機 IP 與 Python 路徑目前是部署腳本中的固定值，移機時需要同步調整。

## Consequences

- 原本 Copyparty 3923 的直接區網入口改由 CopySpace Gateway 接管。
- Copyparty 設定只調整 bind address 與 port；帳號、密碼、共享路徑與 ACL 保持不變。
- 其他裝置統一使用 http://192.168.50.72:3923。
- 3924 與 3925 僅供本機程序使用。
- 完整回退腳本與設定備份保存在部署主機的 D:\Copyparty，不納入 repository。
- 外部 LAN 裝置與真實帳號登入仍需依測試清單完成端到端驗收。

## Acceptance checks

- [x] Host listener 顯示 3923 綁定指定 LAN IP、3924／3925 綁定 loopback。
- [x] Host HTTP smoke test：3923、3925、3924 均能回應。
- [x] 未登入 API 拒絕存取；不允許的 upstream origin 回 400。
- [x] Firewall 3923 規則限定來源子網、目的 IP、TCP port 與 Python 程式。
- [ ] 從另一台實體 LAN 裝置完成端到端連線。
- [ ] 使用真實帳號完成登入與 ACL 操作驗收。
