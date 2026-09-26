"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  resolvePublicRsvpLookupAction,
  type PublicRsvpLookupState,
} from "@/server/actions/rsvp";

const initialState: PublicRsvpLookupState = {};

type RsvpLookupFormProps = {
  /** "light" sits on the navy landing-page panel, with the button beside the box. */
  tone?: "default" | "light";
};

export function RsvpLookupForm({ tone = "default" }: RsvpLookupFormProps) {
  const [state, formAction, isPending] = useActionState(
    resolvePublicRsvpLookupAction,
    initialState,
  );
  const isLight = tone === "light";

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div className={cn("flex flex-col gap-3", isLight && "sm:flex-row")}>
        <label className="relative block flex-1">
          <span className="sr-only">Email, phone number or RSVP code</span>
          <KeyRound
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2",
              isLight ? "text-white/65" : "text-muted-foreground",
            )}
          />
          <Input
            autoComplete="email"
            className={cn(
              "h-12 pl-10",
              isLight
                ? "border-white/20 bg-white/10 text-white placeholder:text-white/60"
                : "bg-white/90",
            )}
            name="lookup"
            placeholder="Email, phone or RSVP code"
          />
        </label>
        <Button
          className={cn(
            "h-12 w-full sm:w-auto sm:px-8",
            isLight &&
              "bg-[#f5ede3] text-primary shadow-lg shadow-black/15 hover:bg-[#efe2d1]",
          )}
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Finding…" : "Find my RSVP"}
        </Button>
      </div>

      <p
        className={cn(
          "text-sm",
          isLight ? "text-center text-white/70" : "text-muted-foreground",
        )}
      >
        Got a link instead? Paste it here.
      </p>
    </form>
  );
}
