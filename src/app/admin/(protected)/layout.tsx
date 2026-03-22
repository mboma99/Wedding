import type { ReactNode } from "react";

import { requireAdminSession } from "@/server/auth/admin";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  await requireAdminSession();

  return children;
}
