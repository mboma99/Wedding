"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAdminAction, type AdminLoginState } from "@/server/actions/admin-auth";

const initialState: AdminLoginState = {};

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAdminAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <label className="space-y-2">
        <span className="text-sm font-medium text-muted-foreground">
          Admin password
        </span>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 rounded-2xl bg-white/90 pl-10"
            name="password"
            placeholder="Enter password"
            type="password"
          />
        </div>
      </label>

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Unlocking admin..." : "Open admin"}
      </Button>
    </form>
  );
}
