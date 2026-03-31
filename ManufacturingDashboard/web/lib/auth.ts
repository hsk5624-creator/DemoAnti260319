import { createHash } from "crypto";
import { supabase } from "./supabase";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  created_at: string;
}

export function hashPassword(password: string): string {
  const salt = "mfg-dashboard-salt";
  return createHash("sha256").update(salt + password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();
  return data as User | null;
}

export async function createUser(user: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const existing = await findUserByEmail(user.email);
  if (existing) return { ok: false, error: "이미 사용 중인 이메일입니다." };

  const { error } = await supabase.from("users").insert({
    name: user.name.trim(),
    email: user.email.trim().toLowerCase(),
    phone: user.phone.trim(),
    password_hash: hashPassword(user.password),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
