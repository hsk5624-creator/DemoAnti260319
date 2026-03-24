"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Mail, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formSchema = z.object({
  email: z.string().email({
    message: "유효한 이메일 주소를 입력해주세요.",
  }),
  password: z.string().min(1, {
    message: "비밀번호를 최소 1자 이상 입력해주세요.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setErrorMsg("");
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    setIsLoading(false);
    
    if (error) {
      if (error.message === "Email not confirmed") {
        setErrorMsg("이메일 인증이 필요합니다. 가입하신 이메일의 메일함을 확인해 주세요.");
      } else {
        setErrorMsg(error.message || "이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } else if (data.user) {
      router.push("/dashboard"); 
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 selection:bg-primary/20">
      {/* Decorative Blur Background Blob */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-[80px] md:blur-[120px] -z-10 pointer-events-none" />

      <Card className="w-full max-w-md border shadow-2xl shadow-black/5 dark:shadow-none bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl transition-all">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <CardTitle className="text-3xl font-bold tracking-tight">
            환영합니다
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground px-4">
            계정에 로그인하여 계속 서비스를 이용해 주세요.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Global Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 text-center font-medium transition-all animate-in fade-in slide-in-from-top-2">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-300">이메일</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                <Input 
                  id="email"
                  placeholder="name@example.com" 
                  type="email" 
                  autoComplete="email"
                  disabled={isLoading}
                  className="pl-9 bg-white/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 transition-colors focus-visible:ring-1"
                  {...form.register("email")} 
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-[0.8rem] font-medium text-red-500 dark:text-red-400">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-300">비밀번호</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                <Input 
                  id="password"
                  placeholder="••••••••" 
                  type="password" 
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="pl-9 bg-white/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 transition-colors focus-visible:ring-1"
                  {...form.register("password")} 
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-[0.8rem] font-medium text-red-500 dark:text-red-400">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full font-semibold shadow-md dark:shadow-none hover:opacity-90 active:scale-[0.98] transition-all duration-200 h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    인증 처리 중...
                  </>
                ) : (
                  "로그인"
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6 font-medium">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="text-zinc-900 dark:text-zinc-100 hover:underline underline-offset-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                회원가입
              </Link>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-zinc-100 dark:border-zinc-800 p-5 mt-2 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-b-xl">
          <p className="text-xs text-muted-foreground text-center">
            [테스트 계정] 이메일: <strong>test@example.com</strong> / 암호: <strong>password</strong>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
