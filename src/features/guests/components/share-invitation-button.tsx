"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { buildInvitationShareMessage } from "@/lib/rsvp";

type ShareInvitationButtonProps = {
  guestName: string;
  householdName?: string | null;
  inviteKind: "HOUSEHOLD" | "INDIVIDUAL";
  inviteCode: string;
  invitePath: string;
} & Pick<ButtonProps, "className" | "size" | "variant">;

export function ShareInvitationButton({
  guestName,
  householdName,
  inviteKind,
  inviteCode,
  invitePath,
  className,
  size = "sm",
  variant = "default",
}: ShareInvitationButtonProps) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "error">(
    "idle",
  );
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  function setTemporaryStatus(nextStatus: "shared" | "copied" | "error") {
    setStatus(nextStatus);

    if (resetTimeoutRef.current) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setStatus("idle");
    }, 2400);
  }

  async function handleShare() {
    const inviteUrl = new URL(invitePath, window.location.origin).toString();
    const message = buildInvitationShareMessage({
      inviteKind,
      guestName,
      householdName,
      inviteCode,
      inviteUrl,
    });

    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: "James & Lisa Wedding Invitation",
            text: message,
          });
          setTemporaryStatus("shared");
          return;
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }
        }
      }

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(message);
          setTemporaryStatus("copied");
          return;
        } catch {
          window.prompt("Copy invitation message:", message);
          setTemporaryStatus("copied");
          return;
        }
      }

      window.prompt("Copy invitation message:", message);
      setTemporaryStatus("copied");
    } catch (error) {
      setTemporaryStatus("error");
    }
  }

  return (
    <Button
      className={className}
      onClick={() => {
        void handleShare();
      }}
      size={size}
      type="button"
      variant={variant}
    >
      {status === "shared" || status === "copied" ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <Share2 className="mr-2 h-4 w-4" />
      )}
      {status === "shared"
        ? "Shared"
        : status === "copied"
          ? "Copied"
          : status === "error"
            ? "Share failed"
            : "Share invite"}
    </Button>
  );
}
