import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_SESSION_COOKIE = "wedding_admin_session";
const SESSION_DAYS = 7;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? getAdminPassword();
}

/**
 * The key sessions are signed with. It mixes in the password, so changing
 * ADMIN_PASSWORD signs every existing session out.
 */
function signingKey() {
  const password = getAdminPassword();
  const secret = getAdminSessionSecret();

  if (!password || !secret) {
    return null;
  }

  return createHash("sha256").update(`${secret}:${password}:traditional-wedding-admin`).digest();
}

function sign(key: Buffer, payload: string) {
  return createHmac("sha256", key).update(payload).digest("hex");
}

function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminPassword() && getAdminSessionSecret());
}

/**
 * A session cookie is "<expiry>.<random>.<signature>": new and random on each
 * login, and only valid until it expires.
 */
export async function hasAdminSession() {
  const key = signingKey();

  if (!key) {
    return false;
  }

  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const [expiresAt, nonce, signature] = value?.split(".") ?? [];

  if (!expiresAt || !nonce || !signature) {
    return false;
  }

  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) * 1000 <= Date.now()) {
    return false;
  }

  return sameText(signature, sign(key, `${expiresAt}.${nonce}`));
}

export async function requireAdminSession() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
}

export async function setAdminSession() {
  const key = signingKey();

  if (!key) {
    throw new Error("Admin password is not configured.");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const nonce = randomBytes(16).toString("hex");
  const value = `${expiresAt}.${nonce}.${sign(key, `${expiresAt}.${nonce}`)}`;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Compares fixed-length digests, so the time taken doesn't reveal anything
 * about the password, not even its length.
 */
export function verifyAdminPassword(password: string) {
  const expected = getAdminPassword();

  if (!expected) {
    return false;
  }

  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(expected), digest(password));
}
