import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/features/admin/admin-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasAdminSession } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Admin Login | Traditional Wedding",
  description:
    "Password-protected access to the traditional wedding admin area.",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await hasAdminSession()) {
    redirect("/admin");
  }

  return (
    <div className="admin-scope">
      <main className="container flex min-h-dvh items-center py-6 sm:py-10">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <CardTitle className="mt-4">Enter admin password</CardTitle>
              <CardDescription>
                Use the shared admin password from your environment settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminLoginForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
