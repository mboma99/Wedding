"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { deleteGuestAction } from "@/server/actions/guests";

type DeleteGuestButtonProps = {
  guestId: string;
  guestName: string;
  label?: string;
  redirectHref?: string;
  disabled?: boolean;
  onDeleteError?: (message: string) => void;
} & Pick<ButtonProps, "className" | "size" | "variant">;

export function DeleteGuestButton({
  guestId,
  guestName,
  label = "Delete",
  redirectHref,
  disabled = false,
  onDeleteError,
  className,
  size = "default",
  variant = "destructive",
}: DeleteGuestButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${guestName} from the guest directory? This also removes their invitation and RSVP data.`,
    );

    if (!confirmed) {
      return;
    }

    setIsPending(true);

    startTransition(async () => {
      const result = await deleteGuestAction(guestId);

      if (!result.success) {
        onDeleteError?.(result.message);
        if (!onDeleteError) {
          window.alert(result.message);
        }
        setIsPending(false);
        return;
      }

      if (redirectHref) {
        router.push(redirectHref);
      }

      router.refresh();
    });
  }

  return (
    <Button
      className={className}
      disabled={disabled || isPending}
      onClick={handleDelete}
      size={size}
      type="button"
      variant={variant}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {isPending ? "Deleting..." : label}
    </Button>
  );
}
