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

interface FileGridProps {
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
  if (isImageExt(ext)) return <ImageIcon className="h-8 w-8" />;
  if (isVideoExt(ext)) return <FileVideoIcon className="h-8 w-8" />;
  if (audioExts.includes(ext.toLowerCase()))
    return <FileAudioIcon className="h-8 w-8" />;
  if (archiveExts.includes(ext.toLowerCase()))
    return <FileArchiveIcon className="h-8 w-8" />;
  if (textExts.includes(ext.toLowerCase()))
    return <FileTextIcon className="h-8 w-8" />;
  return <FileIcon className="h-8 w-8" />;
}

function renderThumbOrIcon(
  serverUrl: string,
  currentPath: string,
  file: FileItem,
) {
  if (isImageExt(file.ext) || isVideoExt(file.ext)) {
    const url = getThumbUrl(serverUrl, currentPath, file);
    return (
      // biome-ignore lint/performance/noImgElement: The proxy URL is dynamic and cannot use next/image optimization.
      <img
        src={url}
        alt={`${decodeURIComponent(file.href)} thumbnail`}
        width={128}
        height={128}
        loading="lazy"
        className="h-24 w-24 object-contain rounded-md border border-border/50 bg-muted/20"
      />
    );
  }
  return (
    <div className="h-24 w-24 flex items-center justify-center rounded-md border border-border/50 bg-muted/20">
      <div className="text-muted-foreground">{getFileIcon(file.ext)}</div>
    </div>
  );
}

export function FileGrid({
  dirs,
  files,
  onNavigate,
  onDownload,
  onDelete,
  onRename,
  currentPath,
  serverUrl,
}: FileGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {dirs.map((dir) => (
        <ContextMenu key={dir.href}>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              onClick={() => onNavigate(currentPath + dir.href)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigate(currentPath + dir.href);
                }
              }}
              className="group relative flex flex-col items-center p-3 sm:p-4 rounded-lg border border-border/50 bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors cursor-pointer h-full"
            >
              <FolderIcon className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-2" />
              <span className="text-xs sm:text-sm text-center text-foreground line-clamp-2 break-all">
                {decodeURIComponent(dir.href.replace(/\/$/, ""))}
              </span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onNavigate(currentPath + dir.href)}>
              Open
            </ContextMenuItem>
            {onRename && (
              <ContextMenuItem
                onClick={() => {
                  const currentName = decodeURIComponent(
                    dir.href.replace(/\/$/, ""),
                  );
                  const newName = prompt("Rename folder", currentName);
                  if (newName?.trim()) {
                    onRename(dir, newName.trim());
                  }
                }}
              >
                <PencilIcon className="mr-2 h-4 w-4" />
                Rename
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
                  Delete
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      ))}

      {files.map((file) => (
        <ContextMenu key={file.href}>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              className="group relative flex flex-col items-center p-3 sm:p-4 rounded-lg border border-border/50 bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors cursor-pointer h-full"
              onClick={() => onDownload(file)}
            >
              <div className="mb-2">
                {renderThumbOrIcon(serverUrl, currentPath, file)}
              </div>
              <span className="text-xs sm:text-sm text-center text-foreground line-clamp-2 break-all mb-1">
                {decodeURIComponent(file.href)}
              </span>
              <span className="text-xs text-muted-foreground">
                {file.sz / 1024 < 1
                  ? `${file.sz} B`
                  : `${(file.sz / 1024).toFixed(1)} KB`}
              </span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onDownload(file)}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download
            </ContextMenuItem>
            {onRename && (
              <ContextMenuItem
                onClick={() => {
                  const name = decodeURIComponent(file.href);
                  const baseName = name.replace(/\.[^/.]+$/, "");
                  const newName = prompt("Rename file", baseName);
                  if (newName?.trim()) {
                    onRename(file, newName.trim());
                  }
                }}
              >
                <PencilIcon className="mr-2 h-4 w-4" />
                Rename
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
                  Delete
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
}
