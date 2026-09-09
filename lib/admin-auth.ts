import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const MAX_AGE = 30 * 60; // 30 min

function sign(expires: string): string {
  return createHmac("sha256", env.ADMIN_PASSWORD).update(expires).digest("hex");
}

export function createSession(): string {
  const expires = String(Date.now() + MAX_AGE * 1000);
  return `${expires}.${sign(expires)}`;
}

export function verifySession(value: string | undefined): boolean {
  if (!value) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createSession(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}
