"use client";

import { useActionState } from "react";
import { KeyRound, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  resolvePublicRsvpLookupAction,
  type PublicRsvpLookupState,
} from "@/server/actions/rsvp";

const initialState: PublicRsvpLookupState = {};

export function RsvpLookupForm() {
  const [state, formAction, isPending] = useActionState(
    resolvePublicRsvpLookupAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <label className="space-y-2">
        <span className="text-sm font-medium text-muted-foreground">
          RSVP code or invitation link
        </span>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 bg-white/90 pl-10"
            name="lookup"
            placeholder="Enter code like ABCD-1234 or paste your RSVP link"
          />
        </div>
      </label>

      <div className="flex items-start gap-2 rounded-[1.25rem] border border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Every invitation includes a short RSVP code. You can type that code here
          or paste the full RSVP link sent by phone or email.
        </p>
      </div>

      <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
        {isPending ? "Finding RSVP..." : "Find my RSVP"}
      </Button>
    </form>
  );
}
