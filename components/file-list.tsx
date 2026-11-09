"use client";

import {
  DownloadIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderIcon,
  ImageIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { DirItem, FileItem } from "@/types/copyparty";

interface FileListProps {
  dirs: DirItem[];
  files: FileItem[];
  onNavigate: (path: string) => void;
  onDownload: (file: FileItem) => void;
  onDelete?: (item: FileItem | DirItem) => void;
  onRename?: (item: FileItem | DirItem, newBaseName: string) => void;
  currentPath: string;
  serverUrl: string;
}

const imageExts = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "avif",
  "heic",
  "heif",
  "tif",
  "tiff",
  "jfif",
];

const videoExts = ["mp4", "webm", "mov", "avi", "mkv", "m4v", "flv", "ogv"];
const audioExts = ["mp3", "wav", "ogg", "flac", "m4a", "opus"];
const archiveExts = ["zip", "rar", "7z", "tar", "gz", "xz", "bz2"];
const textExts = [
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
];

function isImageExt(ext: string) {
  return imageExts.includes(ext.toLowerCase());
}

function isVideoExt(ext: string) {
  return videoExts.includes(ext.toLowerCase());
}

function getThumbUrl(serverUrl: string, currentPath: string, file: FileItem) {
  const params = new URLSearchParams({
    op: "file",
    serverUrl,
    path: `${currentPath}${file.href}`,
    cache: "1",
  });
  if (isImageExt(file.ext)) params.set("thumb", "1");
  return `/api/action?${params.toString()}`;
}

function getFileIcon(ext: string) {
  if (isImageExt(ext)) return <ImageIcon className="h-5 w-5" />;
  if (isVideoExt(ext)) return <FileVideoIcon className="h-5 w-5" />;
  if (audioExts.includes(ext.toLowerCase()))
    return <FileAudioIcon className="h-5 w-5" />;
  if (archiveExts.includes(ext.toLowerCase()))
    return <FileArchiveIcon className="h-5 w-5" />;
  if (textExts.includes(ext.toLowerCase()))
    return <FileTextIcon className="h-5 w-5" />;
  return <FileIcon className="h-5 w-5" />;
}

export function FileList({
  dirs,
  files,
  onNavigate,
  onDownload,
  onDelete,
  onRename,
  currentPath,
  serverUrl,
}: FileListProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let size = bytes / 1024;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const renderThumbOrIcon = (file: FileItem) => {
    if (isImageExt(file.ext) || isVideoExt(file.ext)) {
      const url = getThumbUrl(serverUrl, currentPath, file);
      return (
        // biome-ignore lint/performance/noImgElement: The proxy URL is dynamic and cannot use next/image optimization.
        <img
          src={url}
          alt={`${decodeURIComponent(file.href)} 縮圖`}
          width={48}
          height={48}
          loading="lazy"
          className="h-12 w-12 object-contain rounded-md border border-border/50 bg-muted/20"
        />
      );
    }
    return (
      <div className="h-12 w-12 flex items-center justify-center rounded-md border border-border/50 bg-muted/20">
        <div className="text-muted-foreground">{getFileIcon(file.ext)}</div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:text-sm">
                名稱
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium text-muted-foreground sm:table-cell sm:px-4 sm:text-sm">
                大小
              </th>
              <th className="text-left px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell">
                修改時間
              </th>
              <th className="text-right px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-muted-foreground w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {dirs.map((dir) => (
              <ContextMenu key={dir.href}>
                <ContextMenuTrigger asChild>
                  <tr
                    className="hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate(currentPath + dir.href)}
                  >
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground break-all">
                          {decodeURIComponent(dir.href.replace(/\/$/, ""))}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                      {formatSize(dir.sz)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {new Date(dir.ts * 1000).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <MoreVerticalIcon className="h-4 w-4 text-muted-foreground inline" />
                    </td>
                  </tr>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => onNavigate(currentPath + dir.href)}
                  >
                    開啟
                  </ContextMenuItem>
                  {onRename && (
                    <ContextMenuItem
                      onClick={() => {
                        const currentName = decodeURIComponent(
                          dir.href.replace(/\/$/, ""),
                        );
                        const newName = prompt("重新命名資料夾", currentName);
                        if (newName?.trim())
                          onRename(dir, newName.trim());
                      }}
                    >
                      <PencilIcon className="mr-2 h-4 w-4" />
                      重新命名
                    </ContextMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(dir)}
                      >
                        <TrashIcon className="mr-2 h-4 w-4" />
                        刪除
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {files.map((file) => (
              <ContextMenu key={file.href}>
                <ContextMenuTrigger asChild>
                  <tr
                    className="hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onDownload(file)}
                  >
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex-shrink-0">
                          {renderThumbOrIcon(file)}
                        </div>
                        <span className="text-sm text-foreground break-all">
                          {decodeURIComponent(file.href)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                      {formatSize(file.sz)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {new Date(file.ts * 1000).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <MoreVerticalIcon className="h-4 w-4 text-muted-foreground inline" />
                    </td>
                  </tr>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onDownload(file)}>
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    下載
                  </ContextMenuItem>
                  {onRename && (
                    <ContextMenuItem
                      onClick={() => {
                        const name = decodeURIComponent(file.href);
                        const baseName = name.replace(/\.[^/.]+$/, "");
                        const newName = prompt("重新命名檔案", baseName);
                        if (newName?.trim())
                          onRename(file, newName.trim());
                      }}
                    >
                      <PencilIcon className="mr-2 h-4 w-4" />
                      重新命名
                    </ContextMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(file)}
                      >
                        <TrashIcon className="mr-2 h-4 w-4" />
                        刪除
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
