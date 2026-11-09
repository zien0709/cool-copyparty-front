"use client";

import {
  FolderIcon,
  FolderPlusIcon,
  GridIcon,
  HardDriveIcon,
  ListIcon,
  LogOutIcon,
  RefreshCwIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ServerIcon,
  UploadIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FileGrid } from "@/components/file-grid";
import { FileList } from "@/components/file-list";
import { FileUpload } from "@/components/file-upload";
import { MediaViewer } from "@/components/media-viewer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CopyPartyResponse, DirItem, FileItem } from "@/types/copyparty";

interface FileManagerProps {
  serverUrl: string;
  onLogout: () => void;
  initialData?: CopyPartyResponse;
}

interface ServerMetrics {
  diskFree?: number;
  diskSize?: number;
  volumeBytes?: number;
}

function parseMetric(text: string, name: string): number | undefined {
  const line = text
    .split("\n")
    .find((entry) => entry.startsWith(name) && !entry.startsWith(`${name}_`));
  if (!line) return undefined;
  const value = Number(line.slice(line.lastIndexOf(" ") + 1));
  return Number.isFinite(value) ? value : undefined;
}

function parseServerMetrics(text: string): ServerMetrics {
  return {
    diskFree: parseMetric(text, "cpp_disk_free_bytes"),
    diskSize: parseMetric(text, "cpp_disk_size_bytes"),
    volumeBytes: parseMetric(text, "cpp_vol_bytes{vpath=\"total\"}"),
  };
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return "尚無資料";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function normalizePermissions(value: unknown): string[] {
  const labels: Record<string, string> = {
    r: "read",
    w: "write",
    m: "move",
    d: "delete",
    a: "admin",
    A: "all",
    ".": "dot",
    g: "get",
    G: "upget",
    h: "html",
  };
  const knownNames = new Set(Object.values(labels));
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,]+/)
      : [];

  return rawValues.flatMap((raw) => {
    if (typeof raw !== "string" || !raw.trim()) return [];
    const token = raw.trim();
    if (labels[token]) return [labels[token]];
    if (knownNames.has(token.toLowerCase())) return [token.toLowerCase()];
    if ([...token].every((permission) => permission in labels)) {
      return [...token].map((permission) => labels[permission]);
    }
    return [token];
  });
}

export function FileManager({
  serverUrl,
  onLogout,
  initialData,
}: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState("/");
  const [data, setData] = useState<CopyPartyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return (localStorage.getItem("viewMode") as "grid" | "list") || "list";
      } catch {
        return "list";
      }
    }
    return "list";
  });
  const [showUpload, setShowUpload] = useState(false);
  const [mkdirName, setMkdirName] = useState("");
  const [viewingFile, setViewingFile] = useState<FileItem | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  const imageExts = new Set<string>([
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "bmp",
    "svg",
    "ico",
    "avif",
    "heic",
    "heif",
    "tif",
    "tiff",
    "jfif",
  ]);
  const videoExts = new Set<string>([
    "mp4",
    "webm",
    "mov",
    "avi",
    "mkv",
    "m4v",
    "flv",
    "ogv",
  ]);
  const audioExts = new Set<string>([
    "mp3",
    "wav",
    "ogg",
    "flac",
    "m4a",
    "opus",
  ]);
  const textExts = new Set<string>([
    "txt",
    "md",
    "json",
    "xml",
    "csv",
    "log",
    "js",
    "ts",
    "tsx",
    "html",
    "css",
  ]);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("viewMode", mode);
  };

  const isDemo = serverUrl.startsWith("demo://");
  const currentPermissions = normalizePermissions(data?.perms);
  const hasWritePermission =
    currentPermissions.includes("write") || currentPermissions.includes("all");
  const hasMovePermission =
    currentPermissions.includes("move") || currentPermissions.includes("all");
  const hasDeletePermission =
    currentPermissions.includes("delete") || currentPermissions.includes("all");
  const volumePermissions = (data?.dirs ?? [])
    .map((dir) => ({
      name: decodeURIComponent(dir.href.replace(/\/$/, "")),
      perms: normalizePermissions(dir.perms),
    }))
    .filter((dir) => dir.perms.length > 0);

  const openSettings = async () => {
    setSettingsOpen(true);
    setMetrics(null);
    setMetricsError(null);
    if (isDemo) return;

    setIsLoadingMetrics(true);
    try {
      const params = new URLSearchParams({ op: "metrics", serverUrl });
      const response = await fetch(`/api/action?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "儲存空間指標暫時無法取得");
      }
      setMetrics(parseServerMetrics(await response.text()));
    } catch (error) {
      setMetricsError(
        error instanceof Error ? error.message : "儲存空間指標暫時無法取得",
      );
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError("");

    if (isDemo) {
      // Use provided initial data for demo mode; stay on root for simplicity
      const demo = initialData ?? {
        dirs: [],
        files: [],
        taglist: [],
        srvinf: "demo",
        acct: "demo",
        perms: ["read"], // Only read permissions in demo mode
        cfg: {
          idx: true,
          itag: false,
          dnsort: true,
          dhsortn: 0,
          dsort: "name",
          dcrop: "",
          dth3x: "",
          u2ts: "",
          shr_who: "",
          frand: false,
          lifetime: 0,
          unlist: "",
          sb_lg: "",
        },
        logues: [],
        readmes: [],
      };
      setData(demo);
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ op: "ls", serverUrl, path });
      // cache-busting
      params.set("_", Date.now().toString());
      const response = await fetch(`/api/action?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Authentication failed");
        if (response.status === 403) throw new Error("Access denied");
        throw new Error("Failed to fetch directory");
      }

      const jsonData: CopyPartyResponse = await response.json();
      setData(jsonData);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message === "Authentication failed"
          ? "登入已失效，請重新登入。"
          : (err as { message?: string })?.message === "Access denied"
            ? "目前帳號沒有此路徑的存取權限。"
            : "載入資料夾失敗，請重試。";
      setError(msg);
      if ((err as { message?: string })?.message === "Authentication failed") {
        onLogout();
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [initialData, isDemo, onLogout, serverUrl]);

  useEffect(() => {
    void fetchDirectory(currentPath);
  }, [currentPath, fetchDirectory]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleRefresh = () => {
    fetchDirectory(currentPath);
  };

  const handleDownload = async (file: FileItem, forceDownload = false) => {
    if (isDemo) {
      alert("示範模式不提供下載功能。");
      return;
    }

    const ext = file.ext.toLowerCase();
    const isPreviewable =
      imageExts.has(ext) ||
      videoExts.has(ext) ||
      audioExts.has(ext) ||
      textExts.has(ext);

    if (isPreviewable && !forceDownload) {
      setViewingFile(file);
      return;
    }

    const path = `${currentPath}${file.href}`;
    if (imageExts.has(file.ext.toLowerCase()) && !forceDownload) {
      const params = new URLSearchParams({
        op: "file",
        serverUrl,
        path,
        cache: "1",
      });
      const url = `/api/action?${params.toString()}`;
      window.open(url, "_blank", "noopener");
      return;
    }

    const params = new URLSearchParams({
      op: "file",
      serverUrl,
      path,
      download: "1",
    });
    const url = `/api/action?${params.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    // do not set a.download; rely on server Content-Disposition
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasWritePermission || isDemo) {
      setDragActive(false);
      return;
    }
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isDemo || !hasWritePermission) {
      setError("此帳號只有讀取權限，無法上傳檔案。");
      return;
    }
    if (e.dataTransfer.files?.[0]) {
      setDroppedFiles(Array.from(e.dataTransfer.files));
      setShowUpload(true);
    }
  };

  const handleDelete = async (item: FileItem | DirItem) => {
    if (isDemo) {
      alert("示範模式不提供刪除功能。");
      return;
    }
    if (!confirm(`確定要刪除「${item.href}」嗎？`)) {
      return;
    }

    try {
      const params = new URLSearchParams({
        serverUrl,
        path: `${currentPath}${item.href}`,
      });
      params.set("_", Date.now().toString());
      const response = await fetch(`/api/action?${params.toString()}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (response.ok) {
        handleRefresh();
      } else if (response.status === 401) {
        setError("登入已失效，請重新登入。");
        onLogout();
      } else {
        alert("刪除失敗，請稍後再試。");
      }
    } catch (err) {
      alert("刪除失敗，請稍後再試。");
      console.error(err);
    }
  };

  const handleMkdir = async () => {
    if (isDemo) {
      alert("示範模式不提供建立資料夾功能。");
      return;
    }
    const name = mkdirName.trim();
    if (!name) return;

    try {
      const params = new URLSearchParams({
        op: "upload",
        serverUrl,
        path: currentPath,
      });
      const form = new FormData();
      form.append("act", "mkdir");
      form.append("name", name);

      const response = await fetch(`/api/action?${params.toString()}`, {
        method: "POST",
        body: form,
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Authentication failed");
        if (response.status === 403) throw new Error("Access denied");
        throw new Error("Failed to create directory");
      }

      setMkdirName("");
      handleRefresh();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message === "Authentication failed"
          ? "登入已失效，請重新登入。"
          : (err as { message?: string })?.message === "Access denied"
            ? "目前帳號沒有此路徑的存取權限。"
            : "建立資料夾失敗，請稍後再試。";
      setError(msg);
      if ((err as { message?: string })?.message === "Authentication failed") {
        onLogout();
      }
      console.error(err);
    }
  };

  const handleRename = async (
    item: FileItem | DirItem,
    newBaseName: string,
  ) => {
    if (isDemo) {
      alert("示範模式不提供重新命名功能。");
      return;
    }

    const safeName = newBaseName.trim();
    if (!safeName) return;

    // Detect dir by trailing slash in href
    const isDir = item.href.endsWith("/");

    // Preserve extension for files; ensure trailing slash for dirs
    let newHref = safeName;
    if (!isDir) {
      const ext = (item as FileItem).ext;
      if (ext) {
        // Avoid double dots if user typed it
        if (safeName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
          newHref = safeName;
        } else {
          newHref = `${safeName}.${ext}`;
        }
      }
    } else {
      // remove any trailing slashes from input, ensure one trailing slash
      newHref = `${safeName.replace(/\/+$/, "")}/`;
    }

    try {
      const params = new URLSearchParams({
        op: "move",
        serverUrl,
        path: `${currentPath}${item.href}`,
        dest: `${currentPath}${newHref}`,
      });
      const response = await fetch(`/api/action?${params.toString()}`, {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Authentication failed");
        if (response.status === 403) throw new Error("Access denied");
        throw new Error("Failed to rename");
      }

      handleRefresh();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message === "Authentication failed"
          ? "登入已失效，請重新登入。"
          : (err as { message?: string })?.message === "Access denied"
            ? "目前帳號沒有此路徑的存取權限。"
            : "重新命名失敗，請稍後再試。";
      setError(msg);
      if ((err as { message?: string })?.message === "Authentication failed") {
        onLogout();
      }
      console.error(err);
    }
  };

  const visibleDirs = data?.dirs.filter((d) =>
    d.href.toLowerCase().includes(searchQuery.toLowerCase()),
  ) ?? [];
  const visibleFiles = data?.files.filter((f) =>
    f.href.toLowerCase().includes(searchQuery.toLowerCase()),
  ) ?? [];
  const itemCount = (data?.dirs.length ?? 0) + (data?.files.length ?? 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.07] via-background to-muted/40">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/90 backdrop-blur safe-pt">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md shadow-slate-900/15">
              <FolderIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">CopySpace</p>
              <p className="hidden items-center gap-1.5 truncate text-xs text-muted-foreground sm:flex">
                <ServerIcon className="h-3 w-3 shrink-0" />
                {isDemo ? "示範工作區" : serverUrl}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={openSettings} className="gap-2" aria-label="開啟設定">
              <Settings2Icon className="h-4 w-4" /><span className="hidden sm:inline">設定</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2" aria-label="重新整理資料夾">
              <RefreshCwIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">重新整理</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-foreground" aria-label="登出">
              <LogOutIcon className="h-4 w-4" /><span className="hidden sm:inline">登出</span>
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>工作區設定</DialogTitle>
            <DialogDescription>
              Copyparty 回報的帳號權限與儲存資訊。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <section className="rounded-lg border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">帳號</p>
              <p className="mt-1 font-medium">{data?.acct || "未知帳號"}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">目前路徑權限：{currentPath}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {currentPermissions.length > 0 ? currentPermissions.map((permission) => (
                  <span key={permission} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {permission}
                  </span>
                )) : volumePermissions.length > 0 ? (
                  <div className="w-full space-y-2">
                    <p className="text-sm text-muted-foreground">選擇掛載區以查看權限：</p>
                    {volumePermissions.map((volume) => (
                      <div key={volume.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">/{volume.name}</span>
                        <span className="text-right text-muted-foreground">{volume.perms.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-sm text-muted-foreground">尚未取得權限資訊</span>}
              </div>
            </section>

            <section className="rounded-lg border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">儲存空間</p>
              {isDemo ? (
                <p className="mt-2 text-sm text-muted-foreground">示範模式無法取得儲存空間指標。</p>
              ) : isLoadingMetrics ? (
                <p className="mt-2 text-sm text-muted-foreground">正在載入伺服器指標…</p>
              ) : metricsError ? (
                <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {data?.srvinf?.includes(" free of ") && <p>Copyparty 回報： {data.srvinf}</p>}
                  <p>{metricsError}. 詳細指標需要 Copyparty 啟用 <code>--stats</code>，且目前帳號具備管理員權限。</p>
                </div>
              ) : (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-muted-foreground">可用空間</dt><dd className="font-semibold">{formatBytes(metrics?.diskFree)}</dd></div>
                  <div><dt className="text-muted-foreground">總容量</dt><dd className="font-semibold">{formatBytes(metrics?.diskSize)}</dd></div>
                  <div className="col-span-2"><dt className="text-muted-foreground">檔案佔用空間</dt><dd className="font-semibold">{formatBytes(metrics?.volumeBytes)}</dd></div>
                </dl>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <main
        className={`mx-auto min-h-[calc(100vh-64px)] max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 transition-colors relative ${dragActive ? "bg-primary/5 ring-2 ring-inset ring-primary" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {hasWritePermission && !isDemo && (
          <Button
            variant="default"
            onClick={() => setShowUpload(true)}
            className="fixed bottom-5 right-5 z-20 h-12 w-12 rounded-2xl p-0 shadow-xl shadow-primary/20 sm:bottom-8 sm:right-8"
            aria-label="上傳檔案"
          >
            <UploadIcon className="h-5 w-5" />
          </Button>
        )}

        <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">檔案管理</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">我的檔案空間</h1>
            <p className="mt-1 text-sm text-muted-foreground">瀏覽與管理伺服器上的檔案。</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
            {hasWritePermission ? "可讀寫" : "唯讀"}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">項目數</span><HardDriveIcon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-xl font-semibold">{itemCount}</p></div>
          <div className="rounded-xl border border-border/70 bg-card p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">資料夾</span><FolderIcon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-xl font-semibold">{data?.dirs.length ?? "—"}</p></div>
          <div className="hidden rounded-xl border border-border/70 bg-card p-4 sm:block"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">權限</span><ShieldCheckIcon className="h-4 w-4 text-emerald-600" /></div><p className="mt-2 text-sm font-semibold capitalize">{currentPermissions[0] ?? "讀取中…"}</p></div>
        </div>

        <div className="mb-5 space-y-3">
          <Breadcrumbs path={currentPath} onNavigate={handleNavigate} />

          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋目前資料夾"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              </div>
              <div className="flex items-center gap-2 lg:border-l lg:pl-3">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                onClick={() => handleViewModeChange("grid")}
                className="flex-1 gap-2 sm:flex-none"
                aria-label="網格檢視"
              >
                <GridIcon className="h-4 w-4" />
                <span className="hidden sm:inline">網格</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                onClick={() => handleViewModeChange("list")}
                className="flex-1 gap-2 sm:flex-none"
                aria-label="清單檢視"
              >
                <ListIcon className="h-4 w-4" />
                <span className="hidden sm:inline">清單</span>
              </Button>
              </div>
            </div>
          </div>

          {hasWritePermission && !isDemo && (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card/60 p-3 sm:flex-row">
              <div className="relative flex-1">
                <Input
                  placeholder="新資料夾名稱"
                  value={mkdirName}
                  onChange={(e) => setMkdirName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleMkdir}
                  className="gap-2"
                  disabled={!mkdirName.trim()}
                >
                  <FolderPlusIcon className="h-4 w-4" />
                  建立資料夾
                </Button>
              </div>
            </div>
          )}
          {isDemo && <p className="text-xs text-muted-foreground">示範模式僅供瀏覽。連接伺服器後才能建立、重新命名、上傳或刪除檔案。</p>}
        </div>

        {/* File List */}
        <div className="space-y-4">
          {isLoading && <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">正在載入資料夾…</div>}
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          {data && !isLoading &&
            (viewMode === "grid" ? (
              <FileGrid
                dirs={visibleDirs}
                files={visibleFiles}
                onNavigate={(href: string) => handleNavigate(href)}
                onDownload={handleDownload}
                onDelete={
                  hasDeletePermission && !isDemo ? handleDelete : undefined
                }
                onRename={
                  hasWritePermission && hasMovePermission && !isDemo ? handleRename : undefined
                }
                currentPath={currentPath}
                serverUrl={serverUrl}
              />
            ) : (
              <FileList
                dirs={visibleDirs}
                files={visibleFiles}
                onNavigate={(href: string) => handleNavigate(href)}
                onDownload={handleDownload}
                onDelete={
                  hasDeletePermission && !isDemo ? handleDelete : undefined
                }
                onRename={
                  hasWritePermission && hasMovePermission && !isDemo ? handleRename : undefined
                }
                currentPath={currentPath}
                serverUrl={serverUrl}
              />
            ))}
        </div>

        {/* Upload Modal */}
        {showUpload && hasWritePermission && !isDemo && (
          <FileUpload
            serverUrl={serverUrl}
            currentPath={currentPath}
            canUpload={hasWritePermission}
            initialFiles={droppedFiles}
            onUploadComplete={() => {
              setShowUpload(false);
              setDroppedFiles([]);
              handleRefresh();
            }}
            onClose={() => {
              setShowUpload(false);
              setDroppedFiles([]);
            }}
          />
        )}

        <MediaViewer
          file={viewingFile}
          currentPath={currentPath}
          serverUrl={serverUrl}
          onClose={() => setViewingFile(null)}
          onDownload={(file) => handleDownload(file, true)}
        />
      </main>
    </div>
  );
}
