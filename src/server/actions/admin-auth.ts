"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  clearAdminSession,
  isAdminAuthConfigured,
  setAdminSession,
  verifyAdminPassword,
} from "@/server/auth/admin";
import {
  ADMIN_LOGIN_LIMIT,
  blockedFor,
  clearAttempts,
  recordAttempt,
  visitorKey,
} from "@/server/rate-limit";

const adminLoginSchema = z.object({
  password: z.string().min(1),
});

export type AdminLoginState = {
  error?: string;
};

export async function loginAdminAction(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  if (!isAdminAuthConfigured()) {
    return {
      error:
        "Admin access is not configured. Add ADMIN_PASSWORD to the environment first.",
    };
  }

  const parsed = adminLoginSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Enter the admin password to continue.",
    };
  }

  const visitor = await visitorKey();
  const waitMinutes = blockedFor(ADMIN_LOGIN_LIMIT, visitor);

  if (waitMinutes) {
    return {
      error: `Too many wrong passwords. Try again in ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.`,
    };
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    recordAttempt(ADMIN_LOGIN_LIMIT, visitor);
    // A short pause on every wrong guess slows down anyone trying many.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      error: "That password is incorrect.",
    };
  }

  clearAttempts(ADMIN_LOGIN_LIMIT, visitor);
  await setAdminSession();
  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
