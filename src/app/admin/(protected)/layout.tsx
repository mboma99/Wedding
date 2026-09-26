import type { ReactNode } from "react";

import { AdminNav } from "@/components/shared/admin-nav";
import { AdminContent, AdminNavigationProvider } from "@/components/shared/admin-navigation";
import { requireAdminSession } from "@/server/auth/admin";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  await requireAdminSession();

  return (
    <AdminNavigationProvider>
      <div className="admin-scope min-h-dvh">
        <AdminNav />
        <AdminContent>{children}</AdminContent>
      </div>
    </AdminNavigationProvider>
  );
}
