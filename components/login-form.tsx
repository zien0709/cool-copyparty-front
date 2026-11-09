"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Folder,
  Globe2,
  HardDrive,
  KeyRound,
  Loader2,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface LoginFormProps {
  onLogin: (serverUrl: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [serverUrl, setServerUrl] = useState("http://127.0.0.1:3924");
  const [useUsernames, setUseUsernames] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedServers, setScannedServers] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const isDemo = serverUrl.startsWith("demo://");

  const handleScan = async () => {
    if (isDemo) return;
    setIsScanning(true);
    setError("");
    try {
      const res = await fetch(
        `/api/scan?serverUrl=${encodeURIComponent(serverUrl.trim())}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "無法掃描區域網路。");
        return;
      }
      setScannedServers(data.targets || []);
      setHasScanned(true);
    } catch {
      setError("掃描失敗，請確認伺服器與網路狀態。");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectServer = (ip: string) => {
    setServerUrl(`http://${ip}:3924`);
    setHasScanned(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const normalizedUrl = new URL(serverUrl.trim());
      if (normalizedUrl.protocol !== "http:" && normalizedUrl.protocol !== "https:") {
        throw new Error("伺服器網址必須使用 HTTP 或 HTTPS。");
      }
      const baseUrl = normalizedUrl.toString().replace(/\/+$/, "");
      const resp = await fetch("/api/action?op=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: baseUrl,
          username: useUsernames ? username.trim() : "",
          password,
        }),
        cache: "no-store",
      });

      const data = await resp.json().catch(() => null);
      if (resp.ok) {
        onLogin(baseUrl);
      } else if (resp.status === 401) {
        setError("驗證失敗。請確認密碼；若伺服器啟用了 --usernames，也請確認帳號名稱。");
      } else if (resp.status === 403) {
        setError("伺服器拒絕存取：帳號可能尚未取得此資料夾的權限。");
      } else {
        setError(data?.error || `連線失敗（HTTP ${resp.status}）。`);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("HTTP")
          ? err.message
          : err instanceof TypeError && err.message.includes("Invalid URL")
            ? "伺服器網址格式不正確，請輸入完整的 http:// 或 https:// 網址。"
            : err instanceof Error && err.message.includes("HTTP 或 HTTPS")
              ? err.message
              : "無法連線到伺服器。請確認網址、網路與伺服器狀態。",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f6fb] px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 -top-56 h-[34rem] w-[34rem] rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute -bottom-64 -right-40 h-[38rem] w-[38rem] rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <section className="hidden lg:block">
          <div className="mb-14 inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">CopySpace</p>
              <p className="text-xs font-medium tracking-wide text-slate-500">你的私人檔案空間</p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm shadow-indigo-900/5">
              <Sparkles className="h-3.5 w-3.5" />
              更清爽的檔案瀏覽體驗
            </div>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 xl:text-6xl">
              檔案，都在你掌控之中
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
                隨時輕鬆存取。
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
              連接既有的 Copyparty 伺服器，以更清楚、專注的介面瀏覽你的檔案。
            </p>
          </div>

          <div className="mt-11 grid max-w-xl grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm shadow-slate-900/5 backdrop-blur">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold">以權限為核心</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">檔案存取權限仍由原始伺服器決定。</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm shadow-slate-900/5 backdrop-blur">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <HardDrive className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold">使用自己的儲存空間</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">直接連接你管理的 Copyparty 主機。</p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Globe2 className="h-3.5 w-3.5" />
            沿用既有 Copyparty 服務，不搬動檔案
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">CopySpace</p>
              <p className="text-xs text-slate-500">你的私人檔案空間</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/90 bg-white/90 p-6 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-9">
            <div className="mb-8">
              <p className="text-sm font-semibold text-indigo-600">歡迎回來</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">連接你的伺服器</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                輸入伺服器位址與登入資訊，開啟你的檔案空間。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="serverUrl" className="text-sm font-medium text-slate-700">Copyparty 後端位址</label>
                <div className="relative">
                  <Server className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="serverUrl"
                    type="url"
                    placeholder="http://127.0.0.1:3924"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">填入 Copyparty 後端位址；此位址由主機上的 CopySpace 伺服器連線。其他裝置只需開啟 CopySpace 主入口。</p>
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning || isDemo}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    {isScanning ? "掃描中…" : "掃描區域網路"}
                  </button>
                </div>
                {hasScanned && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                      <span>找到的伺服器</span>
                      <span>{scannedServers.length}</span>
                    </div>
                    {scannedServers.length > 0 ? (
                      <ul className="max-h-36 overflow-y-auto">
                        {scannedServers.map((ip) => (
                          <li key={ip}>
                            <button
                              type="button"
                              onClick={() => handleSelectServer(ip)}
                              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm text-slate-700 transition hover:bg-indigo-50"
                            >
                              <Server className="h-4 w-4 text-indigo-500" />
                              {ip}:3924
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-3 py-3 text-xs text-slate-500">在 3924 埠沒有找到本機 Copyparty 後端。</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 transition hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={useUsernames}
                    onChange={(e) => {
                      setUseUsernames(e.target.checked);
                      if (!e.target.checked) setUsername("");
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-700">
                      伺服器有啟用 <code className="rounded bg-white px-1 py-0.5 text-xs text-slate-600">--usernames</code>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      一般密碼模式不需要使用者名稱；這台伺服器請保持未勾選。
                    </span>
                  </span>
                </label>
                {useUsernames && (
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium text-slate-700">
                      使用者名稱
                    </label>
                    <input
                      id="username"
                      type="text"
                      placeholder="輸入 Copyparty 帳號名稱"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="username"
                      required={useUsernames}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">密碼</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="輸入伺服器密碼"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-6 text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-indigo-900/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    連線中…
                  </>
                ) : (
                  <>
                    連線至伺服器
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p>登入憑證會送至此前端的伺服器端，並以加密內容存放於 HttpOnly 工作階段 Cookie。</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            原本的 Copyparty 服務與檔案位置都不會改動。
          </div>
        </section>
      </div>
    </main>
  );
}
