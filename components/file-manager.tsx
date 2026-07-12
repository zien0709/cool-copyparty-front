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
import { Input } from "@/components/ui/input";
import type { CopyPartyResponse, DirItem, FileItem } from "@/types/copyparty";

interface FileManagerProps {
  serverUrl: string;
  onLogout: () => void;
  initialData?: CopyPartyResponse;
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
  const hasWritePermission = data?.perms.includes("write") || false;
  const hasDeletePermission = data?.perms.includes("delete") || false;

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
          ? "Authentication failed. Please log in again."
          : (err as { message?: string })?.message === "Access denied"
            ? "Access denied. Your account lacks permissions."
            : "Failed to load directory. Please try again.";
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
      alert("Demo mode: downloads are disabled.");
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
    if (isDemo) {
      alert("Demo mode: uploads are disabled.");
      return;
    }
    if (e.dataTransfer.files?.[0]) {
      setDroppedFiles(Array.from(e.dataTransfer.files));
      setShowUpload(true);
    }
  };

  const handleDelete = async (item: FileItem | DirItem) => {
    if (isDemo) {
      alert("Demo mode: delete is disabled.");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${item.href}?`)) {
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
        setError("Authentication failed. Please log in again.");
        onLogout();
      } else {
        alert("Failed to delete item");
      }
    } catch (err) {
      alert("Failed to delete item");
      console.error(err);
    }
  };

  const handleMkdir = async () => {
    if (isDemo) {
      alert("Demo mode: creating folders is disabled.");
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
          ? "Authentication failed. Please log in again."
          : (err as { message?: string })?.message === "Access denied"
            ? "Access denied. Your account lacks permissions."
            : "Failed to create directory. Please try again.";
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
      alert("Demo mode: rename is disabled.");
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
          ? "Authentication failed. Please log in again."
          : (err as { message?: string })?.message === "Access denied"
            ? "Access denied. Your account lacks permissions."
            : "Failed to rename. Please try again.";
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
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/90 backdrop-blur safe-pt">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><FolderIcon className="h-5 w-5 text-primary" /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Cool CopyParty</p>
              <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><ServerIcon className="h-3 w-3" />{isDemo ? "Demo workspace" : serverUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2" aria-label="Refresh directory">
              <RefreshCwIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-foreground" aria-label="Log out">
              <LogOutIcon className="h-4 w-4" /><span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto min-h-[calc(100vh-64px)] max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 transition-colors relative ${dragActive ? "bg-primary/5 ring-2 ring-inset ring-primary" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Button
          variant="default"
          onClick={() => {
            if (isDemo) {
              alert("Demo mode: uploads are disabled.");
              return;
            }
            setShowUpload(true);
          }}
          className="fixed bottom-5 right-5 z-20 h-12 w-12 rounded-full p-0 shadow-lg sm:bottom-8 sm:right-8"
          disabled={isDemo}
          aria-label="Upload files"
        >
          <UploadIcon className="h-5 w-5" />
        </Button>

        <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">File manager</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">Browse and manage the files on your server.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-600" /> Secure session
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Items here</span><HardDriveIcon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-xl font-semibold">{itemCount}</p></div>
          <div className="rounded-xl border border-border/70 bg-card p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Folders</span><FolderIcon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-xl font-semibold">{data?.dirs.length ?? "—"}</p></div>
          <div className="hidden rounded-xl border border-border/70 bg-card p-4 sm:block"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Permission</span><ShieldCheckIcon className="h-4 w-4 text-emerald-600" /></div><p className="mt-2 text-sm font-semibold capitalize">{data?.perms[0] ?? "Checking…"}</p></div>
        </div>

        <div className="mb-5 space-y-3">
          <Breadcrumbs path={currentPath} onNavigate={handleNavigate} />

          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search this folder"
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
                aria-label="Grid view"
              >
                <GridIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                onClick={() => handleViewModeChange("list")}
                className="flex-1 gap-2 sm:flex-none"
                aria-label="List view"
              >
                <ListIcon className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
              </div>
            </div>
          </div>

          {hasWritePermission && !isDemo && (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card/60 p-3 sm:flex-row">
              <div className="relative flex-1">
                <Input
                  placeholder="New folder name"
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
                  Create folder
                </Button>
              </div>
            </div>
          )}
          {isDemo && <p className="text-xs text-muted-foreground">Demo mode is read-only. Connect to a server to create, rename, upload, or delete files.</p>}
        </div>

        {/* File List */}
        <div className="space-y-4">
          {isLoading && <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">Loading directory…</div>}
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
                  hasWritePermission && !isDemo ? handleRename : undefined
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
                  hasWritePermission && !isDemo ? handleRename : undefined
                }
                currentPath={currentPath}
                serverUrl={serverUrl}
              />
            ))}
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <FileUpload
            serverUrl={serverUrl}
            currentPath={currentPath}
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
