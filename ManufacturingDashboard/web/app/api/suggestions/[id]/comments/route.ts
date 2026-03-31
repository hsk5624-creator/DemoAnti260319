import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

// 댓글 목록
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, author:users(name)")
    .eq("post_id", Number(id))
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const comments = (data ?? []).map((c) => ({
    ...c,
    author_name: ((c.author as unknown) as { name: string } | null)?.name ?? "알 수 없음",
  }));

  return NextResponse.json({ comments });
}

// 댓글 작성
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("mfg-auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { content } = await request.json();
  if (!content) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }

  const { error } = await supabase.from("comments").insert({
    post_id: Number(id),
    author_id: authCookie.value,
    content,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
