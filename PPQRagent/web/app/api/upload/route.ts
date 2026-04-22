import { NextRequest, NextResponse } from "next/server";

// Next.js rewrite 프록시는 대용량 파일을 버퍼링하다가 500을 냄.
// 여기서 request body를 스트리밍으로 FastAPI에 직접 전달해 우회.
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  try {
    const fetchOptions: RequestInit & { duplex?: string } = {
      method: "POST",
      headers: { "content-type": contentType },
      body: req.body,
      duplex: "half",   // Node.js: ReadableStream body 전송에 필요
    };

    const res = await fetch("http://localhost:8000/api/upload", fetchOptions);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
