"use client";

import { useActionState } from "react";
import { KeyRound, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  resolvePublicRsvpLookupAction,
  type PublicRsvpLookupState,
} from "@/server/actions/rsvp";

const initialState: PublicRsvpLookupState = {};

type RsvpLookupFormProps = {
  tone?: "default" | "light";
};

export function RsvpLookupForm({ tone = "default" }: RsvpLookupFormProps) {
  const [state, formAction, isPending] = useActionState(
    resolvePublicRsvpLookupAction,
    initialState,
  );
  const isLight = tone === "light";

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <label className="space-y-2">
        <span
          className={cn(
            "text-sm font-medium",
            isLight ? "text-white" : "text-muted-foreground",
          )}
        >
          RSVP code or invitation link
        </span>
        <div className="relative">
          <KeyRound
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2",
              isLight ? "text-white/65" : "text-muted-foreground",
            )}
          />
          <Input
            className={cn(
              "h-12 pl-10",
              isLight
                ? "border-white/20 bg-white/10 text-white placeholder:text-white/55"
                : "bg-white/90",
            )}
            name="lookup"
            placeholder="Enter code like ABCD-1234 or paste your RSVP link"
          />
        </div>
      </label>

      <div
        className={cn(
          "flex items-start gap-2 rounded-[1.25rem] border px-4 py-3 text-sm",
          isLight
            ? "border-white/15 bg-white/10 text-white"
            : "border-border/80 bg-muted/20 text-muted-foreground",
        )}
      >
        <Link2
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            isLight ? "text-white" : "text-primary",
          )}
        />
        <p>
          Every invitation includes a short RSVP code. You can type that code here
          or paste the full RSVP link sent by phone or email.
        </p>
      </div>

      <div className={cn("flex", isLight ? "justify-center" : "")}>
        <Button
          className={cn(
            "w-full sm:w-auto",
            isLight &&
              "max-w-xs bg-[#f5ede3] text-primary shadow-lg shadow-black/15 hover:bg-[#efe2d1] sm:px-8",
          )}
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Finding RSVP..." : "Find my RSVP"}
        </Button>
      </div>
    </form>
  );
}
