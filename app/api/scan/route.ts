import net from "node:net";
import { NextResponse } from "next/server";

const TARGET_HOST = "127.0.0.1";
const TARGET_PORT = 3924;
const CONNECT_TIMEOUT_MS = 500;
const SCAN_COOLDOWN_MS = 30_000;

let lastScanStartedAt = 0;

function isDemoMode(serverUrl: string | null): boolean {
  return serverUrl?.startsWith("demo://") || false;
}

function isSameOriginRequest(req: Request): boolean {
  const requestUrl = new URL(req.url);
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");

  if (origin) {
    try {
      if (new URL(origin).origin !== requestUrl.origin) return false;
    } catch {
      return false;
    }
  }

  return !fetchSite || fetchSite === "same-origin";
}

function checkLocalBackend(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (isOpen: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(isOpen);
    };

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("timeout", () => finish(false));
    socket.connect(TARGET_PORT, TARGET_HOST);
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const serverUrl = searchParams.get("serverUrl");

  if (isDemoMode(serverUrl)) {
    return NextResponse.json(
      { error: "示範模式不提供區網掃描。" },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "拒絕跨來源掃描請求。" },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const now = Date.now();
  const waitMs = SCAN_COOLDOWN_MS - (now - lastScanStartedAt);
  if (waitMs > 0) {
    return NextResponse.json(
      { error: "掃描太頻繁，請稍後再試。" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Retry-After": String(Math.ceil(waitMs / 1000)),
        },
      },
    );
  }
  lastScanStartedAt = now;

  const available = await checkLocalBackend();
  return NextResponse.json(
    { targets: available ? [TARGET_HOST] : [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
