import { NextRequest, NextResponse } from "next/server";

function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

export async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    const user = await res.json();
    if (String(user?.role || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
}
