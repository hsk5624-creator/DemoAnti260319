import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.MRO_PASSWORD || "cell123!hs";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("mro-auth", password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // maxAge 없음 → 브라우저 닫으면 세션 만료
    });
    return res;
  }

  return NextResponse.json({ error: "wrong password" }, { status: 401 });
}
