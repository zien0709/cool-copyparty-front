"use client";

import {
  ArrowRightIcon,
  FolderIcon,
  InfoIcon,
  Loader2Icon,
  SearchIcon,
  ServerIcon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  onLogin: (serverUrl: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [serverUrl, setServerUrl] = useState("http://127.0.0.1:3923");
  const [password, setPassword] = useState("");
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
        `/api/scan?serverUrl=${encodeURIComponent(serverUrl)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setScannedServers(data.targets || []);
        setHasScanned(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to scan local network.");
      }
    } catch {
      setError("Error scanning local network.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectServer = (ip: string) => {
    setServerUrl(`http://${ip}:3923`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const resp = await fetch("/api/action?op=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverUrl: serverUrl.trim(), password }),
      });

      if (resp.ok) {
        onLogin(serverUrl.trim());
      } else if (resp.status === 401) {
        setError("Authentication failed. Please check your password.");
      } else if (resp.status === 403) {
        setError("Access denied. Your account lacks permissions.");
      } else {
        const data = await resp.json().catch(() => null);
        setError(data?.error || `Failed to connect (status ${resp.status}).`);
      }
    } catch {
      setError(
        "Invalid server URL or network issue. Ensure HTTPS is available.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center safe-px safe-pt safe-pb p-5">
      <Card className="w-full max-w-sm border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-4 px-0 pb-7 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FolderIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight">Cool CopyParty</CardTitle>
            <CardDescription className="mt-1">Connect to your server</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="serverUrl" className="text-sm font-medium">
                  Server URL
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleScan}
                  disabled={isScanning || isDemo}
                  className="h-8 px-2 text-xs"
                >
                  {isScanning ? (
                    <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <SearchIcon className="h-3 w-3 mr-1" />
                  )}
                  {isScanning ? "Scanning..." : "Scan Network"}
                </Button>
              </div>
              <Input
                id="serverUrl"
                type="text"
                placeholder="http://127.0.0.1:3923"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                required
                  className="border-0 bg-muted/60 shadow-none focus-visible:bg-muted"
              />

              {isDemo && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600">
                  <InfoIcon className="h-3.5 w-3.5" />
                  <span>Network scanning is disabled for demo targets.</span>
                </div>
              )}

              {hasScanned && !isDemo && (
                <div className="mt-2 overflow-hidden rounded-md bg-muted/50 text-sm">
                  <div className="bg-muted px-3 py-1.5 text-xs font-semibold flex items-center justify-between">
                    <span>Local Servers Found</span>
                    <span className="text-muted-foreground">
                      {scannedServers.length}
                    </span>
                  </div>
                  {scannedServers.length > 0 ? (
                    <ul className="divide-y max-h-32 overflow-y-auto">
                      {scannedServers.map((ip) => (
                        <li key={ip}>
                          <button
                            type="button"
                            onClick={() => handleSelectServer(ip)}
                            className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-xs transition-colors"
                          >
                            <ServerIcon className="h-3 w-3 text-primary" />
                            {ip}:3923
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No CopyParty servers found on port 3923.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-0 bg-muted/60 shadow-none focus-visible:bg-muted"
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 gap-2"
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : <><span>Connect securely</span><ArrowRightIcon className="h-4 w-4" /></>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
