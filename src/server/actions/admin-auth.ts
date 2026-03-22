"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  clearAdminSession,
  isAdminAuthConfigured,
  setAdminSession,
  verifyAdminPassword,
} from "@/server/auth/admin";

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

  if (!verifyAdminPassword(parsed.data.password)) {
    return {
      error: "That password is incorrect.",
    };
  }

  await setAdminSession();
  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
