import { NextRequest, NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/safe-redirect";

function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

// El backend limita intentos por IP; sin esto vería la IP de este servidor para todo
// el personal. Vercel fija x-real-ip / x-forwarded-for en su borde (no las toma del cliente).
function clientIpHeaders(req: NextRequest): Record<string, string> {
  const secret = String(process.env.LOGIN_PROXY_SECRET || "").trim();
  const ip = String(req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  return secret && ip ? { "x-login-proxy-secret": secret, "x-login-client-ip": ip } : {};
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let username = "";
    let password = "";
    let next = "/servmacso10/servicios";

    if (contentType.includes("application/json")) {
      const b = await req.json().catch(() => ({} as any));
      username = String(b.username || "").trim();
      password = String(b.password || "").trim();
      next = String(b.next || next);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      const p = new URLSearchParams(txt);
      username = String(p.get("username") || "").trim();
      password = String(p.get("password") || "").trim();
      next = String(p.get("next") || next);
    } else {
      const form = await req.formData();
      username = String(form.get("username") || "").trim();
      password = String(form.get("password") || "").trim();
      next = String(form.get("next") || next);
    }

    next = safeInternalPath(next, req.url);
    const target = `${apiBase()}/auth/login`;
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(req) },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 429) {
        return new NextResponse("Demasiados intentos. Inténtalo de nuevo en 10 minutos.", {
          status: 429, headers: { "Retry-After": "600", "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      // eslint-disable-next-line no-console
      console.error("[api/login] Backend responded NOT OK", res.status);
      const status = res.status;
      const reason = status === 401 || status === 400 ? "cred" : status >= 500 ? "server" : `s${status}`;
      return NextResponse.redirect(new URL(`/servmacso10?error=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}&src=api`, req.url), 303);
    }

    const data = (await res.json()) as { access_token: string };
    const rsp = NextResponse.redirect(new URL(next, req.url), 303);
    rsp.cookies.set("token", data.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return rsp;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[api/login] FETCH ERROR", e?.message || e);
    return NextResponse.redirect(new URL(`/servmacso10?error=network&next=${encodeURIComponent("/servmacso10/servicios")}&src=api`, req.url), 303);
  }
}


