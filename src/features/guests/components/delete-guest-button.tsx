"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteGuestAction } from "@/server/actions/guests";

type DeleteGuestButtonProps = {
  guestId: string;
  guestName: string;
  label?: string;
  redirectHref?: string;
  disabled?: boolean;
  iconOnly?: boolean;
} & Pick<ButtonProps, "className" | "size" | "variant">;

/**
 * Two-step delete: the first press arms the button, the second deletes.
 * Replaces window.confirm, which blocks the page and can't be styled.
 */
export function DeleteGuestButton({
  guestId,
  guestName,
  label = "Delete",
  redirectHref,
  disabled = false,
  iconOnly = false,
  className,
  size = "default",
  variant = "destructive",
}: DeleteGuestButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isArmed, setIsArmed] = useState(false);

  // Disarm on its own so a stray first press can't be confirmed much later.
  useEffect(() => {
    if (!isArmed) {
      return;
    }

    const timeout = window.setTimeout(() => setIsArmed(false), 4000);

    return () => window.clearTimeout(timeout);
  }, [isArmed]);

  function handleDelete() {
    setIsPending(true);

    startTransition(async () => {
      const result = await deleteGuestAction(guestId);

      if (!result.success) {
        toast.error(`Couldn't delete ${guestName}`, {
          description: result.message,
        });
        setIsPending(false);
        setIsArmed(false);
        return;
      }

      toast.success(`Deleted ${guestName}`);

      if (redirectHref) {
        router.push(redirectHref);
      }

      router.refresh();
    });
  }

  if (isArmed || isPending) {
    return (
      <span className="animate-enter inline-flex items-center gap-1">
        <Button
          autoFocus
          className={cn(!iconOnly && className)}
          disabled={isPending}
          onClick={handleDelete}
          size="sm"
          type="button"
          variant="destructive"
        >
          {isPending ? "Deleting..." : iconOnly ? "Delete?" : "Confirm delete"}
        </Button>
        {isPending ? null : (
          <Button
            onClick={() => setIsArmed(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        )}
      </span>
    );
  }

  return (
    <Button
      aria-label={iconOnly ? `${label} ${guestName}` : undefined}
      className={cn(
        iconOnly && variant === "ghost" && "text-rose-700 hover:bg-rose-50 hover:text-rose-800",
        className,
      )}
      disabled={disabled}
      onClick={() => setIsArmed(true)}
      size={iconOnly ? "icon" : size}
      title={iconOnly ? `${label} ${guestName}` : undefined}
      type="button"
      variant={variant}
    >
      <Trash2 className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
      {iconOnly ? null : label}
    </Button>
  );
}
