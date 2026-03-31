import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

// 게시글 목록 (page 필터)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ?? "";

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, content, created_at, page, author:users(name)")
    .eq("page", page)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = (data ?? []).map((p) => ({
    ...p,
    author_name: ((p.author as unknown) as { name: string } | null)?.name ?? "알 수 없음",
  }));

  return NextResponse.json({ posts });
}

// 게시글 작성
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("mfg-auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { page, title, content } = await request.json();
  if (!page || !title || !content) {
    return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
  }

  const { error } = await supabase.from("posts").insert({
    author_id: authCookie.value,
    page,
    title,
    content,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
