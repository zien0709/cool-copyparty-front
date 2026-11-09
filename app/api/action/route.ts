import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { decrypt, encrypt, generateCookieExpiration } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAME = "copyparty_auth";

function isSecure(req: NextRequest): boolean {
  return new URL(req.url).protocol === "https:";
}

function authenticatedHeaders(pw: string, headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  result.set("PW", pw);
  return result;
}

async function proxyJson(url: string, pw: string): Promise<Response> {
  const resp = await fetch(url, {
    method: "GET",
    headers: authenticatedHeaders(pw),
    cache: "no-store",
  });
  const contentType = resp.headers.get("content-type") || "";
  if (!resp.ok) {
    return NextResponse.json(
      { error: resp.statusText },
      {
        status: resp.status,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
  if (contentType.includes("application/json")) {
    const data = await resp.json();
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } else {
    const text = await resp.text();
    return NextResponse.json(
      { data: text },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

function getDecryptedPw(req: NextRequest): string | null {
  const enc =
    req.headers.get("x-auth-cookie") ||
    req.cookies.get(COOKIE_NAME)?.value ||
    null;
  if (!enc) return null;
  return decrypt(enc);
}

function isDemoMode(serverUrl: string | null): boolean {
  return serverUrl?.startsWith("demo://") || false;
}

function normalizeServerUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value.trim());
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    const allowedOrigins = (process.env.COPYPARTY_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
      return null;
    }
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(parsed.origin)) {
      return null;
    }

    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const op = searchParams.get("op") || "ls";
  const rawServerUrl = searchParams.get("serverUrl");
  const path = searchParams.get("path") || "/";

  // Check for demo mode first
  if (isDemoMode(rawServerUrl)) {
    return NextResponse.json(
      { error: "Operation not allowed in demo mode" },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const serverUrl = normalizeServerUrl(rawServerUrl);
  if (!serverUrl) {
    return NextResponse.json(
      { error: "Missing or disallowed serverUrl" },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const pw = getDecryptedPw(req);
  if (!pw)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } },
    );

  if (op === "ls") {
    const url = `${serverUrl}${path}?ls`;
    return proxyJson(url, pw);
  }

  if (op === "metrics") {
    const metricsUrl = `${serverUrl.replace(/\/+$/, "")}/.cpr/metrics`;
    const upstream = await fetch(metricsUrl, {
      method: "GET",
      headers: authenticatedHeaders(pw, {
        Accept: "text/plain; version=0.0.4",
      }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: upstream.status === 403 ? "Admin access required" : upstream.statusText },
        { status: upstream.status, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // New: direct file proxy with optional download or cache
  if (op === "file") {
    const wantCache = searchParams.get("cache") === "1";
    const wantDownload = searchParams.get("download") === "1";
    const wantThumbnail = searchParams.get("thumb") === "1";
    const range = req.headers.get("range");

    let targetUrl = `${serverUrl}${path}`;
    if (wantDownload) {
      targetUrl += targetUrl.includes("?") ? "&dl" : "?dl";
    }
    if (wantCache) {
      targetUrl += targetUrl.includes("?") ? "&cache" : "?cache";
    }

    const headers = authenticatedHeaders(pw);
    if (!wantThumbnail && range) headers.set("Range", range);
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (wantThumbnail && upstream.ok) {
      const contentType = upstream.headers.get("content-type") || "";

      // Resize in Next.js so thumbnails do not depend on Copyparty's
      // optional Python thumbnail dependencies.
      if (contentType.startsWith("image/")) {
        const original = Buffer.from(await upstream.arrayBuffer());
        try {
          const thumbnail = await sharp(original)
            .resize(256, 256, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toBuffer();

          return new NextResponse(new Uint8Array(thumbnail), {
            status: 200,
            headers: {
              "Cache-Control": wantCache
                ? "public, max-age=604800, immutable"
                : "no-store, max-age=0",
              "Content-Length": String(thumbnail.byteLength),
              "Content-Type": "image/webp",
            },
          });
        } catch {
          // Fall back to the original bytes for unsupported formats.
          return new NextResponse(new Uint8Array(original), {
            status: upstream.status,
            headers: upstream.headers,
          });
        }
      }
    }

    const res = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });

    // Cache control: cache images (when cache=1), otherwise disable caching
    if (wantCache) {
      res.headers.set("Cache-Control", "public, max-age=604800, immutable");
    } else {
      res.headers.set("Cache-Control", "no-store, max-age=0");
    }
    return res;
  }

  // Fallback: just proxy GET to a path
  const url = `${serverUrl}${path}`;
  const upstream = await fetch(url, {
    method: "GET",
    headers: authenticatedHeaders(pw),
    cache: "no-store",
  });
  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const op = searchParams.get("op") || "upload";
  const rawServerUrl = searchParams.get("serverUrl");

  // Check for demo mode first
  if (isDemoMode(rawServerUrl)) {
    // Block all operations in demo mode
    return NextResponse.json(
      { error: "Operation not allowed in demo mode" },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  if (op === "login") {
    const body = await req.json();
    const serverUrl = normalizeServerUrl(body?.serverUrl);
    const username =
      typeof body?.username === "string" ? body.username.trim() : "";
    const password: string | undefined = body?.password;
    const authValue = username ? `${username}:${password}` : password;

    if (!serverUrl || !password) {
      return NextResponse.json(
        { error: "Missing, invalid, or disallowed serverUrl; password is required" },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const testUrl = `${serverUrl.replace(/\/+$/, "")}/?ls`;
    const resp = await fetch(testUrl, {
      headers: authenticatedHeaders(authValue ?? ""),
      cache: "no-store",
    });
    if (!resp.ok) {
      const status = resp.status;
      const msg =
        status === 401
          ? "Authentication failed"
          : status === 403
            ? "Access denied"
            : "Connection failed";
      return NextResponse.json(
        { error: msg },
        { status, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const enc = encrypt(authValue ?? password);
    const res = NextResponse.json(
      { ok: true, username: username || null },
      { status: 200 },
    );
    res.cookies.set({
      name: COOKIE_NAME,
      value: enc,
      httpOnly: true,
      secure: isSecure(req),
      sameSite: "lax",
      expires: generateCookieExpiration(8), // 8 hours session
      path: "/",
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  }

  if (op === "upload") {
    const serverUrl = normalizeServerUrl(searchParams.get("serverUrl"));
    const path = searchParams.get("path") || "/";
    const pw = getDecryptedPw(req);

    if (!serverUrl)
      return NextResponse.json(
        { error: "Missing or disallowed serverUrl" },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    if (!pw)
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } },
      );

    // Stream the original multipart body directly to the upstream to avoid truncation
    const uploadUrl = `${serverUrl}${path}`;
    const contentType = req.headers.get("content-type") || undefined;
    const headers = authenticatedHeaders(pw);
    if (contentType) headers.set("content-type", contentType);

    const upstreamResp = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: req.body,
      cache: "no-store",
      // @ts-expect-error Node fetch requires duplex for streamed bodies
      duplex: "half",
    });

    if (!upstreamResp.ok) {
      return NextResponse.json(
        { error: upstreamResp.statusText },
        {
          status: upstreamResp.status,
          headers: { "Cache-Control": "no-store, max-age=0" },
        },
      );
    }

    const text = await upstreamResp.text();
    return NextResponse.json(
      { ok: true, response: text },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  // Move/Rename
  if (op === "move" || op === "copy") {
    const serverUrl = normalizeServerUrl(searchParams.get("serverUrl"));
    const path = searchParams.get("path") || "/";
    const dest = searchParams.get("dest") || "";
    const pw = getDecryptedPw(req);

    if (!serverUrl)
      return NextResponse.json(
        { error: "Missing or disallowed serverUrl" },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    if (!pw)
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    if (!dest)
      return NextResponse.json(
        { error: "Missing dest" },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
      );

    // Upstream expects POST with ?move=/new/path or ?copy=/new/path on the source URL
    const actionParam = op === "move" ? "move" : "copy";
    const upstreamUrl = `${serverUrl}${path}?${actionParam}=${encodeURIComponent(dest)}`;
    const upstreamResp = await fetch(upstreamUrl, {
      method: "POST",
      headers: authenticatedHeaders(pw),
      cache: "no-store",
    });

    if (!upstreamResp.ok) {
      return NextResponse.json(
        { error: upstreamResp.statusText },
        {
          status: upstreamResp.status,
          headers: { "Cache-Control": "no-store, max-age=0" },
        },
      );
    }

    const text = await upstreamResp.text();
    return NextResponse.json(
      { ok: true, response: text },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  return NextResponse.json(
    { error: "Unsupported POST operation" },
    { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const op = searchParams.get("op") || "delete";
  const rawServerUrl = searchParams.get("serverUrl");

  if (op === "logout") {
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: isSecure(req),
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  }

  // Check for demo mode
  if (isDemoMode(rawServerUrl)) {
    // Block all operations in demo mode except logout
    if (op === "logout") {
      const res = NextResponse.json({ ok: true }, { status: 200 });
      res.cookies.set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure: isSecure(req),
        sameSite: "lax",
        expires: new Date(0),
        path: "/",
      });
      res.headers.set("Cache-Control", "no-store, max-age=0");
      return res;
    } else {
      return NextResponse.json(
        { error: "Operation not allowed in demo mode" },
        { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
  }

  const serverUrl = normalizeServerUrl(rawServerUrl);
  const path = searchParams.get("path") || "/";
  const pw = getDecryptedPw(req);

  if (!serverUrl)
    return NextResponse.json(
      { error: "Missing or disallowed serverUrl" },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  if (!pw)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } },
    );

  const deleteUrl = `${serverUrl}${path}?delete`;
  const upstreamResp = await fetch(deleteUrl, {
    method: "POST",
    headers: authenticatedHeaders(pw),
    cache: "no-store",
  });

  if (!upstreamResp.ok) {
    return NextResponse.json(
      { error: upstreamResp.statusText },
      {
        status: upstreamResp.status,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
