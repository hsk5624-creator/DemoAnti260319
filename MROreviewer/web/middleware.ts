import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.MRO_PASSWORD || "cell123!";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 로그인 페이지 + 인증 API는 통과
  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  // 쿠키 확인
  const auth = request.cookies.get("mro-auth")?.value;
  if (auth === PASSWORD) {
    return NextResponse.next();
  }

  // 인증 안 된 API 요청 → 401
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 인증 안 된 페이지 요청 → 로그인으로
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
