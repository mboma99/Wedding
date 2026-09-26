"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSavingsAction } from "@/server/actions/vendors";

export function SavingsEditor({
  lisa,
  james,
}: {
  lisa: number;
  james: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [lisaValue, setLisaValue] = useState(String(lisa));
  const [jamesValue, setJamesValue] = useState(String(james));
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} size="sm" type="button" variant="outline">
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Update balances
      </Button>
    );
  }

  return (
    <div className="space-y-2.5 rounded-[1.25rem] border border-border/80 bg-muted/25 p-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Lisa saved</span>
          <Input
            inputMode="decimal"
            onChange={(event) => setLisaValue(event.target.value)}
            value={lisaValue}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">James saved</span>
          <Input
            inputMode="decimal"
            onChange={(event) => setJamesValue(event.target.value)}
            value={jamesValue}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={isPending}
          onClick={() => {
            setError(null);
            setIsPending(true);
            startTransition(async () => {
              const result = await updateSavingsAction({
                lisa: Number(lisaValue),
                james: Number(jamesValue),
              });
              setIsPending(false);

              if (!result.success) {
                setError(result.message);
                return;
              }

              setIsOpen(false);
              router.refresh();
            });
          }}
          size="sm"
          type="button"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button onClick={() => setIsOpen(false)} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
