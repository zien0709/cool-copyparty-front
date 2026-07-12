"use client";

import { DownloadIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileItem } from "@/types/copyparty";

interface MediaViewerProps {
  file: FileItem | null;
  currentPath: string;
  serverUrl: string;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
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
];
const videoExts = ["mp4", "webm", "mov", "avi", "mkv", "m4v", "flv", "ogv"];
const audioExts = ["mp3", "wav", "ogg", "flac", "m4a", "opus"];
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

export function MediaViewer({
  file,
  currentPath,
  serverUrl,
  onClose,
  onDownload,
}: MediaViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (file && textExts.includes(file.ext.toLowerCase())) {
      const fetchText = async () => {
        setIsLoading(true);
        try {
          const params = new URLSearchParams({
            op: "file",
            serverUrl,
            path: `${currentPath}${file.href}`,
          });
          const response = await fetch(`/api/action?${params.toString()}`);
          if (response.ok) {
            const text = await response.text();
            setTextContent(text);
          } else {
            setTextContent("Failed to load file content.");
          }
        } catch {
          setTextContent("Error loading file content.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchText();
    } else {
      setTextContent(null);
    }
  }, [file, currentPath, serverUrl]);

  if (!file) return null;

  const ext = file.ext.toLowerCase();
  const fileUrl = `/api/action?${new URLSearchParams({
    op: "file",
    serverUrl,
    path: `${currentPath}${file.href}`,
  }).toString()}`;

  const isImage = imageExts.includes(ext);
  const isVideo = videoExts.includes(ext);
  const isAudio = audioExts.includes(ext);
  const isText = textExts.includes(ext);

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur">
        <DialogHeader className="p-4 pr-14 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <DialogTitle className="text-base font-medium truncate">
              {decodeURIComponent(file.href)}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDownload(file)}
            >
              <DownloadIcon className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center bg-black/5 overflow-hidden p-4">
          {isImage && (
            // biome-ignore lint/performance/noImgElement: The proxy URL is dynamic and cannot use next/image optimization.
            <img
              src={fileUrl}
              alt={decodeURIComponent(file.href)}
              className="max-w-full max-h-full object-contain shadow-lg rounded-sm"
            />
          )}

          {isVideo && (
            <video
              src={fileUrl}
              controls
              autoPlay
              className="max-w-full max-h-full shadow-lg bg-black"
            >
              <track kind="captions" />
            </video>
          )}

          {isAudio && (
            <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-xl border flex flex-col items-center gap-6">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <FileTextIcon className="h-12 w-12 text-primary" />
              </div>
              <audio src={fileUrl} controls autoPlay className="w-full">
                <track kind="captions" />
              </audio>
            </div>
          )}

          {isText && (
            <div className="w-full h-full bg-card rounded-md border shadow-inner overflow-hidden">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-full w-full p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {textContent}
                  </pre>
                </ScrollArea>
              )}
            </div>
          )}

          {!isImage && !isVideo && !isAudio && !isText && (
            <div className="text-center space-y-4">
              <FileTextIcon className="h-16 w-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Preview not available for this file type.
              </p>
              <Button onClick={() => onDownload(file)}>Download File</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
