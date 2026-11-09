import net from "node:net";
import os from "node:os";
import { NextResponse } from "next/server";

const TARGET_PORT = 3923;
const CONNECT_TIMEOUT_MS = 200;
const SCAN_COOLDOWN_MS = 30_000;
const CHUNK_SIZE = 32;

let lastScanStartedAt = 0;

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  const [a, b] = octets;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

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

function checkPort(
  host: string,
  port: number,
  timeoutMs = CONNECT_TIMEOUT_MS,
): Promise<boolean> {
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
    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => finish(false));
    socket.connect(port, host);
  });
}

function getLocalSubnets(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses = new Set<string>();

  for (const ifaceArray of Object.values(interfaces)) {
    if (!ifaceArray) continue;

    for (const iface of ifaceArray) {
      const family = String(iface.family);
      const isIpv4 = family === "IPv4" || family === "4";
      if (isIpv4 && !iface.internal && isPrivateIpv4(iface.address)) {
        addresses.add(iface.address);
      }
    }
  }

  return [...addresses];
}

function getIpsInSubnet(ipAddress: string): string[] {
  const parts = ipAddress.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return [];
  }

  const baseIp = parts.slice(0, 3).join(".");
  return Array.from({ length: 254 }, (_, index) => `${baseIp}.${index + 1}`);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const serverUrl = searchParams.get("serverUrl");

  if (isDemoMode(serverUrl)) {
    return NextResponse.json(
      { error: "示範模式不提供區網掃描。" },
      {
        status: 403,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "拒絕跨來源掃描請求。" },
      {
        status: 403,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
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

  try {
    const targets = new Set<string>(["127.0.0.1"]);
    for (const subnetIp of getLocalSubnets()) {
      for (const ip of getIpsInSubnet(subnetIp)) {
        targets.add(ip);
      }
    }

    const candidates = [...targets];
    const found: string[] = [];

    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
      const chunk = candidates.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (ip) => ({
          ip,
          isOpen: await checkPort(ip, TARGET_PORT),
        })),
      );

      for (const result of results) {
        if (result.isOpen) found.push(result.ip);
      }
    }

    return NextResponse.json(
      { targets: [...new Set(found)] },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { error: "區網掃描失敗。" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
