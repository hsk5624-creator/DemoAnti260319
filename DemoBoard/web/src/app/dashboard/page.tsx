"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, User as UserIcon, Users as UsersIcon } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ id: string; name: string; email: string } | null>(null);
  const [otherUsers, setOtherUsers] = useState<{ id: string; name: string; email: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getData() {
      // 1. 현재 로그인 된 유저의 세션(토큰) 확인
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace("/");
        return;
      }

      // 2. 내 프로필 정보 가져오기
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (profileData) {
        setProfile(profileData);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      // 3. 다른 모든 유저 정보 가져오기 (2-2 기능)
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersData) {
        setOtherUsers(usersData);
      }

      setLoading(false);
    }
    
    getData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
         <span className="text-zinc-500 animate-pulse font-medium tracking-tight">
           Supabase에서 유저 정보를 불러오는 중...
         </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 selection:bg-primary/20">
      {/* Decorative Blur Background */}
      <div className="fixed top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <Card className="w-full max-w-xl border shadow-2xl shadow-indigo-500/5 dark:shadow-none bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl transition-all">
        <CardHeader className="space-y-1 pb-6 pt-7 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="flex justify-between items-center px-2">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                마이페이지
              </CardTitle>
              <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Supabase 데이터베이스에서 조회한 실시간 유저 정보
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-10 pb-8">
          <div className="flex flex-col items-center justify-center space-y-5">
            <div className="relative group">
              <div className="absolute -inset-1 blur-md bg-gradient-to-br from-indigo-500/40 to-purple-500/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-24 h-24 bg-white dark:bg-zinc-900 border shadow-sm rounded-full flex items-center justify-center z-10 transition-transform hover:scale-105 duration-300">
                <UserIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
              </div>
            </div>
            
            <div className="text-center space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                반갑습니다, {profile?.name}님! 🎉
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-[0.95rem]">
                {profile?.email}
              </p>
            </div>

            <div className="mt-8 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-sm text-indigo-700 dark:text-indigo-300/80 font-medium text-center w-full max-w-sm leading-relaxed animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
              완벽합니다! 프론트엔드와 백엔드가 연결되어 성공적으로 데이터 조회를 마쳤습니다. 🚀
            </div>
          </div>

          {/* 다른 가입자 목록 섹션 (2-2 기능) */}
          <div className="mt-16 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <UsersIcon className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">함께하는 멤버들</h3>
              <span className="ml-auto text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                {otherUsers.length}명
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherUsers.map((user) => (
                <div 
                  key={user.id} 
                  className={`p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
                    user.id === profile?.id 
                      ? "bg-indigo-50/30 border-indigo-200/50 dark:bg-indigo-900/10 dark:border-indigo-800/50 ring-1 ring-indigo-500/10" 
                      : "bg-white/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                      {user.name} {user.id === profile?.id && <span className="text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded ml-1">나</span>}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
