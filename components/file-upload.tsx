"use client";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  FileIcon,
  InfoIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Progress } from "./ui/progress";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface FileUploadProps {
  serverUrl: string;
  currentPath: string;
  onUploadComplete: () => void;
  onClose: () => void;
  initialFiles?: File[];
  canUpload: boolean;
}

export function FileUpload({
  serverUrl,
  currentPath,
  onUploadComplete,
  onClose,
  initialFiles,
  canUpload,
}: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (canUpload && !serverUrl.startsWith("demo://") && initialFiles && initialFiles.length > 0) {
      const newFiles: UploadFile[] = initialFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending",
      }));
      setUploadFiles((prev) => [...prev, ...newFiles]);
    }
  }, [canUpload, initialFiles, serverUrl]);

  const isDemo = serverUrl.startsWith("demo://");

  // Detect active work: uploading or waiting for listing to update
  const hasUploading = uploadFiles.some((f) => f.status === "uploading");
  const hasActive = hasUploading;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    if (isDemo || !canUpload) {
      alert(isDemo ? "示範模式不提供上傳功能。" : "目前帳號只有讀取權限，無法上傳檔案。");
      return;
    }

    const newFiles: UploadFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: "pending",
    }));

    setUploadFiles((prev) => [...prev, ...newFiles]);
  };

  const waitUntilListed = async (filename: string): Promise<boolean> => {
    // Poll the listing for a short time to confirm the uploaded file appears
    const end = Date.now() + 8000;
    while (Date.now() < end) {
      try {
        const params = new URLSearchParams({
          op: "ls",
          serverUrl,
          path: currentPath,
        });
        params.set("_", Date.now().toString());
        const resp = await fetch(`/api/action?${params.toString()}`, {
          cache: "no-store",
        });
        if (resp.ok) {
          const data = await resp.json();
          const files: Array<{ href: string }> = data?.files || [];
          if (
            files.some(
              (f) => decodeURIComponent(f.href).replace(/^\//, "") === filename,
            )
          ) {
            return true;
          }
        }
      } catch {
        // ignore and keep trying
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  };

  const uploadFile = async (
    uploadFile: UploadFile,
    index: number,
  ): Promise<void> => {
    const { file } = uploadFile;

    setUploadFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: "uploading" as const } : f,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("f", file);

      const params = new URLSearchParams({
        op: "upload",
        serverUrl,
        path: currentPath,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadFiles((prev) =>
              prev.map((f, i) => (i === index ? { ...f, progress } : f)),
            );
          }
        });

        xhr.addEventListener("load", async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Upload finished network-wise; wait until file appears in listing
            const ok = await waitUntilListed(file.name);
            setUploadFiles((prev) =>
              prev.map((f, i) =>
                i === index
                  ? {
                      ...f,
                      status: ok ? ("success" as const) : ("success" as const),
                      progress: 100,
                      error: ok
                        ? undefined
                        : "檔案已送出，但清單尚未更新；稍後重新整理即可確認。",
                    }
                  : f,
              ),
            );
            resolve();
          } else {
            setUploadFiles((prev) =>
              prev.map((f, i) =>
                i === index
                  ? {
                      ...f,
                      status: "error" as const,
                      error: `上傳失敗（HTTP ${xhr.status}）`,
                    }
                  : f,
              ),
            );
            reject(new Error(xhr.statusText || "Upload failed"));
          }
        });

        xhr.addEventListener("error", () => {
          setUploadFiles((prev) =>
            prev.map((f, i) =>
              i === index
                ? {
                    ...f,
                    status: "error" as const,
                    error: "網路連線中斷，請確認連線後重試。",
                  }
                : f,
            ),
          );
          reject(new Error("Network error"));
        });

        xhr.open("POST", `/api/action?${params.toString()}`);
        xhr.send(formData);
      });
    } catch {
      setUploadFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "error" as const,
                error: "上傳失敗，請稍後重試。",
              }
            : f,
        ),
      );
    }
  };

  const handleUploadAll = async () => {
    if (isDemo || !canUpload) {
      alert(isDemo ? "示範模式不提供上傳功能。" : "目前帳號只有讀取權限，無法上傳檔案。");
      return;
    }
    const pendingFiles = uploadFiles
      .map((f, i) => ({ file: f, index: i }))
      .filter(({ file }) => file.status === "pending");

    for (const { file, index } of pendingFiles) {
      await uploadFile(file, index);
    }

    // refresh after completing uploads and listing confirms
    onUploadComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center safe-px safe-pt safe-pb p-3 sm:p-4">
      <Card className="w-full sm:max-w-2xl rounded-none sm:rounded-xl h-[85vh] sm:h-auto overflow-y-auto py-4 sm:py-6">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" /> 上傳檔案
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              aria-label="關閉上傳視窗"
              onClick={onClose}
              disabled={hasActive}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {!canUpload && !isDemo && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
              <InfoIcon className="h-4 w-4" />
              目前帳號只有讀取權限，無法上傳檔案。
            </div>
          )}
          {isDemo && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
              <InfoIcon className="h-4 w-4" />
              示範模式不提供上傳功能。
            </div>
          )}
          {!isDemo && hasActive && (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-yellow-100 text-yellow-900 px-3 py-2 text-xs sm:text-sm border border-yellow-200">
              <InfoIcon className="h-4 w-4" />
              檔案仍在上傳或確認中，完成前請勿關閉此視窗。
            </div>
          )}
          <section
            aria-label="檔案拖放區"
            className={`rounded-2xl border-2 border-dashed p-4 text-center transition-colors sm:p-6 ${isDragging ? "border-primary bg-primary/5" : "border-border"} ${isDemo || !canUpload ? "pointer-events-none opacity-60" : "hover:border-primary/50"}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (canUpload && !isDemo) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (isDemo || !canUpload) {
                alert(isDemo ? "示範模式不提供上傳功能。" : "目前帳號只有讀取權限，無法上傳檔案。");
                return;
              }
              handleFileSelect(e.dataTransfer.files);
            }}
          >
            <p className="text-sm text-muted-foreground">
              將檔案拖曳至此，或點擊下方按鈕選擇檔案
            </p>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={isDemo || !canUpload}
            />
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDemo || !canUpload}
            >
              選擇檔案
            </Button>
          </section>

          {uploadFiles.length > 0 && (
            <div className="mt-6 space-y-4">
              {uploadFiles.map((uf, index) => (
                <div key={uf.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[60vw] sm:max-w-none">
                        {uf.file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {uf.status === "success" && (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      )}
                      {uf.status === "error" && (
                        <AlertCircleIcon className="h-5 w-5 text-red-600" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`從佇列移除 ${uf.file.name}`}
                        disabled={hasActive}
                        onClick={() =>
                          setUploadFiles((prev) =>
                            prev.filter((_, idx) => idx !== index),
                          )
                        }
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={uf.progress} />
                    {uf.status === "success" && uf.error && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <InfoIcon className="h-3 w-3" />
                        <span>{uf.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <Button
                  onClick={handleUploadAll}
                  className="gap-2"
                  disabled={isDemo || !canUpload || hasActive || !uploadFiles.some((file) => file.status === "pending")}
                >
                  <UploadIcon className="h-4 w-4" /> 全部上傳
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={hasActive}>
              關閉
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
