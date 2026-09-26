import type { ReactNode } from "react";

import { AdminNav } from "@/components/shared/admin-nav";
import { requireAdminSession } from "@/server/auth/admin";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  await requireAdminSession();

  return (
    <div className="admin-scope min-h-dvh">
      <AdminNav />
      {children}
    </div>
  );
}
