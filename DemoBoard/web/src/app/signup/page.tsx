"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Mail, Lock, User, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// 스키마 선언: 비밀번호 확인이 일치하는지 검증하는 로직 추가
const formSchema = z.object({
  name: z.string().min(2, {
    message: "이름은 2글자 이상이어야 합니다.",
  }),
  email: z.string().email({
    message: "유효한 이메일 주소를 입력해주세요.",
  }),
  password: z.string().min(8, {
    message: "비밀번호는 최소 8자 이상 입력해주세요.",
  }),
  passwordConfirm: z.string().min(1, {
    message: "비밀번호 확인을 입력해주세요.",
  }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["passwordConfirm"], // 에러 메시지를 표시할 필드 지정
});

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirm: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setErrorMsg("");
    
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          name: values.name,
        }
      }
    });

    setIsLoading(false);
    
    if (error) {
      setErrorMsg(error.message || "회원가입 중 오류가 발생했습니다.");
    } else {
      alert(`환영합니다, ${values.name}님! 성공적으로 가입되었습니다.`);
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 selection:bg-primary/20">
      {/* Decorative Blur Background Blob */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 rounded-full blur-[80px] md:blur-[120px] -z-10 pointer-events-none" />

      <Card className="w-full max-w-md border shadow-2xl shadow-black/5 dark:shadow-none bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl transition-all mt-8 my-auto">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <CardTitle className="text-3xl font-bold tracking-tight">
            계정 생성
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground px-4">
            간단한 정보들을 입력하고 가입을 완료하세요.
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
              <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-300">이름</Label>
              <div className="relative group">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                <Input 
                  id="name"
                  placeholder="홍길동" 
                  autoComplete="name"
                  disabled={isLoading}
                  className="pl-9 bg-white/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 transition-colors focus-visible:ring-1"
                  {...form.register("name")} 
                />
              </div>
              {form.formState.errors.name && (
                <p className="text-[0.8rem] font-medium text-red-500 dark:text-red-400">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

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
                  placeholder="최소 8자 이상의 비밀번호" 
                  type="password" 
                  autoComplete="new-password"
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

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-zinc-700 dark:text-zinc-300">비밀번호 확인</Label>
              <div className="relative group">
                <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                <Input 
                  id="passwordConfirm"
                  placeholder="비밀번호 재입력" 
                  type="password" 
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="pl-9 bg-white/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 transition-colors focus-visible:ring-1"
                  {...form.register("passwordConfirm")} 
                />
              </div>
              {form.formState.errors.passwordConfirm && (
                <p className="text-[0.8rem] font-medium text-red-500 dark:text-red-400">
                  {form.formState.errors.passwordConfirm.message}
                </p>
              )}
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full font-semibold shadow-md dark:shadow-none hover:opacity-90 active:scale-[0.98] transition-all duration-200 h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    계정 생성 중...
                  </>
                ) : (
                  "회원가입 완료"
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6 font-medium">
              이미 계정이 있으신가요?{" "}
              <Link href="/" className="text-zinc-900 dark:text-zinc-100 hover:underline underline-offset-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                로그인으로 돌아가기
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
